import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { insertKundliApiCall, upsertKundliGeneratedReport } from "../_shared/kundli-audit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StorePdfBody {
  jobId: string;
  pdfBase64?: string;
  pdfUrl?: string;
  fileName?: string;
  previewMode?: boolean;
  bucket?: string;
}

function decodeBase64Pdf(base64: string): Uint8Array {
  const normalized = base64.includes(",") ? base64.split(",")[1] : base64;
  const raw = atob(normalized);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: StorePdfBody = await req.json();
    const jobId = String(body.jobId || "").trim();
    if (!jobId) {
      return new Response(
        JSON.stringify({ error: "jobId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const bucket = body.bucket || "kundli-reports";
    const previewMode = Boolean(body.previewMode);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const safeFileName = (body.fileName || "kundli-report.pdf").replace(/[^a-zA-Z0-9._-]/g, "-");
    const pathPrefix = previewMode ? "preview" : "full";
    const objectPath = `${pathPrefix}/${jobId}/${ts}-${safeFileName}`;

    // Ensure bucket exists
    const { data: bucketInfo } = await supabaseAdmin.storage.getBucket(bucket);
    if (!bucketInfo) {
      const { error: createBucketError } = await supabaseAdmin.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: "20MB",
      });
      if (createBucketError) {
        throw createBucketError;
      }
    }

    let pdfBytes: Uint8Array | null = null;

    if (body.pdfBase64) {
      pdfBytes = decodeBase64Pdf(body.pdfBase64);
    } else if (body.pdfUrl) {
      const pdfResponse = await fetch(body.pdfUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to fetch PDF from URL: ${pdfResponse.status}`);
      }
      const buffer = await pdfResponse.arrayBuffer();
      pdfBytes = new Uint8Array(buffer);
    }

    if (!pdfBytes || pdfBytes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Either pdfBase64 or pdfUrl must be provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .upload(objectPath, pdfBytes, {
        upsert: true,
        contentType: "application/pdf",
        cacheControl: "3600",
      });

    if (uploadError) {
      throw uploadError;
    }

    const expiresIn = previewMode ? 3600 : 60 * 60 * 24 * 7;
    const { data: signedData, error: signedError } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(objectPath, expiresIn);

    if (signedError) {
      throw signedError;
    }

    await supabaseAdmin
      .from("kundli_report_jobs")
      .update({
        pdf_storage_bucket: bucket,
        pdf_storage_path: objectPath,
      })
      .eq("id", jobId);

    await insertKundliApiCall(supabaseAdmin, {
      jobId,
      phase: "PDF storage",
      provider: "supabase-storage",
      apiName: "upload-pdf",
      requestPayload: {
        bucket,
        objectPath,
        previewMode,
        fileName: safeFileName,
      },
      responsePayload: {
        signedUrlCreated: Boolean(signedData?.signedUrl),
      },
      httpStatus: 200,
      durationMs: null,
      success: true,
    });
    await upsertKundliGeneratedReport(supabaseAdmin, {
      jobId,
      status: previewMode ? "preview_pdf_saved" : "pdf_saved",
      pdfStorageBucket: bucket,
      pdfStoragePath: objectPath,
      pdfSignedUrl: signedData?.signedUrl || null,
      pdfSizeBytes: pdfBytes.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        bucket,
        path: objectPath,
        signedUrl: signedData?.signedUrl || null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ [STORE-KUNDLI-PDF] Error:", error);
    try {
      const body: StorePdfBody = await req.clone().json();
      const failedJobId = String(body.jobId || "").trim();
      if (failedJobId) {
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        await insertKundliApiCall(supabaseAdmin, {
          jobId: failedJobId,
          phase: "PDF storage",
          provider: "supabase-storage",
          apiName: "upload-pdf",
          success: false,
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        });
      }
    } catch {
      // no-op
    }
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

/**
 * translate-kundli-report — Stage 2 of the Kundli pipeline.
 *
 * Runs the translation sweep on the partial report saved by process-kundli-job.
 * Gets its OWN 150s wall_clock_limit (Supabase Free tier) dedicated entirely
 * to translation. After completing, triggers finalize-kundli-report (Stage 3).
 *
 * Flow:  process-kundli-job → [this] → finalize-kundli-report
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";

import { runTranslationSweep } from "../_shared/generate-kundli-report/translation-agent.ts";
import { setAgentLanguageContext } from "../_shared/generate-kundli-report/agent-base.ts";
import { normalizeLanguage } from "../_shared/language-packs/index.ts";
import type { SupportedLanguage } from "../_shared/language-packs/types.ts";
import { createJobEvent, touchJobHeartbeat } from "../_shared/job-events.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isLanguagePipelineV2Enabled(language: SupportedLanguage): boolean {
  if (language === "hi" || language === "te") return true;
  if (language === "en") return false;
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  let jobId: string | undefined;

  try {
    const body = await req.json();
    jobId = body.jobId;
    console.log(`🌐 [TRANSLATE-JOB] Starting translation for job: ${jobId}`);

    // Load job record with partial report from Stage 1
    const { data: job, error: fetchError } = await supabaseAdmin
      .from("kundli_report_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) {
      console.error("❌ [TRANSLATE-JOB] Job not found:", jobId);
      return new Response(JSON.stringify({ error: "Job not found" }), { status: 404 });
    }

    const report = job.report_data as Record<string, any>;
    if (!report) throw new Error("No report_data found — Stage 1 may not have completed");

    const requestedLanguage = normalizeLanguage(job.language || "en");
    const useLanguagePipelineV2 = isLanguagePipelineV2Enabled(requestedLanguage);
    const effectiveGenLang: SupportedLanguage = useLanguagePipelineV2 ? requestedLanguage : "en";
    setAgentLanguageContext(effectiveGenLang);

    let totalTokens = report.tokensUsed || 0;

    // ── Translation Sweep ──────────────────────────────────────────────────
    if (effectiveGenLang !== "en") {
      await updateJobStatus(supabaseAdmin, jobId!, "processing", "Translating remaining content", 85, "progress");

      try {
        const translationStats = await runTranslationSweep(report, effectiveGenLang);
        console.log(`🌐 [TRANSLATE-JOB] Sweep: ${translationStats.stringsTranslated}/${translationStats.stringsFound} strings in ${translationStats.batchesSent} batches`);

        if (translationStats.errors.length > 0) {
          report.errors = [...(report.errors || []), ...translationStats.errors.map((e: string) => `TranslationSweep: ${e}`)];
        }
        report.computationMeta = {
          ...(report.computationMeta || {}),
          translationSweep: {
            stringsFound: translationStats.stringsFound,
            stringsTranslated: translationStats.stringsTranslated,
            batchesSent: translationStats.batchesSent,
            errorCount: translationStats.errors.length,
            remainingEnglish: translationStats.remainingEnglishCount,
            sectionBreakdown: translationStats.sectionBreakdown,
          },
        };
        totalTokens += translationStats.tokensUsed || 0;
      } catch (translationErr: any) {
        console.warn(`⚠️ [TRANSLATE-JOB] Translation sweep failed (non-fatal):`, translationErr?.message || translationErr);
        report.errors = [...(report.errors || []), `TranslationSweep: ${translationErr?.message || "unknown error"}`];
      }

      await touchJobHeartbeat(supabaseAdmin, jobId!);
    } else {
      console.log(`⏭️ [TRANSLATE-JOB] Skipping translation for English report`);
    }

    // ── Save translated report and trigger Stage 3 ─────────────────────────
    report.tokensUsed = totalTokens;
    console.log(`📦 [TRANSLATE-JOB] Saving translated report and triggering Stage 3 (finalize)...`);

    await supabaseAdmin
      .from("kundli_report_jobs")
      .update({
        status: "processing",
        current_phase: "Translation complete — finalizing",
        progress_percent: 90,
        report_data: report,
        heartbeat_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Trigger Stage 3: finalize-kundli-report
    const stage3Url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/finalize-kundli-report`;
    const stage3Promise = fetch(stage3Url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ jobId }),
    }).catch(err => {
      console.error("⚠️ [TRANSLATE-JOB] Failed to trigger Stage 3:", err);
    });

    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(stage3Promise);
    }

    console.log("✅ [TRANSLATE-JOB] Translation complete, Stage 3 triggered");
    return new Response(
      JSON.stringify({ success: true, jobId, stage: "translate_complete" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ [TRANSLATE-JOB] Error:", error);

    if (jobId) {
      await createJobEvent(supabaseAdmin, {
        jobId,
        phase: "Translation Error",
        eventType: "fail",
        message: error instanceof Error ? error.message : "Unknown error",
      });

      await supabaseAdmin
        .from("kundli_report_jobs")
        .update({
          status: "failed",
          failure_code: "TRANSLATION_ERROR",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", jobId)
        .then(({ error: updateErr }) => {
          if (updateErr) {
            // Fallback without failure_code
            return supabaseAdmin
              .from("kundli_report_jobs")
              .update({
                status: "failed",
                error_message: error instanceof Error ? error.message : "Unknown error",
              })
              .eq("id", jobId);
          }
        });
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateJobStatus(
  supabase: any,
  jobId: string,
  status: string,
  phase: string,
  progress: number,
  eventType: "start" | "progress" | "success" | "fail" | "info" = "progress",
) {
  const withHeartbeat = await supabase
    .from("kundli_report_jobs")
    .update({
      status,
      current_phase: phase,
      progress_percent: progress,
      heartbeat_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (withHeartbeat.error) {
    await supabase
      .from("kundli_report_jobs")
      .update({ status, current_phase: phase, progress_percent: progress })
      .eq("id", jobId);
  }

  await createJobEvent(supabase, {
    jobId,
    phase,
    eventType,
    message: `${status}: ${phase}`,
    metrics: { progress },
  });
}

/**
 * translate-kundli-report — Stage 2 of the Kundli pipeline.
 *
 * Runs the translation sweep on the partial report saved by process-kundli-job.
 * Gets its OWN 150s wall_clock_limit (Supabase Free tier) dedicated entirely
 * to translation. After completing, triggers finalize-kundli-report (Stage 3).
 *
 * SPLIT MODE: If the translation sweep needs > 12 Gemini batches, this function
 * processes only the first 12 batches, saves partial results, and triggers ITSELF
 * again for the remaining strings. This avoids Supabase's 150s timeout.
 *
 * Flow:  process-kundli-job → [this (pass 1)] → [this (pass 2, if needed)] → finalize-kundli-report
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
  if (language === "hi" || language === "te" || language === "kn" || language === "mr") return true;
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

  // Safety timeout: trigger Stage 3 before Supabase kills us at 150s.
  // Give translation 120s, then bail and proceed with whatever we have.
  const TRANSLATION_TIMEOUT_MS = 120_000;
  // Maximum Gemini batches per pass. If more are needed, we self-chain.
  // With CONCURRENCY=4, 15 batches = 4 waves ≈ 80-100s (well within 120s timeout).
  const MAX_BATCHES_PER_PASS = 15;

  let jobId: string | undefined;
  let report: Record<string, any> | undefined;

  try {
    const body = await req.json();
    jobId = body.jobId;
    const translationPass: number = body.translationPass || 1;
    console.log(`🌐 [TRANSLATE-JOB] Starting translation pass ${translationPass} for job: ${jobId}`);

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

    report = job.report_data as Record<string, any>;
    if (!report) {
      console.error("❌ [TRANSLATE-JOB] No report_data — Stage 1 incomplete, skipping to finalize");
      report = {};
    }

    const requestedLanguage = normalizeLanguage(job.language || "en");
    const useLanguagePipelineV2 = isLanguagePipelineV2Enabled(requestedLanguage);
    const effectiveGenLang: SupportedLanguage = useLanguagePipelineV2 ? requestedLanguage : "en";
    setAgentLanguageContext(effectiveGenLang);

    let totalTokens = (report as any).tokensUsed || 0;

    // ── Translation Sweep (with safety timeout + split support) ────────────
    let needsSecondPass = false;

    if (effectiveGenLang !== "en") {
      const passLabel = translationPass > 1 ? ` (pass ${translationPass})` : "";
      await updateJobStatus(supabaseAdmin, jobId!, "processing", `Translating remaining content${passLabel}`, translationPass === 1 ? 85 : 88, "progress");

      try {
        // On pass 1, limit to MAX_BATCHES_PER_PASS to avoid timeout.
        // On pass 2+, process everything remaining (no limit).
        const sweepOptions = translationPass === 1
          ? { maxBatches: MAX_BATCHES_PER_PASS }
          : undefined;

        // Race translation against a safety timer
        const translationPromise = runTranslationSweep(report!, effectiveGenLang, sweepOptions);
        const timeoutPromise = new Promise<"TIMEOUT">((resolve) =>
          setTimeout(() => resolve("TIMEOUT"), TRANSLATION_TIMEOUT_MS)
        );

        const raceResult = await Promise.race([translationPromise, timeoutPromise]);

        if (raceResult === "TIMEOUT") {
          console.warn(`⏰ [TRANSLATE-JOB] Translation timed out after ${TRANSLATION_TIMEOUT_MS / 1000}s — proceeding with partial translation`);
          report!.errors = [...(report!.errors || []), `TranslationSweep: Timed out after ${TRANSLATION_TIMEOUT_MS / 1000}s — partial translation applied (pass ${translationPass})`];
          report!.computationMeta = {
            ...(report!.computationMeta || {}),
            translationSweep: { timedOut: true, timeoutMs: TRANSLATION_TIMEOUT_MS, pass: translationPass },
          };
        } else {
          const translationStats = raceResult;
          console.log(`🌐 [TRANSLATE-JOB] Sweep pass ${translationPass}: ${translationStats.stringsTranslated}/${translationStats.stringsFound} strings (${translationStats.stringsCached} cached, ${translationStats.batchesSent} Gemini batches, ${translationStats.totalBatchesNeeded} total needed)`);

          if (translationStats.errors.length > 0) {
            report!.errors = [...(report!.errors || []), ...translationStats.errors.map((e: string) => `TranslationSweep: ${e}`)];
          }

          // Check if we need a second pass (more batches than we processed)
          if (translationPass === 1 && translationStats.totalBatchesNeeded > MAX_BATCHES_PER_PASS) {
            needsSecondPass = true;
            console.log(`📦 [TRANSLATE-JOB] Pass 1 processed ${translationStats.batchesSent}/${translationStats.totalBatchesNeeded} batches — will trigger pass 2 for remaining`);
          }

          const sweepKey = translationPass === 1 ? "translationSweep" : "translationSweepPass2";
          report!.computationMeta = {
            ...(report!.computationMeta || {}),
            [sweepKey]: {
              pass: translationPass,
              stringsFound: translationStats.stringsFound,
              stringsTranslated: translationStats.stringsTranslated,
              stringsCached: translationStats.stringsCached,
              batchesSent: translationStats.batchesSent,
              totalBatchesNeeded: translationStats.totalBatchesNeeded,
              errorCount: translationStats.errors.length,
              remainingEnglish: translationStats.remainingEnglishCount,
              sectionBreakdown: translationStats.sectionBreakdown,
            },
          };
          totalTokens += translationStats.tokensUsed || 0;
        }
      } catch (translationErr: any) {
        console.warn(`⚠️ [TRANSLATE-JOB] Translation sweep failed (non-fatal):`, translationErr?.message || translationErr);
        report!.errors = [...(report!.errors || []), `TranslationSweep: ${translationErr?.message || "unknown error"}`];
      }

      await touchJobHeartbeat(supabaseAdmin, jobId!).catch(() => {});
    } else {
      console.log(`⏭️ [TRANSLATE-JOB] Skipping translation for English report`);
    }

    // ── Save report and trigger next stage ───────────────────────────────────
    report!.tokensUsed = totalTokens;

    if (needsSecondPass) {
      // Self-chain: save partial results and trigger another translation pass
      await saveAndTriggerSelf(supabaseAdmin, jobId!, report!, translationPass + 1);
      console.log(`🔄 [TRANSLATE-JOB] Pass ${translationPass} complete — self-chaining to pass ${translationPass + 1}`);
      return new Response(
        JSON.stringify({ success: true, jobId, stage: `translate_pass_${translationPass}_complete`, nextPass: translationPass + 1 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await saveAndTriggerFinalize(supabaseAdmin, jobId!, report!, "Translation complete — finalizing");

    console.log("✅ [TRANSLATE-JOB] Translation complete, Stage 3 triggered");
    return new Response(
      JSON.stringify({ success: true, jobId, stage: "translate_complete" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // ── CRITICAL: Even on error, STILL trigger Stage 3 instead of dying ────
    console.error("❌ [TRANSLATE-JOB] Error (non-fatal, proceeding to finalize):", error);
    const errMsg = error instanceof Error ? error.message : "Unknown error";

    if (jobId) {
      await createJobEvent(supabaseAdmin, {
        jobId,
        phase: "Translation Error (non-fatal)",
        eventType: "info",
        message: errMsg,
      }).catch(() => {});

      // If we have report data, append the error and proceed
      if (report) {
        report.errors = [...(report.errors || []), `TranslationStage: ${errMsg}`];
      }

      // Save whatever we have and trigger finalize anyway
      await saveAndTriggerFinalize(
        supabaseAdmin,
        jobId,
        report,
        "Translation errored — skipping to finalize"
      );

      return new Response(
        JSON.stringify({ success: true, jobId, stage: "translate_error_skipped", error: errMsg }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: errMsg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Save current report state and trigger SELF for another translation pass.
 * Used when the translation sweep has more batches than MAX_BATCHES_PER_PASS.
 */
async function saveAndTriggerSelf(
  supabase: any,
  jobId: string,
  report: Record<string, any>,
  nextPass: number,
) {
  try {
    // Save partial translation results
    await supabase
      .from("kundli_report_jobs")
      .update({
        status: "processing",
        current_phase: `Translation pass ${nextPass - 1} complete — continuing`,
        progress_percent: 87,
        report_data: report,
        heartbeat_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    // Trigger SELF again with next pass number
    const selfUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/translate-kundli-report`;
    const selfPromise = fetch(selfUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ jobId, translationPass: nextPass }),
    }).catch(err => {
      console.error(`⚠️ [TRANSLATE-JOB] Failed to trigger self (pass ${nextPass}):`, err);
    });

    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(selfPromise);
    }

    console.log(`📤 [TRANSLATE-JOB] Self-triggered for pass ${nextPass}`);
  } catch (triggerErr) {
    console.error("💥 [TRANSLATE-JOB] CRITICAL: Failed to self-chain:", triggerErr);
    // Fallback: trigger finalize instead of leaving the job stuck
    await saveAndTriggerFinalize(supabase, jobId, report, "Self-chain failed — skipping to finalize");
  }
}

/**
 * Save current report state to DB and trigger Stage 3 (finalize).
 * Used by both the happy path and the error path to ensure finalize ALWAYS runs.
 */
async function saveAndTriggerFinalize(
  supabase: any,
  jobId: string,
  report: Record<string, any> | undefined,
  phase: string,
) {
  try {
    // Save whatever report data we have
    const updatePayload: Record<string, any> = {
      status: "processing",
      current_phase: phase,
      progress_percent: 90,
      heartbeat_at: new Date().toISOString(),
    };
    if (report) {
      updatePayload.report_data = report;
    }

    await supabase
      .from("kundli_report_jobs")
      .update(updatePayload)
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

    console.log(`📤 [TRANSLATE-JOB] Stage 3 triggered (${phase})`);
  } catch (triggerErr) {
    console.error("💥 [TRANSLATE-JOB] CRITICAL: Failed to save/trigger finalize:", triggerErr);
  }
}

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

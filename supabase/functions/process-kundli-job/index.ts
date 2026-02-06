import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.80.0";
import { fetchSeerKundli, adaptSeerResponse, type SeerKundliRequest } from "../generate-kundli-report/seer-adapter.ts";
import { generatePanchangPrediction } from "../generate-kundli-report/panchang-agent.ts";
import { generatePillarsPrediction } from "../generate-kundli-report/pillars-agent.ts";
import { generateAllPlanetProfiles } from "../generate-kundli-report/planets-agent.ts";
import { generateAllHouseAnalyses } from "../generate-kundli-report/houses-agent.ts";
import { generateCareerPrediction } from "../generate-kundli-report/career-agent.ts";
import { generateMarriagePrediction } from "../generate-kundli-report/marriage-agent.ts";
import { generateDashaPrediction } from "../generate-kundli-report/dasha-agent.ts";
import { generateRahuKetuPrediction } from "../generate-kundli-report/rahu-ketu-agent.ts";
import { generateRemediesPrediction } from "../generate-kundli-report/remedies-agent.ts";
import { generateNumerologyPrediction } from "../generate-kundli-report/numerology-agent.ts";
import { generateSpiritualPrediction } from "../generate-kundli-report/spiritual-agent.ts";
import { generateCharaKarakasPrediction } from "../generate-kundli-report/chara-karakas-agent.ts";
import { generateGlossaryPrediction } from "../generate-kundli-report/glossary-agent.ts";
import { runQAValidation, sanitizeReportContent } from "../generate-kundli-report/qa-agent.ts";
import { calculateCharaKarakas } from "../generate-kundli-report/utils/chara-karakas.ts";
import { calculateAspects, getConjunctions } from "../generate-kundli-report/utils/aspects.ts";
import { getVaar, calculateTithi } from "../generate-kundli-report/utils/panchang.ts";
import { getSignLord } from "../generate-kundli-report/utils/dignity.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    console.log("🔄 [PROCESS-JOB] Starting job:", jobId);

    // Fetch job details
    const { data: job, error: fetchError } = await supabaseAdmin
      .from("kundli_report_jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (fetchError || !job) {
      console.error("❌ [PROCESS-JOB] Job not found:", jobId);
      return new Response(JSON.stringify({ error: "Job not found" }), { status: 404 });
    }

    // Update status to processing
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Initializing", 5);

    const { name, date_of_birth, time_of_birth, place_of_birth, latitude, longitude, timezone, language = "en", gender = "M" } = job;

    // Parse date and time
    const [year, month, day] = date_of_birth.split("-").map(Number);
    const [hour, min] = time_of_birth.split(":").map(Number);
    const birthDate = new Date(year, month - 1, day, hour, min);
    const normalizedGender = gender === "female" || gender === "F" ? "F" : gender === "other" || gender === "O" ? "O" : "M";

    // PHASE 1: Call Seer API (10%)
    console.log("🌐 [PROCESS-JOB] Phase 1: Calling Seer API...");
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Fetching planetary data", 10);

    const seerRequest: SeerKundliRequest = {
      day, month, year, hour, min,
      lat: latitude, lon: longitude, tzone: timezone,
      user_id: 505, name, gender: normalizedGender,
    };

    const { data: seerData } = await fetchSeerKundli(seerRequest);
    const kundli = adaptSeerResponse(seerData);
    console.log("✅ [PROCESS-JOB] Seer API response adapted");

    // Calculate derived data
    const charaKarakas = calculateCharaKarakas(kundli.planets);
    const aspects = calculateAspects(kundli.planets, kundli.asc);
    const conjunctionsMap = getConjunctions(kundli.planets);
    const conjunctions = Array.from(conjunctionsMap.entries()).map(([house, planets]) => ({ house, planets }));

    const moon = kundli.planets.find(p => p.name === "Moon");
    const sun = kundli.planets.find(p => p.name === "Sun");
    const tithiNumber = moon && sun ? calculateTithi(moon.deg, sun.deg) : 1;
    const ascLord = getSignLord(kundli.asc.signIdx);
    const ascLordPlanet = kundli.planets.find(p => p.name === ascLord);

    const errors: string[] = [];
    let totalTokens = 0;

    // PHASE 2: Core predictions (20%)
    console.log("🤖 [PROCESS-JOB] Phase 2: Panchang, Pillars, Numerology...");
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Analyzing Panchang & Numerology", 20);

    const [panchangResult, pillarsResult, numerologyResult] = await Promise.all([
      generatePanchangPrediction({
        birthDate, moonDegree: moon?.deg || 0, sunDegree: sun?.deg || 0,
        vaarIndex: birthDate.getDay(), tithiNumber, karanaName: "Bava", yogaName: "Siddhi",
      }),
      generatePillarsPrediction({
        moonSignIdx: moon?.signIdx || 0, moonDegree: moon?.deg || 0, moonHouse: moon?.house || 1,
        ascSignIdx: kundli.asc.signIdx, ascDegree: kundli.asc.deg,
        ascLordHouse: ascLordPlanet?.house || 1, ascLordSign: ascLordPlanet?.sign || "Aries",
      }),
      generateNumerologyPrediction({ name, dateOfBirth: date_of_birth }),
    ]);

    if (!panchangResult.success) errors.push(`Panchang: ${panchangResult.error}`);
    else totalTokens += panchangResult.tokensUsed || 0;
    if (!pillarsResult.success) errors.push(`Pillars: ${pillarsResult.error}`);
    else totalTokens += pillarsResult.tokensUsed || 0;
    if (!numerologyResult.success) errors.push(`Numerology: ${numerologyResult.error}`);
    else totalTokens += numerologyResult.tokensUsed || 0;

    // PHASE 3: Planet profiles (40%)
    console.log("🤖 [PROCESS-JOB] Phase 3: Planet profiles...");
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Analyzing planetary positions", 40);
    const planetProfiles = await generateAllPlanetProfiles(kundli.planets, kundli.asc);

    // PHASE 4: House analyses (55%)
    console.log("🤖 [PROCESS-JOB] Phase 4: House analyses...");
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Analyzing houses", 55);
    const houseAnalyses = await generateAllHouseAnalyses(kundli.planets, kundli.asc.signIdx);

    // PHASE 5: Life areas (70%)
    console.log("🤖 [PROCESS-JOB] Phase 5: Career, Marriage, Dasha, Rahu-Ketu...");
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Predicting life areas", 70);

    const [careerResult, marriageResult, dashaResult, rahuKetuResult] = await Promise.all([
      generateCareerPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, charaKarakas }),
      generateMarriagePrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, charaKarakas, gender: normalizedGender }),
      generateDashaPrediction({ planets: kundli.planets, moonDegree: moon?.deg || 0, birthDate }),
      generateRahuKetuPrediction({ planets: kundli.planets }),
    ]);

    if (!careerResult.success) errors.push(`Career: ${careerResult.error}`);
    else totalTokens += careerResult.tokensUsed || 0;
    if (!marriageResult.success) errors.push(`Marriage: ${marriageResult.error}`);
    else totalTokens += marriageResult.tokensUsed || 0;
    if (!dashaResult.success) errors.push(`Dasha: ${dashaResult.error}`);
    else totalTokens += dashaResult.tokensUsed || 0;
    if (!rahuKetuResult.success) errors.push(`RahuKetu: ${rahuKetuResult.error}`);
    else totalTokens += rahuKetuResult.tokensUsed || 0;

    // PHASE 6: Remedies & Spiritual (85%)
    console.log("🤖 [PROCESS-JOB] Phase 6: Remedies, Spiritual, Karakas...");
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Generating remedies & spiritual insights", 85);

    const [remediesResult, spiritualResult, charaKarakasResult, glossaryResult] = await Promise.all([
      generateRemediesPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx }),
      generateSpiritualPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx, charaKarakas }),
      generateCharaKarakasPrediction({ planets: kundli.planets, ascSignIdx: kundli.asc.signIdx }),
      generateGlossaryPrediction(),
    ]);

    if (!remediesResult.success) errors.push(`Remedies: ${remediesResult.error}`);
    else totalTokens += remediesResult.tokensUsed || 0;
    if (!spiritualResult.success) errors.push(`Spiritual: ${spiritualResult.error}`);
    else totalTokens += spiritualResult.tokensUsed || 0;
    if (!charaKarakasResult.success) errors.push(`CharaKarakas: ${charaKarakasResult.error}`);
    else totalTokens += charaKarakasResult.tokensUsed || 0;
    if (!glossaryResult.success) errors.push(`Glossary: ${glossaryResult.error}`);
    else totalTokens += glossaryResult.tokensUsed || 0;

    // Assemble report
    let report: Record<string, any> = {
      birthDetails: { name, dateOfBirth: date_of_birth, timeOfBirth: time_of_birth, placeOfBirth: place_of_birth, latitude, longitude, timezone },
      planetaryPositions: kundli.planets.map(p => ({ name: p.name, sign: p.sign, house: p.house, degree: p.deg, isRetro: p.isRetro || false })),
      ascendant: { sign: kundli.asc.sign, degree: kundli.asc.deg },
      charaKarakas, charaKarakasDetailed: charaKarakasResult.data || null,
      aspects, conjunctions,
      panchang: panchangResult.data || null,
      pillars: pillarsResult.data || null,
      planets: planetProfiles,
      houses: houseAnalyses,
      career: careerResult.data || null,
      marriage: marriageResult.data || null,
      dasha: dashaResult.data || null,
      rahuKetu: rahuKetuResult.data || null,
      remedies: remediesResult.data || null,
      numerology: numerologyResult.data || null,
      spiritual: spiritualResult.data || null,
      glossary: glossaryResult.data || null,
      qa: null,
      generatedAt: new Date().toISOString(),
      language,
      errors,
      tokensUsed: totalTokens,
    };

    // PHASE 7: QA Validation (95%)
    console.log("🔍 [PROCESS-JOB] Phase 7: QA validation...");
    await updateJobStatus(supabaseAdmin, jobId, "processing", "Running quality checks", 95);

    const qaResult = await runQAValidation(report);
    if (qaResult.blockedContent.length > 0 || qaResult.issues.some(i => i.severity === "critical")) {
      console.log("🧹 [PROCESS-JOB] Sanitizing report content...");
      report = sanitizeReportContent(report);
    }
    report.qa = qaResult;

    console.log(`✅ [PROCESS-JOB] QA complete. Score: ${qaResult.overallScore}/10`);

    // COMPLETE: Save report (100%)
    await supabaseAdmin
      .from("kundli_report_jobs")
      .update({
        status: "completed",
        current_phase: "Complete",
        progress_percent: 100,
        report_data: report,
        completed_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    console.log(`✅ [PROCESS-JOB] Job ${jobId} completed successfully`);

    return new Response(
      JSON.stringify({ success: true, jobId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ [PROCESS-JOB] Error:", error);
    
    if (jobId) {
      await supabaseAdmin
        .from("kundli_report_jobs")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", jobId);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateJobStatus(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  status: string,
  phase: string,
  progress: number
) {
  await supabase
    .from("kundli_report_jobs")
    .update({
      status,
      current_phase: phase,
      progress_percent: progress,
    })
    .eq("id", jobId);
}

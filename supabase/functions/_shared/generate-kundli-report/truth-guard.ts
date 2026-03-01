// Truth Guard - Deterministic post-processing to enforce astrological correctness
// Overwrites any AI-generated values that contradict the computed chart data

import type { SeerKundli } from "./seer-adapter.ts";
import { getAgentLanguage } from "./agent-base.ts";

interface TruthGuardInput {
  report: Record<string, unknown>;
  kundli: SeerKundli;
  birthDate: Date;
  generatedAt: Date;
  strict?: boolean;
}

interface TruthGuardResult {
  report: Record<string, unknown>;
  issues: string[];
  corrections: number;
}

const SATURN_TRANSIT_FALLBACK_SIGN = "Pisces";
const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

function normalizePhaseLabel(phase: string): string {
  const lang = getAgentLanguage();
  if (lang === "hi") {
    if (phase === "rising") return "उदय चरण (चंद्र से 12वां)";
    if (phase === "peak") return "शिखर चरण (चंद्र पर)";
    if (phase === "setting") return "अस्त चरण (चंद्र से 2रा)";
    return "सक्रिय नहीं";
  }
  if (lang === "te") {
    if (phase === "rising") return "ఉదయ దశ (చంద్రుడి నుండి 12వ)";
    if (phase === "peak") return "శిఖర దశ (చంద్రుడిపై)";
    if (phase === "setting") return "అస్తమయ దశ (చంద్రుడి నుండి 2వ)";
    return "క్రియాశీలం కాదు";
  }
  if (phase === "rising") return "Rising Phase (12th from Moon)";
  if (phase === "peak") return "Peak Phase (Over Moon)";
  if (phase === "setting") return "Setting Phase (2nd from Moon)";
  return "Not Active";
}

function deriveSadeSatiTruth(report: Record<string, unknown>, kundli: SeerKundli) {
  const sade = (report.sadeSati as Record<string, unknown>) || {};
  const moonFromChart = kundli.planets.find((p: any) => p.name === "Moon")?.sign || "N/A";
  const moonSign = String(sade.moonSign || moonFromChart || "N/A");
  const saturnSign = String(sade.saturnSign || SATURN_TRANSIT_FALLBACK_SIGN);
  const moonIdx = SIGNS.indexOf(moonSign);
  const saturnIdx = SIGNS.indexOf(saturnSign);
  const relative = (moonIdx >= 0 && saturnIdx >= 0) ? ((saturnIdx - moonIdx + 12) % 12) : -1;
  const phase = relative === 11 ? "rising" : relative === 0 ? "peak" : relative === 1 ? "setting" : "not_active";
  return {
    moonSign,
    saturnSign,
    phase,
    isActive: phase !== "not_active",
    currentPhase: normalizePhaseLabel(phase),
  };
}

function isSadeSatiDoshaName(name: unknown, nameHindi?: unknown): boolean {
  const full = `${String(name || "")} ${String(nameHindi || "")}`.toLowerCase();
  return full.includes("sade sati") || (full.includes("shani") && full.includes("sati"));
}

export function enforceAstrologyTruth(input: TruthGuardInput): TruthGuardResult {
  const { report, kundli, birthDate, generatedAt, strict = false } = input;
  const issues: string[] = [];
  let corrections = 0;

  // 1. Verify planetary positions in report match kundli data
  const positions = report.planetaryPositions as Array<{ name: string; sign: string; house: number; degree: number }> | undefined;
  if (positions && Array.isArray(positions)) {
    for (const pos of positions) {
      const actual = kundli.planets.find((p: any) => p.name === pos.name);
      if (actual && pos.sign !== actual.sign) {
        issues.push(`${pos.name} sign mismatch: report says ${pos.sign}, chart says ${actual.sign}`);
        pos.sign = actual.sign;
        corrections++;
      }
      if (actual && pos.house !== actual.house) {
        issues.push(`${pos.name} house mismatch: report says H${pos.house}, chart says H${actual.house}`);
        pos.house = actual.house;
        corrections++;
      }
    }
  }

  // 2. Verify ascendant
  const ascendant = report.ascendant as { sign: string; degree: number } | undefined;
  if (ascendant && ascendant.sign !== kundli.asc.sign) {
    issues.push(`Ascendant sign mismatch: report says ${ascendant.sign}, chart says ${kundli.asc.sign}`);
    ascendant.sign = kundli.asc.sign;
    corrections++;
  }

  // 3. Canonicalize Sade Sati status and remove duplicate Sade Sati dosha cards.
  const sade = report.sadeSati as Record<string, unknown> | undefined;
  if (sade && typeof sade === "object") {
    const truth = deriveSadeSatiTruth(report, kundli);
    if (sade.moonSign !== truth.moonSign) {
      sade.moonSign = truth.moonSign;
      corrections++;
    }
    if (sade.saturnSign !== truth.saturnSign) {
      sade.saturnSign = truth.saturnSign;
      corrections++;
    }
    if (sade.phase !== truth.phase) {
      sade.phase = truth.phase;
      corrections++;
    }
    if (sade.isActive !== truth.isActive) {
      sade.isActive = truth.isActive;
      corrections++;
    }
    if (sade.isCurrentlyActive !== truth.isActive) {
      sade.isCurrentlyActive = truth.isActive;
      corrections++;
    }
    if (sade.currentPhase !== truth.currentPhase) {
      sade.currentPhase = truth.currentPhase;
      corrections++;
    }
  }

  const doshas = report.doshas as Record<string, unknown> | undefined;
  if (doshas && typeof doshas === "object") {
    const major = Array.isArray(doshas.majorDoshas) ? (doshas.majorDoshas as Array<Record<string, unknown>>) : [];
    const minor = Array.isArray(doshas.minorDoshas) ? (doshas.minorDoshas as Array<Record<string, unknown>>) : [];
    const remedies = Array.isArray(doshas.doshaRemedies) ? (doshas.doshaRemedies as Array<Record<string, unknown>>) : [];

    const filteredMajor = major.filter((d) => !isSadeSatiDoshaName(d.name, d.nameHindi));
    const filteredMinor = minor.filter((d) => !isSadeSatiDoshaName(d.name, d.nameHindi));
    const filteredRemedies = remedies.filter((r) => !isSadeSatiDoshaName(r.doshaName));
    const removed = (major.length - filteredMajor.length) + (minor.length - filteredMinor.length);

    if (removed > 0 || remedies.length !== filteredRemedies.length) {
      doshas.majorDoshas = filteredMajor;
      doshas.minorDoshas = filteredMinor;
      doshas.doshaRemedies = filteredRemedies;
      const detected = [...filteredMajor, ...filteredMinor].filter((d: any) => {
        const status = String(d?.status || "").toLowerCase();
        return Boolean(d?.isPresent) || status === "present" || status === "partial" || status === "nullified";
      }).length;
      doshas.totalDoshasDetected = detected;
      issues.push("Removed Sade Sati from Dosha cards to prevent contradiction with dedicated Sade Sati section.");
      corrections += Math.max(1, removed);
    }
  }

  return { report, issues, corrections };
}

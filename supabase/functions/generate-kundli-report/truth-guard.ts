// Truth Guard - Deterministic post-processing to enforce astrological correctness
// Overwrites any AI-generated values that contradict the computed chart data

import type { SeerKundli } from "./seer-adapter.ts";

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

  return { report, issues, corrections };
}

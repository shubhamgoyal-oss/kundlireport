// Sade Sati Agent - Analyzes Saturn's transit over Moon sign

import { callAgent, getAgentLanguage, type AgentResponse } from "./agent-base.ts";
import type { SeerPlanet } from "./seer-adapter.ts";
import { signName, tmpl } from "./lang-utils.ts";

type SadeSatiPhase = "rising" | "peak" | "setting" | "not_active";

interface SadeSatiPhaseWindow {
  phaseName: string;
  saturnSign: string;
  startMonth: string;
  startYear: number;
  endMonth: string;
  endYear: number;
  periodLabel: string;
  description: string;
  challenges: string[];
  hidden_blessings: string[];
  advice: string;
}

export interface SadeSatiPrediction {
  // Core deterministic fields
  isActive: boolean;
  phase: SadeSatiPhase;
  saturnSign: string;
  moonSign: string;
  startYear: number | null;
  endYear: number | null;
  currentPhaseDescription: string;
  effects: string[];
  remedies: string[];
  historicalCycles: Array<{ startYear: number; endYear: number; phase: string }>;
  overallGuidance: string;

  // Rich PDF fields
  overview: string;
  importanceExplanation: string;
  moonSignHindi: string;
  isCurrentlyActive: boolean;
  currentPhase: string;
  currentPhaseInterpretation: string;
  moonSaturnRelationship: string;
  phases: SadeSatiPhaseWindow[];
  currentSadeSati: {
    period: string;
    overallTheme: string;
    phase1: string;
    phase2: string;
    phase3: string;
    whatToExpect: string[];
    opportunities: string[];
    whatNotToDo: string[];
    advice: string;
  } | null;
  pastSadeSati: {
    period: string;
    keyLessons: string;
    lifeEvents: string;
  } | null;
  nextSadeSati: {
    period: string;
    approximateStart: string;
    preparationAdvice: string;
  } | null;
  spiritualSignificance: string;
  mantras: Array<{ mantra: string; purpose: string; timing: string }>;
  famousPeopleThrivedDuringSadeSati: string;
}

interface SadeSatiInput {
  planets: SeerPlanet[];
  birthYear: number;
}

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

// SIGN_HINDI/SIGN_TELUGU deleted — now use signName() from lang-utils.ts
// (Note: SIGN_HINDI previously used romanized names like "Mesha" which was a bug;
//  the language pack has proper Devanagari "मेष" which is correct.)

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Must stay aligned with calculate-dosha*/algorithmic-doshas.ts
const CURRENT_SATURN_SIGN = "Pisces";

function isWeakNarrative(text: string | undefined, minLength = 120): boolean {
  const t = String(text || "").trim();
  const lang = getAgentLanguage();
  const effectiveMin = lang === "en" ? minLength : Math.floor(minLength * 0.4);
  if (t.length < effectiveMin) return true;
  if (lang !== "en") return false;
  const genericPatterns = [
    /meaningful shift in priorities/i,
    /structured action/i,
    /disciplined follow-through/i,
    /realistic expectations/i,
    /sequence and timing/i,
  ];
  return genericPatterns.some((rx) => rx.test(t));
}

function signAtOffset(sign: string, offset: number): string {
  const idx = SIGNS.indexOf(sign);
  if (idx === -1) return "N/A";
  const target = (idx + offset + 12) % 12;
  return SIGNS[target];
}

function computePhase(moonSign: string, saturnSign: string): SadeSatiPhase {
  const moonIdx = SIGNS.indexOf(moonSign);
  const saturnIdx = SIGNS.indexOf(saturnSign);
  if (moonIdx === -1 || saturnIdx === -1) return "not_active";
  const rel = (saturnIdx - moonIdx + 12) % 12;
  if (rel === 11) return "rising";
  if (rel === 0) return "peak";
  if (rel === 1) return "setting";
  return "not_active";
}

function phaseLabel(phase: SadeSatiPhase): string {
  if (phase === "rising") return tmpl("sadeSati.phaseLabel.rising");
  if (phase === "peak") return tmpl("sadeSati.phaseLabel.peak");
  if (phase === "setting") return tmpl("sadeSati.phaseLabel.setting");
  return tmpl("sadeSati.phaseLabel.notActive");
}

function phaseDescription(phase: SadeSatiPhase): string {
  if (phase === "rising") return tmpl("sadeSati.phaseDesc.rising");
  if (phase === "peak") return tmpl("sadeSati.phaseDesc.peak");
  if (phase === "setting") return tmpl("sadeSati.phaseDesc.setting");
  return tmpl("sadeSati.phaseDesc.notActive");
}

function buildPhaseYears(phase: SadeSatiPhase, currentYear: number): { start: number | null; end: number | null } {
  if (phase === "rising") return { start: currentYear, end: currentYear + 8 };
  if (phase === "peak") return { start: currentYear - 2, end: currentYear + 5 };
  if (phase === "setting") return { start: currentYear - 5, end: currentYear + 2 };
  return { start: null, end: null };
}

function estimateNextStartYear(moonSign: string, saturnSign: string, currentYear: number): number | null {
  const moonIdx = SIGNS.indexOf(moonSign);
  const saturnIdx = SIGNS.indexOf(saturnSign);
  if (moonIdx === -1 || saturnIdx === -1) return null;
  const risingIdx = (moonIdx + 11) % 12;
  const signDistance = (risingIdx - saturnIdx + 12) % 12;
  const years = signDistance * 2.5;
  return currentYear + Math.round(years);
}

function addMonths(year: number, monthIndex: number, delta: number): { year: number; monthIndex: number } {
  const total = year * 12 + monthIndex + delta;
  const y = Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  return { year: y, monthIndex: m };
}

function normalizeSadeSatiPrediction(
  raw: Partial<SadeSatiPrediction>,
  planets: SeerPlanet[],
): SadeSatiPrediction {
  const moon = planets.find((p) => p.name === "Moon");
  const saturn = planets.find((p) => p.name === "Saturn");
  const currentYear = new Date().getFullYear();
  const lang = getAgentLanguage();

  const moonSign = raw.moonSign || moon?.sign || "N/A";
  const saturnSign = CURRENT_SATURN_SIGN || raw.saturnSign || saturn?.sign || "N/A";
  const deterministicPhase = computePhase(moonSign, saturnSign);
  const phase: SadeSatiPhase = raw.phase && ["rising", "peak", "setting", "not_active"].includes(raw.phase)
    ? raw.phase
    : deterministicPhase;
  const isActive = phase !== "not_active";
  const years = buildPhaseYears(phase, currentYear);
  const startYear = Number.isFinite(raw.startYear as number) ? (raw.startYear as number) : years.start;
  const endYear = Number.isFinite(raw.endYear as number) ? (raw.endYear as number) : years.end;
  const moonLocalName = lang === "en" ? "" : signName(moonSign);

  const currentPeriod = startYear && endYear ? `${startYear} - ${endYear}` : tmpl("sadeSati.transitWindowFallback");
  const nextStartYear = estimateNextStartYear(moonSign, saturnSign, currentYear);
  const nextPeriod = nextStartYear ? `${nextStartYear} - ${nextStartYear + 8}` : tmpl("sadeSati.nextPeriodFallback");

  const phaseAnchorYear = isActive ? (startYear ?? currentYear) : (nextStartYear ?? (currentYear + 1));
  const phaseAnchorMonth = 2; // March (approximate Saturn ingress anchor)
  const phase0Start = addMonths(phaseAnchorYear, phaseAnchorMonth, 0);
  const phase0End = addMonths(phaseAnchorYear, phaseAnchorMonth, 29);
  const phase1Start = addMonths(phaseAnchorYear, phaseAnchorMonth, 30);
  const phase1End = addMonths(phaseAnchorYear, phaseAnchorMonth, 59);
  const phase2Start = addMonths(phaseAnchorYear, phaseAnchorMonth, 60);
  const phase2End = addMonths(phaseAnchorYear, phaseAnchorMonth, 89);

  const phaseWindows: SadeSatiPhaseWindow[] = [
    {
      phaseName: tmpl("sadeSati.window.rising.name"),
      saturnSign: signAtOffset(moonSign, -1),
      startMonth: MONTH_NAMES[phase0Start.monthIndex],
      startYear: phase0Start.year,
      endMonth: MONTH_NAMES[phase0End.monthIndex],
      endYear: phase0End.year,
      periodLabel: `${MONTH_NAMES[phase0Start.monthIndex]} ${phase0Start.year} to ${MONTH_NAMES[phase0End.monthIndex]} ${phase0End.year}`,
      description: tmpl("sadeSati.window.rising.desc"),
      challenges: [
        tmpl("sadeSati.window.rising.challenge0"),
        tmpl("sadeSati.window.rising.challenge1"),
        tmpl("sadeSati.window.rising.challenge2"),
      ],
      hidden_blessings: [
        tmpl("sadeSati.window.rising.blessing0"),
        tmpl("sadeSati.window.rising.blessing1"),
        tmpl("sadeSati.window.rising.blessing2"),
      ],
      advice: tmpl("sadeSati.window.rising.advice"),
    },
    {
      phaseName: tmpl("sadeSati.window.peak.name"),
      saturnSign: moonSign,
      startMonth: MONTH_NAMES[phase1Start.monthIndex],
      startYear: phase1Start.year,
      endMonth: MONTH_NAMES[phase1End.monthIndex],
      endYear: phase1End.year,
      periodLabel: `${MONTH_NAMES[phase1Start.monthIndex]} ${phase1Start.year} to ${MONTH_NAMES[phase1End.monthIndex]} ${phase1End.year}`,
      description: tmpl("sadeSati.window.peak.desc"),
      challenges: [
        tmpl("sadeSati.window.peak.challenge0"),
        tmpl("sadeSati.window.peak.challenge1"),
        tmpl("sadeSati.window.peak.challenge2"),
      ],
      hidden_blessings: [
        tmpl("sadeSati.window.peak.blessing0"),
        tmpl("sadeSati.window.peak.blessing1"),
        tmpl("sadeSati.window.peak.blessing2"),
      ],
      advice: tmpl("sadeSati.window.peak.advice"),
    },
    {
      phaseName: tmpl("sadeSati.window.setting.name"),
      saturnSign: signAtOffset(moonSign, 1),
      startMonth: MONTH_NAMES[phase2Start.monthIndex],
      startYear: phase2Start.year,
      endMonth: MONTH_NAMES[phase2End.monthIndex],
      endYear: phase2End.year,
      periodLabel: `${MONTH_NAMES[phase2Start.monthIndex]} ${phase2Start.year} to ${MONTH_NAMES[phase2End.monthIndex]} ${phase2End.year}`,
      description: tmpl("sadeSati.window.setting.desc"),
      challenges: [
        tmpl("sadeSati.window.setting.challenge0"),
        tmpl("sadeSati.window.setting.challenge1"),
        tmpl("sadeSati.window.setting.challenge2"),
      ],
      hidden_blessings: [
        tmpl("sadeSati.window.setting.blessing0"),
        tmpl("sadeSati.window.setting.blessing1"),
        tmpl("sadeSati.window.setting.blessing2"),
      ],
      advice: tmpl("sadeSati.window.setting.advice"),
    },
  ];

  const effects = (raw.effects || []).map((x) => String(x).trim()).filter(Boolean);
  const remedies = (raw.remedies || []).map((x) => String(x).trim()).filter(Boolean);
  const historicalCycles = Array.isArray(raw.historicalCycles) ? raw.historicalCycles : [];
  const currentPhaseInterpretation = !isWeakNarrative(raw.currentPhaseDescription, 90)
    ? String(raw.currentPhaseDescription)
    : phaseDescription(phase);

  const activeStatus = isActive ? phaseLabel(phase) : tmpl("sadeSati.phaseLabel.notActive");
  const overview = !isWeakNarrative(raw.overview, 180)
    ? String(raw.overview)
    : tmpl("sadeSati.overview", { moonSign, saturnSign, activeStatus });

  const importanceExplanation = !isWeakNarrative(raw.importanceExplanation, 130)
    ? String(raw.importanceExplanation)
    : tmpl("sadeSati.importanceExplanation");

  const houseWord = lang === "hi" ? "भाव" : lang === "te" ? "భావం" : "House";
  const moonHouseClause = moon?.house ? ` (${houseWord} ${moon.house})` : "";
  const moonSaturnRelationship = !isWeakNarrative(raw.moonSaturnRelationship, 110)
    ? String(raw.moonSaturnRelationship)
    : tmpl("sadeSati.moonSaturnRelationship", { moonSign, moonHouseClause, saturnSign });

  const overallGuidance = !isWeakNarrative(raw.overallGuidance, 100)
    ? String(raw.overallGuidance)
    : tmpl("sadeSati.overallGuidance");

  const stableRemedies = remedies.length > 0
    ? remedies
    : isActive
      ? [
          tmpl("sadeSati.remedy.active.0"),
          tmpl("sadeSati.remedy.active.1"),
          tmpl("sadeSati.remedy.active.2"),
        ]
      : [
          tmpl("sadeSati.remedy.inactive.0"),
          tmpl("sadeSati.remedy.inactive.1"),
          tmpl("sadeSati.remedy.inactive.2"),
        ];

  const historical = historicalCycles.length > 0
    ? historicalCycles
    : [
        { startYear: currentYear - 30, endYear: currentYear - 22, phase: "previous_cycle" },
      ];

  const currentSadeSati = isActive
    ? {
        period: currentPeriod,
        overallTheme: overview,
        phase1: phaseWindows[0].description,
        phase2: phaseWindows[1].description,
        phase3: phaseWindows[2].description,
        whatToExpect: effects.length >= 3
          ? effects
          : [
              tmpl("sadeSati.current.whatToExpect.0"),
              tmpl("sadeSati.current.whatToExpect.1"),
              tmpl("sadeSati.current.whatToExpect.2"),
            ],
        opportunities: [
          tmpl("sadeSati.current.opportunities.0"),
          tmpl("sadeSati.current.opportunities.1"),
          tmpl("sadeSati.current.opportunities.2"),
        ],
        whatNotToDo: [
          tmpl("sadeSati.current.whatNotToDo.0"),
          tmpl("sadeSati.current.whatNotToDo.1"),
          tmpl("sadeSati.current.whatNotToDo.2"),
        ],
        advice: overallGuidance,
      }
    : null;

  const pastCycle = historical[historical.length - 1];
  const pastSadeSati = !isActive && pastCycle
    ? {
        period: `${pastCycle.startYear} - ${pastCycle.endYear}`,
        keyLessons: tmpl("sadeSati.past.keyLessons"),
        lifeEvents: tmpl("sadeSati.past.lifeEvents"),
      }
    : null;

  const nextSadeSati = !isActive
    ? {
        period: nextPeriod,
        approximateStart: nextStartYear ? `${nextStartYear}` : tmpl("sadeSati.next.approximateStartFallback"),
        preparationAdvice: tmpl("sadeSati.next.preparationAdvice"),
      }
    : null;

  return {
    isActive,
    phase,
    saturnSign,
    moonSign,
    startYear,
    endYear,
    currentPhaseDescription: currentPhaseInterpretation,
    effects: effects.length > 0 ? effects : [
      tmpl("sadeSati.effect.0"),
      tmpl("sadeSati.effect.1"),
      tmpl("sadeSati.effect.2"),
    ],
    remedies: stableRemedies,
    historicalCycles: historical,
    overallGuidance,
    overview,
    importanceExplanation,
    moonSignHindi: moonLocalName,
    isCurrentlyActive: isActive,
    currentPhase: phaseLabel(phase),
    currentPhaseInterpretation,
    moonSaturnRelationship,
    phases: phaseWindows,
    currentSadeSati,
    pastSadeSati,
    nextSadeSati,
    spiritualSignificance: !isWeakNarrative(raw.spiritualSignificance, 100)
      ? String(raw.spiritualSignificance)
      : tmpl("sadeSati.spiritualSignificance"),
    mantras: Array.isArray(raw.mantras) && raw.mantras.length > 0
      ? raw.mantras
      : [
          {
            mantra: "ॐ शं शनैश्चराय नमः",
            purpose: tmpl("sadeSati.mantra.shani.purpose"),
            timing: tmpl("sadeSati.mantra.shani.timing"),
          },
          {
            mantra: "नीलांजन समाभासं रवि पुत्रं यमाग्रजम्",
            purpose: tmpl("sadeSati.mantra.neelanjana.purpose"),
            timing: tmpl("sadeSati.mantra.neelanjana.timing"),
          },
        ],
    famousPeopleThrivedDuringSadeSati: raw.famousPeopleThrivedDuringSadeSati
      || tmpl("sadeSati.famousPeople"),
  };
}

export async function generateSadeSatiPrediction(input: SadeSatiInput): Promise<AgentResponse<SadeSatiPrediction>> {
  const { planets, birthYear } = input;

  const saturn = planets.find((p) => p.name === "Saturn");
  const moon = planets.find((p) => p.name === "Moon");
  const moonSign = moon?.sign || "N/A";
  const transitSaturnSign = CURRENT_SATURN_SIGN;
  const deterministicPhase = computePhase(moonSign, transitSaturnSign);

  const userPrompt = `Analyze Sade Sati for this native using transit logic:
- Natal Moon: ${moon?.sign} (House ${moon?.house}, ${moon?.deg?.toFixed(1)}°)
- Natal Saturn: ${saturn?.sign} (House ${saturn?.house}, ${saturn?.deg?.toFixed(1)}°)
- Current transit Saturn sign (sidereal): ${transitSaturnSign}
- Deterministic transit phase from Moon relation: ${phaseLabel(deterministicPhase)}
- Birth Year: ${birthYear}

Generate detailed, chart-aware Sade Sati analysis. Do not return one-liners. Every major narrative field must be paragraph-style and specific.`;

  const toolSchema = {
    type: "object",
    properties: {
      phase: { type: "string", enum: ["rising", "peak", "setting", "not_active"] },
      currentPhaseDescription: { type: "string", minLength: 90 },
      effects: { type: "array", items: { type: "string" } },
      remedies: { type: "array", items: { type: "string" } },
      overallGuidance: { type: "string", minLength: 100 },
      overview: { type: "string", minLength: 180 },
      importanceExplanation: { type: "string", minLength: 130 },
      moonSaturnRelationship: { type: "string", minLength: 100 },
      spiritualSignificance: { type: "string", minLength: 100 }
    },
    required: [
      "phase",
      "currentPhaseDescription",
      "effects",
      "remedies",
      "overallGuidance",
      "overview",
      "importanceExplanation",
      "moonSaturnRelationship",
      "spiritualSignificance",
    ],
    additionalProperties: true,
  };

  const aiResult = await callAgent<Partial<SadeSatiPrediction>>(
    "You are an expert Vedic astrologer specializing in Sade Sati analysis.",
    userPrompt,
    "generate_sade_sati_prediction",
    "Generate Sade Sati analysis",
    toolSchema,
  );

  if (!aiResult.success || !aiResult.data) {
    const fallback = normalizeSadeSatiPrediction(
      { phase: deterministicPhase, currentPhaseDescription: phaseDescription(deterministicPhase) },
      planets,
    );
    return { success: true, data: fallback, tokensUsed: aiResult.tokensUsed };
  }

  const normalized = normalizeSadeSatiPrediction(
    {
      ...aiResult.data,
      phase: deterministicPhase,
      saturnSign: transitSaturnSign,
      moonSign,
    },
    planets,
  );

  return { ...aiResult, data: normalized };
}

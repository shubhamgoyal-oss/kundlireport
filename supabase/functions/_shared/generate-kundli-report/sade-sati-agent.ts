// Sade Sati Agent - Analyzes Saturn's transit over Moon sign

import { callAgent, type AgentResponse } from "./agent-base.ts";
import type { SeerPlanet } from "./seer-adapter.ts";

type SadeSatiPhase = "rising" | "peak" | "setting" | "not_active";

interface SadeSatiPhaseWindow {
  phaseName: string;
  saturnSign: string;
  startYear: number;
  endYear: number;
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

const SIGN_HINDI: Record<string, string> = {
  Aries: "Mesha",
  Taurus: "Vrishabha",
  Gemini: "Mithuna",
  Cancer: "Karka",
  Leo: "Simha",
  Virgo: "Kanya",
  Libra: "Tula",
  Scorpio: "Vrischika",
  Sagittarius: "Dhanu",
  Capricorn: "Makara",
  Aquarius: "Kumbha",
  Pisces: "Meena",
};

// Must stay aligned with calculate-dosha*/algorithmic-doshas.ts
const CURRENT_SATURN_SIGN = "Pisces";

function isWeakNarrative(text: string | undefined, minLength = 120): boolean {
  const t = String(text || "").trim();
  if (t.length < minLength) return true;
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
  if (phase === "rising") return "Rising Phase (Udaya Charan)";
  if (phase === "peak") return "Peak Phase (Shikhar Charan)";
  if (phase === "setting") return "Setting Phase (Ast Charan)";
  return "Not Active";
}

function phaseDescription(phase: SadeSatiPhase): string {
  if (phase === "rising") {
    return "Saturn is in the sign before your Moon sign. Responsibilities increase and restructuring starts gradually.";
  }
  if (phase === "peak") {
    return "Saturn is transiting your Moon sign. Emotional pressure is highest and discipline must become non-negotiable.";
  }
  if (phase === "setting") {
    return "Saturn has moved to the sign after your Moon sign. Results mature, pending lessons close, and stability returns.";
  }
  return "Saturn is not currently transiting the 12th, 1st, or 2nd sign from your natal Moon.";
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

function normalizeSadeSatiPrediction(
  raw: Partial<SadeSatiPrediction>,
  planets: SeerPlanet[],
): SadeSatiPrediction {
  const moon = planets.find((p) => p.name === "Moon");
  const saturn = planets.find((p) => p.name === "Saturn");
  const currentYear = new Date().getFullYear();

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
  const moonHindi = SIGN_HINDI[moonSign] || "";

  const currentPeriod = startYear && endYear ? `${startYear} - ${endYear}` : "Transit window based on current Saturn cycle";
  const nextStartYear = estimateNextStartYear(moonSign, saturnSign, currentYear);
  const nextPeriod = nextStartYear ? `${nextStartYear} - ${nextStartYear + 8}` : "To be determined by future Saturn transits";

  const phaseStart = startYear ?? currentYear;
  const phaseWindows: SadeSatiPhaseWindow[] = [
    {
      phaseName: "Rising Phase (12th from Moon)",
      saturnSign: signAtOffset(moonSign, -1),
      startYear: phaseStart,
      endYear: phaseStart + 2,
      description: "Pressure builds through expenses, relocations, and mindset restructuring. This phase asks for discipline before visible gains.",
      challenges: [
        "Rising expenses and responsibility load",
        "Emotional restlessness and sleep disruption",
        "Need to reduce avoidable commitments",
      ],
      hidden_blessings: [
        "Early correction of weak routines",
        "Long-term financial discipline",
        "Clearer boundary-setting in relationships",
      ],
      advice: "Cut non-essential obligations, protect daily rhythm, and build reserves.",
    },
    {
      phaseName: "Peak Phase (Over Moon)",
      saturnSign: moonSign,
      startYear: phaseStart + 2,
      endYear: phaseStart + 5,
      description: "This is the most psychologically intense phase. Saturn tests emotional maturity, accountability, and resilience.",
      challenges: [
        "Higher emotional pressure and self-doubt spikes",
        "Delays in expected outcomes",
        "Relationship strain if communication is reactive",
      ],
      hidden_blessings: [
        "Deep emotional maturity",
        "Enduring career foundations",
        "Stronger judgment under pressure",
      ],
      advice: "Prioritize consistency over speed, avoid impulsive decisions, and maintain sober expectations.",
    },
    {
      phaseName: "Setting Phase (2nd from Moon)",
      saturnSign: signAtOffset(moonSign, 1),
      startYear: phaseStart + 5,
      endYear: phaseStart + 8,
      description: "Closure and consolidation phase. Earlier effort starts converting into durable results and karmic lessons settle.",
      challenges: [
        "Family/finance restructuring decisions",
        "Fatigue from prolonged pressure cycle",
        "Need to close unresolved obligations",
      ],
      hidden_blessings: [
        "Financial stabilization",
        "Improved practical judgment",
        "Release from unproductive patterns",
      ],
      advice: "Consolidate assets, complete pending commitments, and protect long-term harmony.",
    },
  ];

  const effects = (raw.effects || []).map((x) => String(x).trim()).filter(Boolean);
  const remedies = (raw.remedies || []).map((x) => String(x).trim()).filter(Boolean);
  const historicalCycles = Array.isArray(raw.historicalCycles) ? raw.historicalCycles : [];
  const currentPhaseInterpretation = !isWeakNarrative(raw.currentPhaseDescription, 90)
    ? String(raw.currentPhaseDescription)
    : phaseDescription(phase);

  const overview = !isWeakNarrative(raw.overview, 180)
    ? String(raw.overview)
    : `Sade Sati is assessed by Saturn's transit relative to your natal Moon sign (${moonSign}). With current transit Saturn taken as ${saturnSign}, your present status is ${isActive ? `${phaseLabel(phase)} and active` : "not active"}. This period is not a punishment cycle; it is a long-form karmic restructuring phase that rewards discipline, realism, and consistent execution. Outcomes during this cycle usually come through patience, simplified priorities, and sustained effort rather than sudden luck.`;

  const importanceExplanation = !isWeakNarrative(raw.importanceExplanation, 130)
    ? String(raw.importanceExplanation)
    : "Sade Sati is important because it directly tests emotional stability (Moon) under Saturn's pressure. In practical terms, it can alter decision quality, risk tolerance, family dynamics, and financial behavior. The right approach is structured habits, fact-based planning, and emotional regulation. The stronger your discipline, the more constructive Saturn's results become.";

  const moonSaturnRelationship = !isWeakNarrative(raw.moonSaturnRelationship, 110)
    ? String(raw.moonSaturnRelationship)
    : `Your natal Moon is in ${moonSign}${moon?.house ? ` (House ${moon.house})` : ""}, while transit Saturn is considered in ${saturnSign}. This Moon-Saturn relationship determines the phase intensity and the life domains where pressure is felt first. Emotionally, this combination demands maturity and pacing. Practically, the focus should be on consistent effort, realistic timelines, and low-reactivity decision making.`;

  const overallGuidance = !isWeakNarrative(raw.overallGuidance, 100)
    ? String(raw.overallGuidance)
    : "Treat this cycle as a long-term discipline chapter: simplify commitments, preserve financial buffers, and execute priorities in sequence. Saturn rewards structure, integrity, and consistency.";

  const stableRemedies = remedies.length > 0
    ? remedies
    : isActive
      ? [
          "Maintain strict Saturday discipline: complete pending tasks and avoid avoidable conflicts.",
          "Offer sesame oil deepam or Shani prayer on Saturdays with consistency.",
          "Support service-oriented charity (especially for laborers/elderly) to balance Saturn karma.",
        ]
      : [
          "Since Sade Sati is not active, intensive Shani remedies are not mandatory.",
          "Maintain financial discipline and routine stability to stay prepared for future Saturn cycles.",
          "Keep weekly grounding practices (prayer/meditation/service) for long-term resilience.",
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
              "Progress through disciplined, staged execution rather than sudden jumps.",
              "Higher accountability in family, career, and financial choices.",
              "Need for emotional regulation in sensitive conversations.",
            ],
        opportunities: [
          "Build durable systems and repeatable routines.",
          "Improve long-term money discipline and risk filtering.",
          "Mature leadership through patience and consistency.",
        ],
        whatNotToDo: [
          "Do not force outcomes through impulsive decisions.",
          "Avoid over-commitment without execution bandwidth.",
          "Do not ignore sleep, recovery, and mental steadiness.",
        ],
        advice: overallGuidance,
      }
    : null;

  const pastCycle = historical[historical.length - 1];
  const pastSadeSati = !isActive && pastCycle
    ? {
        period: `${pastCycle.startYear} - ${pastCycle.endYear}`,
        keyLessons: "Previous Saturn cycles usually teach patience, accountability, and realistic planning. Repeating patterns from that period are often the key preparation for your next cycle.",
        lifeEvents: "Revisit the years of your previous cycle to identify themes in responsibility, finances, family duties, and emotional resilience; those patterns are your practical Saturn handbook.",
      }
    : null;

  const nextSadeSati = !isActive
    ? {
        period: nextPeriod,
        approximateStart: nextStartYear ? `${nextStartYear}` : "To be determined",
        preparationAdvice: "Prepare 1-2 years before the next cycle: tighten finances, reduce avoidable liabilities, and build a stable routine so Saturn pressure converts into measurable progress.",
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
      "This period emphasizes responsibility, pacing, and emotional maturity.",
      "Progress requires consistency and structured planning.",
      "Long-term stability improves when impulsive decisions are avoided.",
    ],
    remedies: stableRemedies,
    historicalCycles: historical,
    overallGuidance,
    overview,
    importanceExplanation,
    moonSignHindi: moonHindi,
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
      : "Spiritually, Sade Sati reduces ego-reactivity and strengthens inner steadiness. It rewards humility, service, disciplined habits, and truth-based living. The deeper gift is not comfort; it is character.",
    mantras: Array.isArray(raw.mantras) && raw.mantras.length > 0
      ? raw.mantras
      : [
          {
            mantra: "Om Sham Shanicharaya Namah",
            purpose: "Stabilize Saturn-related pressure and improve disciplined focus.",
            timing: "Saturdays, preferably during sunrise or sunset with steady repetition.",
          },
          {
            mantra: "Nilanjana Samabhasam Ravi Putram Yamagrajam",
            purpose: "Traditional Shani stotra for patience, endurance, and karmic balance.",
            timing: "Saturdays after bath, 11/21 repetitions with calm breath.",
          },
        ],
    famousPeopleThrivedDuringSadeSati: raw.famousPeopleThrivedDuringSadeSati
      || "Many high achievers report that their major discipline, leadership, and legacy-building years happened during Saturn pressure cycles because long-term structure was forced into place.",
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

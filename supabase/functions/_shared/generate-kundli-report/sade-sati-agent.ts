// Sade Sati Agent - Analyzes Saturn's transit over Moon sign

import { callAgent, getAgentLanguage, type AgentResponse } from "./agent-base.ts";
import type { SeerPlanet } from "./seer-adapter.ts";

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

/** Language-aware text helper — returns Hindi when agent language is "hi", else English */
function t(en: string, hi: string): string {
  return getAgentLanguage() === "hi" ? hi : en;
}

function phaseLabel(phase: SadeSatiPhase): string {
  if (phase === "rising") return t("Rising Phase (Udaya Charan)", "उदय चरण");
  if (phase === "peak") return t("Peak Phase (Shikhar Charan)", "शिखर चरण");
  if (phase === "setting") return t("Setting Phase (Ast Charan)", "अस्त चरण");
  return t("Not Active", "सक्रिय नहीं");
}

function phaseDescription(phase: SadeSatiPhase): string {
  if (phase === "rising") {
    return t(
      "Saturn is in the sign before your Moon sign. Responsibilities increase and restructuring starts gradually.",
      "शनि आपकी चंद्र राशि से पहले की राशि में है। जिम्मेदारियां बढ़ती हैं और जीवन का पुनर्गठन धीरे-धीरे शुरू होता है।"
    );
  }
  if (phase === "peak") {
    return t(
      "Saturn is transiting your Moon sign. Emotional pressure is highest and discipline must become non-negotiable.",
      "शनि आपकी चंद्र राशि से गोचर कर रहा है। भावनात्मक दबाव सबसे अधिक होता है और अनुशासन अनिवार्य हो जाता है।"
    );
  }
  if (phase === "setting") {
    return t(
      "Saturn has moved to the sign after your Moon sign. Results mature, pending lessons close, and stability returns.",
      "शनि आपकी चंद्र राशि के बाद की राशि में चला गया है। परिणाम परिपक्व होते हैं, शेष पाठ पूरे होते हैं और स्थिरता लौटती है।"
    );
  }
  return t(
    "Saturn is not currently transiting the 12th, 1st, or 2nd sign from your natal Moon.",
    "शनि वर्तमान में आपके जन्म चंद्र से 12वीं, 1ली या 2री राशि से गोचर नहीं कर रहा है।"
  );
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

  const currentPeriod = startYear && endYear ? `${startYear} - ${endYear}` : t("Transit window based on current Saturn cycle", "वर्तमान शनि चक्र के आधार पर गोचर अवधि");
  const nextStartYear = estimateNextStartYear(moonSign, saturnSign, currentYear);
  const nextPeriod = nextStartYear ? `${nextStartYear} - ${nextStartYear + 8}` : t("To be determined by future Saturn transits", "भविष्य के शनि गोचर से निर्धारित होगा");

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
      phaseName: t("Rising Phase (12th from Moon)", "उदय चरण (चंद्र से 12वां)"),
      saturnSign: signAtOffset(moonSign, -1),
      startMonth: MONTH_NAMES[phase0Start.monthIndex],
      startYear: phase0Start.year,
      endMonth: MONTH_NAMES[phase0End.monthIndex],
      endYear: phase0End.year,
      periodLabel: `${MONTH_NAMES[phase0Start.monthIndex]} ${phase0Start.year} to ${MONTH_NAMES[phase0End.monthIndex]} ${phase0End.year}`,
      description: t(
        "Pressure builds through expenses, relocations, and mindset restructuring. This phase asks for discipline before visible gains.",
        "खर्चों, स्थानांतरण और मानसिकता के पुनर्गठन से दबाव बढ़ता है। यह चरण दृश्य लाभ से पहले अनुशासन की मांग करता है।"
      ),
      challenges: [
        t("Rising expenses and responsibility load", "बढ़ते खर्च और जिम्मेदारियों का बोझ"),
        t("Emotional restlessness and sleep disruption", "भावनात्मक बेचैनी और नींद में बाधा"),
        t("Need to reduce avoidable commitments", "अनावश्यक प्रतिबद्धताओं को कम करने की आवश्यकता"),
      ],
      hidden_blessings: [
        t("Early correction of weak routines", "कमज़ोर दिनचर्या में शीघ्र सुधार"),
        t("Long-term financial discipline", "दीर्घकालिक वित्तीय अनुशासन"),
        t("Clearer boundary-setting in relationships", "संबंधों में स्पष्ट सीमाओं का निर्धारण"),
      ],
      advice: t(
        "Cut non-essential obligations, protect daily rhythm, and build reserves.",
        "अनावश्यक दायित्वों को कम करें, दैनिक दिनचर्या की रक्षा करें और भंडार बनाएं।"
      ),
    },
    {
      phaseName: t("Peak Phase (Over Moon)", "शिखर चरण (चंद्र पर)"),
      saturnSign: moonSign,
      startMonth: MONTH_NAMES[phase1Start.monthIndex],
      startYear: phase1Start.year,
      endMonth: MONTH_NAMES[phase1End.monthIndex],
      endYear: phase1End.year,
      periodLabel: `${MONTH_NAMES[phase1Start.monthIndex]} ${phase1Start.year} to ${MONTH_NAMES[phase1End.monthIndex]} ${phase1End.year}`,
      description: t(
        "This is the most psychologically intense phase. Saturn tests emotional maturity, accountability, and resilience.",
        "यह मनोवैज्ञानिक रूप से सबसे तीव्र चरण है। शनि भावनात्मक परिपक्वता, जवाबदेही और सहनशीलता की परीक्षा लेता है।"
      ),
      challenges: [
        t("Higher emotional pressure and self-doubt spikes", "अधिक भावनात्मक दबाव और आत्म-संदेह"),
        t("Delays in expected outcomes", "अपेक्षित परिणामों में देरी"),
        t("Relationship strain if communication is reactive", "प्रतिक्रियात्मक संवाद से संबंधों में तनाव"),
      ],
      hidden_blessings: [
        t("Deep emotional maturity", "गहरी भावनात्मक परिपक्वता"),
        t("Enduring career foundations", "स्थायी कैरियर की नींव"),
        t("Stronger judgment under pressure", "दबाव में बेहतर निर्णय क्षमता"),
      ],
      advice: t(
        "Prioritize consistency over speed, avoid impulsive decisions, and maintain sober expectations.",
        "गति से अधिक निरंतरता को प्राथमिकता दें, आवेगपूर्ण निर्णयों से बचें और संयमित अपेक्षाएं रखें।"
      ),
    },
    {
      phaseName: t("Setting Phase (2nd from Moon)", "अस्त चरण (चंद्र से 2रा)"),
      saturnSign: signAtOffset(moonSign, 1),
      startMonth: MONTH_NAMES[phase2Start.monthIndex],
      startYear: phase2Start.year,
      endMonth: MONTH_NAMES[phase2End.monthIndex],
      endYear: phase2End.year,
      periodLabel: `${MONTH_NAMES[phase2Start.monthIndex]} ${phase2Start.year} to ${MONTH_NAMES[phase2End.monthIndex]} ${phase2End.year}`,
      description: t(
        "Closure and consolidation phase. Earlier effort starts converting into durable results and karmic lessons settle.",
        "समापन और समेकन का चरण। पहले के प्रयास स्थायी परिणामों में बदलने लगते हैं और कर्म के पाठ पूरे होते हैं।"
      ),
      challenges: [
        t("Family/finance restructuring decisions", "परिवार/वित्त पुनर्गठन के निर्णय"),
        t("Fatigue from prolonged pressure cycle", "लंबे दबाव चक्र से थकान"),
        t("Need to close unresolved obligations", "अनसुलझे दायित्वों को पूरा करने की आवश्यकता"),
      ],
      hidden_blessings: [
        t("Financial stabilization", "वित्तीय स्थिरता"),
        t("Improved practical judgment", "बेहतर व्यावहारिक निर्णय क्षमता"),
        t("Release from unproductive patterns", "अनुत्पादक पैटर्न से मुक्ति"),
      ],
      advice: t(
        "Consolidate assets, complete pending commitments, and protect long-term harmony.",
        "संपत्ति को समेकित करें, लंबित प्रतिबद्धताओं को पूरा करें और दीर्घकालिक सामंजस्य की रक्षा करें।"
      ),
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
    : t(
        `Sade Sati is assessed by Saturn's transit relative to your natal Moon sign (${moonSign}). With current transit Saturn taken as ${saturnSign}, your present status is ${isActive ? `${phaseLabel(phase)} and active` : "not active"}. This period is not a punishment cycle; it is a long-form karmic restructuring phase that rewards discipline, realism, and consistent execution. Outcomes during this cycle usually come through patience, simplified priorities, and sustained effort rather than sudden luck.`,
        `साढ़ेसाती का आकलन आपकी जन्म चंद्र राशि (${moonSign}) के सापेक्ष शनि के गोचर से किया जाता है। वर्तमान गोचर शनि ${saturnSign} में होने से, आपकी वर्तमान स्थिति ${isActive ? `${phaseLabel(phase)} और सक्रिय` : "सक्रिय नहीं"} है। यह अवधि कोई दंड चक्र नहीं है; यह एक दीर्घकालिक कर्म पुनर्गठन चरण है जो अनुशासन, यथार्थवाद और निरंतर प्रयास को पुरस्कृत करता है। इस चक्र के दौरान परिणाम आमतौर पर धैर्य, सरल प्राथमिकताओं और निरंतर प्रयास से आते हैं, अचानक भाग्य से नहीं।`
      );

  const importanceExplanation = !isWeakNarrative(raw.importanceExplanation, 130)
    ? String(raw.importanceExplanation)
    : t(
        "Sade Sati is important because it directly tests emotional stability (Moon) under Saturn's pressure. In practical terms, it can alter decision quality, risk tolerance, family dynamics, and financial behavior. The right approach is structured habits, fact-based planning, and emotional regulation. The stronger your discipline, the more constructive Saturn's results become.",
        "साढ़ेसाती इसलिए महत्वपूर्ण है क्योंकि यह शनि के दबाव में भावनात्मक स्थिरता (चंद्र) की सीधी परीक्षा लेती है। व्यावहारिक रूप से, यह निर्णय की गुणवत्ता, जोखिम सहनशीलता, पारिवारिक गतिशीलता और वित्तीय व्यवहार को बदल सकती है। सही दृष्टिकोण है — संरचित आदतें, तथ्य-आधारित योजना और भावनात्मक संयम। आपका अनुशासन जितना मजबूत होगा, शनि के परिणाम उतने ही रचनात्मक होंगे।"
      );

  const moonSaturnRelationship = !isWeakNarrative(raw.moonSaturnRelationship, 110)
    ? String(raw.moonSaturnRelationship)
    : t(
        `Your natal Moon is in ${moonSign}${moon?.house ? ` (House ${moon.house})` : ""}, while transit Saturn is considered in ${saturnSign}. This Moon-Saturn relationship determines the phase intensity and the life domains where pressure is felt first. Emotionally, this combination demands maturity and pacing. Practically, the focus should be on consistent effort, realistic timelines, and low-reactivity decision making.`,
        `आपका जन्म चंद्र ${moonSign}${moon?.house ? ` (भाव ${moon.house})` : ""} में है, जबकि गोचर शनि ${saturnSign} में माना गया है। यह चंद्र-शनि संबंध चरण की तीव्रता और उन जीवन क्षेत्रों को निर्धारित करता है जहां दबाव पहले महसूस होता है। भावनात्मक रूप से, यह संयोजन परिपक्वता और धैर्य की मांग करता है। व्यावहारिक रूप से, ध्यान निरंतर प्रयास, यथार्थवादी समय-सीमाओं और कम प्रतिक्रियात्मक निर्णय लेने पर होना चाहिए।`
      );

  const overallGuidance = !isWeakNarrative(raw.overallGuidance, 100)
    ? String(raw.overallGuidance)
    : t(
        "Treat this cycle as a long-term discipline chapter: simplify commitments, preserve financial buffers, and execute priorities in sequence. Saturn rewards structure, integrity, and consistency.",
        "इस चक्र को दीर्घकालिक अनुशासन के अध्याय के रूप में लें: प्रतिबद्धताओं को सरल करें, वित्तीय बफर बनाए रखें और प्राथमिकताओं को क्रमबद्ध रूप से पूरा करें। शनि संरचना, ईमानदारी और निरंतरता को पुरस्कृत करता है।"
      );

  const stableRemedies = remedies.length > 0
    ? remedies
    : isActive
      ? [
          t("Maintain strict Saturday discipline: complete pending tasks and avoid avoidable conflicts.",
            "शनिवार का सख्त अनुशासन बनाए रखें: लंबित कार्यों को पूरा करें और अनावश्यक विवादों से बचें।"),
          t("Offer sesame oil deepam or Shani prayer on Saturdays with consistency.",
            "शनिवार को तिल के तेल का दीपक या शनि प्रार्थना नियमित रूप से करें।"),
          t("Support service-oriented charity (especially for laborers/elderly) to balance Saturn karma.",
            "शनि कर्म को संतुलित करने के लिए सेवा-उन्मुख दान (विशेषकर श्रमिकों/बुजुर्गों के लिए) करें।"),
        ]
      : [
          t("Since Sade Sati is not active, intensive Shani remedies are not mandatory.",
            "चूंकि साढ़ेसाती सक्रिय नहीं है, इसलिए गहन शनि उपाय अनिवार्य नहीं हैं।"),
          t("Maintain financial discipline and routine stability to stay prepared for future Saturn cycles.",
            "भविष्य के शनि चक्रों के लिए तैयार रहने हेतु वित्तीय अनुशासन और दिनचर्या की स्थिरता बनाए रखें।"),
          t("Keep weekly grounding practices (prayer/meditation/service) for long-term resilience.",
            "दीर्घकालिक सहनशीलता के लिए साप्ताहिक प्रार्थना/ध्यान/सेवा की आदत बनाए रखें।"),
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
              t("Progress through disciplined, staged execution rather than sudden jumps.",
                "अचानक छलांग के बजाय अनुशासित, चरणबद्ध कार्यान्वयन से प्रगति।"),
              t("Higher accountability in family, career, and financial choices.",
                "परिवार, कैरियर और वित्तीय विकल्पों में अधिक जवाबदेही।"),
              t("Need for emotional regulation in sensitive conversations.",
                "संवेदनशील बातचीत में भावनात्मक संयम की आवश्यकता।"),
            ],
        opportunities: [
          t("Build durable systems and repeatable routines.",
            "टिकाऊ प्रणालियां और दोहराने योग्य दिनचर्या बनाएं।"),
          t("Improve long-term money discipline and risk filtering.",
            "दीर्घकालिक धन अनुशासन और जोखिम छानबीन में सुधार करें।"),
          t("Mature leadership through patience and consistency.",
            "धैर्य और निरंतरता के माध्यम से परिपक्व नेतृत्व विकसित करें।"),
        ],
        whatNotToDo: [
          t("Do not force outcomes through impulsive decisions.",
            "आवेगपूर्ण निर्णयों से परिणामों को बलपूर्वक प्राप्त करने का प्रयास न करें।"),
          t("Avoid over-commitment without execution bandwidth.",
            "कार्यान्वयन क्षमता के बिना अत्यधिक प्रतिबद्धताओं से बचें।"),
          t("Do not ignore sleep, recovery, and mental steadiness.",
            "नींद, रिकवरी और मानसिक स्थिरता की उपेक्षा न करें।"),
        ],
        advice: overallGuidance,
      }
    : null;

  const pastCycle = historical[historical.length - 1];
  const pastSadeSati = !isActive && pastCycle
    ? {
        period: `${pastCycle.startYear} - ${pastCycle.endYear}`,
        keyLessons: t(
          "Previous Saturn cycles usually teach patience, accountability, and realistic planning. Repeating patterns from that period are often the key preparation for your next cycle.",
          "पिछले शनि चक्र आमतौर पर धैर्य, जवाबदेही और यथार्थवादी योजना सिखाते हैं। उस अवधि के दोहराए जाने वाले पैटर्न अक्सर आपके अगले चक्र की मुख्य तैयारी होते हैं।"
        ),
        lifeEvents: t(
          "Revisit the years of your previous cycle to identify themes in responsibility, finances, family duties, and emotional resilience; those patterns are your practical Saturn handbook.",
          "अपने पिछले चक्र के वर्षों पर पुनर्विचार करें — जिम्मेदारी, वित्त, पारिवारिक कर्तव्यों और भावनात्मक सहनशीलता के पैटर्न पहचानें; ये पैटर्न आपकी व्यावहारिक शनि पुस्तिका हैं।"
        ),
      }
    : null;

  const nextSadeSati = !isActive
    ? {
        period: nextPeriod,
        approximateStart: nextStartYear ? `${nextStartYear}` : t("To be determined", "निर्धारित किया जाना बाकी"),
        preparationAdvice: t(
          "Prepare 1-2 years before the next cycle: tighten finances, reduce avoidable liabilities, and build a stable routine so Saturn pressure converts into measurable progress.",
          "अगले चक्र से 1-2 वर्ष पहले तैयारी करें: वित्त को मजबूत करें, अनावश्यक देनदारियों को कम करें, और एक स्थिर दिनचर्या बनाएं ताकि शनि का दबाव मापने योग्य प्रगति में बदल सके।"
        ),
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
      t("This period emphasizes responsibility, pacing, and emotional maturity.",
        "यह अवधि जिम्मेदारी, धैर्य और भावनात्मक परिपक्वता पर बल देती है।"),
      t("Progress requires consistency and structured planning.",
        "प्रगति के लिए निरंतरता और संरचित योजना आवश्यक है।"),
      t("Long-term stability improves when impulsive decisions are avoided.",
        "आवेगपूर्ण निर्णयों से बचने पर दीर्घकालिक स्थिरता में सुधार होता है।"),
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
      : t(
          "Spiritually, Sade Sati reduces ego-reactivity and strengthens inner steadiness. It rewards humility, service, disciplined habits, and truth-based living. The deeper gift is not comfort; it is character.",
          "आध्यात्मिक रूप से, साढ़ेसाती अहंकार की प्रतिक्रियाशीलता को कम करती है और आंतरिक स्थिरता को मजबूत करती है। यह विनम्रता, सेवा, अनुशासित आदतों और सत्य-आधारित जीवन को पुरस्कृत करती है। इसका गहरा उपहार आराम नहीं, बल्कि चरित्र निर्माण है।"
        ),
    mantras: Array.isArray(raw.mantras) && raw.mantras.length > 0
      ? raw.mantras
      : [
          {
            mantra: "ॐ शं शनैश्चराय नमः",
            purpose: t(
              "Stabilize Saturn-related pressure and improve disciplined focus.",
              "शनि संबंधी दबाव को स्थिर करें और अनुशासित ध्यान में सुधार करें।"
            ),
            timing: t(
              "Saturdays, preferably during sunrise or sunset with steady repetition.",
              "शनिवार को, अधिमानतः सूर्योदय या सूर्यास्त के समय नियमित जप करें।"
            ),
          },
          {
            mantra: "नीलांजन समाभासं रवि पुत्रं यमाग्रजम्",
            purpose: t(
              "Traditional Shani stotra for patience, endurance, and karmic balance.",
              "धैर्य, सहनशीलता और कर्म संतुलन के लिए पारंपरिक शनि स्तोत्र।"
            ),
            timing: t(
              "Saturdays after bath, 11/21 repetitions with calm breath.",
              "शनिवार को स्नान के बाद, शांत श्वास के साथ 11/21 बार जप करें।"
            ),
          },
        ],
    famousPeopleThrivedDuringSadeSati: raw.famousPeopleThrivedDuringSadeSati
      || t(
          "Many high achievers report that their major discipline, leadership, and legacy-building years happened during Saturn pressure cycles because long-term structure was forced into place.",
          "कई सफल व्यक्तियों ने बताया है कि उनके प्रमुख अनुशासन, नेतृत्व और विरासत-निर्माण के वर्ष शनि के दबाव चक्रों के दौरान हुए क्योंकि दीर्घकालिक संरचना को स्थापित होने के लिए मजबूर किया गया।"
        ),
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

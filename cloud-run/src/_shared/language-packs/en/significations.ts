import type { PlanetSignification } from "../types";

export const EN_SIGNIFICATIONS = {
  planets: {
    Sun: { themes: "authority, recognition, and life-direction", opportunity: "step into visible responsibility", caution: "ego friction and authority clashes" },
    Moon: { themes: "emotions, home-life, and mental balance", opportunity: "stabilize routines and family support", caution: "mood volatility and over-sensitivity" },
    Mars: { themes: "drive, conflict, and decisive action", opportunity: "execute bold plans with discipline", caution: "impulsiveness, disputes, and burnout" },
    Mercury: { themes: "intellect, communication, and commerce", opportunity: "upgrade skills, negotiation, and strategy", caution: "over-analysis and scattered execution" },
    Jupiter: { themes: "growth, wisdom, guidance, and ethics", opportunity: "expand with mentorship and long-term thinking", caution: "over-promising or complacency" },
    Venus: { themes: "relationships, comforts, creative value, and agreements", opportunity: "build harmony and value-led partnerships", caution: "indulgence and misaligned attachments" },
    Saturn: { themes: "structure, accountability, endurance, and karmic tests", opportunity: "build durable outcomes through consistency", caution: "delay frustration and rigid pessimism" },
    Rahu: { themes: "ambition, unconventional pushes, and material acceleration", opportunity: "break ceilings through strategic risk", caution: "obsession, shortcuts, and instability" },
    Ketu: { themes: "detachment, correction, and inner realignment", opportunity: "remove noise and sharpen spiritual clarity", caution: "withdrawal, confusion, and disengagement" },
  } as Record<string, PlanetSignification>,
};

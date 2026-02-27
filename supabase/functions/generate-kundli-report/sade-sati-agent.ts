// Sade Sati Agent - Analyzes Saturn's transit over Moon sign

import { callAgent, type AgentResponse } from "./agent-base.ts";
import type { SeerPlanet } from "./seer-adapter.ts";

export interface SadeSatiPrediction {
  isActive: boolean;
  phase: "rising" | "peak" | "setting" | "not_active";
  saturnSign: string;
  moonSign: string;
  startYear: number | null;
  endYear: number | null;
  currentPhaseDescription: string;
  effects: string[];
  remedies: string[];
  historicalCycles: Array<{
    startYear: number;
    endYear: number;
    phase: string;
  }>;
  overallGuidance: string;
}

interface SadeSatiInput {
  planets: SeerPlanet[];
  birthYear: number;
}

export async function generateSadeSatiPrediction(input: SadeSatiInput): Promise<AgentResponse<SadeSatiPrediction>> {
  const { planets, birthYear } = input;

  const saturn = planets.find(p => p.name === "Saturn");
  const moon = planets.find(p => p.name === "Moon");

  const userPrompt = `Analyze Sade Sati for this chart:
- Saturn: ${saturn?.sign} (House ${saturn?.house}, ${saturn?.deg?.toFixed(1)}°)
- Moon: ${moon?.sign} (House ${moon?.house}, ${moon?.deg?.toFixed(1)}°)
- Birth Year: ${birthYear}

Determine if Sade Sati is currently active, its phase, effects, and remedies.`;

  const toolSchema = {
    type: "object",
    properties: {
      isActive: { type: "boolean" },
      phase: { type: "string", enum: ["rising", "peak", "setting", "not_active"] },
      saturnSign: { type: "string" },
      moonSign: { type: "string" },
      startYear: { type: "number", nullable: true },
      endYear: { type: "number", nullable: true },
      currentPhaseDescription: { type: "string" },
      effects: { type: "array", items: { type: "string" } },
      remedies: { type: "array", items: { type: "string" } },
      historicalCycles: { type: "array", items: { type: "object", properties: { startYear: { type: "number" }, endYear: { type: "number" }, phase: { type: "string" } } } },
      overallGuidance: { type: "string" }
    },
    required: ["isActive", "phase", "saturnSign", "moonSign", "currentPhaseDescription", "effects", "remedies", "overallGuidance"]
  };

  return callAgent<SadeSatiPrediction>(
    "You are an expert Vedic astrologer specializing in Sade Sati analysis. Analyze Saturn's transit over the Moon sign.",
    userPrompt,
    "generate_sade_sati_prediction",
    "Generate Sade Sati analysis",
    toolSchema
  );
}

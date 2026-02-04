// Numerology Agent - Generates numerology analysis

import { callAgent, type AgentResponse } from "./agent-base.ts";

export interface NumerologyPrediction {
  overview: string;
  birthNumber: {
    number: number;
    name: string;
    planet: string;
    interpretation: string;
    personality: string;
    strengths: string[];
    challenges: string[];
  };
  destinyNumber: {
    number: number;
    name: string;
    planet: string;
    interpretation: string;
    lifePath: string;
    opportunities: string[];
  };
  nameNumber: {
    number: number;
    name: string;
    planet: string;
    interpretation: string;
    publicImage: string;
  };
  soulNumber: {
    number: number;
    interpretation: string;
    innerDesires: string;
  };
  karmaNumber: {
    number: number;
    interpretation: string;
    lessons: string[];
  };
  luckyNumbers: number[];
  unluckyNumbers: number[];
  luckyDays: string[];
  luckyColors: string[];
  compatibility: {
    bestNumbers: number[];
    challengingNumbers: number[];
    explanation: string;
  };
  yearPrediction: {
    personalYear: number;
    interpretation: string;
    themes: string[];
    advice: string;
  };
  nameSuggestions: {
    addLetters: string[];
    avoidLetters: string[];
    explanation: string;
  };
  recommendations: string[];
}

const NUMEROLOGY_SYSTEM_PROMPT = `You are an expert in Vedic Numerology (Ank Jyotish).

Calculate and interpret the following numerological values:
1. Mulank (Birth Number) - from day of birth
2. Bhagyank (Destiny Number) - from full date of birth
3. Name Number - from name calculation
4. Soul Number and Karma Number

For each number, explain:
- The ruling planet
- Personality traits
- Life path and purpose
- Strengths and challenges
- Lucky associations

Provide practical guidance based on numerology principles.
Reference Cheiro and Vedic numerology traditions where appropriate.`;

interface NumerologyInput {
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
}

function calculateBirthNumber(day: number): number {
  if (day <= 9) return day;
  return calculateBirthNumber(Math.floor(day / 10) + (day % 10));
}

function calculateDestinyNumber(day: number, month: number, year: number): number {
  const total = day + month + year.toString().split('').reduce((a, b) => a + parseInt(b), 0);
  if (total <= 9) return total;
  if (total === 11 || total === 22) return total; // Master numbers
  return calculateBirthNumber(total);
}

function calculateNameNumber(name: string): number {
  const letterValues: Record<string, number> = {
    a: 1, b: 2, c: 3, d: 4, e: 5, f: 8, g: 3, h: 5, i: 1, j: 1,
    k: 2, l: 3, m: 4, n: 5, o: 7, p: 8, q: 1, r: 2, s: 3, t: 4,
    u: 6, v: 6, w: 6, x: 5, y: 1, z: 7
  };
  
  const total = name.toLowerCase().replace(/[^a-z]/g, '').split('')
    .reduce((sum, letter) => sum + (letterValues[letter] || 0), 0);
  
  if (total <= 9) return total;
  return calculateBirthNumber(total);
}

export async function generateNumerologyPrediction(input: NumerologyInput): Promise<AgentResponse<NumerologyPrediction>> {
  const { name, dateOfBirth } = input;
  
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  
  const birthNumber = calculateBirthNumber(day);
  const destinyNumber = calculateDestinyNumber(day, month, year);
  const nameNumber = calculateNameNumber(name);
  
  // Calculate personal year
  const currentYear = new Date().getFullYear();
  const personalYear = calculateBirthNumber(day + month + currentYear.toString().split('').reduce((a, b) => a + parseInt(b), 0));

  const planetMap: Record<number, string> = {
    1: "Sun", 2: "Moon", 3: "Jupiter", 4: "Rahu", 5: "Mercury",
    6: "Venus", 7: "Ketu", 8: "Saturn", 9: "Mars"
  };

  const userPrompt = `Provide comprehensive numerology analysis:

**Birth Details:**
- Name: ${name}
- Date of Birth: ${dateOfBirth}
- Day: ${day}, Month: ${month}, Year: ${year}

**Calculated Numbers:**
- Birth Number (Mulank): ${birthNumber} (Planet: ${planetMap[birthNumber]})
- Destiny Number (Bhagyank): ${destinyNumber} (Planet: ${planetMap[destinyNumber > 9 ? calculateBirthNumber(destinyNumber) : destinyNumber]})
- Name Number: ${nameNumber} (Planet: ${planetMap[nameNumber]})
- Personal Year (${currentYear}): ${personalYear}

Provide detailed numerological analysis with:
1. Deep interpretation of each core number
2. Personality and life path analysis
3. Lucky and unlucky associations
4. Current year predictions
5. Name improvement suggestions
6. Practical recommendations`;

  const toolSchema = {
    type: "object",
    properties: {
      overview: { type: "string", description: "3-4 paragraph numerology overview" },
      birthNumber: {
        type: "object",
        properties: {
          number: { type: "number" },
          name: { type: "string" },
          planet: { type: "string" },
          interpretation: { type: "string" },
          personality: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          challenges: { type: "array", items: { type: "string" } }
        },
        required: ["number", "name", "planet", "interpretation", "personality", "strengths", "challenges"]
      },
      destinyNumber: {
        type: "object",
        properties: {
          number: { type: "number" },
          name: { type: "string" },
          planet: { type: "string" },
          interpretation: { type: "string" },
          lifePath: { type: "string" },
          opportunities: { type: "array", items: { type: "string" } }
        },
        required: ["number", "name", "planet", "interpretation", "lifePath", "opportunities"]
      },
      nameNumber: {
        type: "object",
        properties: {
          number: { type: "number" },
          name: { type: "string" },
          planet: { type: "string" },
          interpretation: { type: "string" },
          publicImage: { type: "string" }
        },
        required: ["number", "name", "planet", "interpretation", "publicImage"]
      },
      soulNumber: {
        type: "object",
        properties: {
          number: { type: "number" },
          interpretation: { type: "string" },
          innerDesires: { type: "string" }
        },
        required: ["number", "interpretation", "innerDesires"]
      },
      karmaNumber: {
        type: "object",
        properties: {
          number: { type: "number" },
          interpretation: { type: "string" },
          lessons: { type: "array", items: { type: "string" } }
        },
        required: ["number", "interpretation", "lessons"]
      },
      luckyNumbers: { type: "array", items: { type: "number" } },
      unluckyNumbers: { type: "array", items: { type: "number" } },
      luckyDays: { type: "array", items: { type: "string" } },
      luckyColors: { type: "array", items: { type: "string" } },
      compatibility: {
        type: "object",
        properties: {
          bestNumbers: { type: "array", items: { type: "number" } },
          challengingNumbers: { type: "array", items: { type: "number" } },
          explanation: { type: "string" }
        },
        required: ["bestNumbers", "challengingNumbers", "explanation"]
      },
      yearPrediction: {
        type: "object",
        properties: {
          personalYear: { type: "number" },
          interpretation: { type: "string" },
          themes: { type: "array", items: { type: "string" } },
          advice: { type: "string" }
        },
        required: ["personalYear", "interpretation", "themes", "advice"]
      },
      nameSuggestions: {
        type: "object",
        properties: {
          addLetters: { type: "array", items: { type: "string" } },
          avoidLetters: { type: "array", items: { type: "string" } },
          explanation: { type: "string" }
        },
        required: ["addLetters", "avoidLetters", "explanation"]
      },
      recommendations: { type: "array", items: { type: "string" } }
    },
    required: ["overview", "birthNumber", "destinyNumber", "nameNumber", "soulNumber", "karmaNumber", "luckyNumbers", "unluckyNumbers", "luckyDays", "luckyColors", "compatibility", "yearPrediction", "nameSuggestions", "recommendations"],
    additionalProperties: false
  };

  return callAgent<NumerologyPrediction>(
    NUMEROLOGY_SYSTEM_PROMPT,
    userPrompt,
    "generate_numerology_prediction",
    "Generate comprehensive numerology analysis",
    toolSchema
  );
}

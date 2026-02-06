// Glossary Agent - Generates comprehensive glossary of astrological terms

import { callAgent, type AgentResponse } from "./agent-base.ts";

export interface GlossaryTerm {
  term: string;
  termSanskrit: string;
  pronunciation: string;
  category: string;
  definition: string;
  detailedExplanation: string;
  example: string;
  relatedTerms: string[];
}

export interface GlossarySection {
  category: string;
  categoryDescription: string;
  terms: GlossaryTerm[];
}

export interface GlossaryPrediction {
  introduction: string;
  sections: GlossarySection[];
  quickReference: Array<{
    term: string;
    briefDefinition: string;
  }>;
  furtherReading: string[];
}

const GLOSSARY_SYSTEM_PROMPT = `You are an expert Vedic astrology educator creating a comprehensive glossary for a Kundli report.

Create clear, accessible definitions that help readers understand:
1. Basic concepts (planets, signs, houses)
2. Technical terms (aspects, dignities, yogas)
3. Predictive terminology (dashas, transits)
4. Jaimini concepts (karakas, argalas)
5. Remedial terms (upayas, mantras, yantras)

For each term, provide:
- The Sanskrit/Hindi name with transliteration
- Pronunciation guide
- Clear definition for beginners
- Detailed explanation for deeper understanding
- Practical example from astrology
- Related terms for cross-reference

Organize terms by category for easy navigation.
Use simple language while maintaining accuracy.
Include both Parashari and Jaimini terminology.`;

export async function generateGlossaryPrediction(): Promise<AgentResponse<GlossaryPrediction>> {
  
  const userPrompt = `Generate a comprehensive glossary of Vedic astrology terms used in a Kundli report.

Include all major terms organized by these categories:

**1. Foundational Concepts:**
- Kundli/Horoscope, Lagna/Ascendant, Rashi (Signs), Bhava (Houses)
- Graha (Planets), Nakshatra (Lunar Mansions), Pada

**2. Signs & Houses:**
- All 12 Rashis (Mesha, Vrishabha, etc.)
- House significators and meanings (1st-12th houses)
- Kendra, Trikona, Dusthana, Upachaya houses

**3. Planetary Concepts:**
- Dignity (Exaltation, Debilitation, Own Sign, Friend/Enemy)
- Retrograde (Vakri), Combustion (Asta)
- Natural benefics, malefics
- Functional benefics, malefics

**4. Aspects & Combinations:**
- Drishti (Aspects) - Full, Partial, Special
- Conjunction (Yuti), Opposition
- Yoga formations

**5. Dasha Systems:**
- Vimshottari Dasha, Yogini Dasha
- Mahadasha, Antardasha, Pratyantardasha
- Dasha balance, Dasha lords

**6. Jaimini Astrology:**
- Chara Karakas (Atmakaraka, Amatyakaraka, etc.)
- Karakamsa, Swamsa
- Argala, Chara Dasha

**7. Predictive Terms:**
- Transit (Gochar), Ashtakavarga
- Panchang (Tithi, Nakshatra, Yoga, Karana, Vara)
- Muhurta, Shubha/Ashubha timings

**8. Doshas & Yogas:**
- Common doshas (Mangal Dosha, Kaal Sarp, Pitra Dosha, etc.)
- Important yogas (Gaja Kesari, Budhaditya, etc.)
- Nullification/Cancellation

**9. Remedial Terms:**
- Upaya (Remedies), Shanti (Pacification)
- Mantra, Yantra, Tantra
- Rudraksha, Ratna (Gemstones)
- Daan (Charity), Vrata (Fasting)
- Puja, Homa, Jaapa

**10. Chart Types:**
- Rashi Chart (D1), Navamsa (D9)
- Other divisional charts (Hora, Drekkana, etc.)
- North Indian, South Indian styles

Provide clear, educational definitions suitable for readers new to Vedic astrology.`;

  const toolSchema = {
    type: "object",
    properties: {
      introduction: { type: "string", description: "Introduction to the glossary and how to use it" },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            category: { type: "string" },
            categoryDescription: { type: "string" },
            terms: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  term: { type: "string" },
                  termSanskrit: { type: "string" },
                  pronunciation: { type: "string" },
                  category: { type: "string" },
                  definition: { type: "string", description: "Brief 1-2 sentence definition" },
                  detailedExplanation: { type: "string", description: "Detailed explanation" },
                  example: { type: "string" },
                  relatedTerms: { type: "array", items: { type: "string" } }
                },
                required: ["term", "termSanskrit", "pronunciation", "category", "definition", "detailedExplanation", "example", "relatedTerms"]
              }
            }
          },
          required: ["category", "categoryDescription", "terms"]
        }
      },
      quickReference: {
        type: "array",
        description: "Quick reference list of the most important terms",
        items: {
          type: "object",
          properties: {
            term: { type: "string" },
            briefDefinition: { type: "string" }
          },
          required: ["term", "briefDefinition"]
        }
      },
      furtherReading: { type: "array", items: { type: "string" }, description: "Recommended classical texts and resources" }
    },
    required: ["introduction", "sections", "quickReference", "furtherReading"],
    additionalProperties: false
  };

  return callAgent<GlossaryPrediction>(
    GLOSSARY_SYSTEM_PROMPT,
    userPrompt,
    "generate_glossary",
    "Generate comprehensive Vedic astrology glossary",
    toolSchema
  );
}

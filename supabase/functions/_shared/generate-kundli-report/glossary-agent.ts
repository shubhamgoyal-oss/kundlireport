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

function getGlossarySystemPrompt(language: string): string {
  if (language === "hi") {
    return `आप एक विशेषज्ञ वैदिक ज्योतिष शिक्षक हैं जो कुंडली रिपोर्ट के लिए एक व्यापक शब्दकोश बना रहे हैं।

कृपया सभी सामग्री हिन्दी (देवनागरी लिपि) में लिखें। अंग्रेज़ी का उपयोग बिल्कुल न करें।

स्पष्ट, सुलभ परिभाषाएं बनाएं जो पाठकों को समझने में मदद करें:
1. मूल अवधारणाएं (ग्रह, राशियां, भाव)
2. तकनीकी शब्द (दृष्टि, बल, योग)
3. भविष्यवाणी शब्दावली (दशा, गोचर)
4. जैमिनी अवधारणाएं (कारक, आर्गला)
5. उपचार शब्द (उपाय, मंत्र, यंत्र)

प्रत्येक शब्द के लिए प्रदान करें:
- संस्कृत/हिन्दी नाम
- उच्चारण मार्गदर्शन
- शुरुआती लोगों के लिए स्पष्ट परिभाषा
- गहन समझ के लिए विस्तृत व्याख्या
- ज्योतिष से व्यावहारिक उदाहरण
- क्रॉस-रेफरेंस के लिए संबंधित शब्द

श्रेणी के अनुसार शब्दों को व्यवस्थित करें।
सटीकता बनाए रखते हुए सरल हिन्दी भाषा का उपयोग करें।`;
  }
  if (language === "te") {
    return `మీరు కుండలీ నివేదిక కోసం సమగ్ర పారిభాషిక నిఘంటువును సృష్టిస్తున్న నిపుణ వైదిక జ్యోతిష్య విద్యావేత్త.

దయచేసి మొత్తం కంటెంట్ తెలుగు లిపిలో రాయండి. ఆంగ్లం ఉపయోగించకండి.

స్పష్టమైన, అందుబాటులో ఉన్న నిర్వచనాలను సృష్టించండి:
1. ప్రాథమిక భావనలు (గ్రహాలు, రాశులు, భావాలు)
2. సాంకేతిక పదాలు (దృష్టి, బలం, యోగాలు)
3. భవిష్యవాణి పరిభాష (దశ, గోచారం)
4. జైమిని భావనలు (కారకాలు, ఆర్గళ)
5. పరిహార పదాలు (ఉపాయాలు, మంత్రాలు, యంత్రాలు)

ప్రతి పదానికి అందించండి:
- సంస్కృత/తెలుగు పేరు
- ఉచ్చారణ మార్గదర్శకం
- ప్రారంభకులకు స్పష్టమైన నిర్వచనం
- లోతైన అవగాహన కోసం వివరణాత్మక వివరణ
- జ్యోతిష్యం నుండి ఆచరణాత్మక ఉదాహరణ
- క్రాస్-రిఫరెన్స్ కోసం సంబంధిత పదాలు

వర్గం ప్రకారం పదాలను నిర్వహించండి.
ఖచ్చితత్వాన్ని కాపాడుతూ సరళ తెలుగు భాషను ఉపయోగించండి.`;
  }
  return `You are an expert Vedic astrology educator creating a comprehensive glossary for a Kundli report.

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
}

export async function generateGlossaryPrediction(language: string = "en"): Promise<AgentResponse<GlossaryPrediction>> {
  const langLabel = language === "hi" ? "हिन्दी" : language === "te" ? "తెలుగు" : "English";
  const langInstruction = language !== "en"
    ? `\n\nCRITICAL: Write ALL content (categories, descriptions, definitions, examples) in ${langLabel} script. Do NOT use English for any descriptive text. Sanskrit terms can remain in Devanagari.`
    : "";

  const userPrompt = `Generate a comprehensive glossary of Vedic astrology terms used in a Kundli report.${langInstruction}

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
    getGlossarySystemPrompt(language),
    userPrompt,
    "generate_glossary",
    `Generate comprehensive Vedic astrology glossary (${langLabel})`,
    toolSchema
  );
}

/**
 * Translation Agent — Final sweep to translate any remaining English text
 * in Hindi/Telugu reports before Language QC validation.
 *
 * Runs AFTER all content agents + truth guard + safety enforcement, BEFORE QC.
 * Walks the entire report JSON, detects English strings, batches them,
 * and sends to Gemini for translation. This makes the system bulletproof
 * against English leakage from AI fallbacks, dynamic labels, or edge cases.
 *
 * Design:
 *   1. Collect all strings with significant Latin content (>15% Latin chars)
 *   2. Group by top-level report section for contextual batching
 *   3. Translate in PARALLEL batches of 40 via Gemini tool-call (3 concurrent)
 *   4. Validate each translation: reject if output is still >25% Latin or suspiciously short
 *   5. Apply translations back to the report in-place
 *
 * Performance: 3 concurrent batches of 40 strings ≈ 120 strings per ~20-30s wave.
 * Typical Hindi report needs ~60-150 strings → 1-2 waves → 20-60s total.
 */

import { callAgent, type AgentResponse } from "./agent-base.ts";

// ── Configuration ────────────────────────────────────────────────────────────

const BATCH_SIZE = 40;          // Strings per Gemini call (bigger = fewer round-trips)
const CONCURRENCY = 3;          // Run this many batches in parallel per wave
const MAX_RETRIES = 1;          // Retry failed batches once (2 attempts total)
const RETRY_DELAY_MS = 2_000;   // 2 seconds between retries
const LATIN_RATIO_THRESHOLD = 0.15; // 15% Latin → needs translation (thorough)
const MIN_STRING_LENGTH = 8;    // Minimum string length to consider
const MIN_LETTER_COUNT = 4;     // Minimum non-space/digit/punct letters

// ── Pre-built Phrase Cache ──────────────────────────────────────────────────
// Commonly recurring structural labels, section headings, and short phrases
// that appear in EVERY report. Applied BEFORE Gemini batching for instant
// translation (zero API cost). Reduces Gemini batches by 30-50%.
//
// Key format: lowercase trimmed English string
// Value format: { hi: Hindi translation, te: Telugu translation }

const PHRASE_CACHE: Record<string, { hi: string; te: string }> = {
  // ── Section headings & titles ──
  "overview": { hi: "अवलोकन", te: "అవలోకనం" },
  "interpretation": { hi: "व्याख्या", te: "వ్యాఖ్యానం" },
  "placement": { hi: "स्थान", te: "స్థానం" },
  "description": { hi: "विवरण", te: "వివరణ" },
  "definition": { hi: "परिभाषा", te: "నిర్వచనం" },
  "significance": { hi: "महत्व", te: "ప్రాముఖ్యత" },
  "analysis": { hi: "विश्लेषण", te: "విశ్లేషణ" },
  "predictions": { hi: "भविष्यवाणियां", te: "అంచనాలు" },
  "prediction": { hi: "भविष्यवाणी", te: "అంచనా" },
  "summary": { hi: "सारांश", te: "సారాంశం" },
  "guidance": { hi: "मार्गदर्शन", te: "మార్గదర్శకం" },
  "recommendations": { hi: "सुझाव", te: "సిఫారసులు" },
  "advice": { hi: "सलाह", te: "సలహా" },
  "benefits": { hi: "लाभ", te: "ప్రయోజనాలు" },
  "effects": { hi: "प्रभाव", te: "ప్రభావాలు" },
  "remedies": { hi: "उपाय", te: "పరిహారాలు" },
  "strengths": { hi: "शक्तियां", te: "బలాలు" },
  "challenges": { hi: "चुनौतियां", te: "సవాళ్ళు" },
  "opportunities": { hi: "अवसर", te: "అవకాశాలు" },
  "timing": { hi: "समय", te: "సమయం" },
  "formation": { hi: "गठन", te: "నిర్మాణం" },

  // ── Life area section headings ──
  "career analysis": { hi: "कैरियर विश्लेषण", te: "వృత్తి విశ్లేషణ" },
  "marriage analysis": { hi: "विवाह विश्लेषण", te: "వివాహ విశ్లేషణ" },
  "health guidance": { hi: "स्वास्थ्य मार्गदर्शन", te: "ఆరోగ్య మార్గదర్శకం" },
  "health analysis": { hi: "स्वास्थ्य विश्लेषण", te: "ఆరోగ్య విశ్లేషణ" },
  "financial analysis": { hi: "वित्तीय विश्लेषण", te: "ఆర్థిక విశ్లేషణ" },
  "spiritual analysis": { hi: "आध्यात्मिक विश्लेषण", te: "ఆధ్యాత్మిక విశ్లేషణ" },
  "planetary positions": { hi: "ग्रह स्थितियां", te: "గ్రహ స్థితులు" },
  "house analysis": { hi: "भाव विश्लेषण", te: "భావ విశ్లేషణ" },
  "dasha analysis": { hi: "दशा विश्लेषण", te: "దశ విశ్లేషణ" },
  "yoga analysis": { hi: "योग विश्लेषण", te: "యోగ విశ్లేషణ" },
  "dosha analysis": { hi: "दोष विश्लेषण", te: "దోష విశ్లేషణ" },

  // ── Impact categories ──
  "career impact": { hi: "कैरियर प्रभाव", te: "వృత్తి ప్రభావం" },
  "relationship impact": { hi: "संबंध प्रभाव", te: "సంబంధ ప్రభావం" },
  "health impact": { hi: "स्वास्थ्य प्रभाव", te: "ఆరోగ్య ప్రభావం" },
  "financial impact": { hi: "वित्तीय प्रभाव", te: "ఆర్థిక ప్రభావం" },
  "spiritual growth": { hi: "आध्यात्मिक विकास", te: "ఆధ్యాత్మిక వృద్ధి" },

  // ── Dasha system labels ──
  "current phase": { hi: "वर्तमान चरण", te: "ప్రస్తుత దశ" },
  "current mahadasha": { hi: "वर्तमान महादशा", te: "ప్రస్తుత మహాదశ" },
  "current antardasha": { hi: "वर्तमान अंतर्दशा", te: "ప్రస్తుత అంతర్దశ" },
  "focal areas": { hi: "मुख्य क्षेत्र", te: "ప్రధాన రంగాలు" },
  "focus areas": { hi: "मुख्य क्षेत्र", te: "ప్రధాన రంగాలు" },
  "key events": { hi: "प्रमुख घटनाएं", te: "ముఖ్య సంఘటనలు" },
  "key themes": { hi: "प्रमुख विषय", te: "ముఖ్య అంశాలు" },
  "life focus": { hi: "जीवन का केंद्र", te: "జీవిత కేంద్రం" },
  "brief prediction": { hi: "संक्षिप्त भविष्यवाणी", te: "సంక్షిప్త అంచనా" },
  "activation period": { hi: "सक्रियता अवधि", te: "సక్రియ కాలం" },
  "approximate period": { hi: "अनुमानित अवधि", te: "అంచనా కాలం" },

  // ── Marriage/relationship labels ──
  "partner profile": { hi: "साथी प्रोफाइल", te: "భాగస్వామి ప్రొఫైల్" },
  "partner qualities": { hi: "साथी के गुण", te: "భాగస్వామి లక్షణాలు" },
  "marriage prospects": { hi: "विवाह की संभावनाएं", te: "వివాహ అవకాశాలు" },
  "compatibility": { hi: "अनुकूलता", te: "అనుకూలత" },
  "married life": { hi: "वैवाहिक जीवन", te: "వైవాహిక జీవితం" },
  "relationship dynamics": { hi: "संबंधों की गतिशीलता", te: "సంబంధ డైనమిక్స్" },

  // ── Remedy system labels ──
  "recommended gemstones": { hi: "अनुशंसित रत्न", te: "సిఫారసు చేయబడిన రత్నాలు" },
  "recommended mantras": { hi: "अनुशंसित मंत्र", te: "సిఫారసు చేయబడిన మంత్రాలు" },
  "favorable colors": { hi: "शुभ रंग", te: "అనుకూల రంగులు" },
  "favorable directions": { hi: "शुभ दिशाएं", te: "అనుకూల దిశలు" },
  "lucky numbers": { hi: "भाग्यशाली अंक", te: "అదృష్ట సంఖ్యలు" },
  "vedic foundation": { hi: "वैदिक आधार", te: "వేద ఆధారం" },
  "how remedies work": { hi: "उपाय कैसे काम करते हैं", te: "పరిహారాలు ఎలా పని చేస్తాయి" },
  "scientific perspective": { hi: "वैज्ञानिक दृष्टिकोण", te: "శాస్త్రీయ దృక్కోణం" },
  "scriptural reference": { hi: "शास्त्रीय संदर्भ", te: "శాస్త్ర సందర్భం" },
  "scientific basis": { hi: "वैज्ञानिक आधार", te: "శాస్త్రీయ ఆధారం" },
  "direction guidance": { hi: "दिशा मार्गदर्शन", te: "దిశ మార్గదర్శకం" },
  "gemstone": { hi: "रत्न", te: "రత్నం" },
  "mantra": { hi: "मंत्र", te: "మంత్రం" },
  "yantra": { hi: "यंत्र", te: "యంత్రం" },
  "donation": { hi: "दान", te: "దానం" },
  "fasting": { hi: "उपवास", te: "ఉపవాసం" },
  "rudraksha": { hi: "रुद्राक्ष", te: "రుద్రాక్ష" },

  // ── Yoga/Raj Yoga labels ──
  "formation criteria": { hi: "गठन मानदंड", te: "నిర్మాణ ప్రమాణాలు" },
  "in your chart": { hi: "आपकी कुंडली में", te: "మీ జాతకంలో" },
  "strength": { hi: "बल", te: "బలం" },
  "auspicious": { hi: "शुभ", te: "శుభం" },
  "inauspicious": { hi: "अशुभ", te: "అశుభం" },
  "present in chart": { hi: "कुंडली में उपस्थित", te: "జాతకంలో ఉంది" },
  "not present": { hi: "उपस्थित नहीं", te: "లేదు" },

  // ── Karaka labels ──
  "atmakaraka": { hi: "आत्मकारक", te: "ఆత్మకారక" },
  "amatyakaraka": { hi: "अमात्यकारक", te: "అమాత్యకారక" },
  "bhratrikaraka": { hi: "भ्रातृकारक", te: "భ్రాతృకారక" },
  "matrikaraka": { hi: "मातृकारक", te: "మాతృకారక" },
  "putrakaraka": { hi: "पुत्रकारक", te: "పుత్రకారక" },
  "gnatikaraka": { hi: "ज्ञातिकारक", te: "జ్ఞాతికారక" },
  "darakaraka": { hi: "दारकारक", te: "దారకారక" },

  // ── Health section labels ──
  "safe movement": { hi: "सुरक्षित गतिविधि", te: "సురక్షిత కదలిక" },
  "nutrition and hydration": { hi: "पोषण और जलयोजन", te: "పోషణ మరియు హైడ్రేషన్" },
  "body constitution": { hi: "शारीरिक प्रकृति", te: "శరీర తత్వం" },
  "vulnerable areas": { hi: "संवेदनशील क्षेत्र", te: "బలహీన ప్రాంతాలు" },
  "preventive care": { hi: "निवारक देखभाल", te: "నివారణ సంరక్షణ" },
  "mental health": { hi: "मानसिक स्वास्थ्य", te: "మానసిక ఆరోగ్యం" },
  "physical health": { hi: "शारीरिक स्वास्थ्य", te: "శారీరక ఆరోగ్యం" },
  "wellness tips": { hi: "स्वास्थ्य सुझाव", te: "ఆరోగ్య చిట్కాలు" },

  // ── Common adjectives/descriptors used as values ──
  "very strong": { hi: "बहुत मजबूत", te: "చాలా బలమైన" },
  "very weak": { hi: "बहुत कमज़ोर", te: "చాలా బలహీన" },
  "highly favorable": { hi: "अत्यंत अनुकूल", te: "అత్యంత అనుకూలం" },
  "moderately favorable": { hi: "मध्यम अनुकूल", te: "మధ్యస్థంగా అనుకూలం" },
  "unfavorable": { hi: "प्रतिकूल", te: "ప్రతికూలం" },
  "favorable": { hi: "अनुकूल", te: "అనుకూలం" },
  "exalted": { hi: "उच्च", te: "ఉచ్చ" },
  "debilitated": { hi: "नीच", te: "నీచ" },
  "combust": { hi: "अस्त", te: "అస్తం" },

  // ── Spiritual section labels ──
  "spiritual path": { hi: "आध्यात्मिक मार्ग", te: "ఆధ్యాత్మిక మార్గం" },
  "spiritual lesson": { hi: "आध्यात्मिक पाठ", te: "ఆధ్యాత్మిక పాఠం" },
  "meditation style": { hi: "ध्यान शैली", te: "ధ్యాన శైలి" },
  "karmic lessons": { hi: "कर्म के पाठ", te: "కర్మ పాఠాలు" },
  "past life karma": { hi: "पूर्वजन्म कर्म", te: "పూర్వజన్మ కర్మ" },
  "dharmic path": { hi: "धार्मिक मार्ग", te: "ధార్మిక మార్గం" },

  // ── Commonly repeated short phrases ──
  "no significant dosha found": { hi: "कोई महत्वपूर्ण दोष नहीं मिला", te: "ముఖ్యమైన దోషం కనుగొనబడలేదు" },
  "this yoga is present in your chart": { hi: "यह योग आपकी कुंडली में उपस्थित है", te: "ఈ యోగం మీ జాతకంలో ఉంది" },
  "based on your birth chart": { hi: "आपकी जन्म कुंडली के आधार पर", te: "మీ జన్మ జాతకం ఆధారంగా" },
  "overall assessment": { hi: "समग्र मूल्यांकन", te: "మొత్తం అంచనా" },
  "key highlights": { hi: "मुख्य विशेषताएं", te: "ముఖ్య విశేషాలు" },
  "important considerations": { hi: "महत्वपूर्ण विचार", te: "ముఖ్యమైన పరిగణనలు" },
  "positive aspects": { hi: "सकारात्मक पहलू", te: "సానుకూల అంశాలు" },
  "areas of concern": { hi: "चिंता के क्षेत्र", te: "ఆందోళన కలిగించే అంశాలు" },
  "general overview": { hi: "सामान्य अवलोकन", te: "సాధారణ అవలోకనం" },
  "detailed analysis": { hi: "विस्तृत विश्लेषण", te: "వివరణాత్మక విశ్లేషణ" },
  "practical advice": { hi: "व्यावहारिक सलाह", te: "ఆచరణాత్మక సలహా" },
  "spiritual advice": { hi: "आध्यात्मिक सलाह", te: "ఆధ్యాత్మిక సలహా" },
  "remedy advice": { hi: "उपाय सलाह", te: "పరిహార సలహా" },
  "caution note": { hi: "सावधानी नोट", te: "జాగ్రత్త గమనిక" },
  "moon saturn relationship": { hi: "चंद्र-शनि संबंध", te: "చంద్ర-శని సంబంధం" },

  // ── House-related phrases ──
  "house nature": { hi: "भाव प्रकृति", te: "భావ స్వభావం" },
  "house lord": { hi: "भाव स्वामी", te: "భావ అధిపతి" },
  "house occupants": { hi: "भाव के ग्रह", te: "భావ గ్రహాలు" },
  "natural significator": { hi: "प्राकृतिक कारक", te: "సహజ కారకుడు" },

  // ── Planet analysis common phrases ──
  "planetary strength": { hi: "ग्रह बल", te: "గ్రహ బలం" },
  "dignity analysis": { hi: "बल विश्लेषण", te: "బల విశ్లేషణ" },
  "aspect analysis": { hi: "दृष्टि विश्लेषण", te: "దృష్టి విశ్లేషణ" },
  "conjunction analysis": { hi: "युति विश्लेषण", te: "యుతి విశ్లేషణ" },
  "retrograde analysis": { hi: "वक्री विश्लेषण", te: "వక్రి విశ్లేషణ" },

  // ── Pillar section labels ──
  "dharma pillar": { hi: "धर्म स्तंभ", te: "ధర్మ స్తంభం" },
  "artha pillar": { hi: "अर्थ स्तंभ", te: "అర్థ స్తంభం" },
  "kama pillar": { hi: "काम स्तंभ", te: "కామ స్తంభం" },
  "moksha pillar": { hi: "मोक्ष स्तंभ", te: "మోక్ష స్తంభం" },

  // ── Common structural phrases ──
  "characteristics": { hi: "विशेषताएं", te: "లక్షణాలు" },
  "impact": { hi: "प्रभाव", te: "ప్రభావం" },
  "rationale": { hi: "तर्काधार", te: "హేతువు" },
  "narrative": { hi: "वर्णन", te: "వర్ణన" },
  "meaning": { hi: "अर्थ", te: "అర్థం" },
  "explanation": { hi: "स्पष्टीकरण", te: "వివరణ" },
  "insight": { hi: "अंतर्दृष्टि", te: "అంతర్దృష్టి" },
  "severity": { hi: "गंभीरता", te: "తీవ్రత" },
  "nature": { hi: "प्रकृति", te: "స్వభావం" },
  "occupation": { hi: "व्यवसाय", te: "వృత్తి" },

  // ── Miscellaneous high-frequency labels ──
  "section title": { hi: "शीर्षक", te: "శీర్షిక" },
  "sub heading": { hi: "उप शीर्षक", te: "ఉప శీర్షిక" },
  "heading": { hi: "शीर्षक", te: "శీర్షిక" },
  "title": { hi: "शीर्षक", te: "శీర్షిక" },

  // ── Lucky / unlucky labels (user-requested) ──
  "lucky colors": { hi: "शुभ रंग", te: "అదృష్ట రంగులు" },
  "lucky days": { hi: "शुभ दिन", te: "అదృష్ట దినాలు" },
  "lucky numbers": { hi: "शुभ अंक", te: "అదృష్ట సంఖ్యలు" },
  "unlucky numbers": { hi: "अशुभ अंक", te: "దురదృష్ట సంఖ్యలు" },
  "lucky number": { hi: "शुभ अंक", te: "అదృష్ట సంఖ్య" },
  "unlucky number": { hi: "अशुभ अंक", te: "దురదృష్ట సంఖ్య" },
  "lucky day": { hi: "शुभ दिन", te: "అదృష్ట దినం" },
  "lucky color": { hi: "शुभ रंग", te: "అదృష్ట రంగు" },
  "lucky direction": { hi: "शुभ दिशा", te: "అదృష్ట దిశ" },
  "lucky directions": { hi: "शुभ दिशाएं", te: "అదృష్ట దిశలు" },

  // ── Yoga detection / activation (user-requested) ──
  "total yogas detected": { hi: "कुल योग पाए गए", te: "మొత్తం యోగాలు గుర్తించబడ్డాయి" },
  "is switch due now?": { hi: "क्या परिवर्तन अपेक्षित है?", te: "మార్పు ఆశించబడుతుందా?" },
  "is switch due now": { hi: "क्या परिवर्तन अपेक्षित है", te: "మార్పు ఆశించబడుతుందా" },
  "switch due now": { hi: "परिवर्तन अपेक्षित", te: "మార్పు ఆశించబడుతుంది" },
  "activation": { hi: "सक्रियता", te: "సక్రియం" },
  "activation period": { hi: "सक्रियता अवधि", te: "సక్రియ కాలం" },
  "love": { hi: "प्रेम", te: "ప్రేమ" },
  "attraction": { hi: "आकर्षण", te: "ఆకర్షణ" },

  // ── Remedy / gemstone terms (user-requested) ──
  "gemstones": { hi: "रत्न", te: "రత్నాలు" },
  "gemstone": { hi: "रत्न", te: "రత్నం" },
  "recommended": { hi: "अनुशंसित", te: "సిఫారసు చేయబడిన" },
  "pronunciation": { hi: "उच्चारण", te: "ఉచ్చారణ" },
  "ideal work environment": { hi: "आदर्श कार्य वातावरण", te: "ఆదర్శ పని వాతావరణం" },
  "work environment": { hi: "कार्य वातावरण", te: "పని వాతావరణం" },
  "japa": { hi: "जप", te: "జపం" },
  "chanting": { hi: "जप", te: "జపం" },
  "recitation": { hi: "पाठ", te: "పఠనం" },

  // ── Career section labels ──
  "suitable professions": { hi: "उपयुक्त व्यवसाय", te: "తగిన వృత్తులు" },
  "career strengths": { hi: "कैरियर शक्तियां", te: "వృత్తి బలాలు" },
  "career challenges": { hi: "कैरियर चुनौतियां", te: "వృత్తి సవాళ్ళు" },
  "financial prospects": { hi: "वित्तीय संभावनाएं", te: "ఆర్థిక అవకాశాలు" },
  "business aptitude": { hi: "व्यापार योग्यता", te: "వ్యాపార సామర్థ్యం" },
  "leadership qualities": { hi: "नेतृत्व गुण", te: "నాయకత్వ లక్షణాలు" },
  "wealth accumulation": { hi: "धन संचय", te: "సంపద సేకరణ" },
  "income sources": { hi: "आय के स्रोत", te: "ఆదాయ వనరులు" },
  "professional growth": { hi: "पेशेवर विकास", te: "వృత్తిపరమైన వృద్ధి" },
  "work style": { hi: "कार्य शैली", te: "పని శైలి" },

  // ── Sade Sati labels ──
  "sade sati": { hi: "साढ़ेसाती", te: "సాడేసాతి" },
  "sade sati analysis": { hi: "साढ़ेसाती विश्लेषण", te: "సాడేసాతి విశ్లేషణ" },
  "sade sati status": { hi: "साढ़ेसाती स्थिति", te: "సాడేసాతి స్థితి" },
  "rising phase": { hi: "प्रारंभिक चरण", te: "ఆరోహణ దశ" },
  "peak phase": { hi: "चरम चरण", te: "శిఖర దశ" },
  "setting phase": { hi: "अंतिम चरण", te: "అస్తమయ దశ" },
  "not active": { hi: "सक्रिय नहीं", te: "సక్రియం కాదు" },
  "currently active": { hi: "वर्तमान में सक्रिय", te: "ప్రస్తుతం సక్రియం" },
  "saturn transit": { hi: "शनि गोचर", te: "శని గోచరం" },
  "moon sign": { hi: "चंद्र राशि", te: "చంద్ర రాశి" },
  "transit effects": { hi: "गोचर प्रभाव", te: "గోచర ప్రభావాలు" },
  "mental stress": { hi: "मानसिक तनाव", te: "మానసిక ఒత్తిడి" },
  "emotional challenges": { hi: "भावनात्मक चुनौतियां", te: "భావోద్వేగ సవాళ్ళు" },
  "financial difficulties": { hi: "वित्तीय कठिनाइयां", te: "ఆర్థిక కష్టాలు" },
  "career obstacles": { hi: "कैरियर बाधाएं", te: "వృత్తి అడ్డంకులు" },
  "health concerns": { hi: "स्वास्थ्य चिंताएं", te: "ఆరోగ్య ఆందోళనలు" },
  "relationship strain": { hi: "संबंधों में तनाव", te: "సంబంధాల్లో ఒత్తిడి" },

  // ── Marriage / relationship extra labels ──
  "love marriage": { hi: "प्रेम विवाह", te: "ప్రేమ వివాహం" },
  "arranged marriage": { hi: "व्यवस्थित विवाह", te: "వ్యవస్థీకృత వివాహం" },
  "marriage timing": { hi: "विवाह समय", te: "వివాహ సమయం" },
  "partner characteristics": { hi: "साथी की विशेषताएं", te: "భాగస్వామి లక్షణాలు" },
  "marital harmony": { hi: "वैवाहिक सामंजस्य", te: "వైవాహిక సామరస్యం" },
  "childbirth": { hi: "संतान", te: "సంతానం" },
  "children": { hi: "संतान", te: "సంతానం" },
  "family life": { hi: "पारिवारिक जीवन", te: "కుటుంబ జీవితం" },

  // ── Dosha names ──
  "manglik dosha": { hi: "मांगलिक दोष", te: "మాంగళిక దోషం" },
  "kaal sarp dosha": { hi: "कालसर्प दोष", te: "కాలసర్ప దోషం" },
  "pitra dosha": { hi: "पितृ दोष", te: "పితృ దోషం" },
  "nadi dosha": { hi: "नाड़ी दोष", te: "నాడి దోషం" },

  // ── More common section/field labels ──
  "current dasha": { hi: "वर्तमान दशा", te: "ప్రస్తుత దశ" },
  "dasha periods": { hi: "दशा अवधि", te: "దశ కాలాలు" },
  "mahadasha lord": { hi: "महादशा स्वामी", te: "మహాదశ అధిపతి" },
  "antardasha lord": { hi: "अंतर्दशा स्वामी", te: "అంతర్దశ అధిపతి" },
  "dasha balance": { hi: "दशा शेष", te: "దశ శేషం" },
  "planetary period": { hi: "ग्रह अवधि", te: "గ్రహ కాలం" },
  "favorable period": { hi: "अनुकूल अवधि", te: "అనుకూల కాలం" },
  "unfavorable period": { hi: "प्रतिकूल अवधि", te: "ప్రతికూల కాలం" },
  "transit analysis": { hi: "गोचर विश्लेषण", te: "గోచర విశ్లేషణ" },
  "birth chart": { hi: "जन्म कुंडली", te: "జన్మ జాతకం" },
  "divisional chart": { hi: "वर्गीय कुंडली", te: "విభజన జాతకం" },
  "chart analysis": { hi: "कुंडली विश्लेषण", te: "జాతక విశ్లేషణ" },
  "planet in sign": { hi: "ग्रह राशि में", te: "గ్రహం రాశిలో" },
  "planet in house": { hi: "ग्रह भाव में", te: "గ్రహం భావంలో" },
  "retrograde planet": { hi: "वक्री ग्रह", te: "వక్రి గ్రహం" },
  "combust planet": { hi: "अस्त ग्रह", te: "అస్త గ్రహం" },
  "exalted planet": { hi: "उच्च ग्रह", te: "ఉచ్చ గ్రహం" },
  "debilitated planet": { hi: "नीच ग्रह", te: "నీచ గ్రహం" },
  "benefic": { hi: "शुभ", te: "శుభ" },
  "malefic": { hi: "पाप", te: "పాప" },
  "benefic planet": { hi: "शुभ ग्रह", te: "శుభ గ్రహం" },
  "malefic planet": { hi: "पाप ग्रह", te: "పాప గ్రహం" },

  // ── Glossary section labels ──────────────────────────────────────────────
  "glossary": { hi: "शब्दकोश", te: "పారిభాషిక నిఘంటువు" },
  "glossary of vedic astrology terms": { hi: "वैदिक ज्योतिष शब्दकोश", te: "వైదిక జ్యోతిష్య పారిభాషిక నిఘంటువు" },
  "quick reference": { hi: "त्वरित संदर्भ", te: "శీఘ్ర సూచన" },
  "example": { hi: "उदाहरण", te: "ఉదాహరణ" },
  "related": { hi: "संबंधित", te: "సంబంధిత" },
  "related terms": { hi: "संबंधित शब्द", te: "సంబంధిత పదాలు" },
  "detailed explanation": { hi: "विस्तृत व्याख्या", te: "వివరణాత్మక వివరణ" },
  "brief definition": { hi: "संक्षिप्त परिभाषा", te: "సంక్షిప్త నిర్వచనం" },
  "term": { hi: "शब्द", te: "పదం" },

  // ── Common glossary term names (Vedic astrology) ─────────────────────────
  "rashi": { hi: "राशि", te: "రాశి" },
  "bhava": { hi: "भाव", te: "భావం" },
  "graha": { hi: "ग्रह", te: "గ్రహం" },
  "lagna": { hi: "लग्न", te: "లగ్నం" },
  "varga": { hi: "वर्ग", te: "వర్గం" },
  "ayanamsha": { hi: "अयनांश", te: "అయనాంశ" },
  "panchang": { hi: "पंचांग", te: "పంచాంగం" },
  "hora": { hi: "होरा", te: "హోర" },
  "muhurta": { hi: "मुहूर्त", te: "ముహూర్తం" },
  "karana": { hi: "करण", te: "కరణం" },
  "tithi": { hi: "तिथि", te: "తిథి" },
  "vimshottari": { hi: "विंशोत्तरी", te: "వింశోత్తరి" },
  "mahadasha": { hi: "महादशा", te: "మహాదశ" },
  "antardasha": { hi: "अंतर्दशा", te: "అంతర్దశ" },
  "pratyantardasha": { hi: "प्रत्यंतर्दशा", te: "ప్రత్యంతర్దశ" },
  "manglik": { hi: "मांगलिक", te: "మాంగళికం" },
  "kaal sarp": { hi: "कालसर्प", te: "కాలసర్పం" },
  "pitra": { hi: "पितृ", te: "పితృ" },
  "nadi": { hi: "नाड़ी", te: "నాడి" },
  "pancha mahapurusha": { hi: "पंचमहापुरुष", te: "పంచమహాపురుష" },
  "dhana yoga": { hi: "धन योग", te: "ధన యోగం" },
  "raja yoga": { hi: "राजयोग", te: "రాజ యోగం" },
  "neechabhanga": { hi: "नीचभंग", te: "నీచభంగం" },
  "viparita raja yoga": { hi: "विपरीत राजयोग", te: "విపరీత రాజ యోగం" },
  "gajakesari yoga": { hi: "गजकेसरी योग", te: "గజకేసరి యోగం" },
  "budhaditya yoga": { hi: "बुधादित्य योग", te: "బుధాదిత్య యోగం" },
  "hamsa yoga": { hi: "हंस योग", te: "హంస యోగం" },
  "malavya yoga": { hi: "मालव्य योग", te: "మాలవ్య యోగం" },
  "bhadra yoga": { hi: "भद्र योग", te: "భద్ర యోగం" },
  "ruchaka yoga": { hi: "रुचक योग", te: "రుచక యోగం" },
  "shasha yoga": { hi: "शश योग", te: "శశ యోగం" },
  "chandra mangal yoga": { hi: "चंद्र-मंगल योग", te: "చంద్ర-కుజ యోగం" },
  "adhi yoga": { hi: "अधि योग", te: "అధి యోగం" },
  "amala yoga": { hi: "अमल योग", te: "అమల యోగం" },

  // ── Table headers / common labels ────────────────────────────────────────
  "cause": { hi: "कारण", te: "కారణం" },
  "effect": { hi: "प्रभाव", te: "ప్రభావం" },
  "status": { hi: "स्थिति", te: "స్థితి" },
  "type": { hi: "प्रकार", te: "రకం" },
  "degree": { hi: "अंश", te: "డిగ్రీ" },
  "lord": { hi: "स्वामी", te: "అధిపతి" },
  "occupants": { hi: "स्थित ग्रह", te: "స్థిత గ్రహాలు" },
  "signification": { hi: "कारकत्व", te: "కారకత్వం" },
  "category": { hi: "श्रेणी", te: "వర్గం" },
  "category description": { hi: "श्रेणी विवरण", te: "వర్గ వివరణ" },
  "count": { hi: "संख्या", te: "సంఖ్య" },
  "deity": { hi: "देवता", te: "దేవత" },
  "element": { hi: "तत्व", te: "తత్వం" },
  "karaka": { hi: "कारक", te: "కారకం" },
  "soul significator": { hi: "आत्मा कारक", te: "ఆత్మ కారకం" },
  "spouse significator": { hi: "जीवनसाथी कारक", te: "జీవిత భాగస్వామి కారకం" },
  "career significator": { hi: "करियर कारक", te: "వృత్తి కారకం" },

  // ── Remedy / puja / ritual terms ─────────────────────────────────────────
  "wearing instructions": { hi: "धारण निर्देश", te: "ధరించు సూచనలు" },
  "quality guidelines": { hi: "गुणवत्ता दिशानिर्देश", te: "నాణ్యత మార్గదర్శకాలు" },
  "how to verify authenticity": { hi: "प्रामाणिकता कैसे जांचें", te: "ప్రామాణికతను ఎలా ధృవీకరించాలి" },
  "consecration method": { hi: "अभिषेक विधि", te: "ప్రతిష్ఠాపన విధానం" },
  "temple visit": { hi: "मंदिर दर्शन", te: "ఆలయ సందర్శన" },
  "favorable colors": { hi: "शुभ रंग", te: "అనుకూల రంగులు" },
  "colors to avoid": { hi: "अशुभ रंग", te: "నివారించవలసిన రంగులు" },
  "favorable directions": { hi: "शुभ दिशाएं", te: "అనుకూల దిశలు" },
  "directions to avoid": { hi: "अशुभ दिशाएं", te: "నివారించవలసిన దిశలు" },
  "sleep direction": { hi: "शयन दिशा", te: "నిద్ర దిశ" },
  "work direction": { hi: "कार्य दिशा", te: "పని దిశ" },
  "daily routine recommendations": { hi: "दैनिक दिनचर्या सुझाव", te: "రోజువారీ దినచర్య సిఫారసులు" },
  "daily spiritual practices": { hi: "दैनिक साधना", te: "రోజువారీ ఆధ్యాత్మిక సాధన" },
  "frequency": { hi: "आवृत्ति", te: "తరచుదనం" },
  "worship method": { hi: "पूजन विधि", te: "పూజ విధానం" },
  "metal": { hi: "धातु", te: "లోహం" },
  "finger": { hi: "उंगली", te: "వేలు" },
  "day to wear": { hi: "धारण का दिन", te: "ధరించవలసిన రోజు" },
  "japa count": { hi: "जप संख्या", te: "జపం సంఖ్య" },
  "immediate": { hi: "तुरंत", te: "వెంటనే" },
  "short-term": { hi: "अल्पकालिक", te: "స్వల్పకాలిక" },
  "long-term": { hi: "दीर्घकालिक", te: "దీర్ఘకాలిక" },
  "ongoing": { hi: "निरंतर", te: "నిరంతర" },
  "expected benefits": { hi: "अपेक्षित लाभ", te: "ఆశించిన ప్రయోజనాలు" },
  "procedure": { hi: "विधि", te: "విధానం" },
  "primary remedy": { hi: "प्रमुख उपाय", te: "ప్రధాన పరిహారం" },
  "priority remedies": { hi: "प्राथमिकता उपाय", te: "ప్రాధాన్య పరిహారాలు" },
  "recommended remedies": { hi: "अनुशंसित उपाय", te: "సిఫారసు చేయబడిన పరిహారాలు" },

  // ── Career section phrases ───────────────────────────────────────────────
  "right career for you": { hi: "आपके लिए सही करियर", te: "మీకు సరైన వృత్తి" },
  "suitable career fields": { hi: "उपयुक्त करियर क्षेत्र", te: "తగిన వృత్తి రంగాలు" },
  "fields to avoid": { hi: "परहेज करने योग्य क्षेत्र", te: "నివారించవలసిన రంగాలు" },
  "career timing & phases": { hi: "करियर समय और चरण", te: "వృత్తి సమయం మరియు దశలు" },
  "career switch insights": { hi: "करियर परिवर्तन दृष्टिकोण", te: "వృత్తి మార్పు అంతర్దృష్టి" },
  "success formula": { hi: "सफलता का सूत्र", te: "విజయ సూత్రం" },
  "wealth potential": { hi: "आर्थिक क्षमता", te: "సంపద సామర్థ్యం" },
  "business vs job": { hi: "व्यवसाय बनाम नौकरी", te: "వ్యాపారం vs ఉద్యోగం" },
  "ideal roles": { hi: "आदर्श भूमिकाएं", te: "ఆదర్శ పాత్రలు" },
  "current career phase": { hi: "वर्तमान करियर चरण", te: "ప్రస్తుత వృత్తి దశ" },
  "upcoming opportunities": { hi: "आगामी अवसर", te: "రాబోయే అవకాశాలు" },
  "future career changes": { hi: "भविष्य के करियर परिवर्तन", te: "భవిష్యత్ వృత్తి మార్పులు" },
  "preparation plan": { hi: "तैयारी योजना", te: "సన్నాహ ప్రణాళిక" },

  // ── Marriage section phrases ─────────────────────────────────────────────
  "key qualities": { hi: "प्रमुख गुण", te: "ముఖ్య లక్షణాలు" },
  "caution traits": { hi: "सतर्कता गुण", te: "జాగ్రత్త లక్షణాలు" },
  "relationship strengthening": { hi: "संबंध सुदृढ़ीकरण", te: "సంబంధ బలోపేతం" },
  "conflicts to avoid": { hi: "बचने योग्य संघर्ष", te: "నివారించవలసిన సంఘర్షణలు" },
  "favorable periods": { hi: "अनुकूल अवधि", te: "అనుకూల కాలాలు" },
  "challenging periods": { hi: "चुनौतीपूर्ण अवधि", te: "సవాలు కాలాలు" },
  "spouse characteristics": { hi: "जीवनसाथी के गुण", te: "జీవిత భాగస్వామి లక్షణాలు" },
  "marriage indications": { hi: "विवाह संकेत", te: "వివాహ సూచనలు" },
  "ideal partner": { hi: "आदर्श जीवनसाथी", te: "ఆదర్శ భాగస్వామి" },

  // ── Dasha section phrases ────────────────────────────────────────────────
  "focus areas": { hi: "मुख्य क्षेत्र", te: "ప్రధాన రంగాలు" },
  "life themes": { hi: "जीवन विषय", te: "జీవిత అంశాలు" },
  "key events to watch": { hi: "ध्यान देने योग्य घटनाएं", te: "గమనించవలసిన ముఖ్య సంఘటనలు" },
  "associated planet": { hi: "संबंधित ग्रह", te: "సంబంధిత గ్రహం" },
  "mahadasha period": { hi: "महादशा अवधि", te: "మహాదశ కాలం" },
  "dasha sequence": { hi: "दशा क्रम", te: "దశ వరుస" },
  "upcoming periods": { hi: "आगामी अवधि", te: "రాబోయే కాలాలు" },
  "period recommendations": { hi: "अवधि सुझाव", te: "కాలానుగుణ సిఫారసులు" },
  "current transit impact": { hi: "वर्तमान गोचर प्रभाव", te: "ప్రస్తుత గోచర ప్రభావం" },

  // ── Dosha section phrases ────────────────────────────────────────────────
  "affected areas": { hi: "प्रभावित क्षेत्र", te: "ప్రభావిత ప్రాంతాలు" },
  "total doshas detected": { hi: "कुल दोष पाए गए", te: "మొత్తం దోషాలు గుర్తించబడ్డాయి" },
  "nullified": { hi: "निष्प्रभावी", te: "నిరాకరించబడింది" },
  "major doshas": { hi: "प्रमुख दोष", te: "ప్రధాన దోషాలు" },
  "minor doshas": { hi: "लघु दोष", te: "చిన్న దోషాలు" },
  "dosha remedies": { hi: "दोष उपाय", te: "దోష పరిహారాలు" },

  // ── Yoga section phrases ─────────────────────────────────────────────────
  "formation in your chart": { hi: "आपकी कुंडली में निर्माण", te: "మీ జాతకంలో నిర్మాణం" },
  "practices to strengthen yogas": { hi: "योग सुदृढ़ीकरण अभ्यास", te: "యోగాలను బలపరచే సాధనలు" },
  "hidden blessings": { hi: "छिपे हुए आशीर्वाद", te: "దాగి ఉన్న ఆశీర్వాదాలు" },
  "yoga enhancement": { hi: "योग संवर्धन", te: "యోగ వృద్ధి" },
  "life predictions based on yogas": { hi: "योग आधारित जीवन भविष्यवाणी", te: "యోగాల ఆధారంగా జీవిత అంచనాలు" },
  "challenging yogas": { hi: "चुनौतीपूर्ण योग", te: "సవాలు యోగాలు" },

  // ── Rahu-Ketu section phrases ────────────────────────────────────────────
  "life lesson": { hi: "जीवन पाठ", te: "జీవిత పాఠం" },
  "desires": { hi: "इच्छाएं", te: "కోరికలు" },
  "growth areas": { hi: "विकास क्षेत्र", te: "వృద్ధి రంగాలు" },
  "natural talents": { hi: "प्राकृतिक प्रतिभाएं", te: "సహజ ప్రతిభలు" },
  "spiritual gifts": { hi: "आध्यात्मिक वरदान", te: "ఆధ్యాత్మిక వరాలు" },
  "karmic axis": { hi: "कर्म अक्ष", te: "కర్మ అక్షం" },
  "kaal sarp yoga": { hi: "कालसर्प योग", te: "కాలసర్ప యోగం" },

  // ── Sade Sati section phrases ────────────────────────────────────────────
  "approximate start": { hi: "अनुमानित प्रारंभ", te: "అంచనా ప్రారంభం" },
  "the three phases of your sade sati": { hi: "आपकी साढ़ेसाती के तीन चरण", te: "మీ సాడేసాతి మూడు దశలు" },
  "powerful remedies for sade sati": { hi: "साढ़ेसाती के प्रभावी उपाय", te: "సాడేసాతికి శక్తివంతమైన పరిహారాలు" },
  "master guidance for your sade sati": { hi: "साढ़ेसाती के लिए मुख्य मार्गदर्शन", te: "మీ సాడేసాతి కోసం ప్రధాన మార్గదర్శనం" },
  "the moon-saturn relationship in your chart": { hi: "आपकी कुंडली में चंद्र-शनि संबंध", te: "మీ జాతకంలో చంద్ర-శని సంబంధం" },
  "what to expect": { hi: "क्या अपेक्षा करें", te: "ఏమి ఆశించాలి" },
  "unique opportunities": { hi: "विशेष अवसर", te: "ప్రత్యేక అవకాశాలు" },

  // ── Numerology section phrases ───────────────────────────────────────────
  "birth number": { hi: "मूलांक", te: "జన్మ సంఖ్య" },
  "destiny number": { hi: "भाग्यांक", te: "భాగ్య సంఖ్య" },
  "personal year": { hi: "व्यक्तिगत वर्ष", te: "వ్యక్తిగత సంవత్సరం" },
  "sacred mantras": { hi: "पवित्र मंत्र", te: "పవిత్ర మంత్రాలు" },
  "lucky associations": { hi: "शुभ संबंध", te: "అదృష్ట సంబంధాలు" },
  "spiritual rating": { hi: "आध्यात्मिक स्तर", te: "ఆధ్యాత్మిక స్థాయి" },

  // ── Spiritual section phrases ────────────────────────────────────────────
  "ishta devata": { hi: "इष्ट देवता", te: "ఇష్ట దేవత" },
  "moksha path": { hi: "मोक्ष मार्ग", te: "మోక్ష మార్గం" },
  "meditation guidance": { hi: "ध्यान मार्गदर्शन", te: "ధ్యాన మార్గదర్శనం" },
  "the role of faith and intention": { hi: "श्रद्धा और संकल्प का महत्व", te: "విశ్వాసం మరియు సంకల్పం పాత్ర" },
  "traditional wisdom": { hi: "पारंपरिक ज्ञान", te: "సాంప్రదాయ జ్ఞానం" },
  "vedic foundation": { hi: "वैदिक आधार", te: "వేద ఆధారం" },
  "how remedies work": { hi: "उपाय कैसे कार्य करते हैं", te: "పరిహారాలు ఎలా పని చేస్తాయి" },

  // ── Health section phrases ───────────────────────────────────────────────
  "age context & safety": { hi: "आयु संदर्भ और सुरक्षा", te: "వయస్సు సందర్భం మరియు భద్రత" },
  "safe movement guidance": { hi: "सुरक्षित गतिविधि मार्गदर्शन", te: "సురక్షిత కదలిక మార్గదర్శనం" },
  "recovery & sleep": { hi: "पुनर्प्राप्ति और नींद", te: "రికవరీ మరియు నిద్ర" },
  "preventive health checks": { hi: "निवारक स्वास्थ्य जांच", te: "నివారణ ఆరోగ్య పరీక్షలు" },
  "what to avoid": { hi: "क्या न करें", te: "నివారించవలసినవి" },
  "general wellness note": { hi: "सामान्य स्वास्थ्य सुझाव", te: "సాధారణ ఆరోగ్య గమనిక" },
  "age group context": { hi: "आयु वर्ग संदर्भ", te: "వయస్సు వర్గ సందర్భం" },

  // ── Common verbs/phrases in report narrative ─────────────────────────────
  "this indicates": { hi: "यह संकेत करता है", te: "ఇది సూచిస్తుంది" },
  "as a result": { hi: "इसके परिणामस्वरूप", te: "ఫలితంగా" },
  "therefore": { hi: "अतः", te: "అందువల్ల" },
  "however": { hi: "हालांकि", te: "అయితే" },
  "moreover": { hi: "इसके अतिरिक्त", te: "అంతేకాకుండా" },
  "in addition": { hi: "इसके अलावा", te: "అదనంగా" },
  "on the other hand": { hi: "दूसरी ओर", te: "మరొక వైపు" },
  "for example": { hi: "उदाहरण के लिए", te: "ఉదాహరణకు" },
  "in particular": { hi: "विशेष रूप से", te: "ప్రత్యేకంగా" },
  "it is recommended": { hi: "यह अनुशंसित है", te: "ఇది సిఫారసు చేయబడింది" },
  "it is advisable": { hi: "यह उचित है", te: "ఇది సలహా ఇవ్వబడుతోంది" },
  "this is a very auspicious combination": { hi: "यह एक अत्यंत शुभ संयोजन है", te: "ఇది చాలా శుభమైన కలయిక" },
  "the native should": { hi: "जातक को चाहिए", te: "జాతకుడు చేయాలి" },
  "based on the analysis": { hi: "विश्लेषण के आधार पर", te: "విశ్లేషణ ఆధారంగా" },
  "according to vedic astrology": { hi: "वैदिक ज्योतिष के अनुसार", te: "వైదిక జ్యోతిష్యం ప్రకారం" },
  "in vedic astrology": { hi: "वैदिक ज्योतिष में", te: "వైదిక జ్యోతిష్యంలో" },
  "this combination": { hi: "यह संयोजन", te: "ఈ కలయిక" },
  "this placement": { hi: "यह स्थान", te: "ఈ స్థానం" },
  "this transit": { hi: "यह गोचर", te: "ఈ గోచరం" },
  "this period": { hi: "यह अवधि", te: "ఈ కాలం" },
  "during this time": { hi: "इस समय के दौरान", te: "ఈ సమయంలో" },
  "the following remedies are suggested": { hi: "निम्नलिखित उपाय सुझाए गए हैं", te: "క్రింది పరిహారాలు సూచించబడ్డాయి" },
  "you may experience": { hi: "आप अनुभव कर सकते हैं", te: "మీరు అనుభవించవచ్చు" },
  "it is important to note": { hi: "यह ध्यान देना महत्वपूर्ण है", te: "గమనించడం ముఖ్యం" },
  "overall": { hi: "समग्र", te: "మొత్తంగా" },
};

// ── Detection heuristics ────────────────────────────────────────────────────

/**
 * Keys whose values should NEVER be translated.
 * Checked against the immediate parent key of each string value.
 */
const SKIP_KEYS = new Set([
  // ── Metadata / internal ──
  "language", "generationMode", "languagePackVersion", "failureCode",
  "generation_language_mode", "language_qc", "report_data",
  "visitorId", "sessionId", "jobId", "id", "status",
  "generatedAt", "createdAt", "updatedAt", "completedAt",
  "errors", "qa", "languageQc", "languageQcPassed",
  "seerRawResponse", "seerRequest", "computationMeta",
  "translationSweep", "translationStats",
  "predictionSafety", "interpolation", "languagePipeline",

  // ── Birth details / coordinates ──
  "birthDetails", "latitude", "longitude", "timezone",
  "dateOfBirth", "timeOfBirth", "placeOfBirth",
  "city", "state", "country", "gender",

  // ── Planetary data (structural / identifiers) ──
  "planet", "sign", "house", "degree", "signIdx", "deg",
  "nakshatra", "pada", "lord", "dignity", "speed",
  "isRetro", "isRetrograde", "retrograde",

  // ── Dasha periods (dates/labels used as keys) ──
  "startDate", "endDate", "approximatePeriod", "duration",
  "dashaLabel", "period",

  // ── Names / pre-localized labels ──
  "name",       // planet/yoga names — handled by term maps
  "nameHindi", "nameTelugu", "nameEnglish",
  "purposeHindi", "purposeTelugu",

  // ── Charts / media ──
  "chartUrl", "imageUrl", "svgData", "svg", "charts",
  "type",       // chart type identifiers like "D1", "D9"

  // ── Scores / numeric metadata ──
  "score", "overallScore", "tokensUsed", "version",

  // ── Safety meta keys ──
  "medicalDisclaimer", "statusAssumption", "safeguardPolicy",
  "ageGroup", "whenApplicable",
]);

/**
 * Top-level report keys whose entire subtrees should be skipped.
 */
const SKIP_TOP_LEVEL = new Set([
  "seerRawResponse", "seerRequest", "computationMeta",
  "charts", "qa", "languageQc", "errors",
  "birthDetails",         // technical birth info, not prose
  "planetaryPositions", "ascendant", "charaKarakas",
  "aspects", "conjunctions",
  "translationSweep", "translationStats",
]);

/** Keys whose values are narrative and benefit most from translation */
const PRIORITY_KEYS = new Set([
  "overview", "interpretation", "advice", "description",
  "careerImpact", "relationshipImpact", "healthImpact",
  "financialImpact", "spiritualGrowth", "moonSaturnRelationship",
  "characteristics", "lifeFocus", "briefPrediction",
  "focus", "formation", "benefits", "inYourChart",
  "definition", "meaning", "explanation", "significance",
  "narrative", "prediction", "analysis", "guidance",
  "recommendation", "remedy", "challenge", "opportunity",
  "impact", "summary", "insight", "currentPhase",
  "timing", "rationale", "plan", "cautionNote",
  "practicalAdvice", "spiritualAdvice", "remedyAdvice",
  "title", "sectionTitle", "heading", "subHeading",
  // ── Glossary keys (generated in English, must be translated) ──
  "introduction", "category", "categoryDescription",
  "briefDefinition", "detailedExplanation", "term",
  "relatedTerms", "furtherReading",
]);

/** Check if a string value needs translation */
function needsTranslation(text: string): boolean {
  if (!text || text.length < MIN_STRING_LENGTH) return false;

  // Skip technical/date/time/URL values
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return false;
  if (/^\d{1,2}:\d{2}/.test(text)) return false;
  if (/^UTC[+-]/i.test(text)) return false;
  if (/^https?:\/\//.test(text)) return false;
  if (/^data:(image|application)\//.test(text)) return false;
  if (/^<svg[\s>]/.test(text)) return false;
  if (/^[A-Z]{2,5}([_-][A-Z0-9]+)?$/.test(text)) return false;
  if (/^[~≈]?\d+(\.\d+)?\s*(months?|years?|days?|hrs?)?$/i.test(text)) return false;
  if (/^(true|false|null|undefined|none|yes|no|active|inactive)$/i.test(text)) return false;
  if (/^[MFO]$/.test(text)) return false;
  if (/^(en|hi|te|native|legacy)$/i.test(text)) return false;

  // Count actual letters (strip spaces, digits, punctuation, symbols)
  const letters = text.replace(/[\s\d\p{P}\p{S}]/gu, "");
  if (letters.length < MIN_LETTER_COUNT) return false;

  const latinChars = (letters.match(/[A-Za-z]/g) || []).length;
  const latinRatio = latinChars / letters.length;

  // If >15% of letters are Latin, it needs translation
  return latinRatio > LATIN_RATIO_THRESHOLD;
}

// ── Report walker ───────────────────────────────────────────────────────────

interface TranslationEntry {
  path: string;     // JSON path like "career.overview" or "planets[0].analysis"
  original: string; // Original English text
  section: string;  // Top-level section key for grouping
}

/** Recursively walk the report and collect strings needing translation */
function collectEnglishStrings(
  obj: unknown,
  path: string,
  results: TranslationEntry[],
  parentKey?: string,
  topLevelSection?: string,
): void {
  // Skip if parent key is in the skip list
  if (parentKey && SKIP_KEYS.has(parentKey)) return;

  if (typeof obj === "string") {
    if (needsTranslation(obj)) {
      const section = topLevelSection || path.split(".")[0] || "_root";
      results.push({ path, original: obj, section });
    }
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      collectEnglishStrings(item, `${path}[${idx}]`, results, parentKey, topLevelSection);
    });
    return;
  }

  if (obj && typeof obj === "object") {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const fullPath = path ? `${path}.${key}` : key;
      const section = topLevelSection || key;

      // Skip entire top-level subtrees that are technical/debug data
      if (!path && SKIP_TOP_LEVEL.has(key)) continue;

      collectEnglishStrings(value, fullPath, results, key, section);
    }
  }
}

/** Set a value at a JSON path like "career.overview" or "planets[0].analysis" */
function setAtPath(obj: Record<string, any>, path: string, value: string): void {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (current[key] === undefined || current[key] === null) return;
    current = current[key];
  }
  const lastKey = parts[parts.length - 1];
  if (current && lastKey in current) {
    current[lastKey] = value;
  }
}

// ── Translation via Gemini ──────────────────────────────────────────────────

interface BatchResult {
  translations: Map<string, string>;
  tokensUsed: number;
  error?: string;
}

async function translateBatch(
  entries: TranslationEntry[],
  targetLanguage: string,
  sectionContext: string,
): Promise<BatchResult> {
  const langName = targetLanguage === "hi" ? "Hindi (हिन्दी)" : "Telugu (తెలుగు)";
  const scriptName = targetLanguage === "hi" ? "Devanagari" : "Telugu";

  // Build numbered list for Gemini — use double newline for clarity
  const numberedTexts = entries.map((e, i) => `[${i}] ${e.original}`).join("\n\n");

  const systemPrompt = `You are an expert Vedic astrology translator specializing in ${langName}.
Your task is to translate English text into natural, fluent ${langName} using ${scriptName} script.
These strings are from the "${sectionContext}" section of a Vedic astrology (Jyotish) report.

CRITICAL RULES:
1. Output MUST be entirely in ${scriptName} script — ZERO Latin/English characters whatsoever.
2. Vedic astrology terms must use their traditional ${langName} equivalents:
   - Planets: Sun→${targetLanguage === "hi" ? "सूर्य" : "సూర్యుడు"}, Moon→${targetLanguage === "hi" ? "चंद्रमा" : "చంద్రుడు"}, Mars→${targetLanguage === "hi" ? "मंगल" : "కుజుడు"}, Mercury→${targetLanguage === "hi" ? "बुध" : "బుధుడు"}, Jupiter→${targetLanguage === "hi" ? "गुरु" : "గురుడు"}, Venus→${targetLanguage === "hi" ? "शुक्र" : "శుక్రుడు"}, Saturn→${targetLanguage === "hi" ? "शनि" : "శని"}, Rahu→${targetLanguage === "hi" ? "राहु" : "రాహు"}, Ketu→${targetLanguage === "hi" ? "केतु" : "కేతు"}
   - Signs: Aries→${targetLanguage === "hi" ? "मेष" : "మేషం"}, Taurus→${targetLanguage === "hi" ? "वृषभ" : "వృషభం"}, Gemini→${targetLanguage === "hi" ? "मिथुन" : "మిథునం"}, Cancer→${targetLanguage === "hi" ? "कर्क" : "కర్కాటకం"}, Leo→${targetLanguage === "hi" ? "सिंह" : "సింహం"}, Virgo→${targetLanguage === "hi" ? "कन्या" : "కన్య"}, Libra→${targetLanguage === "hi" ? "तुला" : "తుల"}, Scorpio→${targetLanguage === "hi" ? "वृश्चिक" : "వృశ్చికం"}, Sagittarius→${targetLanguage === "hi" ? "धनु" : "ధనుస్సు"}, Capricorn→${targetLanguage === "hi" ? "मकर" : "మకరం"}, Aquarius→${targetLanguage === "hi" ? "कुम्भ" : "కుంభం"}, Pisces→${targetLanguage === "hi" ? "मीन" : "మీనం"}
   - Terms: Mahadasha→${targetLanguage === "hi" ? "महादशा" : "మహాదశ"}, Antardasha→${targetLanguage === "hi" ? "अंतर्दशा" : "అంతర్దశ"}, Yoga→${targetLanguage === "hi" ? "योग" : "యోగం"}, Dosha→${targetLanguage === "hi" ? "दोष" : "దోషం"}, Nakshatra→${targetLanguage === "hi" ? "नक्षत्र" : "నక్షత్రం"}, House→${targetLanguage === "hi" ? "भाव" : "భావం"}, Ascendant→${targetLanguage === "hi" ? "लग्न" : "లగ్నం"}
   - Life areas: Career→${targetLanguage === "hi" ? "करियर" : "వృత్తి"}, Marriage→${targetLanguage === "hi" ? "विवाह" : "వివాహం"}, Health→${targetLanguage === "hi" ? "स्वास्थ्य" : "ఆరోగ్యం"}, Prediction→${targetLanguage === "hi" ? "भविष्यवाणी" : "భవిష్యవాణి"}, Opportunity→${targetLanguage === "hi" ? "अवसर" : "అవకాశం"}, Challenge→${targetLanguage === "hi" ? "चुनौती" : "సవాలు"}, Impact→${targetLanguage === "hi" ? "प्रभाव" : "ప్రభావం"}, Remedy→${targetLanguage === "hi" ? "उपाय" : "పరిహారం"}, Mantra→${targetLanguage === "hi" ? "मंत्र" : "మంత్రం"}, Gemstone→${targetLanguage === "hi" ? "रत्न" : "రత్నం"}
3. If text mixes ${scriptName} and English, translate ONLY the English portions — preserve existing ${scriptName} text.
4. Keep numbers as Arabic numerals (1, 2, 3...) and dates in their original format.
5. Use natural ${langName} sentence structure — NOT word-by-word translation.
6. Maintain the same meaning, tone, detail level, and paragraph structure.
7. Preserve bullet points (•), dashes (—), and formatting markers.
8. Use ${targetLanguage === "hi" ? "।" : "."} for sentence endings instead of periods.
9. Do NOT add extra content, commentary, or explanations.
10. Even parenthetical English like "(Saturn)" must become "(${targetLanguage === "hi" ? "शनि" : "శని"})".`;

  const userPrompt = `Translate each numbered text below into ${langName}. Return a JSON object mapping the number to the translated text.

IMPORTANT: Every single English word must be translated to ${scriptName} script. Check your output has ZERO English words.

Input texts:
${numberedTexts}

Return format: { "0": "translated text for [0]", "1": "translated text for [1]", ... }`;

  const toolSchema = {
    type: "object" as const,
    properties: {
      translations: {
        type: "object" as const,
        description: `Map of index to translated ${langName} text`,
        additionalProperties: { type: "string" as const },
      },
    },
    required: ["translations"],
    additionalProperties: false,
  };

  const result = await callAgent<{ translations: Record<string, string> }>(
    systemPrompt,
    userPrompt,
    "submit_translations",
    `Translate English text to ${langName}`,
    toolSchema,
  );

  const map = new Map<string, string>();
  const tokensUsed = result.tokensUsed || 0;

  if (!result.success || !result.data) {
    return {
      translations: map,
      tokensUsed,
      error: result.error || "Translation call failed",
    };
  }

  const rawTranslations = result.data?.translations || result.data;

  for (const [idxStr, translated] of Object.entries(rawTranslations)) {
    const idx = parseInt(idxStr, 10);
    if (isNaN(idx) || idx >= entries.length || !translated) continue;

    const translatedText = String(translated).trim();
    if (!translatedText) continue;

    // Validate: the translation should NOT be mostly Latin
    const letters = translatedText.replace(/[\s\d\p{P}\p{S}]/gu, "");
    const latinChars = (letters.match(/[A-Za-z]/g) || []).length;
    const latinRatio = letters.length > 0 ? latinChars / letters.length : 0;
    if (latinRatio > 0.25) {
      console.warn(`⚠️ [TRANSLATE] Rejected translation for "${entries[idx].path}" — still ${(latinRatio * 100).toFixed(0)}% Latin`);
      continue;
    }

    // Validate: translated text should not be suspiciously short (dropped content)
    if (translatedText.length < entries[idx].original.length * 0.15 && entries[idx].original.length > 30) {
      console.warn(`⚠️ [TRANSLATE] Rejected suspiciously short translation for "${entries[idx].path}": ${translatedText.length} vs ${entries[idx].original.length} chars`);
      continue;
    }

    // Good translation
    map.set(entries[idx].path, translatedText);
  }

  return { translations: map, tokensUsed };
}

/**
 * Translate a batch with retry logic.
 * Retries up to MAX_RETRIES times with RETRY_DELAY_MS between attempts.
 */
async function translateBatchWithRetry(
  entries: TranslationEntry[],
  targetLanguage: string,
  sectionContext: string,
  batchLabel: string,
): Promise<BatchResult> {
  let lastResult: BatchResult | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await translateBatch(entries, targetLanguage, sectionContext);

      // If we got some translations (even partial), accept it
      if (result.translations.size > 0 || !result.error) {
        if (attempt > 0) {
          console.log(`✅ [TRANSLATE] Batch "${batchLabel}" succeeded on retry ${attempt}`);
        }
        return result;
      }

      lastResult = result;
      console.warn(`⚠️ [TRANSLATE] Batch "${batchLabel}" attempt ${attempt + 1}/${MAX_RETRIES + 1} failed: ${result.error}`);
    } catch (err: any) {
      lastResult = {
        translations: new Map(),
        tokensUsed: 0,
        error: `Crashed: ${err?.message || err}`,
      };
      console.error(`💥 [TRANSLATE] Batch "${batchLabel}" attempt ${attempt + 1}/${MAX_RETRIES + 1} crashed:`, err?.message || err);
    }

    // Wait before retry
    if (attempt < MAX_RETRIES) {
      console.log(`🔄 [TRANSLATE] Retrying batch "${batchLabel}" in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }

  console.error(`❌ [TRANSLATE] Batch "${batchLabel}" EXHAUSTED all ${MAX_RETRIES + 1} attempts`);
  return lastResult || { translations: new Map(), tokensUsed: 0, error: "All retries exhausted" };
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface TranslationResult {
  stringsFound: number;
  stringsTranslated: number;
  stringsCached: number;       // How many resolved from phrase cache (zero API cost)
  batchesSent: number;
  errors: string[];
  tokensUsed: number;
  remainingEnglishCount: number;
  sectionBreakdown: Record<string, { found: number; translated: number }>;
}

// ── Phrase cache lookup ─────────────────────────────────────────────────────

/**
 * Try to resolve a string from the phrase cache.
 * Uses case-insensitive exact match on trimmed text.
 * Returns the cached translation or null.
 */
function lookupPhraseCache(text: string, targetLanguage: string): string | null {
  const key = text.trim().toLowerCase();
  const entry = PHRASE_CACHE[key];
  if (!entry) return null;
  return targetLanguage === "hi" ? entry.hi : targetLanguage === "te" ? entry.te : null;
}

/**
 * Run the translation agent on the full report.
 * Modifies the report IN-PLACE and returns stats.
 *
 * The agent:
 *  1. Walks the entire report JSON tree
 *  2. Detects strings with >15% Latin characters
 *  3. Groups by report section for contextual translation
 *  4. Sends batches of 40 to Gemini — 3 batches at a time IN PARALLEL
 *  5. Validates each translation (rejects if still Latin or too short)
 *  6. Applies valid translations back to the report
 *
 * Performance: 3 concurrent × 40 strings = 120 strings per wave (~20-30s).
 * Typical Hindi report: ~100 strings → 3 batches → 1 wave → ~25s.
 */
export async function runTranslationSweep(
  report: Record<string, any>,
  targetLanguage: string,
): Promise<TranslationResult> {
  const stats: TranslationResult = {
    stringsFound: 0,
    stringsTranslated: 0,
    stringsCached: 0,
    batchesSent: 0,
    errors: [],
    tokensUsed: 0,
    remainingEnglishCount: 0,
    sectionBreakdown: {},
  };

  if (targetLanguage === "en") return stats;

  const langLabel = targetLanguage === "hi" ? "Hindi" : "Telugu";
  console.log(`🌐 [TRANSLATE] Starting ${langLabel} translation sweep (threshold: ${(LATIN_RATIO_THRESHOLD * 100).toFixed(0)}%, batch: ${BATCH_SIZE}, concurrency: ${CONCURRENCY}, retries: ${MAX_RETRIES}, cache: ${Object.keys(PHRASE_CACHE).length} phrases)...`);

  // ── Step 1: Collect all English strings ────────────────────────────────────
  const entries: TranslationEntry[] = [];
  collectEnglishStrings(report, "", entries);
  stats.stringsFound = entries.length;

  if (entries.length === 0) {
    console.log("✅ [TRANSLATE] No English strings found — report is clean!");
    return stats;
  }

  // Group by section for logging and context
  const sectionGroups = new Map<string, TranslationEntry[]>();
  for (const entry of entries) {
    if (!sectionGroups.has(entry.section)) sectionGroups.set(entry.section, []);
    sectionGroups.get(entry.section)!.push(entry);
  }

  // Log discovery summary
  console.log(`🔍 [TRANSLATE] Found ${entries.length} English strings across ${sectionGroups.size} sections:`);
  for (const [sec, secEntries] of sectionGroups) {
    console.log(`  📄 ${sec}: ${secEntries.length} strings`);
    stats.sectionBreakdown[sec] = { found: secEntries.length, translated: 0 };
  }

  // ── Step 2: Apply phrase cache FIRST (instant, zero API cost) ─────────────
  const uncachedEntries: TranslationEntry[] = [];

  for (const entry of entries) {
    const cached = lookupPhraseCache(entry.original, targetLanguage);
    if (cached) {
      // Instant translation from cache — no API call needed
      setAtPath(report, entry.path, cached);
      stats.stringsCached++;
      stats.stringsTranslated++;
      if (stats.sectionBreakdown[entry.section]) {
        stats.sectionBreakdown[entry.section].translated++;
      }
    } else {
      uncachedEntries.push(entry);
    }
  }

  console.log(`⚡ [TRANSLATE] Phrase cache: ${stats.stringsCached}/${entries.length} resolved instantly (${uncachedEntries.length} need Gemini)`);

  // If all strings resolved from cache, we're done!
  if (uncachedEntries.length === 0) {
    console.log("✅ [TRANSLATE] All strings resolved from phrase cache — no Gemini calls needed!");
    stats.remainingEnglishCount = 0;
    return stats;
  }

  // ── Step 3: Sort uncached entries by priority ─────────────────────────────
  uncachedEntries.sort((a, b) => {
    const lastKeyA = a.path.split(".").pop()?.replace(/\[\d+\]$/, "") || "";
    const lastKeyB = b.path.split(".").pop()?.replace(/\[\d+\]$/, "") || "";
    const aPriority = PRIORITY_KEYS.has(lastKeyA) ? 0 : 1;
    const bPriority = PRIORITY_KEYS.has(lastKeyB) ? 0 : 1;
    return aPriority - bPriority;
  });

  // ── Step 4: Build batch descriptors for uncached strings ──────────────────
  interface BatchDescriptor {
    batch: TranslationEntry[];
    primarySection: string;
    batchLabel: string;
    batchIndex: number;
  }

  const allBatches: BatchDescriptor[] = [];
  for (let i = 0; i < uncachedEntries.length; i += BATCH_SIZE) {
    const batch = uncachedEntries.slice(i, i + BATCH_SIZE);
    const batchIndex = allBatches.length + 1;

    // Determine primary section for context
    const sectionCounts = new Map<string, number>();
    for (const e of batch) {
      sectionCounts.set(e.section, (sectionCounts.get(e.section) || 0) + 1);
    }
    const primarySection = [...sectionCounts.entries()]
      .sort((a, b) => b[1] - a[1])[0]?.[0] || "general";

    allBatches.push({
      batch,
      primarySection,
      batchLabel: `batch-${batchIndex} (${primarySection}, ${batch.length} strings)`,
      batchIndex,
    });
  }

  console.log(`📦 [TRANSLATE] ${allBatches.length} batches to translate via Gemini (${CONCURRENCY} concurrent)...`);

  // ── Step 5: Execute batches in PARALLEL waves of CONCURRENCY ──────────────
  for (let waveStart = 0; waveStart < allBatches.length; waveStart += CONCURRENCY) {
    const wave = allBatches.slice(waveStart, waveStart + CONCURRENCY);
    const waveNum = Math.floor(waveStart / CONCURRENCY) + 1;
    console.log(`🚀 [TRANSLATE] Wave ${waveNum}: launching ${wave.length} batches in parallel...`);

    const waveResults = await Promise.allSettled(
      wave.map(async (desc) => {
        stats.batchesSent++;
        console.log(`🔄 [TRANSLATE] ${desc.batchLabel}: translating...`);
        const result = await translateBatchWithRetry(
          desc.batch,
          targetLanguage,
          desc.primarySection,
          desc.batchLabel,
        );
        return { desc, result };
      }),
    );

    // Apply results from this wave
    for (const settled of waveResults) {
      if (settled.status === "rejected") {
        const msg = `Wave ${waveNum} batch rejected: ${settled.reason}`;
        console.error(`❌ [TRANSLATE] ${msg}`);
        stats.errors.push(msg);
        continue;
      }

      const { desc, result } = settled.value;
      const { translations, tokensUsed, error } = result;
      stats.tokensUsed += tokensUsed;

      if (error && translations.size === 0) {
        stats.errors.push(`${desc.batchLabel}: ${error}`);
      }

      // Apply translations
      for (const [path, translated] of translations) {
        setAtPath(report, path, translated);
        stats.stringsTranslated++;

        const entry = desc.batch.find((e) => e.path === path);
        if (entry && stats.sectionBreakdown[entry.section]) {
          stats.sectionBreakdown[entry.section].translated++;
        }
      }

      console.log(`✅ [TRANSLATE] ${desc.batchLabel}: ${translations.size}/${desc.batch.length} translated (${tokensUsed} tokens)`);
    }
  }

  // Estimate remaining (without costly re-scan — just count untranslated)
  stats.remainingEnglishCount = Math.max(0, stats.stringsFound - stats.stringsTranslated);

  console.log(`🏁 [TRANSLATE] Sweep complete: ${stats.stringsTranslated}/${stats.stringsFound} translated (${stats.stringsCached} cached + ${stats.stringsTranslated - stats.stringsCached} via Gemini) in ${stats.batchesSent} batches (${stats.tokensUsed} tokens, ~${stats.remainingEnglishCount} remaining)`);
  return stats;
}

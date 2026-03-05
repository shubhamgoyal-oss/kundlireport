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

import { callAgent, type AgentResponse } from "./agent-base";

// ── Configuration ────────────────────────────────────────────────────────────

const BATCH_SIZE = 40;          // Strings per Gemini call (bigger = fewer round-trips)
const CONCURRENCY = 4;          // Run this many batches in parallel per wave
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

const PHRASE_CACHE: Record<string, { hi: string; te: string; ta?: string; kn?: string; mr?: string; gu?: string }> = {
  // ── Section headings & titles ──
  "overview": { hi: "अवलोकन", te: "అవలోకనం", ta: "அவலோகனம்" },
  "interpretation": { hi: "व्याख्या", te: "వ్యాఖ్యానం", ta: "விளக்கம்" },
  "placement": { hi: "स्थान", te: "స్థానం", ta: "நிலை" },
  "description": { hi: "विवरण", te: "వివరణ", ta: "விவரணை" },
  "definition": { hi: "परिभाषा", te: "నిర్వచనం", ta: "வரையறை" },
  "significance": { hi: "महत्व", te: "ప్రాముఖ్యత", ta: "முக்கியத்துவம்" },
  "analysis": { hi: "विश्लेषण", te: "విశ్లేషణ", ta: "பகுப்பாய்வு" },
  "predictions": { hi: "भविष्यवाणियां", te: "అంచనాలు", ta: "கணிப்புகள்" },
  "prediction": { hi: "भविष्यवाणी", te: "అంచనా", ta: "கணிப்பு" },
  "summary": { hi: "सारांश", te: "సారాంశం", ta: "சுருக்கம்" },
  "guidance": { hi: "मार्गदर्शन", te: "మార్గదర్శకం", ta: "வழிகாட்டல்" },
  "recommendations": { hi: "सुझाव", te: "సిఫారసులు", ta: "பரிந்துரைகள்" },
  "advice": { hi: "सलाह", te: "సలహా", ta: "ஆலோசனை" },
  "benefits": { hi: "लाभ", te: "ప్రయోజనాలు", ta: "பலன்கள்" },
  "effects": { hi: "प्रभाव", te: "ప్రభావాలు", ta: "விளைவுகள்" },
  "remedies": { hi: "उपाय", te: "పరిహారాలు", ta: "பரிகாரங்கள்" },
  "strengths": { hi: "शक्तियां", te: "బలాలు", ta: "வலிமைகள்" },
  "challenges": { hi: "चुनौतियां", te: "సవాళ్ళు", ta: "சவால்கள்" },
  "opportunities": { hi: "अवसर", te: "అవకాశాలు", ta: "வாய்ப்புகள்" },
  "timing": { hi: "समय", te: "సమయం", ta: "நேரம்" },
  "formation": { hi: "गठन", te: "నిర్మాణం", ta: "அமைப்பு" },

  // ── Life area section headings ──
  "career analysis": { hi: "कैरियर विश्लेषण", te: "వృత్తి విశ్లేషణ", ta: "தொழில் பகுப்பாய்வு" },
  "marriage analysis": { hi: "विवाह विश्लेषण", te: "వివాహ విశ్లేషణ", ta: "திருமண பகுப்பாய்வு" },
  "health guidance": { hi: "स्वास्थ्य मार्गदर्शन", te: "ఆరోగ్య మార్గదర్శకం", ta: "ஆரோக்கிய வழிகாட்டல்" },
  "health analysis": { hi: "स्वास्थ्य विश्लेषण", te: "ఆరోగ్య విశ్లేషణ", ta: "ஆரோக்கிய பகுப்பாய்வு" },
  "financial analysis": { hi: "वित्तीय विश्लेषण", te: "ఆర్థిక విశ్లేషణ", ta: "நிதி பகுப்பாய்வு" },
  "spiritual analysis": { hi: "आध्यात्मिक विश्लेषण", te: "ఆధ్యాత్మిక విశ్లేషణ", ta: "ஆன்மீக பகுப்பாய்வு" },
  "planetary positions": { hi: "ग्रह स्थितियां", te: "గ్రహ స్థితులు", ta: "கிரக நிலைகள்" },
  "house analysis": { hi: "भाव विश्लेषण", te: "భావ విశ్లేషణ", ta: "பாவ பகுப்பாய்வு" },
  "dasha analysis": { hi: "दशा विश्लेषण", te: "దశ విశ్లేషణ", ta: "தசா பகுப்பாய்வு" },
  "yoga analysis": { hi: "योग विश्लेषण", te: "యోగ విశ్లేషణ", ta: "யோக பகுப்பாய்வு" },
  "dosha analysis": { hi: "दोष विश्लेषण", te: "దోష విశ్లేషణ", ta: "தோஷ பகுப்பாய்வு" },

  // ── Impact categories ──
  "career impact": { hi: "कैरियर प्रभाव", te: "వృత్తి ప్రభావం", ta: "தொழில் தாக்கம்" },
  "relationship impact": { hi: "संबंध प्रभाव", te: "సంబంధ ప్రభావం", ta: "உறவு தாக்கம்" },
  "health impact": { hi: "स्वास्थ्य प्रभाव", te: "ఆరోగ్య ప్రభావం", ta: "ஆரோக்கிய தாக்கம்" },
  "financial impact": { hi: "वित्तीय प्रभाव", te: "ఆర్థిక ప్రభావం", ta: "நிதி தாக்கம்" },
  "spiritual growth": { hi: "आध्यात्मिक विकास", te: "ఆధ్యాత్మిక వృద్ధి", ta: "ஆன்மீக வளர்ச்சி" },

  // ── Dasha system labels ──
  "current phase": { hi: "वर्तमान चरण", te: "ప్రస్తుత దశ", ta: "தற்போதைய கட்டம்" },
  "current mahadasha": { hi: "वर्तमान महादशा", te: "ప్రస్తుత మహాదశ", ta: "தற்போதைய மகாதசை" },
  "current antardasha": { hi: "वर्तमान अंतर्दशा", te: "ప్రస్తుత అంతర్దశ", ta: "தற்போதைய அந்தர்தசை" },
  "focal areas": { hi: "मुख्य क्षेत्र", te: "ప్రధాన రంగాలు", ta: "முக்கிய பகுதிகள்" },
  "focus areas": { hi: "मुख्य क्षेत्र", te: "ప్రధాన రంగాలు", ta: "முக்கிய பகுதிகள்" },
  "key events": { hi: "प्रमुख घटनाएं", te: "ముఖ్య సంఘటనలు", ta: "முக்கிய நிகழ்வுகள்" },
  "key themes": { hi: "प्रमुख विषय", te: "ముఖ్య అంశాలు", ta: "முக்கிய கருப்பொருள்கள்" },
  "life focus": { hi: "जीवन का केंद्र", te: "జీవిత కేంద్రం", ta: "வாழ்க்கையின் மையம்" },
  "brief prediction": { hi: "संक्षिप्त भविष्यवाणी", te: "సంక్షిప్త అంచనా", ta: "சுருக்கமான கணிப்பு" },
  "activation period": { hi: "सक्रियता अवधि", te: "సక్రియ కాలం", ta: "செயல்படும் காலம்" },
  "approximate period": { hi: "अनुमानित अवधि", te: "అంచనా కాలం", ta: "தோராயமான காலம்" },

  // ── Marriage/relationship labels ──
  "partner profile": { hi: "साथी प्रोफाइल", te: "భాగస్వామి ప్రొఫైల్", ta: "வாழ்க்கைத்துணை விவரம்" },
  "partner qualities": { hi: "साथी के गुण", te: "భాగస్వామి లక్షణాలు", ta: "வாழ்க்கைத்துணையின் குணங்கள்" },
  "marriage prospects": { hi: "विवाह की संभावनाएं", te: "వివాహ అవకాశాలు", ta: "திருமண வாய்ப்புகள்" },
  "compatibility": { hi: "अनुकूलता", te: "అనుకూలత", ta: "பொருத்தம்" },
  "married life": { hi: "वैवाहिक जीवन", te: "వైవాహిక జీవితం", ta: "திருமண வாழ்க்கை" },
  "relationship dynamics": { hi: "संबंधों की गतिशीलता", te: "సంబంధ డైనమిక్స్", ta: "உறவு இயக்கவியல்" },

  // ── Remedy system labels ──
  "recommended gemstones": { hi: "अनुशंसित रत्न", te: "సిఫారసు చేయబడిన రత్నాలు", ta: "பரிந்துரைக்கப்பட்ட ரத்தினங்கள்" },
  "recommended mantras": { hi: "अनुशंसित मंत्र", te: "సిఫారసు చేయబడిన మంత్రాలు", ta: "பரிந்துரைக்கப்பட்ட மந்திரங்கள்" },
  "favorable colors": { hi: "शुभ रंग", te: "అనుకూల రంగులు", ta: "சுப நிறங்கள்" },
  "favorable directions": { hi: "शुभ दिशाएं", te: "అనుకూల దిశలు", ta: "சுப திசைகள்" },
  "lucky numbers": { hi: "भाग्यशाली अंक", te: "అదృష్ట సంఖ్యలు", ta: "அதிர்ஷ்ட எண்கள்" },
  "vedic foundation": { hi: "वैदिक आधार", te: "వేద ఆధారం", ta: "வேத அடிப்படை" },
  "how remedies work": { hi: "उपाय कैसे काम करते हैं", te: "పరిహారాలు ఎలా పని చేస్తాయి", ta: "பரிகாரங்கள் எவ்வாறு செயல்படுகின்றன" },
  "scientific perspective": { hi: "वैज्ञानिक दृष्टिकोण", te: "శాస్త్రీయ దృక్కోణం", ta: "விஞ்ஞான கண்ணோட்டம்" },
  "scriptural reference": { hi: "शास्त्रीय संदर्भ", te: "శాస్త్ర సందర్భం", ta: "சாஸ்திர குறிப்பு" },
  "scientific basis": { hi: "वैज्ञानिक आधार", te: "శాస్త్రీయ ఆధారం", ta: "விஞ்ஞான அடிப்படை" },
  "direction guidance": { hi: "दिशा मार्गदर्शन", te: "దిశ మార్గదర్శకం", ta: "திசை வழிகாட்டல்" },
  "gemstone": { hi: "रत्न", te: "రత్నం", ta: "ரத்தினம்" },
  "mantra": { hi: "मंत्र", te: "మంత్రం", ta: "மந்திரம்" },
  "yantra": { hi: "यंत्र", te: "యంత్రం", ta: "யந்திரம்" },
  "donation": { hi: "दान", te: "దానం", ta: "தானம்" },
  "fasting": { hi: "उपवास", te: "ఉపవాసం", ta: "விரதம்" },
  "rudraksha": { hi: "रुद्राक्ष", te: "రుద్రాక్ష", ta: "ருத்ராக்ஷம்" },

  // ── Yoga/Raj Yoga labels ──
  "formation criteria": { hi: "गठन मानदंड", te: "నిర్మాణ ప్రమాణాలు", ta: "அமைப்பு அளவுகோல்" },
  "in your chart": { hi: "आपकी कुंडली में", te: "మీ జాతకంలో", ta: "உங்கள் குண்டலியில்" },
  "strength": { hi: "बल", te: "బలం", ta: "வலிமை" },
  "auspicious": { hi: "शुभ", te: "శుభం", ta: "சுபம்" },
  "inauspicious": { hi: "अशुभ", te: "అశుభం", ta: "அசுபம்" },
  "present in chart": { hi: "कुंडली में उपस्थित", te: "జాతకంలో ఉంది", ta: "குண்டலியில் உள்ளது" },
  "not present": { hi: "उपस्थित नहीं", te: "లేదు", ta: "இல்லை" },

  // ── Karaka labels ──
  "atmakaraka": { hi: "आत्मकारक", te: "ఆత్మకారక", ta: "ஆத்மகாரகன்" },
  "amatyakaraka": { hi: "अमात्यकारक", te: "అమాత్యకారక", ta: "அமாத்யகாரகன்" },
  "bhratrikaraka": { hi: "भ्रातृकारक", te: "భ్రాతృకారక", ta: "பிராத்ருகாரகன்" },
  "matrikaraka": { hi: "मातृकारक", te: "మాతృకారక", ta: "மாத்ருகாரகன்" },
  "putrakaraka": { hi: "पुत्रकारक", te: "పుత్రకారక", ta: "புத்ரகாரகன்" },
  "gnatikaraka": { hi: "ज्ञातिकारक", te: "జ్ఞాతికారక", ta: "ஞாதிகாரகன்" },
  "darakaraka": { hi: "दारकारक", te: "దారకారక", ta: "தாரகாரகன்" },

  // ── Health section labels ──
  "safe movement": { hi: "सुरक्षित गतिविधि", te: "సురక్షిత కదలిక", ta: "பாதுகாப்பான இயக்கம்" },
  "nutrition and hydration": { hi: "पोषण और जलयोजन", te: "పోషణ మరియు హైడ్రేషన్", ta: "ஊட்டச்சத்தும் நீர்ச்சத்தும்" },
  "body constitution": { hi: "शारीरिक प्रकृति", te: "శరీర తత్వం", ta: "உடல் அமைப்பு" },
  "vulnerable areas": { hi: "संवेदनशील क्षेत्र", te: "బలహీన ప్రాంతాలు", ta: "பாதிக்கப்படும் பகுதிகள்" },
  "preventive care": { hi: "निवारक देखभाल", te: "నివారణ సంరక్షణ", ta: "தடுப்பு பராமரிப்பு" },
  "mental health": { hi: "मानसिक स्वास्थ्य", te: "మానసిక ఆరోగ్యం", ta: "மன ஆரோக்கியம்" },
  "physical health": { hi: "शारीरिक स्वास्थ्य", te: "శారీరక ఆరోగ్యం", ta: "உடல் ஆரோக்கியம்" },
  "wellness tips": { hi: "स्वास्थ्य सुझाव", te: "ఆరోగ్య చిట్కాలు", ta: "ஆரோக்கிய குறிப்புகள்" },

  // ── Zodiac sign names (≥8 chars that pass MIN_STRING_LENGTH) ──
  "aquarius": { hi: "कुम्भ", te: "కుంభం", ta: "கும்பம்" },
  "capricorn": { hi: "मकर", te: "మకరం", ta: "மகரம்" },
  "sagittarius": { hi: "धनु", te: "ధనస్సు", ta: "தனுசு" },

  // ── Dignity / placement terms (≥8 chars) ──
  "own sign": { hi: "स्वराशि", te: "స్వరాశి", ta: "சுயராசி" },
  "own house": { hi: "स्वगृही", te: "స్వగృహం", ta: "சுயவீடு" },
  "mooltrikona": { hi: "मूलत्रिकोण", te: "మూలత్రికోణం", ta: "மூலத்திரிகோணம்" },
  "moolatrikona": { hi: "मूलत्रिकोण", te: "మూలత్రికోణం", ta: "மூலத்திரிகோணம்" },
  "retrograde": { hi: "वक्री", te: "వక్రి", ta: "வக்ரம்" },
  "ascendant": { hi: "लग्न", te: "లగ్నం", ta: "லக்னம்" },

  // ── Nakshatra names (≥8 chars that pass MIN_STRING_LENGTH) ──
  "ashlesha": { hi: "आश्लेषा", te: "ఆశ్లేష", ta: "ஆயில்யம்" },
  "krittika": { hi: "कृत्तिका", te: "కృత్తిక", ta: "கிருத்திகை" },
  "mrigashira": { hi: "मृगशिरा", te: "మృగశిర", ta: "மிருகசீரிடம்" },
  "punarvasu": { hi: "पुनर्वसु", te: "పునర్వసు", ta: "புனர்பூசம்" },
  "uttara phalguni": { hi: "उत्तर फाल्गुनी", te: "ఉత్తర ఫల్గుణి", ta: "உத்திரம்" },
  "purva phalguni": { hi: "पूर्व फाल्गुनी", te: "పూర్వ ఫల్గుణి", ta: "பூரம்" },
  "vishakha": { hi: "विशाखा", te: "విశాఖ", ta: "விசாகம்" },
  "anuradha": { hi: "अनुराधा", te: "అనురాధ", ta: "அனுஷம்" },
  "jyeshtha": { hi: "ज्येष्ठा", te: "జ్యేష్ఠ", ta: "கேட்டை" },
  "purva ashadha": { hi: "पूर्वाषाढ़ा", te: "పూర్వాషాఢ", ta: "பூராடம்" },
  "uttara ashadha": { hi: "उत्तराषाढ़ा", te: "ఉత్తరాషాఢ", ta: "உத்திராடம்" },
  "shravana": { hi: "श्रवण", te: "శ్రవణం", ta: "திருவோணம்" },
  "dhanishta": { hi: "धनिष्ठा", te: "ధనిష్ఠ", ta: "அவிட்டம்" },
  "shatabhisha": { hi: "शतभिषा", te: "శతభిషం", ta: "சதயம்" },
  "purva bhadrapada": { hi: "पूर्वभाद्रपद", te: "పూర్వభాద్రపద", ta: "பூரட்டாதி" },
  "uttara bhadrapada": { hi: "उत्तरभाद्रपद", te: "ఉత్తరభాద్రపద", ta: "உத்திரட்டாதி" },

  // ── Common adjectives/descriptors used as values ──
  "very strong": { hi: "बहुत मजबूत", te: "చాలా బలమైన", ta: "மிகவும் வலிமை" },
  "very weak": { hi: "बहुत कमज़ोर", te: "చాలా బలహీన", ta: "மிகவும் பலவீனம்" },
  "highly favorable": { hi: "अत्यंत अनुकूल", te: "అత్యంత అనుకూలం", ta: "மிகவும் சாதகமான" },
  "moderately favorable": { hi: "मध्यम अनुकूल", te: "మధ్యస్థంగా అనుకూలం", ta: "மிதமாக சாதகமான" },
  "unfavorable": { hi: "प्रतिकूल", te: "ప్రతికూలం", ta: "பாதகமான" },
  "favorable": { hi: "अनुकूल", te: "అనుకూలం", ta: "சாதகமான" },
  "exalted": { hi: "उच्च", te: "ఉచ్చ", ta: "உச்சம்" },
  "debilitated": { hi: "नीच", te: "నీచ", ta: "நீசம்" },
  "combust": { hi: "अस्त", te: "అస్తం", ta: "அஸ்தமனம்" },

  // ── Spiritual section labels ──
  "spiritual path": { hi: "आध्यात्मिक मार्ग", te: "ఆధ్యాత్మిక మార్గం", ta: "ஆன்மீக பாதை" },
  "spiritual lesson": { hi: "आध्यात्मिक पाठ", te: "ఆధ్యాత్మిక పాఠం", ta: "ஆன்மீக பாடம்" },
  "meditation style": { hi: "ध्यान शैली", te: "ధ్యాన శైలి", ta: "தியான முறை" },
  "karmic lessons": { hi: "कर्म के पाठ", te: "కర్మ పాఠాలు", ta: "கர்ம பாடங்கள்" },
  "past life karma": { hi: "पूर्वजन्म कर्म", te: "పూర్వజన్మ కర్మ", ta: "முற்பிறப்பு கர்மா" },
  "dharmic path": { hi: "धार्मिक मार्ग", te: "ధార్మిక మార్గం", ta: "தர்ம பாதை" },

  // ── Commonly repeated short phrases ──
  "no significant dosha found": { hi: "कोई महत्वपूर्ण दोष नहीं मिला", te: "ముఖ్యమైన దోషం కనుగొనబడలేదు", ta: "குறிப்பிடத்தக்க தோஷம் இல்லை" },
  "this yoga is present in your chart": { hi: "यह योग आपकी कुंडली में उपस्थित है", te: "ఈ యోగం మీ జాతకంలో ఉంది", ta: "இந்த யோகம் உங்கள் குண்டலியில் உள்ளது" },
  "based on your birth chart": { hi: "आपकी जन्म कुंडली के आधार पर", te: "మీ జన్మ జాతకం ఆధారంగా", ta: "உங்கள் ஜன்ம குண்டலியின் அடிப்படையில்" },
  "overall assessment": { hi: "समग्र मूल्यांकन", te: "మొత్తం అంచనా", ta: "ஒட்டுமொத்த மதிப்பீடு" },
  "key highlights": { hi: "मुख्य विशेषताएं", te: "ముఖ్య విశేషాలు", ta: "முக்கிய அம்சங்கள்" },
  "important considerations": { hi: "महत्वपूर्ण विचार", te: "ముఖ్యమైన పరిగణనలు", ta: "முக்கியமான கருத்துகள்" },
  "positive aspects": { hi: "सकारात्मक पहलू", te: "సానుకూల అంశాలు", ta: "நேர்மறையான அம்சங்கள்" },
  "areas of concern": { hi: "चिंता के क्षेत्र", te: "ఆందోళన కలిగించే అంశాలు", ta: "கவலைக்குரிய பகுதிகள்" },
  "general overview": { hi: "सामान्य अवलोकन", te: "సాధారణ అవలోకనం", ta: "பொது அவலோகனம்" },
  "detailed analysis": { hi: "विस्तृत विश्लेषण", te: "వివరణాత్మక విశ్లేషణ", ta: "விரிவான பகுப்பாய்வு" },
  "practical advice": { hi: "व्यावहारिक सलाह", te: "ఆచరణాత్మక సలహా", ta: "நடைமுறை ஆலோசனை" },
  "spiritual advice": { hi: "आध्यात्मिक सलाह", te: "ఆధ్యాత్మిక సలహా", ta: "ஆன்மீக ஆலோசனை" },
  "remedy advice": { hi: "उपाय सलाह", te: "పరిహార సలహా", ta: "பரிகார ஆலோசனை" },
  "caution note": { hi: "सावधानी नोट", te: "జాగ్రత్త గమనిక", ta: "எச்சரிக்கை குறிப்பு" },
  "moon saturn relationship": { hi: "चंद्र-शनि संबंध", te: "చంద్ర-శని సంబంధం", ta: "சந்திர-சனி உறவு" },

  // ── House-related phrases ──
  "house nature": { hi: "भाव प्रकृति", te: "భావ స్వభావం", ta: "பாவ இயல்பு" },
  "house lord": { hi: "भाव स्वामी", te: "భావ అధిపతి", ta: "பாவ அதிபதி" },
  "house occupants": { hi: "भाव के ग्रह", te: "భావ గ్రహాలు", ta: "பாவ கிரகங்கள்" },
  "natural significator": { hi: "प्राकृतिक कारक", te: "సహజ కారకుడు", ta: "இயற்கை காரகன்" },

  // ── Planet analysis common phrases ──
  "planetary strength": { hi: "ग्रह बल", te: "గ్రహ బలం", ta: "கிரக வலிமை" },
  "dignity analysis": { hi: "बल विश्लेषण", te: "బల విశ్లేషణ", ta: "கௌரவ பகுப்பாய்வு" },
  "aspect analysis": { hi: "दृष्टि विश्लेषण", te: "దృష్టి విశ్లేషణ", ta: "திருஷ்டி பகுப்பாய்வு" },
  "conjunction analysis": { hi: "युति विश्लेषण", te: "యుతి విశ్లేషణ", ta: "சேர்க்கை பகுப்பாய்வு" },
  "retrograde analysis": { hi: "वक्री विश्लेषण", te: "వక్రి విశ్లేషణ", ta: "வக்ர பகுப்பாய்வு" },

  // ── Pillar section labels ──
  "dharma pillar": { hi: "धर्म स्तंभ", te: "ధర్మ స్తంభం", ta: "தர்ம தூண்" },
  "artha pillar": { hi: "अर्थ स्तंभ", te: "అర్థ స్తంభం", ta: "அர்த்த தூண்" },
  "kama pillar": { hi: "काम स्तंभ", te: "కామ స్తంభం", ta: "காம தூண்" },
  "moksha pillar": { hi: "मोक्ष स्तंभ", te: "మోక్ష స్తంభం", ta: "மோட்ச தூண்" },

  // ── Common structural phrases ──
  "characteristics": { hi: "विशेषताएं", te: "లక్షణాలు", ta: "குணாதிசயங்கள்" },
  "impact": { hi: "प्रभाव", te: "ప్రభావం", ta: "தாக்கம்" },
  "rationale": { hi: "तर्काधार", te: "హేతువు", ta: "காரணம்" },
  "narrative": { hi: "वर्णन", te: "వర్ణన", ta: "விவரணை" },
  "meaning": { hi: "अर्थ", te: "అర్థం", ta: "பொருள்" },
  "explanation": { hi: "स्पष्टीकरण", te: "వివరణ", ta: "விளக்கம்" },
  "insight": { hi: "अंतर्दृष्टि", te: "అంతర్దృష్టి", ta: "நுண்ணறிவு" },
  "severity": { hi: "गंभीरता", te: "తీవ్రత", ta: "தீவிரம்" },
  "nature": { hi: "प्रकृति", te: "స్వభావం", ta: "இயல்பு" },
  "occupation": { hi: "व्यवसाय", te: "వృత్తి", ta: "தொழில்" },

  // ── Miscellaneous high-frequency labels ──
  "section title": { hi: "शीर्षक", te: "శీర్షిక", ta: "தலைப்பு" },
  "sub heading": { hi: "उप शीर्षक", te: "ఉప శీర్షిక", ta: "உபதலைப்பு" },
  "heading": { hi: "शीर्षक", te: "శీర్షిక", ta: "தலைப்பு" },
  "title": { hi: "शीर्षक", te: "శీర్షిక", ta: "தலைப்பு" },

  // ── Lucky / unlucky labels (user-requested) ──
  "lucky colors": { hi: "शुभ रंग", te: "అదృష్ట రంగులు", ta: "அதிர்ஷ்ட நிறங்கள்" },
  "lucky days": { hi: "शुभ दिन", te: "అదృష్ట దినాలు", ta: "அதிர்ஷ்ட நாட்கள்" },
  "unlucky numbers": { hi: "अशुभ अंक", te: "దురదృష్ట సంఖ్యలు", ta: "துரதிர்ஷ்ட எண்கள்" },
  "lucky number": { hi: "शुभ अंक", te: "అదృష్ట సంఖ్య", ta: "அதிர்ஷ்ட எண்" },
  "unlucky number": { hi: "अशुभ अंक", te: "దురదృష్ట సంఖ్య", ta: "துரதிர்ஷ்ட எண்" },
  "lucky day": { hi: "शुभ दिन", te: "అదృష్ట దినం", ta: "அதிர்ஷ்ட நாள்" },
  "lucky color": { hi: "शुभ रंग", te: "అదృష్ట రంగు", ta: "அதிர்ஷ்ட நிறம்" },
  "lucky direction": { hi: "शुभ दिशा", te: "అదృష్ట దిశ", ta: "அதிர்ஷ்ட திசை" },
  "lucky directions": { hi: "शुभ दिशाएं", te: "అదృష్ట దిశలు", ta: "அதிர்ஷ்ட திசைகள்" },

  // ── Yoga detection / activation (user-requested) ──
  "total yogas detected": { hi: "कुल योग पाए गए", te: "మొత్తం యోగాలు గుర్తించబడ్డాయి", ta: "கண்டறியப்பட்ட மொத்த யோகங்கள்" },
  "is switch due now?": { hi: "क्या परिवर्तन अपेक्षित है?", te: "మార్పు ఆశించబడుతుందా?", ta: "மாற்றம் எதிர்பார்க்கப்படுகிறதா?" },
  "is switch due now": { hi: "क्या परिवर्तन अपेक्षित है", te: "మార్పు ఆశించబడుతుందా", ta: "மாற்றம் எதிர்பார்க்கப்படுகிறதா" },
  "switch due now": { hi: "परिवर्तन अपेक्षित", te: "మార్పు ఆశించబడుతుంది", ta: "மாற்றம் எதிர்பார்க்கப்படுகிறது" },
  "activation": { hi: "सक्रियता", te: "సక్రియం", ta: "செயலாக்கம்" },
  "love": { hi: "प्रेम", te: "ప్రేమ", ta: "காதல்" },
  "attraction": { hi: "आकर्षण", te: "ఆకర్షణ", ta: "ஈர்ப்பு" },

  // ── Remedy / gemstone terms (user-requested) ──
  "gemstones": { hi: "रत्न", te: "రత్నాలు", ta: "ரத்தினங்கள்" },
  "recommended": { hi: "अनुशंसित", te: "సిఫారసు చేయబడిన", ta: "பரிந்துரைக்கப்பட்ட" },
  "pronunciation": { hi: "उच्चारण", te: "ఉచ్చారణ", ta: "உச்சரிப்பு" },
  "ideal work environment": { hi: "आदर्श कार्य वातावरण", te: "ఆదర్శ పని వాతావరణం", ta: "இலட்சிய பணிச்சூழல்" },
  "work environment": { hi: "कार्य वातावरण", te: "పని వాతావరణం", ta: "பணிச்சூழல்" },
  "japa": { hi: "जप", te: "జపం", ta: "ஜபம்" },
  "chanting": { hi: "जप", te: "జపం", ta: "ஜபம்" },
  "recitation": { hi: "पाठ", te: "పఠనం", ta: "பாராயணம்" },

  // ── Career section labels ──
  "suitable professions": { hi: "उपयुक्त व्यवसाय", te: "తగిన వృత్తులు", ta: "பொருத்தமான தொழில்கள்" },
  "career strengths": { hi: "कैरियर शक्तियां", te: "వృత్తి బలాలు", ta: "தொழில் வலிமைகள்" },
  "career challenges": { hi: "कैरियर चुनौतियां", te: "వృత్తి సవాళ్ళు", ta: "தொழில் சவால்கள்" },
  "financial prospects": { hi: "वित्तीय संभावनाएं", te: "ఆర్థిక అవకాశాలు", ta: "நிதி வாய்ப்புகள்" },
  "business aptitude": { hi: "व्यापार योग्यता", te: "వ్యాపార సామర్థ్యం", ta: "வணிக திறன்" },
  "leadership qualities": { hi: "नेतृत्व गुण", te: "నాయకత్వ లక్షణాలు", ta: "தலைமை குணங்கள்" },
  "wealth accumulation": { hi: "धन संचय", te: "సంపద సేకరణ", ta: "செல்வ திரட்டல்" },
  "income sources": { hi: "आय के स्रोत", te: "ఆదాయ వనరులు", ta: "வருமான ஆதாரங்கள்" },
  "professional growth": { hi: "पेशेवर विकास", te: "వృత్తిపరమైన వృద్ధి", ta: "தொழில்முறை வளர்ச்சி" },
  "work style": { hi: "कार्य शैली", te: "పని శైలి", ta: "பணி நடைமுறை" },

  // ── Sade Sati labels ──
  "sade sati": { hi: "साढ़ेसाती", te: "సాడేసాతి", ta: "சாடேசதி" },
  "sade sati analysis": { hi: "साढ़ेसाती विश्लेषण", te: "సాడేసాతి విశ్లేషణ", ta: "சாடேசதி பகுப்பாய்வு" },
  "sade sati status": { hi: "साढ़ेसाती स्थिति", te: "సాడేసాతి స్థితి", ta: "சாடேசதி நிலை" },
  "rising phase": { hi: "प्रारंभिक चरण", te: "ఆరోహణ దశ", ta: "ஆரம்ப நிலை" },
  "peak phase": { hi: "चरम चरण", te: "శిఖర దశ", ta: "உச்ச நிலை" },
  "setting phase": { hi: "अंतिम चरण", te: "అస్తమయ దశ", ta: "இறுதி நிலை" },
  "not active": { hi: "सक्रिय नहीं", te: "సక్రియం కాదు", ta: "செயலில் இல்லை" },
  "currently active": { hi: "वर्तमान में सक्रिय", te: "ప్రస్తుతం సక్రియం", ta: "தற்போது செயலில்" },
  "saturn transit": { hi: "शनि गोचर", te: "శని గోచరం", ta: "சனி கோசாரம்" },
  "moon sign": { hi: "चंद्र राशि", te: "చంద్ర రాశి", ta: "சந்திர ராசி" },
  "transit effects": { hi: "गोचर प्रभाव", te: "గోచర ప్రభావాలు", ta: "கோசார விளைவுகள்" },
  "mental stress": { hi: "मानसिक तनाव", te: "మానసిక ఒత్తిడి", ta: "மன அழுத்தம்" },
  "emotional challenges": { hi: "भावनात्मक चुनौतियां", te: "భావోద్వేగ సవాళ్ళు", ta: "உணர்ச்சி சவால்கள்" },
  "financial difficulties": { hi: "वित्तीय कठिनाइयां", te: "ఆర్థిక కష్టాలు", ta: "நிதி சிரமங்கள்" },
  "career obstacles": { hi: "कैरियर बाधाएं", te: "వృత్తి అడ్డంకులు", ta: "தொழில் தடைகள்" },
  "health concerns": { hi: "स्वास्थ्य चिंताएं", te: "ఆరోగ్య ఆందోళనలు", ta: "ஆரோக்கிய கவலைகள்" },
  "relationship strain": { hi: "संबंधों में तनाव", te: "సంబంధాల్లో ఒత్తిడి", ta: "உறவு பதற்றம்" },

  // ── Marriage / relationship extra labels ──
  "love marriage": { hi: "प्रेम विवाह", te: "ప్రేమ వివాహం", ta: "காதல் திருமணம்" },
  "arranged marriage": { hi: "व्यवस्थित विवाह", te: "వ్యవస్థీకృత వివాహం", ta: "நிச்சயிக்கப்பட்ட திருமணம்" },
  "marriage timing": { hi: "विवाह समय", te: "వివాహ సమయం", ta: "திருமண நேரம்" },
  "partner characteristics": { hi: "साथी की विशेषताएं", te: "భాగస్వామి లక్షణాలు", ta: "வாழ்க்கைத்துணையின் குணங்கள்" },
  "marital harmony": { hi: "वैवाहिक सामंजस्य", te: "వైవాహిక సామరస్యం", ta: "திருமண இணக்கம்" },
  "childbirth": { hi: "संतान", te: "సంతానం", ta: "குழந்தைப்பேறு" },
  "children": { hi: "संतान", te: "సంతానం", ta: "குழந்தைகள்" },
  "family life": { hi: "पारिवारिक जीवन", te: "కుటుంబ జీవితం", ta: "குடும்ப வாழ்க்கை" },

  // ── Dosha names ──
  "manglik dosha": { hi: "मांगलिक दोष", te: "మాంగళిక దోషం", ta: "மங்கள தோஷம்" },
  "kaal sarp dosha": { hi: "कालसर्प दोष", te: "కాలసర్ప దోషం", ta: "காலசர்ப தோஷம்" },
  "pitra dosha": { hi: "पितृ दोष", te: "పితృ దోషం", ta: "பித்ரு தோஷம்" },
  "nadi dosha": { hi: "नाड़ी दोष", te: "నాడి దోషం", ta: "நாடி தோஷம்" },

  // ── More common section/field labels ──
  "current dasha": { hi: "वर्तमान दशा", te: "ప్రస్తుత దశ", ta: "தற்போதைய தசை" },
  "dasha periods": { hi: "दशा अवधि", te: "దశ కాలాలు", ta: "தசா காலங்கள்" },
  "mahadasha lord": { hi: "महादशा स्वामी", te: "మహాదశ అధిపతి", ta: "மகாதசை அதிபதி" },
  "antardasha lord": { hi: "अंतर्दशा स्वामी", te: "అంతర్దశ అధిపతి", ta: "அந்தர்தசை அதிபதி" },
  "dasha balance": { hi: "दशा शेष", te: "దశ శేషం", ta: "தசா சேஷம்" },
  "planetary period": { hi: "ग्रह अवधि", te: "గ్రహ కాలం", ta: "கிரக காலம்" },
  "favorable period": { hi: "अनुकूल अवधि", te: "అనుకూల కాలం", ta: "சாதகமான காலம்" },
  "unfavorable period": { hi: "प्रतिकूल अवधि", te: "ప్రతికూల కాలం", ta: "பாதகமான காலம்" },
  "transit analysis": { hi: "गोचर विश्लेषण", te: "గోచర విశ్లేషణ", ta: "கோசார பகுப்பாய்வு" },
  "birth chart": { hi: "जन्म कुंडली", te: "జన్మ జాతకం", ta: "ஜன்ம குண்டலி" },
  "divisional chart": { hi: "वर्गीय कुंडली", te: "విభజన జాతకం", ta: "பிரிவு குண்டலி" },
  "chart analysis": { hi: "कुंडली विश्लेषण", te: "జాతక విశ్లేషణ", ta: "குண்டலி பகுப்பாய்வு" },
  "planet in sign": { hi: "ग्रह राशि में", te: "గ్రహం రాశిలో", ta: "கிரகம் ராசியில்" },
  "planet in house": { hi: "ग्रह भाव में", te: "గ్రహం భావంలో", ta: "கிரகம் பாவத்தில்" },
  "retrograde planet": { hi: "वक्री ग्रह", te: "వక్రి గ్రహం", ta: "வக்ர கிரகம்" },
  "combust planet": { hi: "अस्त ग्रह", te: "అస్త గ్రహం", ta: "அஸ்த கிரகம்" },
  "exalted planet": { hi: "उच्च ग्रह", te: "ఉచ్చ గ్రహం", ta: "உச்ச கிரகம்" },
  "debilitated planet": { hi: "नीच ग्रह", te: "నీచ గ్రహం", ta: "நீச கிரகம்" },
  "benefic": { hi: "शुभ", te: "శుభ", ta: "சுப" },
  "malefic": { hi: "पाप", te: "పాప", ta: "பாப" },
  "benefic planet": { hi: "शुभ ग्रह", te: "శుభ గ్రహం", ta: "சுப கிரகம்" },
  "malefic planet": { hi: "पाप ग्रह", te: "పాప గ్రహం", ta: "பாப கிரகம்" },

  // ── Glossary section labels ──────────────────────────────────────────────
  "glossary": { hi: "शब्दकोश", te: "పారిభాషిక నిఘంటువు", ta: "சொற்களஞ்சியம்" },
  "glossary of vedic astrology terms": { hi: "वैदिक ज्योतिष शब्दकोश", te: "వైదిక జ్యోతిష్య పారిభాషిక నిఘంటువు", ta: "வேத ஜோதிட சொற்களஞ்சியம்" },
  "quick reference": { hi: "त्वरित संदर्भ", te: "శీఘ్ర సూచన", ta: "விரைவு குறிப்பு" },
  "example": { hi: "उदाहरण", te: "ఉదాహరణ", ta: "உதாரணம்" },
  "related": { hi: "संबंधित", te: "సంబంధిత", ta: "தொடர்புடைய" },
  "related terms": { hi: "संबंधित शब्द", te: "సంబంధిత పదాలు", ta: "தொடர்புடைய சொற்கள்" },
  "detailed explanation": { hi: "विस्तृत व्याख्या", te: "వివరణాత్మక వివరణ", ta: "விரிவான விளக்கம்" },
  "brief definition": { hi: "संक्षिप्त परिभाषा", te: "సంక్షిప్త నిర్వచనం", ta: "சுருக்கமான வரையறை" },
  "term": { hi: "शब्द", te: "పదం", ta: "சொல்" },

  // ── Common glossary term names (Vedic astrology) ─────────────────────────
  "rashi": { hi: "राशि", te: "రాశి", ta: "ராசி" },
  "bhava": { hi: "भाव", te: "భావం", ta: "பாவம்" },
  "graha": { hi: "ग्रह", te: "గ్రహం", ta: "கிரகம்" },
  "lagna": { hi: "लग्न", te: "లగ్నం", ta: "லக்னம்" },
  "varga": { hi: "वर्ग", te: "వర్గం", ta: "வர்கம்" },
  "ayanamsha": { hi: "अयनांश", te: "అయనాంశ", ta: "அயனாம்சம்" },
  "panchang": { hi: "पंचांग", te: "పంచాంగం", ta: "பஞ்சாங்கம்" },
  "hora": { hi: "होरा", te: "హోర", ta: "ஹோரை" },
  "muhurta": { hi: "मुहूर्त", te: "ముహూర్తం", ta: "முகூர்த்தம்" },
  "karana": { hi: "करण", te: "కరణం", ta: "கரணம்" },
  "tithi": { hi: "तिथि", te: "తిథి", ta: "திதி" },
  "vimshottari": { hi: "विंशोत्तरी", te: "వింశోత్తరి", ta: "விம்சோத்தரி" },
  "mahadasha": { hi: "महादशा", te: "మహాదశ", ta: "மகாதசை" },
  "antardasha": { hi: "अंतर्दशा", te: "అంతర్దశ", ta: "அந்தர்தசை" },
  "pratyantardasha": { hi: "प्रत्यंतर्दशा", te: "ప్రత్యంతర్దశ", ta: "பிரத்யந்தர்தசை" },
  "manglik": { hi: "मांगलिक", te: "మాంగళికం", ta: "மங்கள" },
  "kaal sarp": { hi: "कालसर्प", te: "కాలసర్పం", ta: "காலசர்ப" },
  "pitra": { hi: "पितृ", te: "పితృ", ta: "பித்ரு" },
  "nadi": { hi: "नाड़ी", te: "నాడి", ta: "நாடி" },
  "pancha mahapurusha": { hi: "पंचमहापुरुष", te: "పంచమహాపురుష", ta: "பஞ்சமஹாபுருஷ" },
  "dhana yoga": { hi: "धन योग", te: "ధన యోగం", ta: "தன யோகம்" },
  "raja yoga": { hi: "राजयोग", te: "రాజ యోగం", ta: "ராஜயோகம்" },
  "neechabhanga": { hi: "नीचभंग", te: "నీచభంగం", ta: "நீசபங்கம்" },
  "viparita raja yoga": { hi: "विपरीत राजयोग", te: "విపరీత రాజ యోగం", ta: "விபரீத ராஜயோகம்" },
  "gajakesari yoga": { hi: "गजकेसरी योग", te: "గజకేసరి యోగం", ta: "கஜகேசரி யோகம்" },
  "budhaditya yoga": { hi: "बुधादित्य योग", te: "బుధాదిత్య యోగం", ta: "புதாதித்ய யோகம்" },
  "hamsa yoga": { hi: "हंस योग", te: "హంస యోగం", ta: "ஹம்ச யோகம்" },
  "malavya yoga": { hi: "मालव्य योग", te: "మాలవ్య యోగం", ta: "மாலவ்ய யோகம்" },
  "bhadra yoga": { hi: "भद्र योग", te: "భద్ర యోగం", ta: "பத்ர யோகம்" },
  "ruchaka yoga": { hi: "रुचक योग", te: "రుచక యోగం", ta: "ருசக யோகம்" },
  "shasha yoga": { hi: "शश योग", te: "శశ యోగం", ta: "சச யோகம்" },
  "chandra mangal yoga": { hi: "चंद्र-मंगल योग", te: "చంద్ర-కుజ యోగం", ta: "சந்திர-செவ்வாய் யோகம்" },
  "adhi yoga": { hi: "अधि योग", te: "అధి యోగం", ta: "அதி யோகம்" },
  "amala yoga": { hi: "अमल योग", te: "అమల యోగం", ta: "அமல யோகம்" },

  // ── Table headers / common labels ────────────────────────────────────────
  "cause": { hi: "कारण", te: "కారణం", ta: "காரணம்" },
  "effect": { hi: "प्रभाव", te: "ప్రభావం", ta: "விளைவு" },
  "status": { hi: "स्थिति", te: "స్థితి", ta: "நிலை" },
  "type": { hi: "प्रकार", te: "రకం", ta: "வகை" },
  "degree": { hi: "अंश", te: "డిగ్రీ", ta: "பாகை" },
  "lord": { hi: "स्वामी", te: "అధిపతి", ta: "அதிபதி" },
  "occupants": { hi: "स्थित ग्रह", te: "స్థిత గ్రహాలు", ta: "கிரகங்கள்" },
  "signification": { hi: "कारकत्व", te: "కారకత్వం", ta: "காரகத்துவம்" },
  "category": { hi: "श्रेणी", te: "వర్గం", ta: "வகை" },
  "category description": { hi: "श्रेणी विवरण", te: "వర్గ వివరణ", ta: "வகை விவரணை" },
  "count": { hi: "संख्या", te: "సంఖ్య", ta: "எண்ணிக்கை" },
  "deity": { hi: "देवता", te: "దేవత", ta: "தேவதை" },
  "element": { hi: "तत्व", te: "తత్వం", ta: "தத்துவம்" },
  "karaka": { hi: "कारक", te: "కారకం", ta: "காரகம்" },
  "soul significator": { hi: "आत्मा कारक", te: "ఆత్మ కారకం", ta: "ஆத்மா காரகன்" },
  "spouse significator": { hi: "जीवनसाथी कारक", te: "జీవిత భాగస్వామి కారకం", ta: "வாழ்க்கைத்துணை காரகன்" },
  "career significator": { hi: "करियर कारक", te: "వృత్తి కారకం", ta: "தொழில் காரகன்" },

  // ── Remedy / puja / ritual terms ─────────────────────────────────────────
  "wearing instructions": { hi: "धारण निर्देश", te: "ధరించు సూచనలు", ta: "அணியும் முறை" },
  "quality guidelines": { hi: "गुणवत्ता दिशानिर्देश", te: "నాణ్యత మార్గదర్శకాలు", ta: "தரக் குறிப்புகள்" },
  "how to verify authenticity": { hi: "प्रामाणिकता कैसे जांचें", te: "ప్రామాణికతను ఎలా ధృవీకరించాలి", ta: "நம்பகத்தன்மையை சரிபார்க்கும் முறை" },
  "consecration method": { hi: "अभिषेक विधि", te: "ప్రతిష్ఠాపన విధానం", ta: "பிரதிஷ்டை முறை" },
  "temple visit": { hi: "मंदिर दर्शन", te: "ఆలయ సందర్శన", ta: "கோயில் வழிபாடு" },
  "colors to avoid": { hi: "अशुभ रंग", te: "నివారించవలసిన రంగులు", ta: "தவிர்க்க வேண்டிய நிறங்கள்" },
  "directions to avoid": { hi: "अशुभ दिशाएं", te: "నివారించవలసిన దిశలు", ta: "தவிர்க்க வேண்டிய திசைகள்" },
  "sleep direction": { hi: "शयन दिशा", te: "నిద్ర దిశ", ta: "தூக்கும் திசை" },
  "work direction": { hi: "कार्य दिशा", te: "పని దిశ", ta: "பணி திசை" },
  "daily routine recommendations": { hi: "दैनिक दिनचर्या सुझाव", te: "రోజువారీ దినచర్య సిఫారసులు", ta: "தினசரி பழக்கவழக்க பரிந்துரைகள்" },
  "daily spiritual practices": { hi: "दैनिक साधना", te: "రోజువారీ ఆధ్యాత్మిక సాధన", ta: "தினசரி ஆன்மீக சாதனை" },
  "frequency": { hi: "आवृत्ति", te: "తరచుదనం", ta: "அடிக்கடி" },
  "worship method": { hi: "पूजन विधि", te: "పూజ విధానం", ta: "பூஜை முறை" },
  "metal": { hi: "धातु", te: "లోహం", ta: "உலோகம்" },
  "finger": { hi: "उंगली", te: "వేలు", ta: "விரல்" },
  "day to wear": { hi: "धारण का दिन", te: "ధరించవలసిన రోజు", ta: "அணியும் நாள்" },
  "japa count": { hi: "जप संख्या", te: "జపం సంఖ్య", ta: "ஜப எண்ணிக்கை" },
  "immediate": { hi: "तुरंत", te: "వెంటనే", ta: "உடனடி" },
  "short-term": { hi: "अल्पकालिक", te: "స్వల్పకాలిక", ta: "குறுகிய கால" },
  "long-term": { hi: "दीर्घकालिक", te: "దీర్ఘకాలిక", ta: "நீண்ட கால" },
  "ongoing": { hi: "निरंतर", te: "నిరంతర", ta: "தொடர்ச்சியான" },
  "expected benefits": { hi: "अपेक्षित लाभ", te: "ఆశించిన ప్రయోజనాలు", ta: "எதிர்பார்க்கப்படும் பலன்கள்" },
  "procedure": { hi: "विधि", te: "విధానం", ta: "விதிமுறை" },
  "primary remedy": { hi: "प्रमुख उपाय", te: "ప్రధాన పరిహారం", ta: "முதன்மை பரிகாரம்" },
  "priority remedies": { hi: "प्राथमिकता उपाय", te: "ప్రాధాన్య పరిహారాలు", ta: "முன்னுரிமை பரிகாரங்கள்" },
  "recommended remedies": { hi: "अनुशंसित उपाय", te: "సిఫారసు చేయబడిన పరిహారాలు", ta: "பரிந்துரைக்கப்பட்ட பரிகாரங்கள்" },

  // ── Career section phrases ───────────────────────────────────────────────
  "right career for you": { hi: "आपके लिए सही करियर", te: "మీకు సరైన వృత్తి", ta: "உங்களுக்கு சரியான தொழில்" },
  "suitable career fields": { hi: "उपयुक्त करियर क्षेत्र", te: "తగిన వృత్తి రంగాలు", ta: "பொருத்தமான தொழில் துறைகள்" },
  "fields to avoid": { hi: "परहेज करने योग्य क्षेत्र", te: "నివారించవలసిన రంగాలు", ta: "தவிர்க்க வேண்டிய துறைகள்" },
  "career timing & phases": { hi: "करियर समय और चरण", te: "వృత్తి సమయం మరియు దశలు", ta: "தொழில் நேரமும் கட்டங்களும்" },
  "career switch insights": { hi: "करियर परिवर्तन दृष्टिकोण", te: "వృత్తి మార్పు అంతర్దృష్టి", ta: "தொழில் மாற்ற நுண்ணறிவு" },
  "success formula": { hi: "सफलता का सूत्र", te: "విజయ సూత్రం", ta: "வெற்றி சூத்திரம்" },
  "wealth potential": { hi: "आर्थिक क्षमता", te: "సంపద సామర్థ్యం", ta: "செல்வ திறன்" },
  "business vs job": { hi: "व्यवसाय बनाम नौकरी", te: "వ్యాపారం vs ఉద్యోగం", ta: "வணிகம் எதிர் வேலை" },
  "ideal roles": { hi: "आदर्श भूमिकाएं", te: "ఆదర్శ పాత్రలు", ta: "இலட்சிய பணிகள்" },
  "current career phase": { hi: "वर्तमान करियर चरण", te: "ప్రస్తుత వృత్తి దశ", ta: "தற்போதைய தொழில் கட்டம்" },
  "upcoming opportunities": { hi: "आगामी अवसर", te: "రాబోయే అవకాశాలు", ta: "வரவிருக்கும் வாய்ப்புகள்" },
  "future career changes": { hi: "भविष्य के करियर परिवर्तन", te: "భవిష్యత్ వృత్తి మార్పులు", ta: "எதிர்கால தொழில் மாற்றங்கள்" },
  "preparation plan": { hi: "तैयारी योजना", te: "సన్నాహ ప్రణాళిక", ta: "தயாரிப்பு திட்டம்" },

  // ── Marriage section phrases ─────────────────────────────────────────────
  "key qualities": { hi: "प्रमुख गुण", te: "ముఖ్య లక్షణాలు", ta: "முக்கிய குணங்கள்" },
  "caution traits": { hi: "सतर्कता गुण", te: "జాగ్రత్త లక్షణాలు", ta: "எச்சரிக்கை குணங்கள்" },
  "relationship strengthening": { hi: "संबंध सुदृढ़ीकरण", te: "సంబంధ బలోపేతం", ta: "உறவு வலுப்படுத்தல்" },
  "conflicts to avoid": { hi: "बचने योग्य संघर्ष", te: "నివారించవలసిన సంఘర్షణలు", ta: "தவிர்க்க வேண்டிய மோதல்கள்" },
  "favorable periods": { hi: "अनुकूल अवधि", te: "అనుకూల కాలాలు", ta: "சாதகமான காலங்கள்" },
  "challenging periods": { hi: "चुनौतीपूर्ण अवधि", te: "సవాలు కాలాలు", ta: "சவாலான காலங்கள்" },
  "spouse characteristics": { hi: "जीवनसाथी के गुण", te: "జీవిత భాగస్వామి లక్షణాలు", ta: "வாழ்க்கைத்துணையின் குணங்கள்" },
  "marriage indications": { hi: "विवाह संकेत", te: "వివాహ సూచనలు", ta: "திருமண அறிகுறிகள்" },
  "ideal partner": { hi: "आदर्श जीवनसाथी", te: "ఆదర్శ భాగస్వామి", ta: "இலட்சிய வாழ்க்கைத்துணை" },

  // ── Yogini Dasha section labels ──────────────────────────────────────────
  "yogini dasha": { hi: "योगिनी दशा", te: "యోగినీ దశ", ta: "யோகினி தசை" },
  "yogini dasha system": { hi: "योगिनी दशा प्रणाली", te: "యోగినీ దశా విధానం", ta: "யோகினி தசா முறை" },
  "yogini dasha analysis": { hi: "योगिनी दशा विश्लेषण", te: "యోగినీ దశ విశ్లేషణ", ta: "யோகினி தசா பகுப்பாய்வு" },
  "current yogini": { hi: "वर्तमान योगिनी", te: "ప్రస్తుత యోగిని", ta: "தற்போதைய யோகினி" },
  "upcoming yoginis": { hi: "आगामी योगिनी", te: "రాబోయే యోగినీలు", ta: "வரவிருக்கும் யோகினிகள்" },
  "yogini sequence": { hi: "योगिनी क्रम", te: "యోగినీ వరుస", ta: "யோகினி வரிசை" },
  "yogini period": { hi: "योगिनी अवधि", te: "యోగినీ కాలం", ta: "யோகினி காலம்" },
  "system explanation": { hi: "प्रणाली व्याख्या", te: "విధాన వివరణ", ta: "முறை விளக்கம்" },
  "bhramari": { hi: "भ्रामरी", te: "భ్రామరి", ta: "பிராமரி" },
  "bhadrika": { hi: "भद्रिका", te: "భద్రిక", ta: "பத்ரிகா" },
  "highly auspicious": { hi: "अत्यंत शुभ", te: "అత్యంత శుభప్రదం", ta: "மிகவும் சுபமான" },
  "auspicious and benevolent": { hi: "शुभ और उदार", te: "శుభ మరియు దయాపరం", ta: "சுபமும் தயையும்" },
  "challenging and transformative": { hi: "चुनौतीपूर्ण और परिवर्तनकारी", te: "సవాలుపూర్వకం మరియు పరివర్తనకారి", ta: "சவாலும் மாற்றமும்" },
  "destructive and intense": { hi: "विनाशकारी और तीव्र", te: "వినాశకరం మరియు తీవ్రం", ta: "அழிவும் தீவிரமும்" },
  "auspicious and fortunate": { hi: "शुभ और सौभाग्यशाली", te: "శుభ మరియు అదృష్టవంతం", ta: "சுபமும் அதிர்ஷ்டமும்" },
  "mixed and cautious": { hi: "मिश्रित और सतर्क", te: "మిశ్రమ మరియు జాగ్రత్త", ta: "கலப்பும் எச்சரிக்கையும்" },
  "successful and luxurious": { hi: "सफल और विलासी", te: "విజయవంతం మరియు విలాసవంతం", ta: "வெற்றியும் ஆடம்பரமும்" },
  "obstructive and karmic": { hi: "बाधाकारक और कर्मिक", te: "అడ్డంకికారక మరియు కర్మిక", ta: "தடையும் கர்மமும்" },

  // ── Dasha section phrases ────────────────────────────────────────────────
  "life themes": { hi: "जीवन विषय", te: "జీవిత అంశాలు", ta: "வாழ்க்கை கருப்பொருள்கள்" },
  "key events to watch": { hi: "ध्यान देने योग्य घटनाएं", te: "గమనించవలసిన ముఖ్య సంఘటనలు", ta: "கவனிக்க வேண்டிய முக்கிய நிகழ்வுகள்" },
  "associated planet": { hi: "संबंधित ग्रह", te: "సంబంధిత గ్రహం", ta: "தொடர்புடைய கிரகம்" },
  "mahadasha period": { hi: "महादशा अवधि", te: "మహాదశ కాలం", ta: "மகாதசை காலம்" },
  "dasha sequence": { hi: "दशा क्रम", te: "దశ వరుస", ta: "தசா வரிசை" },
  "upcoming periods": { hi: "आगामी अवधि", te: "రాబోయే కాలాలు", ta: "வரவிருக்கும் காலங்கள்" },
  "period recommendations": { hi: "अवधि सुझाव", te: "కాలానుగుణ సిఫారసులు", ta: "காலத்திற்கான பரிந்துரைகள்" },
  "current transit impact": { hi: "वर्तमान गोचर प्रभाव", te: "ప్రస్తుత గోచర ప్రభావం", ta: "தற்போதைய கோசார தாக்கம்" },

  // ── Dosha section phrases ────────────────────────────────────────────────
  "affected areas": { hi: "प्रभावित क्षेत्र", te: "ప్రభావిత ప్రాంతాలు", ta: "பாதிக்கப்பட்ட பகுதிகள்" },
  "total doshas detected": { hi: "कुल दोष पाए गए", te: "మొత్తం దోషాలు గుర్తించబడ్డాయి", ta: "கண்டறியப்பட்ட மொத்த தோஷங்கள்" },
  "nullified": { hi: "निष्प्रभावी", te: "నిరాకరించబడింది", ta: "நிவர்த்தியானது" },
  "major doshas": { hi: "प्रमुख दोष", te: "ప్రధాన దోషాలు", ta: "முக்கிய தோஷங்கள்" },
  "minor doshas": { hi: "लघु दोष", te: "చిన్న దోషాలు", ta: "சிறிய தோஷங்கள்" },
  "dosha remedies": { hi: "दोष उपाय", te: "దోష పరిహారాలు", ta: "தோஷ பரிகாரங்கள்" },

  // ── Yoga section phrases ─────────────────────────────────────────────────
  "formation in your chart": { hi: "आपकी कुंडली में निर्माण", te: "మీ జాతకంలో నిర్మాణం", ta: "உங்கள் குண்டலியில் அமைப்பு" },
  "practices to strengthen yogas": { hi: "योग सुदृढ़ीकरण अभ्यास", te: "యోగాలను బలపరచే సాధనలు", ta: "யோகங்களை வலுப்படுத்தும் சாதனைகள்" },
  "hidden blessings": { hi: "छिपे हुए आशीर्वाद", te: "దాగి ఉన్న ఆశీర్వాదాలు", ta: "மறைந்திருக்கும் ஆசிகள்" },
  "yoga enhancement": { hi: "योग संवर्धन", te: "యోగ వృద్ధి", ta: "யோக மேம்பாடு" },
  "life predictions based on yogas": { hi: "योग आधारित जीवन भविष्यवाणी", te: "యోగాల ఆధారంగా జీవిత అంచనాలు", ta: "யோகங்களின் அடிப்படையிலான வாழ்க்கை கணிப்பு" },
  "challenging yogas": { hi: "चुनौतीपूर्ण योग", te: "సవాలు యోగాలు", ta: "சவாலான யோகங்கள்" },

  // ── Rahu-Ketu section phrases ────────────────────────────────────────────
  "life lesson": { hi: "जीवन पाठ", te: "జీవిత పాఠం", ta: "வாழ்க்கை பாடம்" },
  "desires": { hi: "इच्छाएं", te: "కోరికలు", ta: "ஆசைகள்" },
  "growth areas": { hi: "विकास क्षेत्र", te: "వృద్ధి రంగాలు", ta: "வளர்ச்சி பகுதிகள்" },
  "natural talents": { hi: "प्राकृतिक प्रतिभाएं", te: "సహజ ప్రతిభలు", ta: "இயற்கை திறமைகள்" },
  "spiritual gifts": { hi: "आध्यात्मिक वरदान", te: "ఆధ్యాత్మిక వరాలు", ta: "ஆன்மீக வரங்கள்" },
  "karmic axis": { hi: "कर्म अक्ष", te: "కర్మ అక్షం", ta: "கர்ம அச்சு" },
  "kaal sarp yoga": { hi: "कालसर्प योग", te: "కాలసర్ప యోగం", ta: "காலசர்ப யோகம்" },

  // ── Sade Sati section phrases ────────────────────────────────────────────
  "approximate start": { hi: "अनुमानित प्रारंभ", te: "అంచనా ప్రారంభం", ta: "தோராயமான தொடக்கம்" },
  "the three phases of your sade sati": { hi: "आपकी साढ़ेसाती के तीन चरण", te: "మీ సాడేసాతి మూడు దశలు", ta: "உங்கள் சாடே சாதியின் மூன்று கட்டங்கள்" },
  "powerful remedies for sade sati": { hi: "साढ़ेसाती के प्रभावी उपाय", te: "సాడేసాతికి శక్తివంతమైన పరిహారాలు", ta: "சாடே சாதிக்கான சக்திவாய்ந்த பரிகாரங்கள்" },
  "master guidance for your sade sati": { hi: "साढ़ेसाती के लिए मुख्य मार्गदर्शन", te: "మీ సాడేసాతి కోసం ప్రధాన మార్గదర్శనం", ta: "உங்கள் சாடே சாதிக்கான முக்கிய வழிகாட்டுதல்" },
  "the moon-saturn relationship in your chart": { hi: "आपकी कुंडली में चंद्र-शनि संबंध", te: "మీ జాతకంలో చంద్ర-శని సంబంధం", ta: "உங்கள் ஜாதகத்தில் சந்திரன்-சனி உறவு" },
  "what to expect": { hi: "क्या अपेक्षा करें", te: "ఏమి ఆశించాలి", ta: "என்ன எதிர்பார்க்கலாம்" },
  "unique opportunities": { hi: "विशेष अवसर", te: "ప్రత్యేక అవకాశాలు", ta: "தனித்துவமான வாய்ப்புகள்" },

  // ── Numerology section phrases ───────────────────────────────────────────
  "birth number": { hi: "मूलांक", te: "జన్మ సంఖ్య", ta: "பிறப்பு எண்" },
  "destiny number": { hi: "भाग्यांक", te: "భాగ్య సంఖ్య", ta: "விதி எண்" },
  "personal year": { hi: "व्यक्तिगत वर्ष", te: "వ్యక్తిగత సంవత్సరం", ta: "தனிப்பட்ட ஆண்டு" },
  "sacred mantras": { hi: "पवित्र मंत्र", te: "పవిత్ర మంత్రాలు", ta: "புனித மந்திரங்கள்" },
  "lucky associations": { hi: "शुभ संबंध", te: "అదృష్ట సంబంధాలు", ta: "அதிர்ஷ்ட தொடர்புகள்" },
  "spiritual rating": { hi: "आध्यात्मिक स्तर", te: "ఆధ్యాత్మిక స్థాయి", ta: "ஆன்மீக மதிப்பீடு" },

  // ── Spiritual section phrases ────────────────────────────────────────────
  "ishta devata": { hi: "इष्ट देवता", te: "ఇష్ట దేవత", ta: "இஷ்ட தேவதை" },
  "moksha path": { hi: "मोक्ष मार्ग", te: "మోక్ష మార్గం", ta: "மோட்ச பாதை" },
  "meditation guidance": { hi: "ध्यान मार्गदर्शन", te: "ధ్యాన మార్గదర్శనం", ta: "தியான வழிகாட்டுதல்" },
  "the role of faith and intention": { hi: "श्रद्धा और संकल्प का महत्व", te: "విశ్వాసం మరియు సంకల్పం పాత్ర", ta: "நம்பிக்கையும் சங்கல்பமும்" },
  "traditional wisdom": { hi: "पारंपरिक ज्ञान", te: "సాంప్రదాయ జ్ఞానం", ta: "பாரம்பரிய ஞானம்" },

  // ── Health section phrases ───────────────────────────────────────────────
  "age context & safety": { hi: "आयु संदर्भ और सुरक्षा", te: "వయస్సు సందర్భం మరియు భద్రత", ta: "வயது சூழலும் பாதுகாப்பும்" },
  "safe movement guidance": { hi: "सुरक्षित गतिविधि मार्गदर्शन", te: "సురక్షిత కదలిక మార్గదర్శనం", ta: "பாதுகாப்பான உடல் இயக்க வழிகாட்டுதல்" },
  "recovery & sleep": { hi: "पुनर्प्राप्ति और नींद", te: "రికవరీ మరియు నిద్ర", ta: "மீட்பும் தூக்கமும்" },
  "preventive health checks": { hi: "निवारक स्वास्थ्य जांच", te: "నివారణ ఆరోగ్య పరీక్షలు", ta: "தடுப்பு உடல்நல பரிசோதனைகள்" },
  "what to avoid": { hi: "क्या न करें", te: "నివారించవలసినవి", ta: "தவிர்க்க வேண்டியவை" },
  "general wellness note": { hi: "सामान्य स्वास्थ्य सुझाव", te: "సాధారణ ఆరోగ్య గమనిక", ta: "பொது நல்வாழ்வு குறிப்பு" },
  "age group context": { hi: "आयु वर्ग संदर्भ", te: "వయస్సు వర్గ సందర్భం", ta: "வயது குழு சூழல்" },

  // ── Common verbs/phrases in report narrative ─────────────────────────────
  "this indicates": { hi: "यह संकेत करता है", te: "ఇది సూచిస్తుంది", ta: "இது குறிக்கிறது" },
  "as a result": { hi: "इसके परिणामस्वरूप", te: "ఫలితంగా", ta: "இதன் விளைவாக" },
  "therefore": { hi: "अतः", te: "అందువల్ల", ta: "எனவே" },
  "however": { hi: "हालांकि", te: "అయితే", ta: "இருப்பினும்" },
  "moreover": { hi: "इसके अतिरिक्त", te: "అంతేకాకుండా", ta: "மேலும்" },
  "in addition": { hi: "इसके अलावा", te: "అదనంగా", ta: "கூடுதலாக" },
  "on the other hand": { hi: "दूसरी ओर", te: "మరొక వైపు", ta: "மறுபுறம்" },
  "for example": { hi: "उदाहरण के लिए", te: "ఉదాహరణకు", ta: "உதாரணமாக" },
  "in particular": { hi: "विशेष रूप से", te: "ప్రత్యేకంగా", ta: "குறிப்பாக" },
  "it is recommended": { hi: "यह अनुशंसित है", te: "ఇది సిఫారసు చేయబడింది", ta: "இது பரிந்துரைக்கப்படுகிறது" },
  "it is advisable": { hi: "यह उचित है", te: "ఇది సలహా ఇవ్వబడుతోంది", ta: "இது அறிவுறுத்தப்படுகிறது" },
  "this is a very auspicious combination": { hi: "यह एक अत्यंत शुभ संयोजन है", te: "ఇది చాలా శుభమైన కలయిక", ta: "இது மிகவும் சுபமான சேர்க்கை" },
  "the native should": { hi: "जातक को चाहिए", te: "జాతకుడు చేయాలి", ta: "ஜாதகர் செய்ய வேண்டும்" },
  "based on the analysis": { hi: "विश्लेषण के आधार पर", te: "విశ్లేషణ ఆధారంగా", ta: "பகுப்பாய்வின் அடிப்படையில்" },
  "according to vedic astrology": { hi: "वैदिक ज्योतिष के अनुसार", te: "వైదిక జ్యోతిష్యం ప్రకారం", ta: "வேத ஜோதிடத்தின் படி" },
  "in vedic astrology": { hi: "वैदिक ज्योतिष में", te: "వైదిక జ్యోతిష్యంలో", ta: "வேத ஜோதிடத்தில்" },
  "this combination": { hi: "यह संयोजन", te: "ఈ కలయిక", ta: "இந்த சேர்க்கை" },
  "this placement": { hi: "यह स्थान", te: "ఈ స్థానం", ta: "இந்த நிலை" },
  "this transit": { hi: "यह गोचर", te: "ఈ గోచరం", ta: "இந்த கோசாரம்" },
  "this period": { hi: "यह अवधि", te: "ఈ కాలం", ta: "இந்த காலம்" },
  "during this time": { hi: "इस समय के दौरान", te: "ఈ సమయంలో", ta: "இந்த நேரத்தில்" },
  "the following remedies are suggested": { hi: "निम्नलिखित उपाय सुझाए गए हैं", te: "క్రింది పరిహారాలు సూచించబడ్డాయి", ta: "பின்வரும் பரிகாரங்கள் பரிந்துரைக்கப்படுகின்றன" },
  "you may experience": { hi: "आप अनुभव कर सकते हैं", te: "మీరు అనుభవించవచ్చు", ta: "நீங்கள் அனுபவிக்கலாம்" },
  "it is important to note": { hi: "यह ध्यान देना महत्वपूर्ण है", te: "గమనించడం ముఖ్యం", ta: "கவனிக்க வேண்டியது" },
  "overall": { hi: "समग्र", te: "మొత్తంగా", ta: "ஒட்டுமொத்தமாக" },
};

// ── Short-Term Translation Cache ──────────────────────────────────────────
// Terms shorter than MIN_STRING_LENGTH (8 chars) that the general sweep skips.
// Applied in a pre-sweep BEFORE the main Gemini batching.
// These are exact-match translations for standalone short values.

const SHORT_TERM_TRANSLATIONS: Record<string, { hi: string; te: string; ta?: string; kn?: string; mr?: string; gu?: string }> = {
  // ── Planet names ──
  "sun": { hi: "सूर्य", te: "సూర్యుడు", ta: "சூரியன்", kn: "ಸೂರ್ಯ", mr: "सूर्य", gu: "સૂર્ય" },
  "moon": { hi: "चंद्रमा", te: "చంద్రుడు", ta: "சந்திரன்", kn: "ಚಂದ್ರ", mr: "चंद्र", gu: "ચંદ્ર" },
  "mars": { hi: "मंगल", te: "కుజుడు", ta: "செவ்வாய்", kn: "ಕುಜ", mr: "मंगळ", gu: "મંગળ" },
  "mercury": { hi: "बुध", te: "బుధుడు", ta: "புதன்", kn: "ಬುಧ", mr: "बुध", gu: "બુધ" },
  "jupiter": { hi: "गुरु", te: "గురుడు", ta: "குரு", kn: "ಗುರು", mr: "गुरु", gu: "ગુરુ" },
  "venus": { hi: "शुक्र", te: "శుక్రుడు", ta: "சுக்கிரன்", kn: "ಶುಕ್ರ", mr: "शुक्र", gu: "શુક્ર" },
  "saturn": { hi: "शनि", te: "శని", ta: "சனி", kn: "ಶನಿ", mr: "शनि", gu: "શનિ" },
  "rahu": { hi: "राहु", te: "రాహు", ta: "ராகு", kn: "ರಾಹು", mr: "राहु", gu: "રાહુ" },
  "ketu": { hi: "केतु", te: "కేతు", ta: "கேது", kn: "ಕೇತು", mr: "केतु", gu: "કેતુ" },

  // ── Zodiac signs ──
  "aries": { hi: "मेष", te: "మేషం", ta: "மேஷம்", kn: "ಮೇಷ", mr: "मेष", gu: "મેષ" },
  "taurus": { hi: "वृषभ", te: "వృషభం", ta: "ரிஷபம்", kn: "ವೃಷಭ", mr: "वृषभ", gu: "વૃષભ" },
  "gemini": { hi: "मिथुन", te: "మిథునం", ta: "மிதுனம்", kn: "ಮಿಥುನ", mr: "मिथुन", gu: "મિથુન" },
  "cancer": { hi: "कर्क", te: "కర్కాటకం", ta: "கடகம்", kn: "ಕರ್ಕಾಟಕ", mr: "कर्क", gu: "કર્ક" },
  "leo": { hi: "सिंह", te: "సింహం", ta: "சிம்மம்", kn: "ಸಿಂಹ", mr: "सिंह", gu: "સિંહ" },
  "virgo": { hi: "कन्या", te: "కన్య", ta: "கன்னி", kn: "ಕನ್ಯಾ", mr: "कन्या", gu: "કન્યા" },
  "libra": { hi: "तुला", te: "తులా", ta: "துலாம்", kn: "ತುಲಾ", mr: "तूळ", gu: "તુલા" },
  "scorpio": { hi: "वृश्चिक", te: "వృశ్చికం", ta: "விருச்சிகம்", kn: "ವೃಶ್ಚಿಕ", mr: "वृश्चिक", gu: "વૃશ્ચિક" },
  "pisces": { hi: "मीन", te: "మీనం", ta: "மீனம்", kn: "ಮೀನ", mr: "मीन", gu: "મીન" },
  // sagittarius, capricorn, aquarius are ≥ 8 chars → in PHRASE_CACHE

  // ── Nakshatra names (< 8 chars) ──
  "ashwini": { hi: "अश्विनी", te: "అశ్విని", ta: "அசுவினி", kn: "ಅಶ್ವಿನಿ", mr: "अश्विनी" },
  "bharani": { hi: "भरणी", te: "భరణి", ta: "பரணி", kn: "ಭರಣಿ", mr: "भरणी" },
  "rohini": { hi: "रोहिणी", te: "రోహిణి", ta: "ரோகிணி", kn: "ರೋಹಿಣಿ", mr: "रोहिणी" },
  "ardra": { hi: "आर्द्रा", te: "ఆర్ద్ర", ta: "திருவாதிரை", kn: "ಆರ್ದ್ರಾ", mr: "आर्द्रा" },
  "pushya": { hi: "पुष्य", te: "పుష్యమి", ta: "பூசம்", kn: "ಪುಷ್ಯ", mr: "पुष्य" },
  "magha": { hi: "मघा", te: "మఘ", ta: "மகம்", kn: "ಮಘಾ", mr: "मघा" },
  "hasta": { hi: "हस्त", te: "హస్త", ta: "அஸ்தம்", kn: "ಹಸ್ತ", mr: "हस्त" },
  "chitra": { hi: "चित्रा", te: "చిత్ర", ta: "சித்திரை", kn: "ಚಿತ್ರಾ", mr: "चित्रा" },
  "swati": { hi: "स्वाति", te: "స్వాతి", ta: "சுவாதி", kn: "ಸ್ವಾತಿ", mr: "स्वाती" },
  "moola": { hi: "मूल", te: "మూల", ta: "மூலம்", kn: "ಮೂಲಾ", mr: "मूळ" },
  "revati": { hi: "रेवती", te: "రేవతి", ta: "ரேவதி", kn: "ರೇವತಿ", mr: "रेवती" },

  // ── Dignity / status terms ──
  "exalted": { hi: "उच्च", te: "ఉచ్చ", ta: "உச்சம்", kn: "ಉಚ್ಚ", mr: "उच्च" },
  "own sign": { hi: "स्वराशि", te: "స్వరాశి", ta: "சுயராசி", kn: "ಸ್ವರಾಶಿ", mr: "स्वराशी" },
  "neutral": { hi: "सम", te: "సమం", ta: "சமம்", kn: "ಸಮ", mr: "सम" },
  "enemy": { hi: "शत्रु", te: "శత్రు", ta: "பகை", kn: "ಶತ್ರು", mr: "शत्रु" },
  "friend": { hi: "मित्र", te: "మిత్ర", ta: "நட்பு", kn: "ಮಿತ್ರ", mr: "मित्र" },
  "friendly": { hi: "मित्र", te: "మిత్ర", ta: "நட்பு", kn: "ಮಿತ್ರ", mr: "मित्र" },
  "direct": { hi: "मार्गी", te: "మార్గి", ta: "நேர்", kn: "ಮಾರ್ಗಿ", mr: "मार्गी" },

  // ── Yogini names (proper nouns — transliterate, don't translate) ──
  "mangala": { hi: "मंगला", te: "మంగళ", ta: "மங்களா", kn: "ಮಂಗಳಾ", mr: "मंगला" },
  "pingala": { hi: "पिंगला", te: "పింగళ", ta: "பிங்களா", kn: "ಪಿಂಗಳಾ", mr: "पिंगला" },
  "dhanya": { hi: "धान्य", te: "ధాన్య", ta: "தான்யா", kn: "ಧಾನ್ಯ", mr: "धान्य" },
  "ulka": { hi: "उल्का", te: "ఉల్క", ta: "உல்கா", kn: "ಉಲ್ಕಾ", mr: "उल्का" },
  "siddha": { hi: "सिद्ध", te: "సిద్ధ", ta: "சித்தா", kn: "ಸಿದ್ಧ", mr: "सिद्ध" },
  "sankata": { hi: "संकट", te: "సంకట", ta: "சங்கடா", kn: "ಸಂಕಟ", mr: "संकट" },

  // ── Common short labels ──
  "strong": { hi: "बलवान", te: "బలమైన", ta: "வலிமை", kn: "ಬಲಶಾಲಿ", mr: "बलवान", gu: "મજબૂત" },
  "weak": { hi: "कमज़ोर", te: "బలహీన", ta: "பலவீனம்", kn: "ದುರ್ಬಲ", mr: "कमकुवत", gu: "નબળું" },
  "active": { hi: "सक्रिय", te: "సక్రియం", ta: "செயலில்", kn: "ಸಕ್ರಿಯ", mr: "सक्रिय", gu: "સક્રિય" },
  "mixed": { hi: "मिश्रित", te: "మిశ్రమం", ta: "கலப்பு", kn: "ಮಿಶ್ರ", mr: "मिश्र", gu: "મિશ્ર" },
  "present": { hi: "उपस्थित", te: "ఉన్నది", ta: "உள்ளது", kn: "ಇದೆ", mr: "उपस्थित", gu: "હાજર" },
  "absent": { hi: "अनुपस्थित", te: "లేదు", ta: "இல்லை", kn: "ಇಲ್ಲ", mr: "अनुपस्थित", gu: "ગેરહાજર" },
  "high": { hi: "उच्च", te: "ఉన్నత", ta: "உயர்", kn: "ಉನ್ನತ", mr: "उच्च", gu: "ઉચ્ચ" },
  "low": { hi: "निम्न", te: "తక్కువ", ta: "குறைவு", kn: "ಕಡಿಮೆ", mr: "कमी", gu: "નીચું" },
  "good": { hi: "शुभ", te: "శుభం", ta: "நல்ல", kn: "ಶುಭ", mr: "शुभ", gu: "શુભ" },
  "mild": { hi: "हल्का", te: "తేలిక", ta: "மிதமான", kn: "ಸೌಮ್ಯ", mr: "सौम्य", gu: "હળવું" },
  "severe": { hi: "गंभीर", te: "తీవ్రం", ta: "தீவிரம்", kn: "ತೀವ್ರ", mr: "गंभीर", gu: "ગંભીર" },
  "benefic": { hi: "शुभ", te: "శుభ", ta: "சுப", kn: "ಶುಭ", mr: "शुभ", gu: "શુભ" },
  "malefic": { hi: "पाप", te: "పాప", ta: "பாப", kn: "ಪಾಪ", mr: "पाप", gu: "પાપ" },
  "kendra": { hi: "केन्द्र", te: "కేంద్రం", ta: "கேந்திரம்", kn: "ಕೇಂದ್ರ", mr: "केंद्र", gu: "કેન્દ્ર" },
  "trikona": { hi: "त्रिकोण", te: "త్రికోణం", ta: "திரிகோணம்", kn: "ತ್ರಿಕೋಣ", mr: "त्रिकोण", gu: "ત્રિકોણ" },
  "dusthana": { hi: "दुस्थान", te: "దుస్థానం", ta: "துஷ்டானம்", kn: "ದುಸ್ಥಾನ", mr: "दुस्थान", gu: "દુસ્થાન" },
  "upachaya": { hi: "उपचय", te: "ఉపచయం", ta: "உபசயம்", kn: "ಉಪಚಯ", mr: "उपचय", gu: "ઉપચય" },
  "maraka": { hi: "मारक", te: "మారకం", ta: "மாரகம்", kn: "ಮಾರಕ", mr: "मारक", gu: "મારક" },

  // ── Day names (< 8 chars) ──
  "monday": { hi: "सोमवार", te: "సోమవారం", ta: "திங்கள்", kn: "ಸೋಮವಾರ", mr: "सोमवार", gu: "સોમવાર" },
  "tuesday": { hi: "मंगलवार", te: "మంగళవారం", ta: "செவ்வாய்", kn: "ಮಂಗಳವಾರ", mr: "मंगळवार", gu: "મંગળવાર" },
  "friday": { hi: "शुक्रवार", te: "శుక్రవారం", ta: "வெள்ளி", kn: "ಶುಕ್ರವಾರ", mr: "शुक्रवार", gu: "શુક્રવાર" },
  "sunday": { hi: "रविवार", te: "ఆదివారం", ta: "ஞாயிறு", kn: "ಭಾನುವಾರ", mr: "रविवार", gu: "રવિવાર" },

  // ── Common terms that appear as standalone values ──
  "career": { hi: "करियर", te: "వృత్తి", ta: "தொழில்", kn: "ವೃತ್ತಿ", mr: "करिअर", gu: "કારકિર્દી" },
  "health": { hi: "स्वास्थ्य", te: "ఆరోగ్యం", ta: "ஆரோக்கியம்", kn: "ಆರೋಗ್ಯ", mr: "आरोग्य", gu: "આરોગ્ય" },
  "wealth": { hi: "धन", te: "సంపద", ta: "செல்வம்", kn: "ಧನ", mr: "धन", gu: "ધન" },
  "love": { hi: "प्रेम", te: "ప్రేమ", ta: "காதல்", kn: "ಪ್ರೇಮ", mr: "प्रेम", gu: "પ્રેમ" },
  "yoga": { hi: "योग", te: "యోగం", ta: "யோகம்", kn: "ಯೋಗ", mr: "योग", gu: "યોગ" },
  "dosha": { hi: "दोष", te: "దోషం", ta: "தோஷம்", kn: "ದೋಷ", mr: "दोष", gu: "દોષ" },
  "dasha": { hi: "दशा", te: "దశ", ta: "தசை", kn: "ದಶಾ", mr: "दशा", gu: "દશા" },
  "graha": { hi: "ग्रह", te: "గ్రహం", ta: "கிரகம்", kn: "ಗ್ರಹ", mr: "ग्रह", gu: "ગ્રહ" },
  "bhava": { hi: "भाव", te: "భావం", ta: "பாவம்", kn: "ಭಾವ", mr: "भाव", gu: "ભાવ" },
  "lagna": { hi: "लग्न", te: "లగ్నం", ta: "லக்னம்", kn: "ಲಗ್ನ", mr: "लग्न", gu: "લગ્ન" },
};

/**
 * Pre-sweep: translate known short terms that the general sweep skips due to MIN_STRING_LENGTH.
 * Walks the entire report and replaces exact-match string values.
 * This handles planet names, zodiac signs, nakshatras, dignity terms, etc.
 * Runs BEFORE collectEnglishStrings() in the main sweep.
 */
function applyKnownTermTranslations(
  report: Record<string, any>,
  targetLanguage: string,
): number {
  if (targetLanguage === "en") return 0;
  let count = 0;

  function walk(obj: any, parentKey?: string, isTopLevel = false): void {
    if (parentKey && SKIP_KEYS.has(parentKey)) return;

    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        if (typeof obj[i] === "string") {
          const key = obj[i].trim().toLowerCase();
          const cached = SHORT_TERM_TRANSLATIONS[key];
          if (cached) {
            const translation = targetLanguage === "hi" ? cached.hi : targetLanguage === "te" ? cached.te : targetLanguage === "ta" ? (cached.ta ?? null) : targetLanguage === "kn" ? (cached.kn ?? null) : targetLanguage === "mr" ? (cached.mr ?? cached.hi) : targetLanguage === "gu" ? (cached.gu ?? null) : null;
            if (translation) { obj[i] = translation; count++; }
          }
        } else {
          walk(obj[i], parentKey, false);
        }
      }
      return;
    }

    if (obj && typeof obj === "object") {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        // Skip entire top-level subtrees
        if (isTopLevel && SKIP_TOP_LEVEL.has(key)) continue;

        if (typeof value === "string") {
          const lookupKey = value.trim().toLowerCase();
          const cached = SHORT_TERM_TRANSLATIONS[lookupKey];
          if (cached) {
            const translation = targetLanguage === "hi" ? cached.hi : targetLanguage === "te" ? cached.te : targetLanguage === "ta" ? (cached.ta ?? null) : targetLanguage === "kn" ? (cached.kn ?? null) : targetLanguage === "mr" ? (cached.mr ?? cached.hi) : targetLanguage === "gu" ? (cached.gu ?? null) : null;
            if (translation) { (obj as any)[key] = translation; count++; }
          }
        } else {
          walk(value, key, false);
        }
      }
    }
  }

  walk(report, undefined, true);
  return count;
}

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

  // ── Planetary data (structural / numeric only) ──
  // NOTE: "planet","sign","nakshatra","lord","dignity","name" REMOVED from skip list.
  // Short values like "Sun","Mars","Aries" are naturally protected by MIN_STRING_LENGTH=8.
  // Longer values like "Sagittarius","Uttara Phalguni","Atmakaraka" NEED translation.
  "house", "degree", "signIdx", "deg",
  "pada", "speed",
  "isRetro", "isRetrograde", "retrograde",

  // ── Dasha periods (dates/labels used as keys) ──
  "startDate", "endDate", "approximatePeriod", "duration",
  "dashaLabel", "period",

  // ── Names / pre-localized labels ──
  // NOTE: "name" REMOVED — it blocked translation of gemstone names, yoga names, etc.
  // Short names (<8 chars) are safely ignored by needsTranslation().
  "nameHindi", "nameTelugu", "nameEnglish",
  "purposeHindi", "purposeTelugu",

  // ── Charts / media ──
  "chartUrl", "imageUrl", "svgData", "svg", "charts",
  "type",       // chart type identifiers like "D1", "D9"

  // ── Scores / numeric metadata ──
  "score", "overallScore", "tokensUsed", "version",

  // ── Safety meta keys ──
  // NOTE: "medicalDisclaimer","statusAssumption","safeguardPolicy" REMOVED — these
  // are prose text that MUST be translated. "ageGroup","whenApplicable" also removed.
]);

/**
 * Top-level report keys whose entire subtrees should be skipped.
 */
const SKIP_TOP_LEVEL = new Set([
  "seerRawResponse", "seerRequest", "computationMeta",
  "charts", "qa", "languageQc", "errors",
  "birthDetails",         // technical birth info, not prose
  // NOTE: planetaryPositions, ascendant, charaKarakas, aspects, conjunctions
  // were previously skipped here but they contain display text (karaka names,
  // signification prose, planet/sign names, aspect descriptions) that MUST be
  // translated. Short structural values (planet="Sun", degree=15.2) are safely
  // ignored by needsTranslation() due to MIN_STRING_LENGTH=8.
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
  // ── Display fields previously blocked by SKIP_KEYS ──
  "signification", "karaka", "planet", "sign", "name",
  "lord", "dignity", "nakshatra",
  "medicalDisclaimer", "statusAssumption", "safeguardPolicy",
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
  if (/^(en|hi|te|kn|mr|native|legacy)$/i.test(text)) return false;

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
  const langName = targetLanguage === "hi" ? "Hindi (हिन्दी)"
    : targetLanguage === "te" ? "Telugu (తెలుగు)"
    : targetLanguage === "kn" ? "Kannada (ಕನ್ನಡ)"
    : targetLanguage === "mr" ? "Marathi (मराठी)"
    : targetLanguage === "gu" ? "Gujarati (ગુજરાતી)"
    : "Hindi (हिन्दी)";
  const scriptName = targetLanguage === "hi" || targetLanguage === "mr" ? "Devanagari"
    : targetLanguage === "te" ? "Telugu"
    : targetLanguage === "kn" ? "Kannada"
    : targetLanguage === "gu" ? "Gujarati"
    : "Devanagari";

  // Build numbered list for Gemini — use double newline for clarity
  const numberedTexts = entries.map((e, i) => `[${i}] ${e.original}`).join("\n\n");

  // Helper to pick the correct term by language
  const t = (hi: string, te: string, kn: string, mr: string, gu: string): string =>
    targetLanguage === "hi" ? hi : targetLanguage === "te" ? te : targetLanguage === "kn" ? kn : targetLanguage === "mr" ? mr : gu;

  const sentenceEnding = targetLanguage === "hi" || targetLanguage === "mr" || targetLanguage === "gu" ? "।" : ".";

  const systemPrompt = `You are an expert Vedic astrology translator specializing in ${langName}.
Your task is to translate English text into natural, fluent ${langName} using ${scriptName} script.
These strings are from the "${sectionContext}" section of a Vedic astrology (Jyotish) report.

CRITICAL RULES:
1. Output MUST be entirely in ${scriptName} script — ZERO Latin/English characters whatsoever.
2. Vedic astrology terms must use their traditional ${langName} equivalents:
   - Planets: Sun→${t("सूर्य", "సూర్యుడు", "ಸೂರ್ಯ", "सूर्य", "સૂર્ય")}, Moon→${t("चंद्रमा", "చంద్రుడు", "ಚಂದ್ರ", "चंद्र", "ચંદ્ર")}, Mars→${t("मंगल", "కుజుడు", "ಕುಜ", "मंगळ", "મંગળ")}, Mercury→${t("बुध", "బుధుడు", "ಬುಧ", "बुध", "બુધ")}, Jupiter→${t("गुरु", "గురుడు", "ಗುರು", "गुरु", "ગુરુ")}, Venus→${t("शुक्र", "శుక్రుడు", "ಶುಕ್ರ", "शुक्र", "શુક્ર")}, Saturn→${t("शनि", "శని", "ಶని", "शनि", "શનિ")}, Rahu→${t("राहु", "రాహు", "ರಾಹು", "राहु", "રાહુ")}, Ketu→${t("केतु", "కేతు", "ಕೇತು", "केतु", "કેતુ")}
   - Signs: Aries→${t("मेष", "మేషం", "ಮೇಷ", "मेष", "મેષ")}, Taurus→${t("वृषभ", "వృషభం", "ವೃಷಭ", "वृषभ", "વૃષભ")}, Gemini→${t("मिथुन", "మిథునం", "ಮಿಥುನ", "मिथुन", "મિથુન")}, Cancer→${t("कर्क", "కర్కాటకం", "ಕರ್ಕಾಟಕ", "कर्क", "કર્ક")}, Leo→${t("सिंह", "సింహం", "ಸಿಂಹ", "सिंह", "સિંહ")}, Virgo→${t("कन्या", "కన్య", "ಕನ್ಯಾ", "कन्या", "કન્યા")}, Libra→${t("तुला", "తులా", "ತುಲಾ", "तूळ", "તુલા")}, Scorpio→${t("वृश्चिक", "వృశ్చికం", "ವೃಶ್ಚಿಕ", "वृश्चिक", "વૃશ્ચિક")}, Sagittarius→${t("धनु", "ధనుస్సు", "ಧನು", "धनु", "ધનુ")}, Capricorn→${t("मकर", "మకరం", "ಮಕರ", "मकर", "મકર")}, Aquarius→${t("कुम्भ", "కుంభం", "ಕುಂಭ", "कुंभ", "કુંભ")}, Pisces→${t("मीन", "మీనం", "ಮೀನ", "मीन", "મીન")}
   - Terms: Mahadasha→${t("महादशा", "మహాదశ", "ಮಹಾದಶಾ", "महादशा", "મહાદશા")}, Antardasha→${t("अंतर्दशा", "అంతర్దశ", "ಅಂತರ್ದಶಾ", "अंतर्दशा", "અંતર્દશા")}, Yoga→${t("योग", "యోగం", "ಯೋಗ", "योग", "યોગ")}, Dosha→${t("दोष", "దోషం", "ದೋಷ", "दोष", "દોષ")}, Nakshatra→${t("नक्षत्र", "నక్షత్రం", "ನಕ್ಷತ್ರ", "नक्षत्र", "નક્ષત્ર")}, House→${t("भाव", "భావం", "ಭಾವ", "भाव", "ભાવ")}, Ascendant→${t("लग्न", "లగ్నం", "ಲಗ್ನ", "लग्न", "લગ્ન")}
   - Life areas: Career→${t("करियर", "వృత్తి", "ವೃತ್ತಿ", "करिअर", "કારકિર્દી")}, Marriage→${t("विवाह", "వివాహం", "ವಿವಾಹ", "विवाह", "વિવાહ")}, Health→${t("स्वास्थ्य", "ఆరోగ్యం", "ಆರೋಗ್ಯ", "आरोग्य", "આરોગ્ય")}, Prediction→${t("भविष्यवाणी", "భవిష్యవాణి", "ಭವಿಷ್ಯವಾಣಿ", "भविष्यवाणी", "ભવિષ્યવાણી")}, Opportunity→${t("अवसर", "అవకాశం", "ಅವಕಾಶ", "संधी", "અવસર")}, Challenge→${t("चुनौती", "సవాలు", "ಸವಾಲು", "आव्हान", "પડકાર")}, Impact→${t("प्रभाव", "ప్రభావం", "ಪ್ರಭಾವ", "प्रभाव", "પ્રભાવ")}, Remedy→${t("उपाय", "పరిహారం", "ಪರಿಹಾರ", "उपाय", "ઉપાય")}, Mantra→${t("मंत्र", "మంత్రం", "ಮಂತ್ರ", "मंत्र", "મંત્ર")}, Gemstone→${t("रत्न", "రత్నం", "ರత్న", "रत्न", "રત્ન")}
3. If text mixes ${scriptName} and English, translate ONLY the English portions — preserve existing ${scriptName} text.
4. Keep numbers as Arabic numerals (1, 2, 3...) and dates in their original format.
5. Use natural ${langName} sentence structure — NOT word-by-word translation.
6. Maintain the same meaning, tone, detail level, and paragraph structure.
7. Preserve bullet points (•), dashes (—), and formatting markers.
8. Use ${sentenceEnding} for sentence endings instead of periods.
9. Do NOT add extra content, commentary, or explanations.
10. Even parenthetical English like "(Saturn)" must become "(${t("शनि", "శని", "ಶನಿ", "शनि", "શનિ")})".
11. PROPER NOUNS: Yogini names (Mangala, Pingala, Dhanya, Bhramari, Bhadrika, Ulka, Siddha, Sankata) must be transliterated to ${scriptName} script, NOT translated. They are names, not common nouns.
12. "Nakshatra" means ${t("नक्षत्र", "నక్షత్రం", "ನಕ್ಷತ್ರ", "नक्षत्र", "નક્ષત્ર")} — NEVER translate it as "constellations" or any other English word. Always use the ${scriptName} equivalent.
13. NEVER repeat the same word multiple times. Every sentence must be a natural, fluent translation with varied vocabulary.`;

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

    // Validate: reject repeated-word hallucinations (e.g., "constellations constellations constellations...")
    const translatedWords = translatedText.split(/\s+/).filter(w => w.length > 2);
    if (translatedWords.length >= 6) {
      const wordFreq = new Map<string, number>();
      for (const w of translatedWords) wordFreq.set(w.toLowerCase(), (wordFreq.get(w.toLowerCase()) || 0) + 1);
      const maxFreq = Math.max(...wordFreq.values());
      if (maxFreq > Math.max(4, translatedWords.length * 0.4)) {
        const repeatedWord = [...wordFreq.entries()].find(([, v]) => v === maxFreq)?.[0] || "?";
        console.warn(`⚠️ [TRANSLATE] Rejected hallucinated translation for "${entries[idx].path}" — word "${repeatedWord}" repeated ${maxFreq}/${translatedWords.length} times`);
        continue;
      }
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
  totalBatchesNeeded: number;  // Total Gemini batches needed (before any maxBatches limit)
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
  if (targetLanguage === "hi") return entry.hi;
  if (targetLanguage === "te") return entry.te;
  if (targetLanguage === "ta") return entry.ta ?? null; // Tamil — uncached entries fall through to Gemini
  if (targetLanguage === "kn") return entry.kn ?? null; // uncached → Gemini will handle
  if (targetLanguage === "mr") return entry.mr ?? entry.hi; // Marathi falls back to Hindi (Devanagari, similar vocabulary)
  if (targetLanguage === "gu") return entry.gu ?? null;
  return null;
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
  options?: { maxBatches?: number },
): Promise<TranslationResult> {
  const stats: TranslationResult = {
    stringsFound: 0,
    stringsTranslated: 0,
    stringsCached: 0,
    batchesSent: 0,
    totalBatchesNeeded: 0,
    errors: [],
    tokensUsed: 0,
    remainingEnglishCount: 0,
    sectionBreakdown: {},
  };

  if (targetLanguage === "en") return stats;

  const langLabel = targetLanguage === "hi" ? "Hindi" : targetLanguage === "te" ? "Telugu" : targetLanguage === "kn" ? "Kannada" : targetLanguage === "mr" ? "Marathi" : targetLanguage === "gu" ? "Gujarati" : targetLanguage;
  console.log(`🌐 [TRANSLATE] Starting ${langLabel} translation sweep (threshold: ${(LATIN_RATIO_THRESHOLD * 100).toFixed(0)}%, batch: ${BATCH_SIZE}, concurrency: ${CONCURRENCY}, retries: ${MAX_RETRIES}, cache: ${Object.keys(PHRASE_CACHE).length} phrases)...`);

  // ── Step 0: Pre-sweep — translate known short terms (planet names, signs, etc.) ──
  const shortTermCount = applyKnownTermTranslations(report, targetLanguage);
  console.log(`⚡ [TRANSLATE] Pre-sweep: ${shortTermCount} short terms translated (planets, signs, nakshatras, etc.)`);

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

  stats.totalBatchesNeeded = allBatches.length;

  // If maxBatches is set, only process that many batches
  const maxBatches = options?.maxBatches;
  const batchesToProcess = maxBatches && allBatches.length > maxBatches
    ? allBatches.slice(0, maxBatches)
    : allBatches;

  if (maxBatches && allBatches.length > maxBatches) {
    console.log(`⚠️ [TRANSLATE] Limiting to ${maxBatches}/${allBatches.length} batches (split mode). Remaining will be processed in next pass.`);
  }

  console.log(`📦 [TRANSLATE] ${batchesToProcess.length} batches to translate via Gemini (${CONCURRENCY} concurrent)...`);

  // ── Step 5: Execute batches in PARALLEL waves of CONCURRENCY ──────────────
  for (let waveStart = 0; waveStart < batchesToProcess.length; waveStart += CONCURRENCY) {
    const wave = batchesToProcess.slice(waveStart, waveStart + CONCURRENCY);
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

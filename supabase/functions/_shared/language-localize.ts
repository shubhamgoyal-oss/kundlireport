import { getLanguagePack, normalizeLanguage } from "./language-packs/index.ts";

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function localizeText(text: string, replacements: Array<{ from: string; to: string }>): string {
  let out = text;
  for (const { from, to } of replacements) {
    const re = new RegExp(`\\b${escapeRegex(from)}\\b`, "gi");
    out = out.replace(re, to);
  }
  return out;
}

function removeNoise(value: string): string {
  return value
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+([,.;:!?।॥])/g, "$1")
    .trim();
}

const LOCALIZATION_SKIP_KEYS = new Set([
  "language",
  "generationMode",
  "languagePackVersion",
  "failureCode",
  "generation_language_mode",
  "language_qc",
  "report_data",
  "visitorId",
  "sessionId",
  "jobId",
]);

function shouldSkipLocalizationForValue(value: string, parentKey?: string): boolean {
  if (parentKey && LOCALIZATION_SKIP_KEYS.has(parentKey)) return true;
  if (!value) return false;
  const text = value.trim();
  // Preserve technical/date/time values and offsets.
  if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(text)) return true;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(text)) return true;
  if (/^UTC[+-]\d{2}:\d{2}$/i.test(text)) return true;
  if (/^[A-Z]{2,5}([_-][A-Z0-9]{2,5})?$/.test(text)) return true;
  return false;
}

function normalizeEnding(value: string, language: "en" | "hi" | "te"): string {
  if (!value || value.length < 40) return value;
  if (/[।॥.!?]\s*$/.test(value)) return value;
  if (language === "en") return `${value}.`;
  return `${value}।`;
}

function replaceCommonLatin(value: string, language: "en" | "hi" | "te"): string {
  if (language === "en") return value;
  const hiMap: Array<[RegExp, string]> = [
    // ── Strength / severity / status ──
    [/\bhigh\b/gi, "उच्च"],
    [/\bmedium\b/gi, "मध्यम"],
    [/\blow\b/gi, "कम"],
    [/\bnone\b/gi, "नहीं"],
    [/\bpresent\b/gi, "उपस्थित"],
    [/\babsent\b/gi, "अनुपस्थित"],
    [/\bnullified\b/gi, "निरस्त"],
    [/\bpartial\b/gi, "आंशिक"],
    [/\bstrong\b/gi, "मजबूत"],
    [/\bmoderate\b/gi, "मध्यम"],
    [/\bweak\b/gi, "कमज़ोर"],
    [/\bactive\b/gi, "सक्रिय"],
    [/\bstrength\b/gi, "बल"],
    [/\bseverity\b/gi, "गंभीरता"],
    [/\bintensity\b/gi, "तीव्रता"],

    // ── Time / period ──
    [/\bphase\b/gi, "चरण"],
    [/\bperiod\b/gi, "अवधि"],
    [/\byears?\b/gi, "वर्ष"],
    [/\bmonths?\b/gi, "महीने"],
    [/\bdays?\b/gi, "दिन"],
    [/\bcurrent\b/gi, "वर्तमान"],
    [/\bprevious\b/gi, "पूर्व"],
    [/\bduration\b/gi, "अवधि"],
    [/\btiming\b/gi, "समय"],

    // ── Jyotish core terms ──
    [/\bhouse\b/gi, "भाव"],
    [/\bhouses\b/gi, "भाव"],
    [/\bsign\b/gi, "राशि"],
    [/\bsigns\b/gi, "राशियां"],
    [/\bplanet\b/gi, "ग्रह"],
    [/\bplanets\b/gi, "ग्रह"],
    [/\bdosha\b/gi, "दोष"],
    [/\byoga\b/gi, "योग"],
    [/\byogas\b/gi, "योग"],
    [/\bdasha\b/gi, "दशा"],
    [/\bnative\b/gi, "जातक"],
    [/\bascendant\b/gi, "लग्न"],
    [/\bnakshatra\b/gi, "नक्षत्र"],
    [/\bcycle\b/gi, "चक्र"],
    [/\bkarma\b/gi, "कर्म"],
    [/\bvedic\b/gi, "वैदिक"],
    [/\bkundli\b/gi, "कुंडली"],
    [/\bhoroscope\b/gi, "जन्मपत्री"],
    [/\bjapa\b/gi, "जप"],
    [/\bmantra\b/gi, "मंत्र"],
    [/\bmantras\b/gi, "मंत्र"],

    // ── People / gender ──
    [/\bmale\b/gi, "पुरुष"],
    [/\bfemale\b/gi, "महिला"],
    [/\byoung\b/gi, "युवा"],
    [/\badult\b/gi, "वयस्क"],
    [/\bsenior\b/gi, "वरिष्ठ"],
    [/\bminor\b/gi, "अल्पवय"],
    [/\bspouse\b/gi, "जीवनसाथी"],
    [/\bpartner\b/gi, "साथी"],

    // ── Life areas & sections ──
    [/\bhealth\b/gi, "स्वास्थ्य"],
    [/\bcareer\b/gi, "कैरियर"],
    [/\bmarriage\b/gi, "विवाह"],
    [/\bguidance\b/gi, "मार्गदर्शन"],
    [/\banalysis\b/gi, "विश्लेषण"],
    [/\bremedy\b/gi, "उपाय"],
    [/\bremedies\b/gi, "उपाय"],
    [/\bprediction\b/gi, "भविष्यवाणी"],
    [/\bpredictions\b/gi, "भविष्यवाणियां"],
    [/\boverview\b/gi, "अवलोकन"],
    [/\bsummary\b/gi, "सारांश"],
    [/\bbenefits\b/gi, "लाभ"],
    [/\beffects\b/gi, "प्रभाव"],
    [/\bimpact\b/gi, "प्रभाव"],
    [/\binsight\b/gi, "अंतर्दृष्टि"],
    [/\bdescription\b/gi, "विवरण"],
    [/\binterpretation\b/gi, "व्याख्या"],
    [/\bexplanation\b/gi, "स्पष्टीकरण"],
    [/\bsignificance\b/gi, "महत्व"],

    // ── Remedy-related terms ──
    [/\bgemstones?\b/gi, "रत्न"],
    [/\brecommended\b/gi, "अनुशंसित"],
    [/\bpronunciation\b/gi, "उच्चारण"],
    [/\bfasting\b/gi, "उपवास"],
    [/\bdonation\b/gi, "दान"],
    [/\bcharity\b/gi, "दान"],
    [/\brudraksha\b/gi, "रुद्राक्ष"],
    [/\byantra\b/gi, "यंत्र"],
    [/\bworship\b/gi, "पूजा"],
    [/\bpuja\b/gi, "पूजा"],
    [/\bprayer\b/gi, "प्रार्थना"],
    [/\bmeditation\b/gi, "ध्यान"],
    [/\bchanting\b/gi, "जप"],
    [/\brecitation\b/gi, "पाठ"],

    // ── Lucky / unlucky ──
    [/\blucky\b/gi, "शुभ"],
    [/\bunlucky\b/gi, "अशुभ"],
    [/\bcolou?rs?\b/gi, "रंग"],
    [/\bnumbers?\b/gi, "अंक"],
    [/\bdirections?\b/gi, "दिशा"],

    // ── Yoga / marriage / career terms ──
    [/\bdetected\b/gi, "पाया गया"],
    [/\bactivation\b/gi, "सक्रियता"],
    [/\battraction\b/gi, "आकर्षण"],
    [/\blove\b/gi, "प्रेम"],
    [/\bswitch\b/gi, "परिवर्तन"],
    [/\bdue\b/gi, "अपेक्षित"],
    [/\btotal\b/gi, "कुल"],
    [/\benvironment\b/gi, "वातावरण"],
    [/\bideal\b/gi, "आदर्श"],
    [/\bwork\b/gi, "कार्य"],
    [/\bcompatibility\b/gi, "अनुकूलता"],
    [/\brelationship\b/gi, "संबंध"],
    [/\bprofession\b/gi, "व्यवसाय"],
    [/\boccupation\b/gi, "व्यवसाय"],
    [/\bfinancial\b/gi, "वित्तीय"],
    [/\bwealth\b/gi, "धन"],
    [/\bprosperity\b/gi, "समृद्धि"],
    [/\bsuccess\b/gi, "सफलता"],
    [/\bgrowth\b/gi, "विकास"],
    [/\bopportunity\b/gi, "अवसर"],
    [/\bopportunities\b/gi, "अवसर"],
    [/\bchallenge\b/gi, "चुनौती"],
    [/\bchallenges\b/gi, "चुनौतियां"],
    [/\bfavorable\b/gi, "अनुकूल"],
    [/\bunfavorable\b/gi, "प्रतिकूल"],
    [/\bauspicious\b/gi, "शुभ"],
    [/\binauspicious\b/gi, "अशुभ"],

    // ── Sade Sati / transit ──
    [/\btransit\b/gi, "गोचर"],
    [/\brising\b/gi, "प्रारंभिक"],
    [/\bpeak\b/gi, "चरम"],
    [/\bsetting\b/gi, "अंतिम"],
    [/\binfluence\b/gi, "प्रभाव"],
    [/\bexalted\b/gi, "उच्च"],
    [/\bdebilitated\b/gi, "नीच"],
    [/\bretrograde\b/gi, "वक्री"],
    [/\bcombust\b/gi, "अस्त"],
    [/\bdignity\b/gi, "बल"],
    [/\baspect\b/gi, "दृष्टि"],
    [/\bconjunction\b/gi, "युति"],

    // ── Common adjectives / descriptors ──
    [/\bpositive\b/gi, "सकारात्मक"],
    [/\bnegative\b/gi, "नकारात्मक"],
    [/\bnatural\b/gi, "प्राकृतिक"],
    [/\bspiritual\b/gi, "आध्यात्मिक"],
    [/\bmental\b/gi, "मानसिक"],
    [/\bphysical\b/gi, "शारीरिक"],
    [/\bemotional\b/gi, "भावनात्मक"],
    [/\bpractical\b/gi, "व्यावहारिक"],
    [/\bimportant\b/gi, "महत्वपूर्ण"],
    [/\bsignificant\b/gi, "महत्वपूर्ण"],
    [/\bbeneficial\b/gi, "लाभदायक"],
    [/\bharmful\b/gi, "हानिकारक"],
    [/\bprotective\b/gi, "रक्षात्मक"],
    [/\bpowerful\b/gi, "शक्तिशाली"],

    // ── Misc common words ──
    [/\bcharacteristics\b/gi, "विशेषताएं"],
    [/\bqualities\b/gi, "गुण"],
    [/\bnature\b/gi, "प्रकृति"],
    [/\btype\b/gi, "प्रकार"],
    [/\bresult\b/gi, "परिणाम"],
    [/\bresults\b/gi, "परिणाम"],
    [/\bcaution\b/gi, "सावधानी"],
    [/\bwarning\b/gi, "चेतावनी"],
    [/\badvice\b/gi, "सलाह"],
    [/\brecommendation\b/gi, "सुझाव"],
    [/\brecommendations\b/gi, "सुझाव"],
    [/\bformation\b/gi, "गठन"],
    [/\bcriteria\b/gi, "मानदंड"],
    [/\barea\b/gi, "क्षेत्र"],
    [/\bareas\b/gi, "क्षेत्र"],
    [/\bfocus\b/gi, "केंद्र"],
    [/\bpath\b/gi, "मार्ग"],
    [/\bgeneral\b/gi, "सामान्य"],
    [/\bspecific\b/gi, "विशिष्ट"],
    [/\boverall\b/gi, "समग्र"],
    [/\bdetailed\b/gi, "विस्तृत"],
    [/\bbased\b/gi, "आधारित"],
    [/\baccording\b/gi, "अनुसार"],
    [/\bthrough\b/gi, "द्वारा"],
    [/\brelated\b/gi, "संबंधित"],
    [/\brespective\b/gi, "संबंधित"],

    // ── Nitya yoga names ──
    [/\bSiddha\b/g, "सिद्ध"],
    [/\bMangala\b/g, "मंगला"],
    [/\bPingala\b/g, "पिंगला"],
    [/\bDhanya\b/g, "धन्या"],
    [/\bBhramari\b/g, "भ्रमरी"],
    [/\bBhadrika\b/g, "भद्रिका"],
    [/\bUlka\b/g, "उल्का"],
    [/\bSankata\b/g, "संकटा"],
  ];
  const teMap: Array<[RegExp, string]> = [
    // ── Strength / severity / status ──
    [/\bhigh\b/gi, "అధిక"],
    [/\bmedium\b/gi, "మధ్యస్థ"],
    [/\blow\b/gi, "తక్కువ"],
    [/\bnone\b/gi, "లేదు"],
    [/\bpresent\b/gi, "ఉంది"],
    [/\babsent\b/gi, "లేదు"],
    [/\bnullified\b/gi, "నిరాకరించబడింది"],
    [/\bpartial\b/gi, "ఆంశికం"],
    [/\bstrong\b/gi, "బలమైన"],
    [/\bmoderate\b/gi, "మధ్యస్థ"],
    [/\bweak\b/gi, "బలహీన"],
    [/\bactive\b/gi, "సక్రియ"],
    [/\bstrength\b/gi, "బలం"],
    [/\bseverity\b/gi, "తీవ్రత"],
    [/\bintensity\b/gi, "తీవ్రత"],

    // ── Time / period ──
    [/\bphase\b/gi, "దశ"],
    [/\bperiod\b/gi, "కాలం"],
    [/\byears?\b/gi, "సంవత్సరాలు"],
    [/\bmonths?\b/gi, "నెలలు"],
    [/\bdays?\b/gi, "రోజులు"],
    [/\bcurrent\b/gi, "ప్రస్తుత"],
    [/\bprevious\b/gi, "గత"],
    [/\bduration\b/gi, "కాలం"],
    [/\btiming\b/gi, "సమయం"],

    // ── Jyotish core terms ──
    [/\bhouse\b/gi, "భావం"],
    [/\bhouses\b/gi, "భావాలు"],
    [/\bsign\b/gi, "రాశి"],
    [/\bsigns\b/gi, "రాశులు"],
    [/\bplanet\b/gi, "గ్రహం"],
    [/\bplanets\b/gi, "గ్రహాలు"],
    [/\bdosha\b/gi, "దోషం"],
    [/\byoga\b/gi, "యోగం"],
    [/\byogas\b/gi, "యోగాలు"],
    [/\bdasha\b/gi, "దశ"],
    [/\bnative\b/gi, "జాతకుడు"],
    [/\bascendant\b/gi, "లగ్నం"],
    [/\bnakshatra\b/gi, "నక్షత్రం"],
    [/\bcycle\b/gi, "చక్రం"],
    [/\bkarma\b/gi, "కర్మ"],
    [/\bvedic\b/gi, "వేద"],
    [/\bkundli\b/gi, "జాతకం"],
    [/\bhoroscope\b/gi, "జాతకం"],
    [/\bjapa\b/gi, "జపం"],
    [/\bmantra\b/gi, "మంత్రం"],
    [/\bmantras\b/gi, "మంత్రాలు"],

    // ── People / gender ──
    [/\bmale\b/gi, "పురుషుడు"],
    [/\bfemale\b/gi, "మహిళ"],
    [/\byoung\b/gi, "యువ"],
    [/\badult\b/gi, "వయోజన"],
    [/\bsenior\b/gi, "వృద్ధ"],
    [/\bminor\b/gi, "అల్పవయస్కుడు"],
    [/\bspouse\b/gi, "జీవిత భాగస్వామి"],
    [/\bpartner\b/gi, "భాగస్వామి"],

    // ── Life areas & sections ──
    [/\bhealth\b/gi, "ఆరోగ్యం"],
    [/\bcareer\b/gi, "వృత్తి"],
    [/\bmarriage\b/gi, "వివాహం"],
    [/\bguidance\b/gi, "మార్గదర్శకం"],
    [/\banalysis\b/gi, "విశ్లేషణ"],
    [/\bremedy\b/gi, "పరిహారం"],
    [/\bremedies\b/gi, "పరిహారాలు"],
    [/\bprediction\b/gi, "భవిష్యవాణి"],
    [/\bpredictions\b/gi, "భవిష్యవాణి"],
    [/\boverview\b/gi, "అవలోకనం"],
    [/\bsummary\b/gi, "సారాంశం"],
    [/\bbenefits\b/gi, "ప్రయోజనాలు"],
    [/\beffects\b/gi, "ప్రభావాలు"],
    [/\bimpact\b/gi, "ప్రభావం"],
    [/\binsight\b/gi, "అంతర్దృష్టి"],
    [/\bdescription\b/gi, "వివరణ"],
    [/\binterpretation\b/gi, "వ్యాఖ్యానం"],
    [/\bexplanation\b/gi, "వివరణ"],
    [/\bsignificance\b/gi, "ప్రాముఖ్యత"],

    // ── Remedy-related terms ──
    [/\bgemstones?\b/gi, "రత్నం"],
    [/\brecommended\b/gi, "సిఫారసు చేయబడిన"],
    [/\bpronunciation\b/gi, "ఉచ్చారణ"],
    [/\bfasting\b/gi, "ఉపవాసం"],
    [/\bdonation\b/gi, "దానం"],
    [/\bcharity\b/gi, "దానం"],
    [/\brudraksha\b/gi, "రుద్రాక్ష"],
    [/\byantra\b/gi, "యంత్రం"],
    [/\bworship\b/gi, "పూజ"],
    [/\bpuja\b/gi, "పూజ"],
    [/\bprayer\b/gi, "ప్రార్థన"],
    [/\bmeditation\b/gi, "ధ్యానం"],
    [/\bchanting\b/gi, "జపం"],
    [/\brecitation\b/gi, "పఠనం"],

    // ── Lucky / unlucky ──
    [/\blucky\b/gi, "అదృష్ట"],
    [/\bunlucky\b/gi, "దురదృష్ట"],
    [/\bcolou?rs?\b/gi, "రంగు"],
    [/\bnumbers?\b/gi, "సంఖ్య"],
    [/\bdirections?\b/gi, "దిశ"],

    // ── Yoga / marriage / career terms ──
    [/\bdetected\b/gi, "గుర్తించబడింది"],
    [/\bactivation\b/gi, "సక్రియం"],
    [/\battraction\b/gi, "ఆకర్షణ"],
    [/\blove\b/gi, "ప్రేమ"],
    [/\bswitch\b/gi, "మార్పు"],
    [/\bdue\b/gi, "నిర్ణయించబడిన"],
    [/\btotal\b/gi, "మొత్తం"],
    [/\benvironment\b/gi, "వాతావరణం"],
    [/\bideal\b/gi, "ఆదర్శ"],
    [/\bwork\b/gi, "పని"],
    [/\bcompatibility\b/gi, "అనుకూలత"],
    [/\brelationship\b/gi, "సంబంధం"],
    [/\bprofession\b/gi, "వృత్తి"],
    [/\boccupation\b/gi, "వృత్తి"],
    [/\bfinancial\b/gi, "ఆర్థిక"],
    [/\bwealth\b/gi, "సంపద"],
    [/\bprosperity\b/gi, "సమృద్ధి"],
    [/\bsuccess\b/gi, "విజయం"],
    [/\bgrowth\b/gi, "వృద్ధి"],
    [/\bopportunity\b/gi, "అవకాశం"],
    [/\bopportunities\b/gi, "అవకాశాలు"],
    [/\bchallenge\b/gi, "సవాలు"],
    [/\bchallenges\b/gi, "సవాళ్ళు"],
    [/\bfavorable\b/gi, "అనుకూలం"],
    [/\bunfavorable\b/gi, "ప్రతికూలం"],
    [/\bauspicious\b/gi, "శుభం"],
    [/\binauspicious\b/gi, "అశుభం"],

    // ── Sade Sati / transit ──
    [/\btransit\b/gi, "గోచరం"],
    [/\brising\b/gi, "ఆరోహణ"],
    [/\bpeak\b/gi, "శిఖరం"],
    [/\bsetting\b/gi, "అస్తమయ"],
    [/\binfluence\b/gi, "ప్రభావం"],
    [/\bexalted\b/gi, "ఉచ్చ"],
    [/\bdebilitated\b/gi, "నీచ"],
    [/\bretrograde\b/gi, "వక్రి"],
    [/\bcombust\b/gi, "అస్తం"],
    [/\bdignity\b/gi, "బలం"],
    [/\baspect\b/gi, "దృష్టి"],
    [/\bconjunction\b/gi, "యుతి"],

    // ── Common adjectives / descriptors ──
    [/\bpositive\b/gi, "సానుకూల"],
    [/\bnegative\b/gi, "ప్రతికూల"],
    [/\bnatural\b/gi, "సహజ"],
    [/\bspiritual\b/gi, "ఆధ్యాత్మిక"],
    [/\bmental\b/gi, "మానసిక"],
    [/\bphysical\b/gi, "శారీరక"],
    [/\bemotional\b/gi, "భావోద్వేగ"],
    [/\bpractical\b/gi, "ఆచరణాత్మక"],
    [/\bimportant\b/gi, "ముఖ్యమైన"],
    [/\bsignificant\b/gi, "ముఖ్యమైన"],
    [/\bbeneficial\b/gi, "ప్రయోజనకరమైన"],
    [/\bharmful\b/gi, "హానికరమైన"],
    [/\bprotective\b/gi, "రక్షణాత్మక"],
    [/\bpowerful\b/gi, "శక్తివంతమైన"],

    // ── Misc common words ──
    [/\bcharacteristics\b/gi, "లక్షణాలు"],
    [/\bqualities\b/gi, "గుణాలు"],
    [/\bnature\b/gi, "స్వభావం"],
    [/\btype\b/gi, "రకం"],
    [/\bresult\b/gi, "ఫలితం"],
    [/\bresults\b/gi, "ఫలితాలు"],
    [/\bcaution\b/gi, "జాగ్రత్త"],
    [/\bwarning\b/gi, "హెచ్చరిక"],
    [/\badvice\b/gi, "సలహా"],
    [/\brecommendation\b/gi, "సిఫారసు"],
    [/\brecommendations\b/gi, "సిఫారసులు"],
    [/\bformation\b/gi, "నిర్మాణం"],
    [/\bcriteria\b/gi, "ప్రమాణాలు"],
    [/\barea\b/gi, "ప్రాంతం"],
    [/\bareas\b/gi, "ప్రాంతాలు"],
    [/\bfocus\b/gi, "కేంద్రం"],
    [/\bpath\b/gi, "మార్గం"],
    [/\bgeneral\b/gi, "సాధారణ"],
    [/\bspecific\b/gi, "నిర్దిష్ట"],
    [/\boverall\b/gi, "మొత్తం"],
    [/\bdetailed\b/gi, "వివరణాత్మక"],
    [/\bbased\b/gi, "ఆధారిత"],
    [/\baccording\b/gi, "ప్రకారం"],
    [/\bthrough\b/gi, "ద్వారా"],
    [/\brelated\b/gi, "సంబంధిత"],
    [/\brespective\b/gi, "సంబంధిత"],

    // ── Nitya yoga names ──
    [/\bSiddha\b/g, "సిద్ధ"],
    [/\bMangala\b/g, "మంగళ"],
    [/\bPingala\b/g, "పింగళ"],
    [/\bDhanya\b/g, "ధన్య"],
    [/\bBhramari\b/g, "భ్రమరి"],
    [/\bBhadrika\b/g, "భద్రికా"],
    [/\bUlka\b/g, "ఉల్కా"],
    [/\bSankata\b/g, "సంకటా"],
  ];

  let out = value;
  const rules = language === "hi" ? hiMap : teMap;
  for (const [re, to] of rules) {
    out = out.replace(re, to);
  }
  // NOTE: We intentionally do NOT strip remaining Latin words here.
  // Previously, all unmatched English words were blanked out, which
  // caused gibberish in the output (missing words, broken sentences).
  // The translation agent (Stage 2) handles untranslated English via
  // Gemini, and any remaining English is better than blank text.
  out = out.replace(/[ \t]{2,}/g, " ").trim();
  return out;
}

function walk(
  value: unknown,
  replacements: Array<{ from: string; to: string }>,
  language: "en" | "hi" | "te",
  parentKey?: string,
): unknown {
  if (typeof value === "string") {
    if (shouldSkipLocalizationForValue(value, parentKey)) return value;
    const localized = localizeText(value, replacements);
    const withCommon = replaceCommonLatin(localized, language);
    const cleaned = removeNoise(withCommon);
    return normalizeEnding(cleaned, language);
  }
  if (Array.isArray(value)) {
    return value.map((item) => walk(item, replacements, language, parentKey));
  }
  if (value && typeof value === "object") {
    const input = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      output[k] = walk(v, replacements, language, k);
    }
    return output;
  }
  return value;
}

export function localizeStructuredReportTerms<T>(report: T, language: unknown): T {
  const normalized = normalizeLanguage(language);
  if (normalized === "en") return report;

  const pack = getLanguagePack(normalized);
  const replacements: Array<{ from: string; to: string }> = [];
  const maps = [
    pack.termMaps.misc || {},
    pack.termMaps.months || {},
    pack.termMaps.nakshatras || {},
    pack.termMaps.planets,
    pack.termMaps.signs,
    pack.termMaps.weekdays,
    pack.termMaps.houses,
  ];

  for (const map of maps) {
    for (const [from, to] of Object.entries(map)) {
      replacements.push({ from, to });
    }
  }

  // Replace longer phrases first to avoid partial substitutions.
  replacements.sort((a, b) => b.from.length - a.from.length);

  return walk(report, replacements, normalized) as T;
}

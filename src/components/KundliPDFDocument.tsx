import { Document, Page, Text, View, StyleSheet, Font, Svg, Path, G, Rect, Circle, Line, Polygon, Ellipse, Defs, ClipPath, LinearGradient, RadialGradient, Stop, Image } from '@react-pdf/renderer';
import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
// Disable hyphenation to prevent character substitution issues
Font.registerHyphenationCallback(word => [word]);

// Register DejaVu Sans as fallback to handle all characters properly
// DejaVu Sans has complete Latin character coverage
Font.register({
  family: 'DejaVuSans',
  fonts: [
    {
      src: '/fonts/DejaVuSans.ttf',
      fontWeight: 'normal',
      fontStyle: 'normal',
    },
    {
      src: '/fonts/DejaVuSans-Bold.ttf',
      fontWeight: 'bold',
      fontStyle: 'normal',
    },
    // Map italic to regular (we don't have a separate italic font file)
    {
      src: '/fonts/DejaVuSans.ttf',
      fontWeight: 'normal',
      fontStyle: 'italic',
    },
    {
      src: '/fonts/DejaVuSans-Bold.ttf',
      fontWeight: 'bold',
      fontStyle: 'italic',
    },
  ],
});

// Register neutral Latin family alias
Font.register({
  family: 'NotoSans',
  fonts: [
    { src: '/fonts/DejaVuSans.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/DejaVuSans-Bold.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: '/fonts/DejaVuSans.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/DejaVuSans-Bold.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

// Register Hindi and Telugu fonts for native-script rendering
Font.register({
  family: 'NotoSansDevanagari',
  fonts: [
    { src: '/fonts/NotoSansDevanagari-Regular.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/NotoSansDevanagari-Bold.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: '/fonts/NotoSansDevanagari-Regular.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/NotoSansDevanagari-Bold.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

Font.register({
  family: 'NotoSansTelugu',
  fonts: [
    { src: '/fonts/NotoSansTelugu-Regular.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/NotoSansTelugu-Bold.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: '/fonts/NotoSansTelugu-Regular.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/NotoSansTelugu-Bold.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});

// Sri Mandir logo (200×200 PNG, base64-encoded for reliable @react-pdf/renderer rendering)
const SRI_MANDIR_LOGO_URI = '/images/sri-mandir-logo.png';

// Warm orange/saffron color palette — matches Sri Mandir branding (NO purple)
const P = {
  pageBg: '#FDF8F0',       // warm cream page background
  gold: '#C9A84C',          // gold for borders and accents
  goldLight: '#E8D5A0',     // light gold for subtle borders
  primary: '#9a3412',       // deep burnt orange for main headings (was purple)
  secondary: '#c2410c',     // warm dark orange for sub-headings (was purple)
  accent: '#ea580c',        // bright orange for tertiary headings (was purple)
  bodyText: '#2C1810',      // warm dark brown for body text
  mutedText: '#78350f',     // warm amber-brown for secondary text
  cardBg: '#FFF7ED',        // warm peach for cards
  tableAlt: '#FFF7ED',      // alternating table row — warm peach
  highlightBg: '#FFF9E6',   // warm yellow highlight
  white: '#FFFFFF',
  lightBorder: '#fed7aa',   // light orange border
};

const SRIMANDIR_ORANGE = '#f97316';

// Brand header bar color — deep warm brown (NOT purple)
const BRAND_HEADER_DARK = '#7c2d12';

const SIGN_TO_INDEX: Record<string, number> = {
  Aries: 0,
  Taurus: 1,
  Gemini: 2,
  Cancer: 3,
  Leo: 4,
  Virgo: 5,
  Libra: 6,
  Scorpio: 7,
  Sagittarius: 8,
  Capricorn: 9,
  Aquarius: 10,
  Pisces: 11,
};

const SIGN_SHORT: Record<string, string> = {
  Aries: 'Ari',
  Taurus: 'Tau',
  Gemini: 'Gem',
  Cancer: 'Can',
  Leo: 'Leo',
  Virgo: 'Vir',
  Libra: 'Lib',
  Scorpio: 'Sco',
  Sagittarius: 'Sag',
  Capricorn: 'Cap',
  Aquarius: 'Aqu',
  Pisces: 'Pis',
};

const SIGN_LORDS = [
  'Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury',
  'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter',
];

const NAKSHATRA_SPAN = 13.333333;
const NAKSHATRA_PADA_SPAN = 3.333333;
const NAKSHATRAS = [
  { name: 'Ashwini', lord: 'Ketu' },
  { name: 'Bharani', lord: 'Venus' },
  { name: 'Krittika', lord: 'Sun' },
  { name: 'Rohini', lord: 'Moon' },
  { name: 'Mrigashira', lord: 'Mars' },
  { name: 'Ardra', lord: 'Rahu' },
  { name: 'Punarvasu', lord: 'Jupiter' },
  { name: 'Pushya', lord: 'Saturn' },
  { name: 'Ashlesha', lord: 'Mercury' },
  { name: 'Magha', lord: 'Ketu' },
  { name: 'Purva Phalguni', lord: 'Venus' },
  { name: 'Uttara Phalguni', lord: 'Sun' },
  { name: 'Hasta', lord: 'Moon' },
  { name: 'Chitra', lord: 'Mars' },
  { name: 'Swati', lord: 'Rahu' },
  { name: 'Vishakha', lord: 'Jupiter' },
  { name: 'Anuradha', lord: 'Saturn' },
  { name: 'Jyeshtha', lord: 'Mercury' },
  { name: 'Mula', lord: 'Ketu' },
  { name: 'Purva Ashadha', lord: 'Venus' },
  { name: 'Uttara Ashadha', lord: 'Sun' },
  { name: 'Shravana', lord: 'Moon' },
  { name: 'Dhanishta', lord: 'Mars' },
  { name: 'Shatabhisha', lord: 'Rahu' },
  { name: 'Purva Bhadrapada', lord: 'Jupiter' },
  { name: 'Uttara Bhadrapada', lord: 'Saturn' },
  { name: 'Revati', lord: 'Mercury' },
];

const DASHA_ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury'];
const DASHA_YEARS: Record<string, number> = {
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
  Ketu: 7,
  Venus: 20,
};

const CHART_LABEL_MAP: Record<string, string> = {
  "लग्न": "Asc",
  "लग": "Asc",
  "सू": "Su",
  "चं": "Mo",
  "मं": "Ma",
  "बु": "Me",
  "गु": "Ju",
  "शु": "Ve",
  "श": "Sa",
  "रा": "Ra",
  "के": "Ke",
};

const normalizeChartLabel = (raw: string): string => {
  const text = String(raw || "").trim();
  if (!text) return "";
  if (CHART_LABEL_MAP[text]) return CHART_LABEL_MAP[text];
  return sanitizeText(text);
};

/**
 * Sanitize text to remove control/noise characters while preserving native scripts.
 */
const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return '';
  return String(text)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+,/g, ',')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const SATURN_TRANSIT_FALLBACK_SIGN = 'Pisces';
const SIGNS = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
const MONTH_NAMES_BY_LANGUAGE: Record<'en' | 'hi' | 'te', string[]> = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  te: ['జనవరి', 'ఫిబ్రవరి', 'మార్చి', 'ఏప్రిల్', 'మే', 'జూన్', 'జూలై', 'ఆగస్టు', 'సెప్టెంబర్', 'అక్టోబర్', 'నవంబర్', 'డిసెంబర్'],
};

let ACTIVE_PDF_FONT_FAMILY = 'NotoSans';
let ACTIVE_PDF_BODY_FONT_SIZE = 10.5;
let ACTIVE_PDF_BODY_LINE_HEIGHT = 1.45;
let ACTIVE_PDF_LANGUAGE: 'en' | 'hi' | 'te' = 'en';

const PDF_UI_PHRASE_MAP: Record<'hi' | 'te', Record<string, string>> = {
  hi: {
    'Sri Mandir Kundli Report': 'श्री मंदिर कुंडली रिपोर्ट',
    'Table of Contents': 'विषय सूची',
    'Birth Details': 'जन्म विवरण',
    'YOUR': 'आपकी',
    'KUNDLI REPORT': 'कुंडली रिपोर्ट',
    'A Personalized Vedic Astrology Blueprint': 'आपकी वैदिक ज्योतिष रूपरेखा',
    'Date of Birth': 'जन्म तिथि',
    'Time of Birth': 'जन्म समय',
    'Place of Birth': 'जन्म स्थान',
    'Created by expert astrologers': 'विशेषज्ञ ज्योतिषियों द्वारा तैयार',
    'Prepared on': 'तैयार किया गया',
    'This comprehensive Kundli report covers all major dimensions of your birth chart, from your fundamental planetary blueprint to specific life-area predictions and remedial guidance.': 'यह विस्तृत कुंडली रिपोर्ट आपकी जन्मकुंडली के सभी प्रमुख आयामों को समाहित करती है, जिसमें मूल ग्रह स्थिति से लेकर जीवन के विभिन्न क्षेत्रों की भविष्यवाणियां और उपाय सम्मिलित हैं।',
    'Birth Details & Planetary Positions': 'जन्म विवरण और ग्रह स्थितियां',
    'Planetary Positions': 'ग्रह स्थितियां',
    'Detailed Planetary Snapshot': 'विस्तृत ग्रह सारणी',
    'Panchang Analysis': 'पंचांग विश्लेषण',
    'Three Pillars of Your Chart': 'आपकी कुंडली के तीन स्तंभ',
    'Personal Planetary Profiles': 'ग्रह प्रोफ़ाइल',
    'Bhavphal — The 12 Houses': 'भावफल — 12 भाव',
    'Career & Professional Life': 'कैरियर और पेशेवर जीवन',
    'Love, Romance & Marriage': 'प्रेम, संबंध और विवाह',
    'Health & Well-Being': 'स्वास्थ्य और कल्याण',
    'Vimshottari Dasha Predictions': 'विंशोत्तरी दशा भविष्यवाणी',
    'Rahu–Ketu Karmic Axis': 'राहु-केतु कर्म अक्ष',
    'Raja Yogas & Auspicious Combinations': 'राजयोग और शुभ संयोजन',
    'Dosha Analysis': 'दोष विश्लेषण',
    "Sade Sati — Saturn's 7.5-Year Transit": 'साढ़ेसाती — शनि का 7.5 वर्ष का गोचर',
    'Numerology Analysis': 'अंक ज्योतिष विश्लेषण',
    'Spiritual Potential & Dharma': 'आध्यात्मिक क्षमता और धर्म',
    'Vedic Remedies': 'वैदिक उपाय',
    'Chara Karakas — Jaimini System': 'चर कारक — जैमिनी पद्धति',
    'Sade Sati': 'साढ़ेसाती',
    'Your Sade Sati Status': 'आपकी साढ़ेसाती स्थिति',
    'Transit Saturn': 'गोचर शनि',
    'Currently Active': 'वर्तमान सक्रियता',
    'Current Phase': 'वर्तमान चरण',
    'YES — ACTIVE NOW': 'हाँ — अभी सक्रिय',
    'Not Currently Active': 'वर्तमान में सक्रिय नहीं',
    'Saturn Sign': 'शनि राशि',
    'Period': 'अवधि',
    'Guidance for This Phase': 'इस चरण के लिए मार्गदर्शन',
    'Purpose': 'उद्देश्य',
    'Best Time': 'उत्तम समय',
    'Month-level periods below are approximate transit windows derived from Saturn phase sequencing.': 'नीचे दिए गए मासिक कालखंड शनि चरण क्रम के आधार पर अनुमानित गोचर विंडो हैं।',
    'The Three Phases of Your Sade Sati': 'आपकी साढ़ेसाती के तीन चरण',
    'Sade Sati — Detailed Analysis': 'साढ़ेसाती — विस्तृत विश्लेषण',
    'Sade Sati — Remedies & Spiritual Significance': 'साढ़ेसाती — उपाय और आध्यात्मिक महत्व',
    'Powerful Remedies for Sade Sati': 'साढ़ेसाती के प्रभावी उपाय',
    'Current Sade Sati': 'वर्तमान साढ़ेसाती',
    'Past Sade Sati': 'पूर्व साढ़ेसाती',
    'Next Sade Sati': 'अगली साढ़ेसाती',
    'The Moon-Saturn Relationship in Your Chart': 'आपकी कुंडली में चंद्र-शनि संबंध',
    'Master Guidance for Your Sade Sati': 'साढ़ेसाती के लिए मुख्य मार्गदर्शन',
    'Inspiration — Famous People Who Thrived During Sade Sati': 'प्रेरणा — साढ़ेसाती में सफल रहे प्रसिद्ध लोग',
    'PART': 'भाग',
    'Rising Phase (12th from Moon)': 'उदय चरण (चंद्र से 12वां)',
    'Peak Phase (Over Moon)': 'चरम चरण (चंद्र पर)',
    'Setting Phase (2nd from Moon)': 'अवरोह चरण (चंद्र से 2रा)',
    'Not Active': 'सक्रिय नहीं',
    'Looking for detailed guidance on your birth chart? Speak to our expert astrologers today': 'अपनी कुंडली पर विस्तृत मार्गदर्शन चाहिए? आज ही हमारे विशेषज्ञ ज्योतिषियों से बात करें',
    // Section sub-headers (planet profiles)
    'Placement Analysis': 'स्थान विश्लेषण',
    'House Significance': 'भाव महत्व',
    'Aspects': 'दृष्टियां',
    'Retrograde Effect': 'वक्री प्रभाव',
    'Dasha Influence': 'दशा प्रभाव',
    // Chara Karakas
    'Chara Karakas (Jaimini)': 'चर कारक (जैमिनी)',
    'Chara Karakas - Jaimini Astrology': 'चर कारक — जैमिनी ज्योतिष',
    'Understanding the Jaimini System': 'जैमिनी पद्धति की समझ',
    'Your Chara Karakas': 'आपके चर कारक',
    // Charts
    'Kundali Charts (Divisional Charts)': 'कुंडली चार्ट (विभागीय)',
    'Additional Divisional Charts': 'अतिरिक्त विभागीय चार्ट',
    'Kundali Charts': 'कुंडली चार्ट',
    // Birth details labels
    'Tithi at Birth': 'जन्म कालीन तिथि',
    'Nakshatra at Birth': 'जन्म नक्षत्र',
    'Yoga at Birth': 'जन्म का योग',
    'Karana at Birth': 'जन्म का करण',
    'Lahiri Ayanamsha': 'लाहिरी अयनांश',
    'Sun Degree': 'सूर्य अंश',
    'Ascendant Degree': 'लग्न अंश',
    'Lord in': 'स्वामी भाव',
    'Vaar (Day)': 'वार',
    // Three Pillars
    'Moon Sign (Rashi)': 'चंद्र राशि',
    'Moon Sign': 'चंद्र राशि',
    'Ascendant (Lagna)': 'लग्न',
    'Birth Nakshatra': 'जन्म नक्षत्र',
    'Emotional Nature': 'भावनात्मक स्वभाव',
    'Ruling Planet': 'राशि स्वामी',
    // Bhavphal
    'Bhavphal - House Analysis Overview': 'भावफल — भाव विश्लेषण',
    // TOC sub-descriptions
    'Ascendant, planetary placements, Chara Karakas (Jaimini)': 'लग्न, ग्रह स्थितियां, चर कारक (जैमिनी)',
    'Vaar, Tithi, Nakshatra, Yoga, Karana at birth': 'वार, तिथि, नक्षत्र, योग, करण',
    'Moon Sign, Ascendant, Birth Nakshatra': 'चंद्र राशि, लग्न, जन्म नक्षत्र',
    'Detailed analysis of all 9 planets': 'सभी 9 ग्रहों का विस्तृत विश्लेषण',
    'Complete house-by-house life analysis': 'सभी 12 भावों का जीवन विश्लेषण',
    'Career calling, wealth potential, suitable fields': 'कैरियर, आर्थिक संभावना, उपयुक्त क्षेत्र',
    'Partner profile, marriage timing, compatibility': 'जीवनसाथी, विवाह काल, अनुकूलता',
    'Age-aware lifestyle guidance and preventive care focus': 'आयु-आधारित जीवनशैली मार्गदर्शन',
    'Current & upcoming planetary periods': 'वर्तमान और आगामी दशा-अंतर्दशा',
    'Past karma, future direction, Kaal Sarp Yoga': 'पूर्व कर्म, भविष्य दिशा, कालसर्प योग',
    'Pancha Mahapurusha, Dhana Yogas and more': 'पंचमहापुरुष, धन योग और अन्य',
    'Mangal Dosha, Kaal Sarp and other planetary afflictions': 'मंगल दोष, कालसर्प और अन्य दोष',
    'Current status, phases, remedies': 'वर्तमान स्थिति, चरण, उपाय',
    'Birth number, destiny number, personal year': 'मूलांक, भाग्यांक, व्यक्तिगत वर्ष',
    'Atmakaraka, Ishta Devata, Moksha path': 'आत्मकारक, इष्ट देवता, मोक्ष मार्ग',
    'Gemstones, Rudraksha, Mantras, Yantras, Pujas': 'रत्न, रुद्राक्ष, मंत्र, यंत्र, पूजा',
    'Atmakaraka, Amatyakaraka, Darakaraka in depth': 'आत्मकारक, अमात्यकारक, दारकारक',
    // Static paragraph texts
    'R = Retrograde, C = Combust. Fields marked "if available" are shown when present in source astro data.': 'R = वक्री, C = अस्त। "यदि उपलब्ध" से अंकित क्षेत्र केवल स्रोत डेटा में उपलब्ध होने पर प्रदर्शित होते हैं।',
    'The Panchang (five limbs) provides the foundational cosmic timing of your birth, revealing the day\'s energy, lunar phase, and celestial influences that shape your destiny.': 'पंचांग (पाँच अंग) आपके जन्म की मूल ज्योतिषीय समय-गणना है, जो उस दिन की ऊर्जा, चंद्र चरण और आपकी नियति को आकार देने वाले खगोलीय प्रभावों को प्रकट करती है।',
    'The three fundamental pillars—Moon Sign, Ascendant, and Birth Nakshatra—form the core identity markers of your horoscope, revealing your emotional nature, physical constitution, and life purpose.': 'तीन मूल स्तंभ — चंद्र राशि, लग्न और जन्म नक्षत्र — आपकी कुंडली के केंद्रीय पहचान चिह्न हैं, जो आपकी भावनात्मक प्रकृति, शारीरिक गठन और जीवन उद्देश्य को दर्शाते हैं।',
    'The twelve houses (Bhavas) of your horoscope govern different areas of life. Each house is colored by its sign, lord placement, and any planetary occupants. This comprehensive analysis reveals the potential in each life domain.': 'आपकी कुंडली के बारह भाव जीवन के विभिन्न क्षेत्रों को नियंत्रित करते हैं। प्रत्येक भाव अपनी राशि, भावेश की स्थिति और ग्रहों की उपस्थिति से प्रभावित होता है।',
    'These are the key divisional charts (Varga charts) derived from your birth chart. Each chart reveals specific life areas and is used for deeper analysis of those domains.': 'ये आपकी जन्मकुंडली से निकाले गए प्रमुख विभागीय चार्ट (वर्ग चार्ट) हैं। प्रत्येक चार्ट जीवन के विशेष क्षेत्रों को दर्शाता है।',
    // ── Section / ContentPage names ───────────────────────────────────────────
    'House Analysis (Bhavphal)': 'भावफल — भाव विश्लेषण',
    'Career Analysis': 'करियर विश्लेषण',
    'Career Calling': 'करियर — आपकी पुकार',
    'Love & Marriage': 'प्रेम और विवाह',
    'Dasha Predictions': 'दशा भविष्यवाणी',
    'Antardasha Predictions': 'अंतर्दशा भविष्यवाणी',
    'Antardasha Predictions (Current Mahadasha)': 'अंतर्दशा भविष्यवाणी (वर्तमान महादशा)',
    'Yogini Dasha': 'योगिनी दशा',
    'Yogini Dasha System': 'योगिनी दशा पद्धति',
    'Dasha Sequence': 'दशा क्रम',
    'Dasha Sequence & Timing': 'दशा क्रम और समय',
    'Rahu-Ketu Axis': 'राहु-केतु अक्ष',
    'Minor Doshas': 'लघु दोष',
    'Dosha Remedies': 'दोष उपाय',
    'Raja Yogas': 'राजयोग',
    'Raja Yogas (Auspicious Combinations)': 'राजयोग (शुभ संयोजन)',
    'Dhana Yogas': 'धन योग',
    'Dhana Yogas (Wealth Combinations)': 'धन योग (धन संयोजन)',
    'Life Predictions from Yogas': 'योग आधारित जीवन भविष्यवाणी',
    'Life Predictions Based on Yogas': 'योग आधारित जीवन भविष्यवाणी',
    'Challenging Yogas': 'चुनौतीपूर्ण योग',
    'Challenging Yogas (For Awareness)': 'चुनौतीपूर्ण योग (जागरूकता के लिए)',
    'Spiritual Potential': 'आध्यात्मिक क्षमता',
    'Understanding Vedic Remedies': 'वैदिक उपाय — परिचय',
    'Gemstone Therapy': 'रत्न चिकित्सा',
    'Gemstone Therapy (Ratna Shastra)': 'रत्न चिकित्सा (रत्न शास्त्र)',
    'Rudraksha Therapy': 'रुद्राक्ष चिकित्सा',
    'Mantra Therapy': 'मंत्र चिकित्सा',
    'Mantra Therapy (Mantra Shastra)': 'मंत्र चिकित्सा (मंत्र शास्त्र)',
    'Yantras & Pujas': 'यंत्र और पूजा',
    'Yantras & Puja Recommendations': 'यंत्र और पूजा सुझाव',
    'Ishta Devata & Spiritual Practices': 'इष्ट देवता और साधना',
    'Lifestyle Remedies': 'जीवनशैली उपाय',
    'Lifestyle Remedies & Guidance': 'जीवनशैली उपाय और मार्गदर्शन',
    'Atmakaraka Analysis': 'आत्मकारक विश्लेषण',
    'Amatyakaraka Analysis': 'अमात्यकारक विश्लेषण',
    'Glossary': 'शब्दकोश',
    'Glossary of Vedic Astrology Terms': 'वैदिक ज्योतिष शब्दकोश',
    // ── Glossary inline labels ──────────────────────────────────────────────
    'Example': 'उदाहरण',
    'Related': 'संबंधित',
    // ── Planetary matrix abbreviations ─────────────────────────────────────
    'RL': 'रा.स्वा.',
    'NL': 'न.स्वा.',
    'Sub': 'उप',
    // ── Table misc ─────────────────────────────────────────────────────────
    'Empty': 'खाली',
    'Primary Gemstone': 'प्रमुख रत्न',
    'Secondary Gemstone': 'गौण रत्न',
    'Mukhi Rudraksha': 'मुखी रुद्राक्ष',
    'Planetary Analysis': 'ग्रह विश्लेषण',
    'Mahadasha Predictions': 'महादशा भविष्यवाणी',
    'in': 'में',
    // ── Compound Nakshatra names (must be phrases, not single words) ───────
    'Purva Phalguni': 'पूर्वा फाल्गुनी',
    'Uttara Phalguni': 'उत्तरा फाल्गुनी',
    'Purva Ashadha': 'पूर्वाषाढ़ा',
    'Uttara Ashadha': 'उत्तराषाढ़ा',
    'Purva Bhadrapada': 'पूर्वा भाद्रपद',
    'Uttara Bhadrapada': 'उत्तरा भाद्रपद',
    // ── Aspect type translations ──────────────────────────────────────────
    'Full Aspect': 'पूर्ण दृष्टि',
    'Partial Aspect': 'आंशिक दृष्टि',
    'Special Aspect': 'विशेष दृष्टि',
    'Conjunction': 'युति',
    // ── Hardcoded paragraphs ──────────────────────────────────────────────
    'Before exploring specific remedies, it is essential to understand the profound science and tradition behind Vedic Upayas (remedial measures). This section explains why these remedies work and how they have been validated through millennia of practice.': 'विशिष्ट उपायों का अध्ययन करने से पहले, वैदिक उपायों के पीछे के गहन विज्ञान और परंपरा को समझना आवश्यक है। यह खंड बताता है कि ये उपाय क्यों कार्य करते हैं और सहस्राब्दियों के अभ्यास से कैसे सिद्ध हुए हैं।',
    'The following challenging combinations are present in your chart. Awareness of these helps you navigate difficulties and apply appropriate remedies.': 'आपकी कुंडली में निम्नलिखित चुनौतीपूर्ण संयोजन मौजूद हैं। इनकी जागरूकता आपको कठिनाइयों से निपटने और उचित उपाय लागू करने में सहायता करती है।',
    'Chart image unavailable for this section.': 'इस खंड के लिए चार्ट चित्र उपलब्ध नहीं है।',
    'Gemstones have been used in Vedic astrology for millennia to harness planetary energies and balance cosmic influences.': 'वैदिक ज्योतिष में सहस्राब्दियों से ग्रह ऊर्जाओं को संतुलित करने और ब्रह्मांडीय प्रभावों को संतुलित करने के लिए रत्नों का उपयोग किया जाता रहा है।',
    'Total Yogas Detected': 'कुल योग पाए गए',
    'Overall Strength': 'समग्र शक्ति',
    // ── SubSection titles ─────────────────────────────────────────────────────
    'Remedies': 'उपाय',
    'Significance': 'महत्व',
    'Detailed Analysis': 'विस्तृत विश्लेषण',
    'Predictions': 'भविष्यवाणी',
    'Timing': 'समय',
    'Right Career For You': 'आपके लिए सही करियर',
    '10th House Analysis': 'दशम भाव विश्लेषण',
    'Sun Analysis (Authority)': 'सूर्य विश्लेषण (अधिकार)',
    'Saturn Analysis (Work Ethic)': 'शनि विश्लेषण (कार्य निष्ठा)',
    'Amatyakaraka (Career Significator)': 'अमात्यकारक (करियर कारक)',
    'Suitable Career Fields': 'उपयुक्त करियर क्षेत्र',
    'Fields to Avoid': 'परहेज करने योग्य क्षेत्र',
    'Career Timing & Phases': 'करियर समय और चरण',
    'Career Switch Insights': 'करियर परिवर्तन दृष्टिकोण',
    'Success Formula': 'सफलता का सूत्र',
    'Wealth Potential': 'आर्थिक क्षमता',
    'Business vs Job': 'व्यवसाय बनाम नौकरी',
    'Recommendations': 'सुझाव',
    'Relationship Safety Framework': 'संबंध सुरक्षा ढांचा',
    '5th House (Romance)': 'पंचम भाव (प्रेम)',
    '7th House (Marriage)': 'सप्तम भाव (विवाह)',
    'Venus Analysis': 'शुक्र विश्लेषण',
    'Darakaraka (Spouse Significator)': 'दारकारक (जीवनसाथी कारक)',
    'Partner Profile': 'जीवनसाथी प्रोफ़ाइल',
    'Ideal Partner (If Unmarried)': 'आदर्श जीवनसाथी (अविवाहित के लिए)',
    'Guidance If Married': 'विवाहित के लिए मार्गदर्शन',
    'Marriage Timing': 'विवाह काल',
    'Mangal Dosha': 'मंगल दोष',
    'Age Context & Safety': 'आयु संदर्भ और सुरक्षा',
    'Safe Movement Guidance': 'सुरक्षित गतिविधि मार्गदर्शन',
    'Nutrition & Hydration': 'पोषण और जलयोजन',
    'Recovery & Sleep': 'पुनर्प्राप्ति और नींद',
    'Preventive Health Checks': 'निवारक स्वास्थ्य जांच',
    'What to Avoid': 'क्या न करें',
    'General Wellness Note': 'सामान्य स्वास्थ्य सुझाव',
    'Career Impact': 'करियर प्रभाव',
    'Relationship Impact': 'संबंध प्रभाव',
    'Health Impact': 'स्वास्थ्य प्रभाव',
    'Financial Impact': 'आर्थिक प्रभाव',
    'Spiritual Growth': 'आध्यात्मिक विकास',
    'Key Events': 'प्रमुख घटनाएं',
    'Recommended Remedies': 'अनुशंसित उपाय',
    'Upcoming Periods': 'आगामी अवधि',
    'Complete Dasha Sequence (Vimshottari 120-Year Cycle)': 'संपूर्ण दशा क्रम (विंशोत्तरी 120 वर्ष)',
    'Current Transit Impact': 'वर्तमान गोचर प्रभाव',
    'Period Recommendations': 'अवधि सुझाव',
    'Spiritual Guidance': 'आध्यात्मिक मार्गदर्शन',
    'Karmic Axis': 'कर्म अक्ष',
    'Rahu Analysis (Future Direction)': 'राहु विश्लेषण (भविष्य दिशा)',
    'Ketu Analysis (Past Life Karma)': 'केतु विश्लेषण (पूर्वजन्म कर्म)',
    'Kaal Sarp Yoga': 'कालसर्प योग',
    'Spiritual Path': 'आध्यात्मिक पथ',
    'Major Doshas': 'प्रमुख दोष',
    'Priority Remedies': 'प्राथमिकता उपाय',
    'Raja Yogas (Power & Success)': 'राजयोग (शक्ति और सफलता)',
    'Wealth': 'धन',
    'Fame & Recognition': 'यश और पहचान',
    'Spirituality': 'आध्यात्मिकता',
    'Yoga Enhancement': 'योग संवर्धन',
    'Spiritual Significance': 'आध्यात्मिक महत्व',
    'Sacred Mantras': 'पवित्र मंत्र',
    'Lucky Associations': 'शुभ संबंध',
    'Spiritual Rating': 'आध्यात्मिक स्तर',
    'Atmakaraka (Soul Purpose)': 'आत्मकारक (आत्मा का उद्देश्य)',
    '9th House (Dharma)': 'नवम भाव (धर्म)',
    '12th House (Moksha)': 'द्वादश भाव (मोक्ष)',
    'Ishta Devata (Personal Deity)': 'इष्ट देवता',
    'Meditation Guidance': 'ध्यान मार्गदर्शन',
    'Moksha Path': 'मोक्ष मार्ग',
    'Vedic Foundation': 'वैदिक आधार',
    'How Remedies Work': 'उपाय कैसे कार्य करते हैं',
    'The Role of Faith and Intention': 'श्रद्धा और संकल्प का महत्व',
    'Scientific Perspective': 'वैज्ञानिक दृष्टिकोण',
    'Traditional Wisdom': 'पारंपरिक ज्ञान',
    'Gemstones to Avoid': 'कौन से रत्न न पहनें',
    'Yantra Recommendations': 'यंत्र सुझाव',
    'Recommended Pujas': 'अनुशंसित पूजाएं',
    'Your Ishta Devata (Personal Deity)': 'आपके इष्ट देवता',
    'Fasting Recommendations (Vrata)': 'व्रत सुझाव',
    'Donations (Daan)': 'दान',
    'Color Therapy': 'रंग चिकित्सा',
    'Direction Guidance (Vastu)': 'दिशा मार्गदर्शन (वास्तु)',
    'Daily Routine Recommendations': 'दैनिक दिनचर्या सुझाव',
    'Daily Spiritual Practices': 'दैनिक साधना',
    'General Advice': 'सामान्य सुझाव',
    'Weak Planets Summary': 'कमजोर ग्रह सारांश',
    'Soul Purpose': 'आत्मा का उद्देश्य',
    'Spiritual Lesson': 'आध्यात्मिक शिक्षा',
    'Spouse Characteristics': 'जीवनसाथी के गुण',
    'Marriage Indications': 'विवाह संकेत',
    'Partner Qualities': 'जीवनसाथी के गुण',
    'Career Direction': 'करियर दिशा',
    'Professional Strengths': 'पेशेवर शक्तियां',
    'Suitable Professions': 'उपयुक्त पेशे',
    'Karaka Interactions': 'कारक अंतःक्रिया',
    'Scriptural References': 'शास्त्रीय संदर्भ',
    'Detailed Interpretation': 'विस्तृत व्याख्या',
    'Life Impact': 'जीवन प्रभाव',
    'Quick Reference': 'त्वरित संदर्भ',
    'Upcoming Yogini Periods': 'आगामी योगिनी अवधियां',
    'Complete Yogini Dasha Cycle (36 Years)': 'संपूर्ण योगिनी दशा चक्र (36 वर्ष)',
    // ── Career, marriage, and analysis subsection headers ─────────────────────
    'Strengths': 'शक्तियां',
    'Challenges': 'चुनौतियां',
    'Core Strengths': 'मुख्य शक्तियां',
    'Challenges to Navigate': 'नेविगेट करने के लिए चुनौतियां',
    'Attributes': 'विशेषताएं',
    'Impact': 'प्रभाव',
    // ── Antardasha / Dasha inline labels ────────────────────────────────────
    'Focus Areas': 'मुख्य क्षेत्र',
    'Life Themes': 'जीवन विषय',
    'Key Events to Watch': 'ध्यान देने योग्य घटनाएं',
    'Advice': 'परामर्श',
    'Associated Planet': 'संबंधित ग्रह',
    'Duration': 'अवधि',
    'Mahadasha Period': 'महादशा अवधि',
    'Current Yogini': 'वर्तमान योगिनी',
    // ── Dosha section inline labels ─────────────────────────────────────────
    'Cause': 'कारण',
    'Effects': 'प्रभाव',
    'Status': 'स्थिति',
    'Severity': 'गंभीरता',
    'Affected Areas': 'प्रभावित क्षेत्र',
    'Total Doshas Detected': 'कुल दोष पाए गए',
    'Nullified': 'निष्प्रभावी',
    'Immediate (Start Now)': 'तुरंत (अभी शुरू करें)',
    'Short-Term (1-3 Months)': 'अल्पकालिक (1-3 महीने)',
    'Long-Term (Ongoing)': 'दीर्घकालिक (निरंतर)',
    'Procedure': 'विधि',
    'Expected Benefits': 'अपेक्षित लाभ',
    'Mantras': 'मंत्र',
    'Primary Remedy': 'प्रमुख उपाय',
    'Remedies for': 'उपाय —',
    'Deity': 'देवता',
    'Count': 'संख्या',
    // ── Rahu-Ketu inline labels ─────────────────────────────────────────────
    'Life Lesson': 'जीवन पाठ',
    'Desires': 'इच्छाएं',
    'Growth Areas': 'विकास क्षेत्र',
    'Natural Talents': 'प्राकृतिक प्रतिभाएं',
    'Spiritual Gifts': 'आध्यात्मिक वरदान',
    'Type': 'प्रकार',
    // ── Chara Karaka table & section labels ──────────────────────────────────
    'Karaka': 'कारक',
    'Planet': 'ग्रह',
    'Sign': 'राशि',
    'House': 'भाव',
    'Signification': 'कारकत्व',
    'Soul Significator': 'आत्मा कारक',
    'Spouse Significator': 'जीवनसाथी कारक',
    'Career Significator': 'करियर कारक',
    'Effect': 'प्रभाव',
    // ── Yogini table headers ────────────────────────────────────────────────
    'Yogini': 'योगिनी',
    'Years': 'वर्ष',
    'Nature': 'स्वभाव',
    // ── Section divider translations ────────────────────────────────────────
    'Doshas, Yogas & Karma': 'दोष, योग और कर्म',
    'Karmic imbalances, auspicious combinations, and the Rahu-Ketu axis that defines your soul\'s evolutionary mission': 'कर्म असंतुलन, शुभ संयोजन, और राहु-केतु अक्ष जो आपकी आत्मा के विकास मार्ग को परिभाषित करता है',
    'Life Predictions': 'जीवन भविष्यवाणी',
    'Career, marriage, wealth, health — what the stars reveal about every major chapter of your life': 'करियर, विवाह, धन, स्वास्थ्य — ग्रह आपके जीवन के हर अध्याय के बारे में क्या बताते हैं',
    'Your Dasha Timeline': 'आपकी दशा समयरेखा',
    'The planetary periods that govern each phase of your life — your cosmic roadmap from birth to liberation': 'आपके जीवन के हर चरण को नियंत्रित करने वाली ग्रह अवधियां — जन्म से मोक्ष तक की ब्रह्मांडीय रूपरेखा',
    'Numerology & Spiritual Potential': 'अंक ज्योतिष और आध्यात्मिक क्षमता',
    'Sacred numbers, your soul\'s purpose, and the spiritual path written in your chart': 'पवित्र अंक, आपकी आत्मा का उद्देश्य, और कुंडली में लिखा आध्यात्मिक मार्ग',
    'Gemstones, mantras, rituals, fasting, and lifestyle practices to harmonize your planetary energies': 'रत्न, मंत्र, अनुष्ठान, व्रत और जीवनशैली — ग्रह ऊर्जा को संतुलित करने के उपाय',
    // ── Atmakaraka special labels ───────────────────────────────────────────
    'The Atmakaraka is the most important planet in Jaimini astrology, representing your soul\'s purpose.': 'आत्मकारक जैमिनी ज्योतिष में सबसे महत्वपूर्ण ग्रह है, जो आपकी आत्मा के उद्देश्य का प्रतिनिधित्व करता है।',
    // ── Static paragraph text ───────────────────────────────────────────────
    'The following are the current and upcoming sub-periods (Antardashas) within your current Mahadasha. Completed past Antardashas are intentionally excluded so this section stays forward-looking and actionable.': 'निम्नलिखित आपकी वर्तमान महादशा के भीतर वर्तमान और आगामी अंतर्दशाएं हैं। पूर्ण हो चुकी अंतर्दशाओं को जानबूझकर हटाया गया है ताकि यह खंड भविष्योन्मुखी और क्रियाशील रहे।',
    'Sade Sati cards are intentionally removed from Dosha pages and handled only in the dedicated Sade Sati section to prevent conflicting status.': 'साढ़ेसाती कार्ड जानबूझकर दोष पृष्ठों से हटाए गए हैं और विरोधाभासी स्थिति से बचने के लिए केवल समर्पित साढ़ेसाती खंड में शामिल हैं।',
    // ── Dasha table headers ─────────────────────────────────────────────────
    'Life Focus': 'जीवन केंद्र',
    'Approximate Period': 'अनुमानित अवधि',
    'Focus': 'केंद्र',
    'Mahadasha': 'महादशा',
    'Antardasha': 'अंतर्दशा',
    // ── Chart purpose translations ──────────────────────────────────────────
    'Overall life assessment': 'संपूर्ण जीवन आकलन',
    'Wealth and finances': 'धन और वित्त',
    'Siblings and courage': 'भाई-बहन और साहस',
    'Fortune and property': 'भाग्य और संपत्ति',
    'Children and progeny': 'संतान और वंश',
    'Marriage and spouse': 'विवाह और जीवनसाथी',
    'Career and profession': 'करियर और पेशा',
    'Parents and ancestry': 'माता-पिता और वंश',
    'Spiritual progress': 'आध्यात्मिक प्रगति',
    'Education and learning': 'शिक्षा और ज्ञान',
    'Strength and weakness': 'शक्ति और दुर्बलता',
    'Past life karma': 'पूर्वजन्म कर्म',
    // ── Atmakaraka/Darakaraka/Amatyakaraka ──────────────────────────────────
    'Atmakaraka': 'आत्मकारक',
    'Darakaraka': 'दारकारक',
    'Amatyakaraka': 'अमात्यकारक',
    'Term': 'शब्द',
    'Definition': 'परिभाषा',
    'Degree': 'अंश',
    'Lord': 'स्वामी',
    'Occupants': 'स्थित ग्रह',
    // ── Remaining hardcoded English headers ─────────────────────────────────
    'Ideal Roles': 'आदर्श भूमिकाएं',
    'Current Career Phase': 'वर्तमान करियर चरण',
    'Upcoming Opportunities': 'आगामी अवसर',
    'Future Career Changes': 'भविष्य के करियर परिवर्तन',
    'Preparation Plan': 'तैयारी योजना',
    'Key Qualities': 'प्रमुख गुण',
    'Caution Traits': 'सतर्कता गुण',
    'Relationship Strengthening': 'संबंध सुदृढ़ीकरण',
    'Conflicts to Avoid': 'बचने योग्य संघर्ष',
    'Favorable Periods': 'अनुकूल अवधि',
    'Challenging Periods': 'चुनौतीपूर्ण अवधि',
    'Opportunities': 'अवसर',
    'Formation in Your Chart': 'आपकी कुंडली में निर्माण',
    'Benefits': 'लाभ',
    'In Your Chart': 'आपकी कुंडली में',
    'Practices to Strengthen Yogas': 'योग सुदृढ़ीकरण अभ्यास',
    'Hidden Blessings': 'छिपे हुए आशीर्वाद',
    'Phase 1 — The Rising (Building Pressure)': 'चरण 1 — उदय (दबाव निर्माण)',
    'Phase 2 — The Peak (Maximum Intensity)': 'चरण 2 — चरम (अधिकतम तीव्रता)',
    'Phase 3 — The Setting (Harvest & Release)': 'चरण 3 — अवरोह (फसल और मुक्ति)',
    'What to Expect': 'क्या अपेक्षा करें',
    'Unique Opportunities': 'विशेष अवसर',
    'Scriptural Reference': 'शास्त्रीय संदर्भ',
    'How It Works': 'यह कैसे कार्य करता है',
    'Scientific Basis': 'वैज्ञानिक आधार',
    'Quality Guidelines': 'गुणवत्ता दिशानिर्देश',
    'Cautions': 'सावधानियां',
    'Wearing Instructions': 'धारण निर्देश',
    'How to Verify Authenticity': 'प्रामाणिकता कैसे जांचें',
    'Scriptural Source': 'शास्त्रीय स्रोत',
    'Scriptural Basis': 'शास्त्रीय आधार',
    'Scriptural Derivation': 'शास्त्रीय उत्पत्ति',
    'Overview': 'अवलोकन',
    'Antardashas': 'अंतर्दशाएं',
    'Interpretation': 'व्याख्या',
    'Current Mahadasha': 'वर्तमान महादशा',
    'Current Antardasha': 'वर्तमान अंतर्दशा',
    'Mahadasha Predictions': 'महादशा भविष्यवाणी',
    'Antardasha Predictions': 'अंतर्दशा भविष्यवाणी',
    // ── InfoRow labels — Career section ────────────────────────────────────────
    'Ideal Work Environment': 'आदर्श कार्य वातावरण',
    'Is Switch Due Now?': 'क्या अभी बदलाव उचित है?',
    'Next Switch Window': 'अगला परिवर्तन समय',
    // ── InfoRow labels — Marriage section ────────────────────────────────────
    'Love Nature': 'प्रेम स्वभाव',
    'Marriage Prospects': 'विवाह संभावनाएं',
    'Attraction Style': 'आकर्षण शैली',
    'Physical Traits': 'शारीरिक विशेषताएं',
    'Personality': 'व्यक्तित्व',
    'Background': 'पृष्ठभूमि',
    'Meeting': 'मिलन परिस्थिति',
    'Applicability': 'लागू होने की स्थिति',
    'Ideal Age Range': 'आदर्श आयु सीमा',
    'Ideal Time for Young Natives': 'युवा जातकों के लिए आदर्श समय',
    'Current Prospects': 'वर्तमान संभावनाएं',
    'Status Assumption': 'स्थिति अनुमान',
    // ── InfoRow labels — Birth details ──────────────────────────────────────
    'Name': 'नाम',
    'Sex': 'लिंग',
    'Day': 'दिन',
    'City': 'शहर',
    'State': 'राज्य',
    'Country': 'देश',
    'Latitude': 'अक्षांश',
    'Longitude': 'देशांतर',
    'Timezone': 'समय क्षेत्र',
    'Male': 'पुरुष',
    'Female': 'स्त्री',
    // ── InfoRow labels — Three Pillars ──────────────────────────────────────
    'Element': 'तत्व',
    // ── InfoRow labels — Dasha section ──────────────────────────────────────
    'Starting Dasha': 'प्रारंभिक दशा',
    'Balance at Birth': 'जन्म पर शेष',
    // ── InfoRow labels — Spiritual section ──────────────────────────────────
    'Dharma Path': 'धर्म मार्ग',
    'Liberation Path': 'मोक्ष मार्ग',
    'Style': 'शैली',
    // ── InfoRow labels — Remedies section ────────────────────────────────────
    'Weight': 'भार',
    'Metal': 'धातु',
    'Finger': 'उंगली',
    'Day to Wear': 'धारण का दिन',
    'Japa Count': 'जप संख्या',
    'Pronunciation': 'उच्चारण',
    'Placement': 'स्थापना',
    'Frequency': 'आवृत्ति',
    'Worship Method': 'पूजन विधि',
    'Mantra': 'मंत्र',
    'Temple Visit': 'मंदिर दर्शन',
    'Favorable Colors': 'शुभ रंग',
    'Colors to Avoid': 'अशुभ रंग',
    'Favorable Directions': 'शुभ दिशाएं',
    'Directions to Avoid': 'अशुभ दिशाएं',
    'Sleep Direction': 'शयन दिशा',
    'Work Direction': 'कार्य दिशा',
    // ── InfoRow labels — Numerology ─────────────────────────────────────────
    'Lucky Numbers': 'शुभ अंक',
    'Unlucky Numbers': 'अशुभ अंक',
    'Lucky Days': 'शुभ दिन',
    'Lucky Colors': 'शुभ रंग',
    // ── InfoRow labels — Raja Yogas ─────────────────────────────────────────
    'Activation Period': 'सक्रियता काल',
    'Activation': 'सक्रियता',
    'Strength': 'शक्ति',
    'Peak Period': 'चरम काल',
    'Recommended Gemstones': 'अनुशंसित रत्न',
    // ── InfoRow labels — Sade Sati ──────────────────────────────────────────
    'Approximate Start': 'अनुमानित प्रारंभ',
    // ── InfoRow labels — Health ─────────────────────────────────────────────
    'Age Group Context': 'आयु वर्ग संदर्भ',
    // ── InfoRow labels — misc ───────────────────────────────────────────────
    'Rahu': 'राहु',
    'Ketu': 'केतु',
    'N/A': 'उपलब्ध नहीं',
    'Career': 'करियर',
    // ── InfoRow labels — (if available) birth data ──────────────────────────
    'Ishta (if available)': 'इष्ट (यदि उपलब्ध)',
    'Sunrise (if available)': 'सूर्योदय (यदि उपलब्ध)',
    'Sunset (if available)': 'सूर्यास्त (यदि उपलब्ध)',
    'Local Mean Time (if available)': 'स्थानीय माध्य समय (यदि उपलब्ध)',
    'Sidereal Time (if available)': 'नाक्षत्र समय (यदि उपलब्ध)',
    'Tithi Ending Time (if available)': 'तिथि समाप्ति समय (यदि उपलब्ध)',
    'Nakshatra Ending Time (if available)': 'नक्षत्र समाप्ति समय (यदि उपलब्ध)',
    // ── Thank You page ────────────────────────────────────────────────────────
    'THANK YOU': 'धन्यवाद',
    'Thank you for choosing Sri Mandir for your Kundli report. We hope this personalized Vedic astrology blueprint brings you clarity, guidance, and confidence on your life journey.': 'श्री मंदिर से कुंडली रिपोर्ट चुनने के लिए धन्यवाद। हमें आशा है कि यह वैदिक ज्योतिष रूपरेखा आपको जीवन यात्रा में स्पष्टता, मार्गदर्शन और आत्मविश्वास प्रदान करेगी।',
    'For personalized consultations with our expert astrologers': 'हमारे विशेषज्ञ ज्योतिषियों से व्यक्तिगत परामर्श के लिए',
    'May the stars guide your path': 'ग्रह आपके मार्ग को प्रकाशित करें',
    // ── Hardcoded remedy intro paragraphs ──────────────────────────────────
    'Mantras are sacred sound vibrations that connect the practitioner to cosmic energies. The science of Mantra Shastra explains how specific sound frequencies can influence planetary energies and transform consciousness.': 'मंत्र पवित्र ध्वनि कंपन हैं जो साधक को ब्रह्मांडीय ऊर्जाओं से जोड़ते हैं। मंत्र शास्त्र का विज्ञान बताता है कि विशिष्ट ध्वनि आवृत्तियां कैसे ग्रह ऊर्जाओं को प्रभावित कर सकती हैं और चेतना को रूपांतरित कर सकती हैं।',
    'Rudraksha beads are sacred seeds from the Elaeocarpus ganitrus tree, revered for their spiritual and healing properties. Each Mukhi (face) of Rudraksha resonates with specific planetary energies.': 'रुद्राक्ष के मनके इलियोकार्पस गैनिट्रस वृक्ष के पवित्र बीज हैं, जो आध्यात्मिक और उपचारात्मक गुणों के लिए पूजित हैं। रुद्राक्ष के प्रत्येक मुखी (चेहरे) विशिष्ट ग्रह ऊर्जाओं के साथ अनुनाद करते हैं।',
    'Yantras are sacred geometric diagrams that serve as focal points for meditation and planetary propitiation. Each Yantra embodies specific cosmic energies through precise mathematical proportions.': 'यंत्र पवित्र ज्यामितीय आरेख हैं जो ध्यान और ग्रह शांति के लिए केंद्र बिंदु के रूप में कार्य करते हैं। प्रत्येक यंत्र सटीक गणितीय अनुपातों के माध्यम से विशिष्ट ब्रह्मांडीय ऊर्जाओं को मूर्त रूप देता है।',
    'Planetary Degree Matrix': 'ग्रह अंश सारणी',
  },
  te: {
    'Sri Mandir Kundli Report': 'శ్రీ మందిర్ కుండలి నివేదిక',
    'Table of Contents': 'విషయ సూచిక',
    'Birth Details': 'జనన వివరాలు',
    'YOUR': 'మీ',
    'KUNDLI REPORT': 'కుండ్లీ రిపోర్ట్',
    'A Personalized Vedic Astrology Blueprint': 'మీ వ్యక్తిగత వైదిక జ్యోతిష్య రూపరేఖ',
    'Date of Birth': 'జనన తేది',
    'Time of Birth': 'జనన సమయం',
    'Place of Birth': 'జనన స్థలం',
    'Created by expert astrologers': 'నిపుణ జ్యోతిష్యులచే సిద్ధం చేయబడింది',
    'Prepared on': 'తయారైన తేదీ',
    'This comprehensive Kundli report covers all major dimensions of your birth chart, from your fundamental planetary blueprint to specific life-area predictions and remedial guidance.': 'ఈ సమగ్ర కుండ్లీ రిపోర్ట్ మీ జనన జాతకంలోని ప్రధాన అంశాలన్నింటినీ కవర్ చేస్తుంది; ప్రాథమిక గ్రహ స్థితి నుండి జీవితం వివిధ రంగాల అంచనాలు మరియు పరిహార మార్గదర్శకత వరకు అందిస్తుంది.',
    'Birth Details & Planetary Positions': 'జనన వివరాలు మరియు గ్రహ స్థితులు',
    'Planetary Positions': 'గ్రహ స్థితులు',
    'Detailed Planetary Snapshot': 'వివరమైన గ్రహ పట్టిక',
    'Panchang Analysis': 'పంచాంగ విశ్లేషణ',
    'Career & Professional Life': 'వృత్తి మరియు ప్రొఫెషనల్ జీవితం',
    'Love, Romance & Marriage': 'ప్రేమ, సంబంధం మరియు వివాహం',
    'Health & Well-Being': 'ఆరోగ్యం మరియు శ్రేయస్సు',
    "Sade Sati — Saturn's 7.5-Year Transit": 'ఏడున్నర శని — 7.5 ఏళ్ల గోచారం',
    'Sade Sati': 'ఏడున్నర శని',
    'Your Sade Sati Status': 'మీ ఏడున్నర శని స్థితి',
    'Transit Saturn': 'గోచార శని',
    'Currently Active': 'ప్రస్తుతం చురుకుగా ఉందా',
    'Current Phase': 'ప్రస్తుత దశ',
    'YES — ACTIVE NOW': 'అవును — ప్రస్తుతం చురుకుగా ఉంది',
    'Not Currently Active': 'ప్రస్తుతం చురుకుగా లేదు',
    'Saturn Sign': 'శని రాశి',
    'Period': 'కాలం',
    'Guidance for This Phase': 'ఈ దశకు మార్గదర్శనం',
    'Purpose': 'ఉద్దేశ్యం',
    'Best Time': 'మంచి సమయం',
    'Month-level periods below are approximate transit windows derived from Saturn phase sequencing.': 'క్రింద ఉన్న నెలవారీ కాలాలు శని దశ క్రమంపై ఆధారపడ్డ అంచనా గోచార విండోలు.',
    'PART': 'భాగం',
    'Not Active': 'ప్రస్తుతం లేదు',
    'Looking for detailed guidance on your birth chart? Speak to our expert astrologers today': 'మీ జనన చార్ట్‌పై విశదమైన మార్గదర్శనం కావాలా? ఈరోజే మా నిపుణ జ్యోతిష్యులతో మాట్లాడండి',
    // Missing major section headers
    'Three Pillars of Your Chart': 'మీ కుండలిలోని మూడు స్తంభాలు',
    'Personal Planetary Profiles': 'గ్రహ ప్రొఫైల్‌లు',
    'Bhavphal — The 12 Houses': 'భావఫలం — 12 భావాలు',
    'Vimshottari Dasha Predictions': 'వింశోత్తరి దశా అంచనాలు',
    'Rahu–Ketu Karmic Axis': 'రాహు-కేతు కర్మ అక్షం',
    'Raja Yogas & Auspicious Combinations': 'రాజయోగాలు మరియు శుభ సంయోగాలు',
    'Dosha Analysis': 'దోష విశ్లేషణ',
    'Numerology Analysis': 'సంఖ్యా జ్యోతిష్య విశ్లేషణ',
    'Spiritual Potential & Dharma': 'ఆధ్యాత్మిక సామర్థ్యం మరియు ధర్మం',
    'Vedic Remedies': 'వైదిక పరిహారాలు',
    'Chara Karakas — Jaimini System': 'చర కారకాలు — జైమిని పద్ధతి',
    // Planet sub-headers
    'Placement Analysis': 'స్థాన విశ్లేషణ',
    'House Significance': 'భావ ప్రాముఖ్యత',
    'Aspects': 'దృష్టులు',
    'Retrograde Effect': 'వక్రీ ప్రభావం',
    'Dasha Influence': 'దశా ప్రభావం',
    // Chara Karakas
    'Chara Karakas (Jaimini)': 'చర కారకాలు (జైమిని)',
    'Chara Karakas - Jaimini Astrology': 'చర కారకాలు — జైమిని జ్యోతిష్యం',
    'Understanding the Jaimini System': 'జైమిని పద్ధతి అర్థం',
    'Your Chara Karakas': 'మీ చర కారకాలు',
    // Charts
    'Kundali Charts (Divisional Charts)': 'కుండలి చార్ట్‌లు',
    'Additional Divisional Charts': 'అదనపు విభాగీయ చార్ట్‌లు',
    'Kundali Charts': 'కుండలి చార్ట్‌లు',
    // Birth details labels
    'Tithi at Birth': 'జనన తిథి',
    'Nakshatra at Birth': 'జనన నక్షత్రం',
    'Yoga at Birth': 'జనన యోగం',
    'Karana at Birth': 'జనన కరణం',
    'Lahiri Ayanamsha': 'లాహిరి అయనాంశం',
    'Sun Degree': 'సూర్యుని అంశం',
    'Ascendant Degree': 'లగ్న అంశం',
    'Lord in': 'అధిపతి భావం',
    'Vaar (Day)': 'వారం',
    // Three Pillars
    'Moon Sign (Rashi)': 'చంద్ర రాశి',
    'Moon Sign': 'చంద్ర రాశి',
    'Ascendant (Lagna)': 'లగ్నం',
    'Birth Nakshatra': 'జన్మ నక్షత్రం',
    'Emotional Nature': 'భావనాత్మక స్వభావం',
    'Ruling Planet': 'రాశి అధిపతి',
    // Bhavphal
    'Bhavphal - House Analysis Overview': 'భావఫలం — భావ విశ్లేషణ',
    // TOC sub-descriptions
    'Ascendant, planetary placements, Chara Karakas (Jaimini)': 'లగ్నం, గ్రహ స్థితులు, చర కారకాలు (జైమిని)',
    'Vaar, Tithi, Nakshatra, Yoga, Karana at birth': 'వారం, తిథి, నక్షత్రం, యోగం, కరణం',
    'Moon Sign, Ascendant, Birth Nakshatra': 'చంద్ర రాశి, లగ్నం, జన్మ నక్షత్రం',
    'Detailed analysis of all 9 planets': 'అన్ని 9 గ్రహాల వివరమైన విశ్లేషణ',
    'Complete house-by-house life analysis': 'అన్ని 12 భావాల జీవిత విశ్లేషణ',
    'Career calling, wealth potential, suitable fields': 'వృత్తి, ఆర్థిక సామర్థ్యం, అనువైన రంగాలు',
    'Partner profile, marriage timing, compatibility': 'జీవిత భాగస్వామి, వివాహ సమయం, అనుకూలత',
    'Age-aware lifestyle guidance and preventive care focus': 'వయసు-ఆధారిత జీవనశైలి మార్గదర్శనం',
    'Current & upcoming planetary periods': 'ప్రస్తుత మరియు రాబోయే దశలు',
    'Past karma, future direction, Kaal Sarp Yoga': 'గత కర్మ, భవిష్య దిశ, కాలసర్ప యోగం',
    'Pancha Mahapurusha, Dhana Yogas and more': 'పంచమహాపురుష, ధన యోగాలు మరియు ఇతరాలు',
    'Mangal Dosha, Kaal Sarp and other planetary afflictions': 'మంగళ దోషం, కాలసర్పం మరియు ఇతర దోషాలు',
    'Current status, phases, remedies': 'ప్రస్తుత స్థితి, దశలు, పరిహారాలు',
    'Birth number, destiny number, personal year': 'మూలాంకం, భాగ్యాంకం, వ్యక్తిగత సంవత్సరం',
    'Atmakaraka, Ishta Devata, Moksha path': 'ఆత్మకారకం, ఇష్ట దేవత, మోక్ష మార్గం',
    'Gemstones, Rudraksha, Mantras, Yantras, Pujas': 'రత్నాలు, రుద్రాక్ష, మంత్రాలు, యంత్రాలు, పూజలు',
    'Atmakaraka, Amatyakaraka, Darakaraka in depth': 'ఆత్మకారకం, అమాత్యకారకం, దారకారకం',
    // Static paragraph texts
    'R = Retrograde, C = Combust. Fields marked "if available" are shown when present in source astro data.': 'R = వక్రీ, C = అస్తం. "లభ్యమైతే" అని గుర్తించిన అంశాలు మూల డేటాలో ఉన్నప్పుడు మాత్రమే చూపబడతాయి.',
    'The Panchang (five limbs) provides the foundational cosmic timing of your birth, revealing the day\'s energy, lunar phase, and celestial influences that shape your destiny.': 'పంచాంగం (ఐదు అంగాలు) మీ జన్మ సమయపు మూల జ్యోతిష్య గణన, ఆ రోజు శక్తి, చంద్ర దశ మరియు మీ విధిని నిర్ణయించే ఖగోళ ప్రభావాలను వెల్లడిస్తుంది.',
    'The three fundamental pillars—Moon Sign, Ascendant, and Birth Nakshatra—form the core identity markers of your horoscope, revealing your emotional nature, physical constitution, and life purpose.': 'మూడు మూల స్తంభాలు — చంద్ర రాశి, లగ్నం మరియు జన్మ నక్షత్రం — మీ కుండలిలోని కేంద్ర గుర్తింపు చిహ్నాలు, ఇవి మీ భావనాత్మక స్వభావం, శారీరక స్వరూపం మరియు జీవిత లక్ష్యాన్ని తెలుపుతాయి.',
    'The twelve houses (Bhavas) of your horoscope govern different areas of life. Each house is colored by its sign, lord placement, and any planetary occupants. This comprehensive analysis reveals the potential in each life domain.': 'మీ కుండలిలోని పన్నెండు భావాలు జీవితంలోని వేర్వేరు రంగాలను నియంత్రిస్తాయి. ప్రతి భావం దాని రాశి, అధిపతి స్థానం మరియు గ్రహాల ఉనికి ద్వారా ప్రభావితమవుతుంది.',
    'These are the key divisional charts (Varga charts) derived from your birth chart. Each chart reveals specific life areas and is used for deeper analysis of those domains.': 'ఇవి మీ జన్మ కుండలి నుండి తీసుకోబడిన ముఖ్యమైన విభాగీయ చార్ట్‌లు (వర్గ చార్ట్‌లు). ప్రతి చార్ట్ జీవితంలో నిర్దిష్ట రంగాలను చూపిస్తుంది.',
    // ── Sade Sati entries ─────────────────────────────────────────────────────
    'Sade Sati — Detailed Analysis': 'ఏడున్నర శని — వివరమైన విశ్లేషణ',
    'Sade Sati — Remedies & Spiritual Significance': 'ఏడున్నర శని — పరిహారాలు మరియు ఆధ్యాత్మిక ప్రాముఖ్యత',
    'Powerful Remedies for Sade Sati': 'ఏడున్నర శనికి శక్తివంతమైన పరిహారాలు',
    'Current Sade Sati': 'ప్రస్తుత ఏడున్నర శని',
    'Past Sade Sati': 'గత ఏడున్నర శని',
    'Next Sade Sati': 'తదుపరి ఏడున్నర శని',
    'The Moon-Saturn Relationship in Your Chart': 'మీ కుండలిలో చంద్ర-శని సంబంధం',
    'Master Guidance for Your Sade Sati': 'మీ ఏడున్నర శనికి ప్రధాన మార్గదర్శనం',
    'Inspiration — Famous People Who Thrived During Sade Sati': 'స్ఫూర్తి — ఏడున్నర శనిలో వృద్ధి చెందిన ప్రసిద్ధులు',
    'The Three Phases of Your Sade Sati': 'మీ ఏడున్నర శని మూడు దశలు',
    'Rising Phase (12th from Moon)': 'ఉదయ దశ (చంద్రుడి నుండి 12వ)',
    'Peak Phase (Over Moon)': 'శిఖర దశ (చంద్రుడిపై)',
    'Setting Phase (2nd from Moon)': 'అస్తమయ దశ (చంద్రుడి నుండి 2వ)',
    // ── Section / ContentPage names ───────────────────────────────────────────
    'House Analysis (Bhavphal)': 'భావఫలం — భావ విశ్లేషణ',
    'Career Analysis': 'వృత్తి విశ్లేషణ',
    'Career Calling': 'వృత్తి — మీ పిలుపు',
    'Love & Marriage': 'ప్రేమ మరియు వివాహం',
    'Dasha Predictions': 'దశా అంచనాలు',
    'Antardasha Predictions': 'అంతర్దశా అంచనాలు',
    'Antardasha Predictions (Current Mahadasha)': 'అంతర్దశా అంచనాలు (ప్రస్తుత మహాదశ)',
    'Yogini Dasha': 'యోగిని దశ',
    'Yogini Dasha System': 'యోగిని దశా పద్ధతి',
    'Dasha Sequence': 'దశా క్రమం',
    'Dasha Sequence & Timing': 'దశా క్రమం మరియు సమయం',
    'Rahu-Ketu Axis': 'రాహు-కేతు అక్షం',
    'Minor Doshas': 'చిన్న దోషాలు',
    'Dosha Remedies': 'దోష పరిహారాలు',
    'Raja Yogas': 'రాజయోగాలు',
    'Raja Yogas (Auspicious Combinations)': 'రాజయోగాలు (శుభ సంయోగాలు)',
    'Dhana Yogas': 'ధన యోగాలు',
    'Dhana Yogas (Wealth Combinations)': 'ధన యోగాలు (సంపద సంయోగాలు)',
    'Life Predictions from Yogas': 'యోగ ఆధారిత జీవిత అంచనాలు',
    'Life Predictions Based on Yogas': 'యోగ ఆధారిత జీవిత అంచనాలు',
    'Challenging Yogas': 'సవాలు యోగాలు',
    'Challenging Yogas (For Awareness)': 'సవాలు యోగాలు (అవగాహన కోసం)',
    'Spiritual Potential': 'ఆధ్యాత్మిక సామర్థ్యం',
    'Understanding Vedic Remedies': 'వైదిక పరిహారాలు — పరిచయం',
    'Gemstone Therapy': 'రత్న చికిత్స',
    'Gemstone Therapy (Ratna Shastra)': 'రత్న చికిత్స (రత్న శాస్త్రం)',
    'Rudraksha Therapy': 'రుద్రాక్ష చికిత్స',
    'Mantra Therapy': 'మంత్ర చికిత్స',
    'Mantra Therapy (Mantra Shastra)': 'మంత్ర చికిత్స (మంత్ర శాస్త్రం)',
    'Yantras & Pujas': 'యంత్రాలు మరియు పూజలు',
    'Yantras & Puja Recommendations': 'యంత్రాలు మరియు పూజా సూచనలు',
    'Ishta Devata & Spiritual Practices': 'ఇష్ట దేవత మరియు ఆధ్యాత్మిక సాధన',
    'Lifestyle Remedies': 'జీవనశైలి పరిహారాలు',
    'Lifestyle Remedies & Guidance': 'జీవనశైలి పరిహారాలు మరియు మార్గదర్శనం',
    'Atmakaraka Analysis': 'ఆత్మకారక విశ్లేషణ',
    'Amatyakaraka Analysis': 'అమాత్యకారక విశ్లేషణ',
    'Glossary': 'పారిభాషిక నిఘంటువు',
    'Glossary of Vedic Astrology Terms': 'వైదిక జ్యోతిష్య పారిభాషిక నిఘంటువు',
    // ── Glossary inline labels ──────────────────────────────────────────────
    'Example': 'ఉదాహరణ',
    'Related': 'సంబంధిత',
    // ── Planetary matrix abbreviations ─────────────────────────────────────
    'RL': 'రా.అధి.',
    'NL': 'న.అధి.',
    'Sub': 'ఉప',
    // ── Table misc ─────────────────────────────────────────────────────────
    'Empty': 'ఖాళీ',
    'Primary Gemstone': 'ప్రాథమిక రత్నం',
    'Secondary Gemstone': 'ద్వితీయ రత్నం',
    'Mukhi Rudraksha': 'ముఖి రుద్రాక్ష',
    'Planetary Analysis': 'గ్రహ విశ్లేషణ',
    'Mahadasha Predictions': 'మహాదశ అంచనాలు',
    'in': 'లో',
    // ── Compound Nakshatra names (must be phrases, not single words) ───────
    'Purva Phalguni': 'పూర్వ ఫల్గుని',
    'Uttara Phalguni': 'ఉత్తర ఫల్గుని',
    'Purva Ashadha': 'పూర్వాషాఢ',
    'Uttara Ashadha': 'ఉత్తరాషాఢ',
    'Purva Bhadrapada': 'పూర్వ భాద్రపద',
    'Uttara Bhadrapada': 'ఉత్తర భాద్రపద',
    // ── Aspect type translations ──────────────────────────────────────────
    'Full Aspect': 'పూర్ణ దృష్టి',
    'Partial Aspect': 'పాక్షిక దృష్టి',
    'Special Aspect': 'ప్రత్యేక దృష్టి',
    'Conjunction': 'యుతి',
    // ── Hardcoded paragraphs ──────────────────────────────────────────────
    'Before exploring specific remedies, it is essential to understand the profound science and tradition behind Vedic Upayas (remedial measures). This section explains why these remedies work and how they have been validated through millennia of practice.': 'నిర్దిష్ట పరిహారాలను అన్వేషించే ముందు, వైదిక ఉపాయాల వెనుక ఉన్న లోతైన శాస్త్రం మరియు సంప్రదాయాన్ని అర్థం చేసుకోవడం అవసరం. ఈ విభాగం ఈ పరిహారాలు ఎందుకు పని చేస్తాయో మరియు సహస్రాబ్దాల అభ్యాసం ద్వారా ఎలా ధృవీకరించబడ్డాయో వివరిస్తుంది.',
    'The following challenging combinations are present in your chart. Awareness of these helps you navigate difficulties and apply appropriate remedies.': 'మీ జాతకంలో క్రింది సవాలు కలయికలు ఉన్నాయి. వీటి గురించి అవగాహన కలిగి ఉంటే కష్టాలను అధిగమించడంలో మరియు తగిన పరిహారాలను అమలు చేయడంలో మీకు సహాయపడుతుంది.',
    'Chart image unavailable for this section.': 'ఈ విభాగానికి చార్ట్ చిత్రం అందుబాటులో లేదు.',
    'Gemstones have been used in Vedic astrology for millennia to harness planetary energies and balance cosmic influences.': 'గ్రహ శక్తులను అదుపు చేయడానికి మరియు విశ్వ ప్రభావాలను సమతుల్యం చేయడానికి వైదిక జ్యోతిష్యంలో సహస్రాబ్దాలుగా రత్నాలు ఉపయోగించబడుతున్నాయి.',
    'Total Yogas Detected': 'మొత్తం యోగాలు గుర్తించబడ్డాయి',
    'Overall Strength': 'మొత్తం బలం',
    // ── SubSection titles ─────────────────────────────────────────────────────
    'Remedies': 'పరిహారాలు',
    'Significance': 'ప్రాముఖ్యత',
    'Detailed Analysis': 'వివరమైన విశ్లేషణ',
    'Predictions': 'అంచనాలు',
    'Timing': 'సమయం',
    'Right Career For You': 'మీకు సరైన వృత్తి',
    '10th House Analysis': 'దశమ భావ విశ్లేషణ',
    'Sun Analysis (Authority)': 'సూర్య విశ్లేషణ (అధికారం)',
    'Saturn Analysis (Work Ethic)': 'శని విశ్లేషణ (పని నైతికత)',
    'Amatyakaraka (Career Significator)': 'అమాత్యకారకం (వృత్తి కారకం)',
    'Suitable Career Fields': 'అనువైన వృత్తి రంగాలు',
    'Fields to Avoid': 'నివారించాల్సిన రంగాలు',
    'Career Timing & Phases': 'వృత్తి సమయం మరియు దశలు',
    'Career Switch Insights': 'వృత్తి మార్పు అంతర్దృష్టి',
    'Success Formula': 'విజయ సూత్రం',
    'Wealth Potential': 'ఆర్థిక సామర్థ్యం',
    'Business vs Job': 'వ్యాపారం vs ఉద్యోగం',
    'Recommendations': 'సూచనలు',
    'Relationship Safety Framework': 'సంబంధ భద్రతా చట్రం',
    '5th House (Romance)': 'పంచమ భావం (ప్రేమ)',
    '7th House (Marriage)': 'సప్తమ భావం (వివాహం)',
    'Venus Analysis': 'శుక్ర విశ్లేషణ',
    'Darakaraka (Spouse Significator)': 'దారకారకం (జీవిత భాగస్వామి కారకం)',
    'Partner Profile': 'జీవిత భాగస్వామి ప్రొఫైల్',
    'Ideal Partner (If Unmarried)': 'ఆదర్శ భాగస్వామి (అవివాహితులకు)',
    'Guidance If Married': 'వివాహితులకు మార్గదర్శనం',
    'Marriage Timing': 'వివాహ సమయం',
    'Mangal Dosha': 'మంగళ దోషం',
    'Age Context & Safety': 'వయసు సందర్భం మరియు భద్రత',
    'Safe Movement Guidance': 'సురక్షిత కదలిక మార్గదర్శనం',
    'Nutrition & Hydration': 'పోషణ మరియు నీటి పుష్టి',
    'Recovery & Sleep': 'పునరుద్ధరణ మరియు నిద్ర',
    'Preventive Health Checks': 'నివారణ ఆరోగ్య పరీక్షలు',
    'What to Avoid': 'ఏమి నివారించాలి',
    'General Wellness Note': 'సాధారణ ఆరోగ్య గమనిక',
    'Career Impact': 'వృత్తి ప్రభావం',
    'Relationship Impact': 'సంబంధ ప్రభావం',
    'Health Impact': 'ఆరోగ్య ప్రభావం',
    'Financial Impact': 'ఆర్థిక ప్రభావం',
    'Spiritual Growth': 'ఆధ్యాత్మిక వికాసం',
    'Key Events': 'ముఖ్య సంఘటనలు',
    'Recommended Remedies': 'సూచించిన పరిహారాలు',
    'Upcoming Periods': 'రాబోయే కాలాలు',
    'Complete Dasha Sequence (Vimshottari 120-Year Cycle)': 'సంపూర్ణ దశా క్రమం (వింశోత్తరి 120 సంవత్సరాల చక్రం)',
    'Current Transit Impact': 'ప్రస్తుత గోచార ప్రభావం',
    'Period Recommendations': 'కాల సూచనలు',
    'Spiritual Guidance': 'ఆధ్యాత్మిక మార్గదర్శనం',
    'Karmic Axis': 'కర్మ అక్షం',
    'Rahu Analysis (Future Direction)': 'రాహు విశ్లేషణ (భవిష్య దిశ)',
    'Ketu Analysis (Past Life Karma)': 'కేతు విశ్లేషణ (పూర్వ జన్మ కర్మ)',
    'Kaal Sarp Yoga': 'కాలసర్ప యోగం',
    'Spiritual Path': 'ఆధ్యాత్మిక మార్గం',
    'Major Doshas': 'ప్రధాన దోషాలు',
    'Priority Remedies': 'ప్రాధాన్య పరిహారాలు',
    'Raja Yogas (Power & Success)': 'రాజయోగాలు (శక్తి మరియు విజయం)',
    'Wealth': 'సంపద',
    'Fame & Recognition': 'కీర్తి మరియు గుర్తింపు',
    'Spirituality': 'ఆధ్యాత్మికత',
    'Yoga Enhancement': 'యోగ బలపరచడం',
    'Spiritual Significance': 'ఆధ్యాత్మిక ప్రాముఖ్యత',
    'Sacred Mantras': 'పవిత్ర మంత్రాలు',
    'Lucky Associations': 'శుభ అనుబంధాలు',
    'Spiritual Rating': 'ఆధ్యాత్మిక స్థాయి',
    'Atmakaraka (Soul Purpose)': 'ఆత్మకారకం (ఆత్మ ఉద్దేశ్యం)',
    '9th House (Dharma)': 'నవమ భావం (ధర్మం)',
    '12th House (Moksha)': 'ద్వాదశ భావం (మోక్షం)',
    'Ishta Devata (Personal Deity)': 'ఇష్ట దేవత',
    'Meditation Guidance': 'ధ్యాన మార్గదర్శనం',
    'Moksha Path': 'మోక్ష మార్గం',
    'Vedic Foundation': 'వైదిక ఆధారం',
    'How Remedies Work': 'పరిహారాలు ఎలా పని చేస్తాయి',
    'The Role of Faith and Intention': 'విశ్వాసం మరియు సంకల్పం పాత్ర',
    'Scientific Perspective': 'శాస్త్రీయ దృక్పథం',
    'Traditional Wisdom': 'సాంప్రదాయిక జ్ఞానం',
    'Gemstones to Avoid': 'నివారించాల్సిన రత్నాలు',
    'Yantra Recommendations': 'యంత్ర సూచనలు',
    'Recommended Pujas': 'సూచించిన పూజలు',
    'Your Ishta Devata (Personal Deity)': 'మీ ఇష్ట దేవత',
    'Fasting Recommendations (Vrata)': 'వ్రత సూచనలు',
    'Donations (Daan)': 'దానం',
    'Color Therapy': 'రంగు చికిత్స',
    'Direction Guidance (Vastu)': 'దిశ మార్గదర్శనం (వాస్తు)',
    'Daily Routine Recommendations': 'దైనందిన దినచర్య సూచనలు',
    'Daily Spiritual Practices': 'దైనందిన ఆధ్యాత్మిక సాధన',
    'General Advice': 'సాధారణ సలహా',
    'Weak Planets Summary': 'బలహీన గ్రహాల సారాంశం',
    'Soul Purpose': 'ఆత్మ ఉద్దేశ్యం',
    'Spiritual Lesson': 'ఆధ్యాత్మిక పాఠం',
    'Spouse Characteristics': 'జీవిత భాగస్వామి లక్షణాలు',
    'Marriage Indications': 'వివాహ సూచనలు',
    'Partner Qualities': 'భాగస్వామి గుణాలు',
    'Career Direction': 'వృత్తి దిశ',
    'Professional Strengths': 'వృత్తిపరమైన బలాలు',
    'Suitable Professions': 'అనువైన వృత్తులు',
    'Karaka Interactions': 'కారక అంతఃచర్యలు',
    'Scriptural References': 'శాస్త్రీయ సూచనలు',
    'Detailed Interpretation': 'వివరమైన వ్యాఖ్యానం',
    'Life Impact': 'జీవిత ప్రభావం',
    'Quick Reference': 'త్వరిత సూచిక',
    'Upcoming Yogini Periods': 'రాబోయే యోగిని కాలాలు',
    'Complete Yogini Dasha Cycle (36 Years)': 'సంపూర్ణ యోగిని దశా చక్రం (36 సంవత్సరాలు)',
    // ── Career, marriage, and analysis subsection headers ─────────────────────
    'Strengths': 'బలాలు',
    'Challenges': 'సవాళ్లు',
    'Core Strengths': 'ప్రధాన బలాలు',
    'Challenges to Navigate': 'నావిగేట్ చేయడానికి సవాళ్లు',
    'Attributes': 'లక్షణాలు',
    'Impact': 'ప్రభావం',
    // ── Antardasha / Dasha inline labels ────────────────────────────────────
    'Focus Areas': 'ముఖ్య రంగాలు',
    'Life Themes': 'జీవిత అంశాలు',
    'Key Events to Watch': 'గమనించాల్సిన ముఖ్య సంఘటనలు',
    'Advice': 'సలహా',
    'Associated Planet': 'సంబంధిత గ్రహం',
    'Duration': 'వ్యవధి',
    'Mahadasha Period': 'మహాదశ కాలం',
    'Current Yogini': 'ప్రస్తుత యోగిని',
    // ── Dosha section inline labels ─────────────────────────────────────────
    'Cause': 'కారణం',
    'Effects': 'ప్రభావాలు',
    'Status': 'స్థితి',
    'Severity': 'తీవ్రత',
    'Affected Areas': 'ప్రభావిత రంగాలు',
    'Total Doshas Detected': 'మొత్తం దోషాలు కనుగొనబడ్డాయి',
    'Nullified': 'నిర్వీర్యం',
    'Immediate (Start Now)': 'తక్షణం (ఇప్పుడే ప్రారంభించండి)',
    'Short-Term (1-3 Months)': 'స్వల్పకాలిక (1-3 నెలలు)',
    'Long-Term (Ongoing)': 'దీర్ఘకాలిక (నిరంతరం)',
    'Procedure': 'విధానం',
    'Expected Benefits': 'ఆశించిన ప్రయోజనాలు',
    'Mantras': 'మంత్రాలు',
    'Primary Remedy': 'ప్రాథమిక పరిహారం',
    'Remedies for': 'పరిహారాలు —',
    'Deity': 'దేవత',
    'Count': 'సంఖ్య',
    // ── Rahu-Ketu inline labels ─────────────────────────────────────────────
    'Life Lesson': 'జీవిత పాఠం',
    'Desires': 'కోరికలు',
    'Growth Areas': 'అభివృద్ధి రంగాలు',
    'Natural Talents': 'సహజ ప్రతిభలు',
    'Spiritual Gifts': 'ఆధ్యాత్మిక వరాలు',
    'Type': 'రకం',
    // ── Chara Karaka table & section labels ──────────────────────────────────
    'Karaka': 'కారకం',
    'Planet': 'గ్రహం',
    'Sign': 'రాశి',
    'House': 'భావం',
    'Signification': 'కారకత్వం',
    'Soul Significator': 'ఆత్మ కారకం',
    'Spouse Significator': 'జీవిత భాగస్వామి కారకం',
    'Career Significator': 'వృత్తి కారకం',
    'Effect': 'ప్రభావం',
    // ── Yogini table headers ────────────────────────────────────────────────
    'Yogini': 'యోగిని',
    'Years': 'సంవత్సరాలు',
    'Nature': 'స్వభావం',
    // ── Section divider translations ────────────────────────────────────────
    'Doshas, Yogas & Karma': 'దోషాలు, యోగాలు & కర్మ',
    'Karmic imbalances, auspicious combinations, and the Rahu-Ketu axis that defines your soul\'s evolutionary mission': 'కర్మ అసమతుల్యతలు, శుభ సంయోగాలు, మరియు మీ ఆత్మ పరిణామ మిషన్‌ను నిర్వచించే రాహు-కేతు అక్షం',
    'Life Predictions': 'జీవిత అంచనాలు',
    'Career, marriage, wealth, health — what the stars reveal about every major chapter of your life': 'వృత్తి, వివాహం, సంపద, ఆరోగ్యం — నక్షత్రాలు మీ జీవితంలోని ప్రతి ముఖ్య అధ్యాయం గురించి ఏమి వెల్లడిస్తాయి',
    'Your Dasha Timeline': 'మీ దశా కాలరేఖ',
    'The planetary periods that govern each phase of your life — your cosmic roadmap from birth to liberation': 'మీ జీవితంలోని ప్రతి దశను నియంత్రించే గ్రహ కాలాలు — జన్మ నుండి మోక్షం వరకు మీ విశ్వ మార్గ చిత్రం',
    'Numerology & Spiritual Potential': 'సంఖ్యా శాస్త్రం & ఆధ్యాత్మిక సామర్థ్యం',
    'Sacred numbers, your soul\'s purpose, and the spiritual path written in your chart': 'పవిత్ర సంఖ్యలు, మీ ఆత్మ ఉద్దేశ్యం, మరియు మీ చార్ట్‌లో వ్రాయబడిన ఆధ్యాత్మిక మార్గం',
    'Gemstones, mantras, rituals, fasting, and lifestyle practices to harmonize your planetary energies': 'రత్నాలు, మంత్రాలు, ఆచారాలు, ఉపవాసం, మరియు మీ గ్రహ శక్తులను సమన్వయం చేయడానికి జీవనశైలి అభ్యాసాలు',
    'The Atmakaraka is the most important planet in Jaimini astrology, representing your soul\'s purpose.': 'ఆత్మకారకం జైమిని జ్యోతిష్యంలో అత్యంత ముఖ్యమైన గ్రహం, ఇది మీ ఆత్మ ఉద్దేశ్యాన్ని సూచిస్తుంది.',
    'The following are the current and upcoming sub-periods (Antardashas) within your current Mahadasha. Completed past Antardashas are intentionally excluded so this section stays forward-looking and actionable.': 'ఈ క్రింది వాటిలో మీ ప్రస్తుత మహాదశలోని ప్రస్తుత మరియు రాబోయే ఉప-కాలాలు (అంతర్దశలు) ఉన్నాయి.',
    'Life Focus': 'జీవిత కేంద్రం',
    'Approximate Period': 'అంచనా కాలం',
    'Focus': 'కేంద్రం',
    'Mahadasha': 'మహాదశ',
    'Antardasha': 'అంతర్దశ',
    // ── Chart purpose translations ──────────────────────────────────────────
    'Overall life assessment': 'సమగ్ర జీవిత అంచనా',
    'Wealth and finances': 'సంపద మరియు ఆర్థిక',
    'Siblings and courage': 'తోబుట్టువులు మరియు ధైర్యం',
    'Fortune and property': 'అదృష్టం మరియు ఆస్తి',
    'Children and progeny': 'సంతానం',
    'Marriage and spouse': 'వివాహం మరియు జీవిత భాగస్వామి',
    'Career and profession': 'వృత్తి మరియు ఉద్యోగం',
    'Parents and ancestry': 'తల్లిదండ్రులు మరియు వంశం',
    'Spiritual progress': 'ఆధ్యాత్మిక పురోగతి',
    'Education and learning': 'విద్య మరియు అభ్యాసం',
    'Strength and weakness': 'బలం మరియు బలహీనత',
    'Past life karma': 'పూర్వజన్మ కర్మ',
    'Atmakaraka': 'ఆత్మకారకం',
    'Darakaraka': 'దారకారకం',
    'Amatyakaraka': 'అమాత్యకారకం',
    'Term': 'పదం',
    'Definition': 'నిర్వచనం',
    'Degree': 'అంశం',
    'Lord': 'అధిపతి',
    'Occupants': 'ఉన్న గ్రహాలు',
    // ── Remaining hardcoded English headers ─────────────────────────────────
    'Ideal Roles': 'ఆదర్శ పాత్రలు',
    'Current Career Phase': 'ప్రస్తుత వృత్తి దశ',
    'Upcoming Opportunities': 'రాబోయే అవకాశాలు',
    'Future Career Changes': 'భవిష్యత్ వృత్తి మార్పులు',
    'Preparation Plan': 'సిద్ధత ప్రణాళిక',
    'Key Qualities': 'ముఖ్య గుణాలు',
    'Caution Traits': 'జాగ్రత్త లక్షణాలు',
    'Relationship Strengthening': 'సంబంధ బలపరచడం',
    'Conflicts to Avoid': 'నివారించాల్సిన సంఘర్షణలు',
    'Favorable Periods': 'అనుకూల కాలాలు',
    'Challenging Periods': 'సవాలు కాలాలు',
    'Opportunities': 'అవకాశాలు',
    'Formation in Your Chart': 'మీ కుండలిలో ఏర్పడటం',
    'Benefits': 'ప్రయోజనాలు',
    'In Your Chart': 'మీ కుండలిలో',
    'Practices to Strengthen Yogas': 'యోగాలను బలపరచే అభ్యాసాలు',
    'Hidden Blessings': 'దాగి ఉన్న ఆశీర్వాదాలు',
    'Phase 1 — The Rising (Building Pressure)': 'దశ 1 — ఉదయం (ఒత్తిడి నిర్మాణం)',
    'Phase 2 — The Peak (Maximum Intensity)': 'దశ 2 — శిఖరం (గరిష్ట తీవ్రత)',
    'Phase 3 — The Setting (Harvest & Release)': 'దశ 3 — అస్తమయం (ఫలితం & విముక్తి)',
    'What to Expect': 'ఏమి ఆశించాలి',
    'Unique Opportunities': 'ప్రత్యేక అవకాశాలు',
    'Scriptural Reference': 'శాస్త్రీయ సూచన',
    'How It Works': 'ఇది ఎలా పని చేస్తుంది',
    'Scientific Basis': 'శాస్త్రీయ ఆధారం',
    'Quality Guidelines': 'నాణ్యత మార్గదర్శకాలు',
    'Cautions': 'జాగ్రత్తలు',
    'Wearing Instructions': 'ధరించే నిర్దేశాలు',
    'How to Verify Authenticity': 'ప్రామాణికతను ఎలా ధృవీకరించాలి',
    'Scriptural Source': 'శాస్త్రీయ మూలం',
    'Scriptural Basis': 'శాస్త్రీయ ఆధారం',
    'Scriptural Derivation': 'శాస్త్రీయ ఉత్పత్తి',
    'Overview': 'అవలోకనం',
    'Antardashas': 'అంతర్దశలు',
    'Interpretation': 'వ్యాఖ్యానం',
    // ── InfoRow labels — Career section ────────────────────────────────────────
    'Ideal Work Environment': 'ఆదర్శ పని వాతావరణం',
    'Is Switch Due Now?': 'ఇప్పుడు మార్పు అవసరమా?',
    'Next Switch Window': 'తదుపరి మార్పు సమయం',
    // ── InfoRow labels — Marriage section ────────────────────────────────────
    'Love Nature': 'ప్రేమ స్వభావం',
    'Marriage Prospects': 'వివాహ అవకాశాలు',
    'Attraction Style': 'ఆకర్షణ శైలి',
    'Physical Traits': 'భౌతిక లక్షణాలు',
    'Personality': 'వ్యక్తిత్వం',
    'Background': 'నేపథ్యం',
    'Meeting': 'కలయిక పరిస్థితి',
    'Applicability': 'వర్తింపు',
    'Ideal Age Range': 'ఆదర్శ వయస్సు పరిధి',
    'Ideal Time for Young Natives': 'యువ జాతకులకు ఆదర్శ సమయం',
    'Current Prospects': 'ప్రస్తుత అవకాశాలు',
    'Status Assumption': 'స్థితి అంచనా',
    // ── InfoRow labels — Birth details ──────────────────────────────────────
    'Name': 'పేరు',
    'Sex': 'లింగం',
    'Day': 'రోజు',
    'City': 'నగరం',
    'State': 'రాష్ట్రం',
    'Country': 'దేశం',
    'Latitude': 'అక్షాంశం',
    'Longitude': 'రేఖాంశం',
    'Timezone': 'సమయ మండలం',
    'Male': 'పురుషుడు',
    'Female': 'స్త్రీ',
    // ── InfoRow labels — Three Pillars ──────────────────────────────────────
    'Element': 'తత్వం',
    // ── InfoRow labels — Dasha section ──────────────────────────────────────
    'Starting Dasha': 'ప్రారంభ దశ',
    'Balance at Birth': 'జననంలో మిగిలిన',
    // ── InfoRow labels — Spiritual section ──────────────────────────────────
    'Dharma Path': 'ధర్మ మార్గం',
    'Liberation Path': 'మోక్ష మార్గం',
    'Style': 'శైలి',
    // ── InfoRow labels — Remedies section ────────────────────────────────────
    'Weight': 'బరువు',
    'Metal': 'లోహం',
    'Finger': 'వేలు',
    'Day to Wear': 'ధరించే రోజు',
    'Japa Count': 'జప సంఖ్య',
    'Pronunciation': 'ఉచ్చారణ',
    'Placement': 'ప్రతిష్ఠాపన',
    'Frequency': 'తరచుదనం',
    'Worship Method': 'పూజా విధానం',
    'Mantra': 'మంత్రం',
    'Temple Visit': 'దేవాలయ దర్శనం',
    'Favorable Colors': 'శుభ రంగులు',
    'Colors to Avoid': 'అశుభ రంగులు',
    'Favorable Directions': 'శుభ దిశలు',
    'Directions to Avoid': 'అశుభ దిశలు',
    'Sleep Direction': 'నిద్ర దిశ',
    'Work Direction': 'పని దిశ',
    // ── InfoRow labels — Numerology ─────────────────────────────────────────
    'Lucky Numbers': 'శుభ సంఖ్యలు',
    'Unlucky Numbers': 'అశుభ సంఖ్యలు',
    'Lucky Days': 'శుభ రోజులు',
    'Lucky Colors': 'శుభ రంగులు',
    // ── InfoRow labels — Raja Yogas ─────────────────────────────────────────
    'Activation Period': 'సక్రియ కాలం',
    'Activation': 'సక్రియం',
    'Strength': 'బలం',
    'Peak Period': 'శిఖర కాలం',
    'Recommended Gemstones': 'సిఫార్సు చేసిన రత్నాలు',
    // ── InfoRow labels — Sade Sati ──────────────────────────────────────────
    'Approximate Start': 'సుమారు ప్రారంభం',
    // ── InfoRow labels — Health ─────────────────────────────────────────────
    'Age Group Context': 'వయస్సు సందర్భం',
    // ── InfoRow labels — misc ───────────────────────────────────────────────
    'Rahu': 'రాహు',
    'Ketu': 'కేతు',
    'N/A': 'అందుబాటులో లేదు',
    'Career': 'వృత్తి',
    // ── InfoRow labels — (if available) birth data ──────────────────────────
    'Ishta (if available)': 'ఇష్ట (లభ్యమైతే)',
    'Sunrise (if available)': 'సూర్యోదయం (లభ్యమైతే)',
    'Sunset (if available)': 'సూర్యాస్తమయం (లభ్యమైతే)',
    'Local Mean Time (if available)': 'స్థానిక సగటు సమయం (లభ్యమైతే)',
    'Sidereal Time (if available)': 'నక్షత్ర సమయం (లభ్యమైతే)',
    'Tithi Ending Time (if available)': 'తిథి ముగింపు సమయం (లభ్యమైతే)',
    'Nakshatra Ending Time (if available)': 'నక్షత్ర ముగింపు సమయం (లభ్యమైతే)',
    // ── Thank You page ────────────────────────────────────────────────────────
    'THANK YOU': 'ధన్యవాదాలు',
    'Thank you for choosing Sri Mandir for your Kundli report. We hope this personalized Vedic astrology blueprint brings you clarity, guidance, and confidence on your life journey.': 'మీ కుండ్లీ రిపోర్ట్ కోసం శ్రీ మందిర్‌ను ఎంచుకున్నందుకు ధన్యవాదాలు. ఈ వ్యక్తిగత వైదిక జ్యోతిష్య రూపరేఖ మీ జీవన ప్రయాణంలో స్పష్టత, మార్గదర్శనం మరియు ఆత్మవిశ్వాసాన్ని అందిస్తుందని ఆశిస్తున్నాము.',
    'For personalized consultations with our expert astrologers': 'మా నిపుణ జ్యోతిష్యులతో వ్యక్తిగత సంప్రదింపుల కోసం',
    'May the stars guide your path': 'నక్షత్రాలు మీ మార్గాన్ని ప్రకాశింపజేయాలని కోరుకుంటున్నాము',
    // ── Hardcoded remedy intro paragraphs ──────────────────────────────────
    'Mantras are sacred sound vibrations that connect the practitioner to cosmic energies. The science of Mantra Shastra explains how specific sound frequencies can influence planetary energies and transform consciousness.': 'మంత్రాలు సాధకుడిని విశ్వ శక్తులతో అనుసంధానం చేసే పవిత్ర ధ్వని కంపనాలు. మంత్ర శాస్త్ర విజ్ఞానం నిర్దిష్ట ధ్వని ఆవృత్తులు గ్రహ శక్తులను ఎలా ప్రభావితం చేయగలవో మరియు చైతన్యాన్ని ఎలా మార్చగలవో వివరిస్తుంది.',
    'Rudraksha beads are sacred seeds from the Elaeocarpus ganitrus tree, revered for their spiritual and healing properties. Each Mukhi (face) of Rudraksha resonates with specific planetary energies.': 'రుద్రాక్ష పూసలు ఇలియోకార్పస్ గానిట్రస్ చెట్టు నుండి వచ్చే పవిత్ర విత్తనాలు, వాటి ఆధ్యాత్మిక మరియు వైద్య గుణాల కోసం పూజించబడతాయి. రుద్రాక్ష యొక్క ప్రతి ముఖి (ముఖం) నిర్దిష్ట గ్రహ శక్తులతో ప్రతిధ్వనిస్తుంది.',
    'Yantras are sacred geometric diagrams that serve as focal points for meditation and planetary propitiation. Each Yantra embodies specific cosmic energies through precise mathematical proportions.': 'యంత్రాలు ధ్యానం మరియు గ్రహ శాంతి కోసం కేంద్ర బిందువులుగా పనిచేసే పవిత్ర జ్యామితీయ చిత్రాలు. ప్రతి యంత్రం ఖచ్చితమైన గణిత అనుపాతాల ద్వారా నిర్దిష్ట విశ్వ శక్తులను మూర్తీభవిస్తుంది.',
    'Planetary Degree Matrix': 'గ్రహ అంశ సారణి',
  },
};

const PDF_UI_WORD_MAP: Record<'hi' | 'te', Record<string, string>> = {
  hi: {
    Report: 'रिपोर्ट',
    Birth: 'जन्म',
    Details: 'विवरण',
    Planetary: 'ग्रह',
    Positions: 'स्थितियां',
    Analysis: 'विश्लेषण',
    Career: 'कैरियर',
    Marriage: 'विवाह',
    Health: 'स्वास्थ्य',
    Remedies: 'उपाय',
    Degree: 'अंश',
    Sunrise: 'सूर्योदय',
    Sunset: 'सूर्यास्त',
    available: 'उपलब्ध',
    if: 'यदि',
    at: 'पर',
    Time: 'समय',
    Date: 'तिथि',
    Place: 'स्थान',
    Name: 'नाम',
    Status: 'स्थिति',
    Rasi: 'राशि',
    Speed: 'गति',
    Nak: 'नक्ष',
    Pad: 'पाद',
    Dignity: 'गरिमा',
    Retrograde: 'वक्री',
    Combust: 'अस्त',
    Pl: 'ग्रह',
    Transit: 'गोचर',
    Phase: 'चरण',
    Current: 'वर्तमान',
    Next: 'अगला',
    Past: 'पूर्व',
    Moon: 'चंद्र',
    Saturn: 'शनि',
    Sun: 'सूर्य',
    Jupiter: 'गुरु',
    Venus: 'शुक्र',
    Mercury: 'बुध',
    Mars: 'मंगल',
    Rahu: 'राहु',
    Ketu: 'केतु',
    Aries: 'मेष',
    Taurus: 'वृषभ',
    Gemini: 'मिथुन',
    Cancer: 'कर्क',
    Leo: 'सिंह',
    Virgo: 'कन्या',
    Libra: 'तुला',
    Scorpio: 'वृश्चिक',
    Sagittarius: 'धनु',
    Capricorn: 'मकर',
    Aquarius: 'कुंभ',
    Pisces: 'मीन',
    Monday: 'सोमवार',
    Tuesday: 'मंगलवार',
    Wednesday: 'बुधवार',
    Thursday: 'गुरुवार',
    Friday: 'शुक्रवार',
    Saturday: 'शनिवार',
    Sunday: 'रविवार',
    // Additional UI words
    Sign: 'राशि',
    House: 'भाव',
    Motion: 'गति',
    Direct: 'मार्गी',
    Placement: 'स्थान',
    Significance: 'महत्व',
    Influence: 'प्रभाव',
    Ascendant: 'लग्न',
    Nakshatra: 'नक्षत्र',
    Tithi: 'तिथि',
    Yoga: 'योग',
    Karana: 'करण',
    Pada: 'पाद',
    Deity: 'देवता',
    Element: 'तत्व',
    Lord: 'स्वामी',
    Occupants: 'स्थित ग्रह',
    Signification: 'कारकत्व',
    Karaka: 'कारक',
    Planet: 'ग्रह',
    Sex: 'लिंग',
    City: 'शहर',
    State: 'राज्य',
    Country: 'देश',
    Latitude: 'अक्षांश',
    Longitude: 'देशांतर',
    Timezone: 'समय क्षेत्र',
    Day: 'दिन',
    Personality: 'व्यक्तित्व',
    Aspect: 'दृष्टि',
    Mahadasha: 'महादशा',
    Antardasha: 'अंतर्दशा',
    Antardashas: 'अंतर्दशाएं',
    Predictions: 'भविष्यवाणी',
    Opportunities: 'अवसर',
    Challenges: 'चुनौतियां',
    Recommendations: 'सुझाव',
    Impact: 'प्रभाव',
    Spiritual: 'आध्यात्मिक',
    Growth: 'विकास',
    Financial: 'आर्थिक',
    Relationship: 'संबंध',
    Key: 'प्रमुख',
    Events: 'घटनाएं',
    Upcoming: 'आगामी',
    Definition: 'परिभाषा',
    Formation: 'निर्माण',
    Chart: 'कुंडली',
    Practices: 'अभ्यास',
    Strengthen: 'मजबूत करें',
    Hidden: 'छिपे',
    Blessings: 'आशीर्वाद',
    Rising: 'उदय',
    Peak: 'चरम',
    Setting: 'अवरोह',
    Pressure: 'दबाव',
    Building: 'निर्माण',
    Maximum: 'अधिकतम',
    Intensity: 'तीव्रता',
    Harvest: 'फसल',
    Release: 'मुक्ति',
    Expect: 'अपेक्षा',
    Avoid: 'परहेज',
    Unique: 'विशेष',
    Works: 'कार्य',
    Quality: 'गुणवत्ता',
    Guidelines: 'दिशानिर्देश',
    Cautions: 'सावधानियां',
    Wearing: 'धारण',
    Instructions: 'निर्देश',
    Verify: 'सत्यापन',
    Authenticity: 'प्रामाणिकता',
    Scriptural: 'शास्त्रीय',
    Source: 'स्रोत',
    Vibrational: 'कंपन',
    Science: 'विज्ञान',
    Proper: 'उचित',
    Method: 'विधि',
    Geometric: 'ज्यामितीय',
    Consecration: 'अभिषेक',
    Basis: 'आधार',
    Procedure: 'विधि',
    Derivation: 'व्युत्पत्ति',
    Physiological: 'शारीरिक',
    Benefits: 'लाभ',
    Vastu: 'वास्तु',
    Explanation: 'व्याख्या',
    Partner: 'जीवनसाथी',
    Qualities: 'गुण',
    How: 'कैसे',
    It: 'यह',
    What: 'क्या',
    to: 'को',
    // ── Nakshatra names ───────────────────────────────────────────────────
    Ashwini: 'अश्विनी',
    Bharani: 'भरणी',
    Krittika: 'कृत्तिका',
    Rohini: 'रोहिणी',
    Mrigashira: 'मृगशिरा',
    Ardra: 'आर्द्रा',
    Punarvasu: 'पुनर्वसु',
    Pushya: 'पुष्य',
    Ashlesha: 'आश्लेषा',
    Magha: 'मघा',
    Hasta: 'हस्त',
    Chitra: 'चित्रा',
    Swati: 'स्वाति',
    Vishakha: 'विशाखा',
    Anuradha: 'अनुराधा',
    Jyeshtha: 'ज्येष्ठा',
    Mula: 'मूल',
    Shravana: 'श्रवण',
    Dhanishta: 'धनिष्ठा',
    Shatabhisha: 'शतभिषा',
    Revati: 'रेवती',
    // ── Dignity terms ─────────────────────────────────────────────────────
    Exalted: 'उच्च',
    Debilitated: 'नीच',
    Mooltrikona: 'मूलत्रिकोण',
    Friendly: 'मित्र',
    Neutral: 'सम',
    Enemy: 'शत्रु',
    Own: 'स्वगृह',
    // ── Short sign abbreviations ──────────────────────────────────────────
    Ari: 'मेष',
    Tau: 'वृष',
    Gem: 'मिथ',
    Can: 'कर्क',
    Vir: 'कन्य',
    Lib: 'तुला',
    Sco: 'वृश्चि',
    Sag: 'धनु',
    Cap: 'मकर',
    Aqu: 'कुंभ',
    Pis: 'मीन',
    // ── Karaka type names ──────────────────────────────────────────────────
    Atmakaraka: 'आत्मकारक',
    Amatyakaraka: 'अमात्यकारक',
    Bhratrikaraka: 'भ्रातृकारक',
    Matrikaraka: 'मातृकारक',
    Putrakaraka: 'पुत्रकारक',
    Gnatikaraka: 'ज्ञातिकारक',
    Darakaraka: 'दारकारक',
    // ── Signification words ─────────────────────────────────────────────
    Self: 'स्वयं',
    soul: 'आत्मा',
    life: 'जीवन',
    purpose: 'उद्देश्य',
    ego: 'अहंकार',
    mind: 'मन',
    advisors: 'सलाहकार',
    Siblings: 'भाई-बहन',
    siblings: 'भाई-बहन',
    courage: 'साहस',
    efforts: 'प्रयास',
    Mother: 'माता',
    mother: 'माता',
    property: 'संपत्ति',
    emotions: 'भावनाएं',
    vehicles: 'वाहन',
    Children: 'संतान',
    children: 'संतान',
    creativity: 'रचनात्मकता',
    intelligence: 'बुद्धि',
    Enemies: 'शत्रु',
    enemies: 'शत्रु',
    diseases: 'रोग',
    debts: 'ऋण',
    obstacles: 'बाधाएं',
    partnerships: 'साझेदारी',
    spouse: 'जीवनसाथी',
    marriage: 'विवाह',
    // ── Common English words appearing in reports ────────────────────────
    Total: 'कुल',
    Detected: 'पाया गया',
    Overall: 'समग्र',
    Rating: 'रेटिंग',
    Severity: 'गंभीरता',
    Chart: 'कुंडली',
    image: 'चित्र',
    unavailable: 'अनुपलब्ध',
    section: 'खंड',
    // ── Misc ───────────────────────────────────────────────────────────────
    Empty: 'खाली',
    Nature: 'स्वभाव',
    Benefic: 'शुभ',
    Malefic: 'अशुभ',
    Active: 'सक्रिय',
    Inactive: 'निष्क्रिय',
    Present: 'उपस्थित',
    Absent: 'अनुपस्थित',
    Strong: 'बलवान',
    Weak: 'दुर्बल',
    High: 'उच्च',
    Medium: 'मध्यम',
    Low: 'निम्न',
  },
  te: {
    Report: 'నివేదిక',
    Birth: 'జనన',
    Details: 'వివరాలు',
    Planetary: 'గ్రహ',
    Positions: 'స్థితులు',
    Analysis: 'విశ్లేషణ',
    Career: 'వృత్తి',
    Marriage: 'వివాహం',
    Health: 'ఆరోగ్యం',
    Remedies: 'పరిహారాలు',
    Degree: 'డిగ్రీ',
    Sunrise: 'సూర్యోదయం',
    Sunset: 'సూర్యాస్తమయం',
    available: 'లభ్యం',
    if: 'యెడల',
    at: 'వద్ద',
    Time: 'సమయం',
    Date: 'తేదీ',
    Place: 'స్థలం',
    Name: 'పేరు',
    Status: 'స్థితి',
    Rasi: 'రాశి',
    Speed: 'వేగం',
    Nak: 'నక్ష',
    Pad: 'పాదం',
    Dignity: 'స్థితి బలం',
    Retrograde: 'వక్రీ',
    Combust: 'అస్త',
    Pl: 'గ్రహం',
    Transit: 'గోచారం',
    Phase: 'దశ',
    Current: 'ప్రస్తుత',
    Next: 'తదుపరి',
    Past: 'గత',
    Moon: 'చంద్ర',
    Saturn: 'శని',
    Sun: 'సూర్యుడు',
    Jupiter: 'గురు',
    Venus: 'శుక్రుడు',
    Mercury: 'బుధుడు',
    Mars: 'కుజుడు',
    Rahu: 'రాహు',
    Ketu: 'కేతు',
    Aries: 'మేషం',
    Taurus: 'వృషభం',
    Gemini: 'మిథునం',
    Cancer: 'కర్కాటకం',
    Leo: 'సింహం',
    Virgo: 'కన్య',
    Libra: 'తులా',
    Scorpio: 'వృశ్చికం',
    Sagittarius: 'ధనుస్సు',
    Capricorn: 'మకరం',
    Aquarius: 'కుంభం',
    Pisces: 'మీనం',
    // Additional UI words
    Sign: 'రాశి',
    House: 'భావం',
    Motion: 'గతి',
    Direct: 'నేరు',
    Placement: 'స్థానం',
    Significance: 'ప్రాముఖ్యత',
    Influence: 'ప్రభావం',
    Ascendant: 'లగ్నం',
    Nakshatra: 'నక్షత్రం',
    Tithi: 'తిథి',
    Yoga: 'యోగం',
    Karana: 'కరణం',
    Pada: 'పాదం',
    Deity: 'దేవత',
    Element: 'తత్వం',
    Lord: 'అధిపతి',
    Occupants: 'స్థిత గ్రహాలు',
    Signification: 'కారకత్వం',
    Karaka: 'కారకం',
    Planet: 'గ్రహం',
    Sex: 'లింగం',
    City: 'నగరం',
    State: 'రాష్ట్రం',
    Country: 'దేశం',
    Latitude: 'అక్షాంశం',
    Longitude: 'రేఖాంశం',
    Timezone: 'సమయ మండలం',
    Day: 'రోజు',
    Personality: 'వ్యక్తిత్వం',
    Aspect: 'దృష్టి',
    Mahadasha: 'మహాదశ',
    Antardasha: 'అంతర్దశ',
    Antardashas: 'అంతర్దశలు',
    Predictions: 'అంచనాలు',
    Opportunities: 'అవకాశాలు',
    Challenges: 'సవాళ్లు',
    Recommendations: 'సిఫార్సులు',
    Impact: 'ప్రభావం',
    Spiritual: 'ఆధ్యాత్మిక',
    Growth: 'వృద్ధి',
    Financial: 'ఆర్థిక',
    Relationship: 'సంబంధం',
    Key: 'ప్రధాన',
    Events: 'సంఘటనలు',
    Upcoming: 'రాబోయే',
    Definition: 'నిర్వచనం',
    Formation: 'నిర్మాణం',
    Chart: 'చార్ట్',
    Practices: 'సాధనలు',
    Strengthen: 'బలపరచడం',
    Hidden: 'దాచిన',
    Blessings: 'ఆశీర్వాదాలు',
    Unique: 'ప్రత్యేక',
    Avoid: 'నివారించండి',
    Quality: 'నాణ్యత',
    Guidelines: 'మార్గదర్శకాలు',
    Cautions: 'జాగ్రత్తలు',
    Wearing: 'ధరించు',
    Instructions: 'సూచనలు',
    Partner: 'భాగస్వామి',
    Qualities: 'లక్షణాలు',
    // ── Nakshatra names ───────────────────────────────────────────────────
    Ashwini: 'అశ్విని',
    Bharani: 'భరణి',
    Krittika: 'కృత్తిక',
    Rohini: 'రోహిణి',
    Mrigashira: 'మృగశిర',
    Ardra: 'ఆర్ద్ర',
    Punarvasu: 'పునర్వసు',
    Pushya: 'పుష్యమి',
    Ashlesha: 'ఆశ్లేష',
    Magha: 'మఘ',
    Hasta: 'హస్త',
    Chitra: 'చిత్త',
    Swati: 'స్వాతి',
    Vishakha: 'విశాఖ',
    Anuradha: 'అనురాధ',
    Jyeshtha: 'జ్యేష్ఠ',
    Mula: 'మూల',
    Shravana: 'శ్రవణం',
    Dhanishta: 'ధనిష్ఠ',
    Shatabhisha: 'శతభిషం',
    Revati: 'రేవతి',
    // ── Dignity terms ─────────────────────────────────────────────────────
    Exalted: 'ఉచ్చ',
    Debilitated: 'నీచ',
    Mooltrikona: 'మూలత్రికోణం',
    Friendly: 'మిత్ర',
    Neutral: 'సమ',
    Enemy: 'శత్రు',
    Own: 'స్వగృహం',
    // ── Short sign abbreviations ──────────────────────────────────────────
    Ari: 'మేషం',
    Tau: 'వృష',
    Gem: 'మిథు',
    Can: 'కర్కా',
    Vir: 'కన్య',
    Lib: 'తులా',
    Sco: 'వృశ్చి',
    Sag: 'ధనుస్సు',
    Cap: 'మకరం',
    Aqu: 'కుంభం',
    Pis: 'మీనం',
    // ── Karaka type names ──────────────────────────────────────────────────
    Atmakaraka: 'ఆత్మకారకం',
    Amatyakaraka: 'అమాత్యకారకం',
    Bhratrikaraka: 'భ్రాతృకారకం',
    Matrikaraka: 'మాతృకారకం',
    Putrakaraka: 'పుత్రకారకం',
    Gnatikaraka: 'జ్ఞాతికారకం',
    Darakaraka: 'దారకారకం',
    // ── Signification words ─────────────────────────────────────────────
    Self: 'ఆత్మ',
    soul: 'ఆత్మ',
    life: 'జీవితం',
    purpose: 'ఉద్దేశ్యం',
    ego: 'అహంకారం',
    mind: 'మనస్సు',
    advisors: 'సలహాదారులు',
    Siblings: 'తోబుట్టువులు',
    siblings: 'తోబుట్టువులు',
    courage: 'ధైర్యం',
    efforts: 'ప్రయత్నాలు',
    Mother: 'తల్లి',
    mother: 'తల్లి',
    property: 'ఆస్తి',
    emotions: 'భావాలు',
    vehicles: 'వాహనాలు',
    Children: 'పిల్లలు',
    children: 'పిల్లలు',
    creativity: 'సృజనాత్మకత',
    intelligence: 'బుద్ధి',
    Enemies: 'శత్రువులు',
    enemies: 'శత్రువులు',
    diseases: 'వ్యాధులు',
    debts: 'అప్పులు',
    obstacles: 'అడ్డంకులు',
    partnerships: 'భాగస్వామ్యాలు',
    spouse: 'భాగస్వామి',
    marriage: 'వివాహం',
    // ── Common English words appearing in reports ────────────────────────
    Total: 'మొత్తం',
    Detected: 'గుర్తించబడింది',
    Overall: 'మొత్తం',
    Rating: 'రేటింగ్',
    Severity: 'తీవ్రత',
    Chart: 'చార్ట్',
    image: 'చిత్రం',
    unavailable: 'అందుబాటులో లేదు',
    section: 'విభాగం',
    // ── Misc ───────────────────────────────────────────────────────────────
    Empty: 'ఖాళీ',
    Nature: 'స్వభావం',
    Benefic: 'శుభ',
    Malefic: 'అశుభ',
    Active: 'సక్రియ',
    Inactive: 'నిష్క్రియ',
    Present: 'ఉన్నది',
    Absent: 'లేదు',
    Strong: 'బలవంతం',
    Weak: 'బలహీనం',
    High: 'ఉన్నత',
    Medium: 'మధ్యమ',
    Low: 'తక్కువ',
  },
};

const DISCLAIMER_CONTENT: Record<'en' | 'hi' | 'te', { title: string; paragraphs: string[] }> = {
  en: {
    title: 'Disclaimer',
    paragraphs: [
      'This report is created using principles of Vedic astrology and is meant to offer guidance and self-understanding, not fixed predictions. Astrology is a rich and interpretive science, and insights may vary across astrologers, systems, and traditions.',
      'The purpose of this report is to help you gain clarity and awareness, so you can make more informed choices in life. It is not a substitute for medical, legal, financial, or professional advice, and important decisions should always be made with the support of qualified experts.',
      'Any remedies or spiritual suggestions mentioned — such as mantras, practices, or donations — are completely optional. Please follow only what feels right to you. Their impact can differ from person to person and depends on belief, intention, and consistent practice. No outcomes are guaranteed.',
      'Your life path is shaped by your own choices. This report is a tool for reflection and growth, and the author is not responsible for actions taken or results experienced based on its content. The content of this report may be updated or refined over time.',
      'Read this report with an open heart and a grounded mind — the universe may guide you, but you always remain in control of your journey.',
    ],
  },
  hi: {
    title: 'अस्वीकरण',
    paragraphs: [
      'यह रिपोर्ट वैदिक ज्योतिष के सिद्धांतों के आधार पर तैयार की गई है और इसका उद्देश्य मार्गदर्शन एवं आत्म-जागरूकता प्रदान करना है, न कि निश्चित भविष्यवाणियाँ करना। ज्योतिष एक समृद्ध एवं व्याख्यात्मक विद्या है, और विभिन्न ज्योतिषियों, पद्धतियों व परंपराओं के अनुसार व्याख्या भिन्न हो सकती है।',
      'इस रिपोर्ट का उद्देश्य आपको स्पष्टता और जागरूकता प्रदान करना है, ताकि आप जीवन में अधिक सूचित निर्णय ले सकें। यह चिकित्सा, कानूनी, वित्तीय या किसी अन्य पेशेवर सलाह का विकल्प नहीं है, और महत्वपूर्ण निर्णय हमेशा योग्य विशेषज्ञों के परामर्श से लिए जाने चाहिए।',
      'रिपोर्ट में उल्लिखित कोई भी उपाय या आध्यात्मिक सुझाव — जैसे मंत्र, साधना या दान — पूर्णतः वैकल्पिक हैं। कृपया वही अपनाएँ जो आपको उचित लगे। इनका प्रभाव व्यक्ति-व्यक्ति पर भिन्न हो सकता है और यह विश्वास, संकल्प एवं निरंतर अभ्यास पर निर्भर करता है। किसी भी परिणाम की गारंटी नहीं दी जाती।',
      'आपके जीवन की दिशा आपके अपने निर्णयों से तय होती है। यह रिपोर्ट आत्मचिंतन और विकास का एक साधन है, और इसकी विषय-वस्तु के आधार पर किए गए कार्यों या प्राप्त परिणामों के लिए लेखक उत्तरदायी नहीं है। इस रिपोर्ट की सामग्री को समय-समय पर अद्यतन या परिष्कृत किया जा सकता है।',
      'इस रिपोर्ट को खुले हृदय और स्थिर मन से पढ़ें — ब्रह्मांड आपका मार्गदर्शन कर सकता है, लेकिन आपकी यात्रा पर नियंत्रण सदैव आपका ही रहता है।',
    ],
  },
  te: {
    title: 'నిరాకరణ',
    paragraphs: [
      'ఈ నివేదిక వైదిక జ్యోతిష్యం యొక్క సూత్రాల ఆధారంగా రూపొందించబడింది మరియు మార్గదర్శనం మరియు ఆత్మ-అవగాహన అందించడానికి ఉద్దేశించబడింది, నిశ్చిత అంచనాలు కాదు. జ్యోతిష్యం ఒక సమృద్ధమైన మరియు వ్యాఖ్యానాత్మక శాస్త్రం, మరియు జ్యోతిష్యులు, పద్ధతులు మరియు సంప్రదాయాలను బట్టి అంతర్దృష్టులు మారవచ్చు.',
      'ఈ నివేదిక యొక్క ఉద్దేశ్యం మీకు స్పష్టత మరియు అవగాహన కల్పించడం, తద్వారా మీరు జీవితంలో మరింత సమాచారం ఆధారంగా నిర్ణయాలు తీసుకోగలరు. ఇది వైద్య, న్యాయ, ఆర్థిక లేదా వృత్తిపరమైన సలహాకు ప్రత్యామ్నాయం కాదు, మరియు ముఖ్యమైన నిర్ణయాలు ఎల్లప్పుడూ అర్హత గల నిపుణుల మద్దతుతో తీసుకోవాలి.',
      'పేర్కొన్న ఏదైనా ఆధ్యాత్మిక సూచనలు — మంత్రాలు, సాధనలు లేదా దానాలు — పూర్తిగా ఐచ్ఛికం. దయచేసి మీకు సరిగ్గా అనిపించేదే అనుసరించండి. వాటి ప్రభావం వ్యక్తికి వ్యక్తికి భిన్నంగా ఉంటుంది మరియు విశ్వాసం, సంకల్పం మరియు స్థిరమైన సాధనపై ఆధారపడి ఉంటుంది. ఎటువంటి ఫలితాలు హామీ ఇవ్వబడవు.',
      'మీ జీవిత మార్గం మీ స్వంత ఎంపికల ద్వారా రూపొందుతుంది. ఈ నివేదిక ఆత్మపరిశీలన మరియు ఎదుగుదల కోసం ఒక సాధనం, మరియు దాని కంటెంట్ ఆధారంగా తీసుకున్న చర్యలు లేదా అనుభవించిన ఫలితాలకు రచయిత బాధ్యత వహించరు. ఈ నివేదిక యొక్క కంటెంట్ కాలక్రమేణా నవీకరించబడవచ్చు.',
      'ఈ నివేదికను తెరిచిన హృదయంతో మరియు స్థిరమైన మనసుతో చదవండి — విశ్వం మీకు మార్గదర్శనం చేయవచ్చు, కానీ మీ ప్రయాణంపై నియంత్రణ ఎల్లప్పుడూ మీదే.',
    ],
  },
};

const GUIDANCE_CONTENT: Record<'en' | 'hi' | 'te', { title: string; paragraphs: string[] }> = {
  en: {
    title: 'Guidance for Your Journey Ahead',
    paragraphs: [
      'This Kundli report brings together insights from Vedic astrology to help you better understand the influences shaping your life. By carefully exploring planetary patterns, karmic tendencies, and key life themes, the report offers perspective to support thoughtful and informed choices.',
      'At Sri Mandir, we believe guidance should be followed by meaningful support. Through our trusted network of temples and experienced astrologers, we provide access to authentic Vedic remedies such as energized Rudrakshas, gemstones, yantras, and detailed guided spiritual services — rooted in tradition and offered with care.',
      'If you feel uncertain or would like deeper clarity, you can connect with our certified expert astrologers through online consultations, tailored to your chart and current life phase.',
      'Your journey does not end with this report — it continues with awareness, faith, and conscious action.',
    ],
  },
  hi: {
    title: 'आपकी आगे की यात्रा के लिए मार्गदर्शन',
    paragraphs: [
      'यह कुंडली रिपोर्ट वैदिक ज्योतिष की अंतर्दृष्टि को एक साथ लाती है ताकि आप अपने जीवन को प्रभावित करने वाली शक्तियों को बेहतर समझ सकें। ग्रहों की स्थिति, कर्म प्रवृत्तियों और प्रमुख जीवन विषयों का सावधानीपूर्वक विश्लेषण करके, यह रिपोर्ट विचारशील और सूचित निर्णय लेने में सहायता प्रदान करती है।',
      'श्री मंदिर में हम मानते हैं कि मार्गदर्शन के बाद सार्थक सहयोग होना चाहिए। हमारे विश्वसनीय मंदिरों के नेटवर्क और अनुभवी ज्योतिषियों के माध्यम से, हम प्रामाणिक वैदिक उपाय प्रदान करते हैं — जैसे ऊर्जायुक्त रुद्राक्ष, रत्न, यंत्र और विस्तृत आध्यात्मिक सेवाएँ — जो परंपरा में निहित हैं और श्रद्धा के साथ प्रस्तुत की जाती हैं।',
      'यदि आप अनिश्चित महसूस करते हैं या अधिक स्पष्टता चाहते हैं, तो आप हमारे प्रमाणित विशेषज्ञ ज्योतिषियों से ऑनलाइन परामर्श के माध्यम से जुड़ सकते हैं, जो आपकी कुंडली और वर्तमान जीवन चरण के अनुसार अनुकूलित होता है।',
      'आपकी यात्रा इस रिपोर्ट के साथ समाप्त नहीं होती — यह जागरूकता, श्रद्धा और सचेत कर्म के साथ आगे बढ़ती रहती है।',
    ],
  },
  te: {
    title: 'మీ ముందున్న ప్రయాణానికి మార్గదర్శనం',
    paragraphs: [
      'ఈ కుండలి నివేదిక మీ జీవితాన్ని ప్రభావితం చేస్తున్న శక్తులను బాగా అర్థం చేసుకోవడానికి వైదిక జ్యోతిష్యం నుండి అంతర్దృష్టులను ఒకచోట చేర్చింది. గ్రహ స్థితులు, కర్మ ప్రవృత్తులు మరియు ముఖ్యమైన జీవిత అంశాలను జాగ్రత్తగా విశ్లేషించడం ద్వారా, ఆలోచనాత్మక మరియు సమాచారంతో కూడిన నిర్ణయాలకు మద్దతుగా ఈ నివేదిక దృక్పథాన్ని అందిస్తుంది.',
      'శ్రీ మందిర్‌లో, మార్గదర్శనం తర్వాత అర్థవంతమైన మద్దతు ఉండాలని మేము విశ్వసిస్తాము. మా విశ్వసనీయ దేవాలయాల నెట్‌వర్క్ మరియు అనుభవజ్ఞులైన జ్యోతిష్యుల ద్వారా, శక్తివంతమైన రుద్రాక్షలు, రత్నాలు, యంత్రాలు మరియు వివరమైన ఆధ్యాత్మిక సేవలు వంటి ప్రామాణిక వైదిక పరిహారాలను మేము అందిస్తాము — సంప్రదాయంలో పాతుకుపోయి, శ్రద్ధతో అందించబడతాయి.',
      'మీరు అనిశ్చితంగా అనిపించినా లేదా లోతైన స్పష్టత కోరుకుంటున్నా, మీ జాతకం మరియు ప్రస్తుత జీవిత దశకు అనుగుణంగా రూపొందించబడిన ఆన్‌లైన్ సంప్రదింపుల ద్వారా మా ప్రమాణీకృత నిపుణ జ్యోతిష్యులతో మీరు కనెక్ట్ అవ్వవచ్చు.',
      'మీ ప్రయాణం ఈ నివేదికతో ముగియదు — అది అవగాహన, విశ్వాసం మరియు చైతన్యవంతమైన చర్యతో కొనసాగుతుంది.',
    ],
  },
};

const applyLanguageTypography = (language: string | null | undefined) => {
  const code = String(language || 'en').toLowerCase();
  if (code.startsWith('hi')) {
    ACTIVE_PDF_LANGUAGE = 'hi';
    // GPOS/GDEF tables stripped from NotoSansDevanagari via fonttools to fix fontkit null-anchor crash.
    ACTIVE_PDF_FONT_FAMILY = 'NotoSansDevanagari';
    ACTIVE_PDF_BODY_FONT_SIZE = 11.2;
    ACTIVE_PDF_BODY_LINE_HEIGHT = 1.62;
    return;
  }
  if (code.startsWith('te')) {
    ACTIVE_PDF_LANGUAGE = 'te';
    // GPOS/GDEF tables stripped from NotoSansTelugu via fonttools to fix fontkit null-anchor crash.
    ACTIVE_PDF_FONT_FAMILY = 'NotoSansTelugu';
    ACTIVE_PDF_BODY_FONT_SIZE = 11.2;
    ACTIVE_PDF_BODY_LINE_HEIGHT = 1.62;
    return;
  }
  ACTIVE_PDF_LANGUAGE = 'en';
  ACTIVE_PDF_FONT_FAMILY = 'NotoSans';
  ACTIVE_PDF_BODY_FONT_SIZE = 10.5;
  ACTIVE_PDF_BODY_LINE_HEIGHT = 1.45;
};

const localizePdfUiText = (raw: string | null | undefined): string => {
  const input = sanitizeText(String(raw || ''));
  if (!input || ACTIVE_PDF_LANGUAGE === 'en') return input;

  const phraseMap = PDF_UI_PHRASE_MAP[ACTIVE_PDF_LANGUAGE];
  const wordMap = PDF_UI_WORD_MAP[ACTIVE_PDF_LANGUAGE];

  if (phraseMap[input]) return phraseMap[input];

  let output = input;
  const phraseEntries = Object.entries(phraseMap).sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of phraseEntries) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startBound = /^\w/.test(from) ? '\\b' : '';
    const endBound = /\w$/.test(from) ? '\\b' : '';
    const re = new RegExp(`${startBound}${escaped}${endBound}`, 'gi');
    output = output.replace(re, to);
  }

  for (const [from, to] of Object.entries(wordMap)) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\b${escaped}\\b`, 'gi');
    output = output.replace(re, to);
  }

  return output;
};

type SadeSatiPhaseKey = 'rising' | 'peak' | 'setting' | 'not_active';

const normalizeSadeSatiPhase = (raw: unknown): SadeSatiPhaseKey => {
  const text = String(raw || '').toLowerCase();
  if (text.includes('rising') || text.includes('12th')) return 'rising';
  if (text.includes('peak') || text.includes('over moon') || text.includes('1st')) return 'peak';
  if (text.includes('setting') || text.includes('2nd')) return 'setting';
  if (text.includes('not active') || text.includes('not currently active')) return 'not_active';
  return 'not_active';
};

const computeSadeSatiPhaseFromSigns = (moonSign: string, saturnSign: string): SadeSatiPhaseKey => {
  const moonIdx = SIGNS.indexOf(moonSign);
  const saturnIdx = SIGNS.indexOf(saturnSign);
  if (moonIdx < 0 || saturnIdx < 0) return 'not_active';
  const relative = (saturnIdx - moonIdx + 12) % 12;
  if (relative === 11) return 'rising';
  if (relative === 0) return 'peak';
  if (relative === 1) return 'setting';
  return 'not_active';
};

const phaseLabel = (phase: SadeSatiPhaseKey): string => {
  if (phase === 'rising') return localizePdfUiText('Rising Phase (12th from Moon)');
  if (phase === 'peak') return localizePdfUiText('Peak Phase (Over Moon)');
  if (phase === 'setting') return localizePdfUiText('Setting Phase (2nd from Moon)');
  return localizePdfUiText('Not Active');
};

const isSadeSatiDoshaName = (name: unknown, nameHindi?: unknown): boolean => {
  const full = `${String(name || '')} ${String(nameHindi || '')}`.toLowerCase();
  return full.includes('sade sati') || (full.includes('shani') && full.includes('sati'));
};

const parseYearLike = (value: unknown): number | null => {
  const n = Number(String(value ?? '').match(/\d{4}/)?.[0]);
  return Number.isFinite(n) ? n : null;
};

const addMonthsUtc = (year: number, monthIndex: number, delta: number): { year: number; monthIndex: number } => {
  const total = year * 12 + monthIndex + delta;
  const y = Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  return { year: y, monthIndex: m };
};

const styles = StyleSheet.create({
  page: {
    // CRITICAL: Page-level padding ensures ALL pages (including overflow/continuation)
    // respect the content safe area. Child View padding does NOT carry over on page breaks.
    paddingTop: 66,       // 14 (orange border) + 40 (header height) + 12 (gap below header)
    paddingBottom: 72,    // 14 (orange border) + 50 (footer height) + 8 (gap above footer)
    paddingLeft: 42,      // 14 (orange border) + 28 (content padding)
    paddingRight: 42,     // 14 (orange border) + 28 (content padding)
    fontFamily: 'DejaVuSans',
    lineHeight: 1.45,
    fontSize: 10.5,
    color: P.bodyText,
    backgroundColor: SRIMANDIR_ORANGE,
  },
  // ── Sri Mandir page template ─────────────────────────────
  pageWhitePanel: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    bottom: 14,
    backgroundColor: '#ffffff',
    borderRadius: 10,
  },
  sriMandirFooterBar: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    height: 50,
    backgroundColor: '#fff7ed',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderTopWidth: 1,
    borderTopColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  sriMandirBrandName: {
    fontSize: 9.2,
    fontWeight: 'bold',
    color: '#c2410c',
    letterSpacing: 0.5,
    marginBottom: 2,
    textAlign: 'center',
  },
  sriMandirTagline: {
    fontSize: 7.8,
    color: '#78350f',
    textAlign: 'center',
    lineHeight: 1.3,
  },
  sriMandirContact: {
    fontSize: 7.8,
    color: '#c2410c',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  fixedHeader: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    height: 40,
    backgroundColor: BRAND_HEADER_DARK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 20,
  },
  pageNumber: {
    position: 'absolute',
    bottom: 18,
    right: 20,
    fontSize: 8.5,
    color: '#c2410c',
    opacity: 0.6,
  },
  coverPage: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    minHeight: 841.89,
    fontFamily: 'DejaVuSans',
    backgroundColor: '#5c1d0c',
  },
  coverBackgroundLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  dividerPage: {
    padding: 0,
    fontFamily: 'DejaVuSans',
    backgroundColor: SRIMANDIR_ORANGE,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  coverTitle: {
    fontSize: 54,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
    textAlign: 'center',
    letterSpacing: 0.6,
  },
  coverSubtitle: {
    fontSize: 13,
    color: '#fbbf24',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.9,
  },
  coverName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff7ed',
    marginBottom: 10,
    textAlign: 'center',
  },
  coverDetails: {
    fontSize: 10.2,
    color: '#fde68a',
    textAlign: 'center',
    marginBottom: 5,
  },
  coverKicker: {
    fontSize: 24,
    color: '#ffffff',
    letterSpacing: 0.2,
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  coverMark: {
    fontSize: 46,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  coverMetaLabel: {
    fontSize: 8.4,
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 2,
  },
  coverFooterMeta: {
    fontSize: 11,
    color: '#fff7ed',
    textAlign: 'center',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  coverFooterBrand: {
    fontSize: 10.5,
    color: '#fde68a',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  coverBrandRow: {
    marginTop: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBrandLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  coverBrandText: {
    fontSize: 24,
    color: '#f3f4f6',
    fontWeight: 'bold',
  },
  coverDividerRow: {
    marginTop: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverDividerLine: {
    width: 145,
    height: 1,
    backgroundColor: '#fbbf24',
    opacity: 0.7,
  },
  coverDividerCenter: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: 'bold',
  },
  coverIdentityCard: {
    marginTop: 12,
    width: 430,
    backgroundColor: 'rgba(92, 29, 12, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.50)',
    borderRadius: 14,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 18,
  },
  coverInfoBlock: {
    width: '100%',
    alignItems: 'center',
    marginTop: 6,
  },
  coverInfoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  coverInfoLabel: {
    fontSize: 8.4,
    color: '#f59e0b',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginRight: 8,
  },
  coverInfoValue: {
    fontSize: 10.2,
    color: '#fde68a',
  },
  coverFooterWrap: {
    marginTop: 28,
    alignItems: 'center',
  },
  header: {
    fontSize: 16,
    fontWeight: 'bold',
    color: P.primary,
    marginBottom: 9,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: P.gold,
  },
  subHeader: {
    fontSize: 12.5,
    fontWeight: 'bold',
    color: P.secondary,
    marginTop: 10,
    marginBottom: 5,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: P.goldLight,
  },
  subSubHeader: {
    fontSize: 11.5,
    fontWeight: 'bold',
    color: P.primary,
    marginTop: 7,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 10.2,
    marginBottom: 5,
    textAlign: 'left',
    color: P.bodyText,
    lineHeight: 1.45,
  },
  // Body text — same as paragraph but no margin/justify (for inside cards, highlights, callouts)
  bodyText: {
    fontSize: 10.2,
    color: P.bodyText,
    lineHeight: 1.45,
  },
  // Small italic muted text — for scriptural refs, disclaimers, cautions
  scriptural: {
    fontSize: 9.5,
    fontStyle: 'normal',
    color: '#6b7280',
    marginTop: 3,
    lineHeight: 1.4,
  },
  // Bold label inside highlight/card
  boldLabel: {
    fontWeight: 'bold',
    fontSize: 10.5,
    color: P.bodyText,
    lineHeight: 1.45,
  },
  // Accent text (orange, for emphasis)
  accentText: {
    fontSize: 10.5,
    color: '#ea580c',
    lineHeight: 1.45,
  },
  // Caution/warning text
  cautionText: {
    fontSize: 10,
    color: '#dc2626',
    lineHeight: 1.45,
  },
  // Success/positive text
  successText: {
    fontSize: 10,
    color: '#059669',
    lineHeight: 1.45,
  },
  table: {
    width: '100%',
    marginVertical: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
    paddingVertical: 5,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
    paddingVertical: 5,
    backgroundColor: P.tableAlt,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: P.primary,
    paddingVertical: 6,
  },
  tableHeaderCell: {
    flex: 1,
    color: P.white,
    fontWeight: 'bold',
    fontSize: 10,
    paddingHorizontal: 6,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
    paddingHorizontal: 6,
    color: P.bodyText,
  },
  advancedTable: {
    width: '100%',
    marginTop: 6,
    borderWidth: 1,
    borderColor: P.lightBorder,
    borderRadius: 4,
    overflow: 'hidden',
  },
  advancedTableHeader: {
    flexDirection: 'row',
    backgroundColor: P.primary,
    paddingVertical: 5,
  },
  advancedTableHeaderCell: {
    fontSize: 8.2,
    color: P.white,
    fontWeight: 'bold',
    paddingHorizontal: 3,
    textAlign: 'center',
  },
  advancedTableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
    paddingVertical: 4,
  },
  advancedTableRowAlt: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
    paddingVertical: 4,
    backgroundColor: P.tableAlt,
  },
  advancedCellText: {
    fontSize: 7.6,
    lineHeight: 1.2,
    color: P.bodyText,
    textAlign: 'center',
    paddingHorizontal: 3,
  },
  tinyNote: {
    fontSize: 8.2,
    color: P.mutedText,
    marginTop: 4,
    lineHeight: 1.35,
  },
  card: {
    backgroundColor: P.cardBg,
    borderRadius: 5,
    padding: 12,
    marginVertical: 6,
    borderLeftWidth: 2,
    borderLeftColor: P.gold,
  },
  cardTitle: {
    fontSize: 11.2,
    fontWeight: 'bold',
    color: P.primary,
    marginBottom: 5,
  },
  // ── Professional info strip (replaces old pill badges) ────────
  infoStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: P.lightBorder,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  infoStripItem: {
    flex: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: P.lightBorder,
    alignItems: 'center',
  },
  infoStripLabel: {
    fontSize: 7.5,
    color: P.mutedText,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoStripValue: {
    fontSize: 9.5,
    color: P.primary,
    fontWeight: 'bold',
  },
  // Status badges — small, inline, for status indicators only
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  label: {
    width: 130,
    fontWeight: 'bold',
    color: P.primary,
    fontSize: 10,
  },
  value: {
    flex: 1,
    color: P.bodyText,
    fontSize: 10,
  },
  list: {
    marginLeft: 6,
    marginVertical: 5,
  },
  listItem: {
    marginBottom: 4,
  },
  bullet: {
    width: 15,
    color: P.gold,
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionBreak: {
    marginVertical: 14,
  },
  highlight: {
    backgroundColor: P.highlightBg,
    padding: 10,
    borderRadius: 3,
    marginVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: P.gold,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '48%',
    marginRight: '2%',
    marginBottom: 6,
  },
  stableTwoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stableCol: {
    width: '48%',
  },
  section: {
    marginBottom: 10,
  },
  chartContainer: {
    width: 240,
    height: 240,
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.lightBorder,
    borderRadius: 3,
    overflow: 'hidden',
  },
  chartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  chartItem: {
    width: '48%',
    marginBottom: 14,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: P.primary,
    marginBottom: 4,
    textAlign: 'center',
    width: '100%',
  },
  chartPurpose: {
    fontSize: 8,
    color: P.mutedText,
    textAlign: 'center',
    marginTop: 3,
    width: '100%',
    maxLines: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
    marginVertical: 8,
  },
  tocEntry: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
  },
  tocNumber: {
    width: 26,
    fontSize: 10.5,
    color: P.gold,
    fontWeight: 'bold',
  },
  tocTitle: {
    flex: 1,
    fontSize: 11.2,
    color: P.bodyText,
    fontWeight: 'bold',
  },
  tocSubtitle: {
    fontSize: 8.8,
    color: P.mutedText,
    marginLeft: 26,
    marginTop: -2,
    marginBottom: 3,
  },
  tocColumns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tocColumn: {
    width: '48%',
  },
  tocEntryCompact: {
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: P.lightBorder,
  },
  tocEntryCompactTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tocNumberCompact: {
    width: 22,
    fontSize: 9.8,
    color: P.gold,
    fontWeight: 'bold',
  },
  tocTitleCompact: {
    flex: 1,
    fontSize: 9.6,
    color: P.bodyText,
    fontWeight: 'bold',
    lineHeight: 1.2,
  },
  tocSubtitleCompact: {
    fontSize: 7.6,
    color: P.mutedText,
    marginLeft: 22,
    marginTop: 1,
    lineHeight: 1.25,
  },
  // ── Callout boxes ──────────────────────────────────────────
  calloutBox: {
    backgroundColor: '#fff7ed',
    borderRadius: 4,
    padding: 10,
    marginVertical: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
  },
  calloutTitle: {
    fontSize: 10.5,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  // ── Grid layout ─────────────────────────────────────────
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  // ── Nickname badge for houses ──────────────────────────────
  nicknameBadge: {
    backgroundColor: BRAND_HEADER_DARK,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  nicknameBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  nicknameFun: {
    fontSize: 9.5,
    color: P.mutedText,
    fontStyle: 'normal',
    marginBottom: 7,
  },
  // ── Section intro italic ────────────────────────────────────
  sectionIntro: {
    fontSize: 10.5,
    marginBottom: 6,
    fontStyle: 'normal',
    color: P.mutedText,
    lineHeight: 1.45,
    borderLeftWidth: 3,
    borderLeftColor: P.gold,
    paddingLeft: 10,
  },
  // ── Info/Success/Warning boxes ──────────────────────────────
  infoBox: {
    backgroundColor: '#fff7ed',
    padding: 10,
    borderRadius: 4,
    marginVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 4,
    marginVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#22c55e',
  },
  warningBox: {
    backgroundColor: '#fff7ed',
    padding: 10,
    borderRadius: 4,
    marginVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: '#f97316',
  },
  // ── Footer ────────────────────────────────────────────────
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: P.mutedText,
  },
  fixedHeaderTitle: {
    color: '#ffffff',
    fontSize: 9.2,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  fixedHeaderSection: {
    color: '#ffedd5',
    fontSize: 8.4,
    fontWeight: 'normal',
  },
  dividerKicker: {
    fontSize: 11,
    color: '#ffffff',
    letterSpacing: 2.2,
    marginBottom: 20,
    opacity: 0.85,
  },
  dividerTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 1.15,
  },
  dividerSubtitle: {
    fontSize: 11.2,
    color: '#fff7ed',
    textAlign: 'center',
    lineHeight: 1.4,
    opacity: 0.9,
  },
  dividerFooter: {
    fontSize: 8.8,
    color: '#ffffff',
    opacity: 0.75,
    letterSpacing: 0.3,
  },
});

// Helper components
const Section = ({
  title,
  children,
  wrap = true,
  keepWithNext = 72,
}: {
  title: string;
  children: React.ReactNode;
  wrap?: boolean;
  keepWithNext?: number;
}) => (
  <View style={styles.section} wrap={wrap}>
    <Text style={styles.header} minPresenceAhead={keepWithNext}>{localizePdfUiText(title)}</Text>
    {children}
  </View>
);

const SubSection = ({
  title,
  children,
  keepWithNext = 56,
}: {
  title: string;
  children: React.ReactNode;
  keepWithNext?: number;
}) => (
  <View>
    <Text style={styles.subHeader} minPresenceAhead={keepWithNext}>{localizePdfUiText(title)}</Text>
    {children}
  </View>
);

// Professional info strip — replaces colorful pill badges
const InfoStrip = ({ items }: { items: { label: string; value: string }[] }) => (
  <View style={styles.infoStrip}>
    {items.map((item, idx) => (
      <View key={idx} style={[styles.infoStripItem, idx === items.length - 1 && { borderRightWidth: 0 }]}>
        <Text style={styles.infoStripLabel}>{localizePdfUiText(item.label).toUpperCase()}</Text>
        <Text style={styles.infoStripValue}>{localizePdfUiText(item.value)}</Text>
      </View>
    ))}
  </View>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <View style={[styles.row, { marginBottom: 2 }]}>
    <Text style={styles.label}>{localizePdfUiText(label)}:</Text>
    <Text style={styles.value}>{localizePdfUiText(value)}</Text>
  </View>
);

const SriMandirFooter = () => (
  <View style={styles.sriMandirFooterBar} fixed>
    <Text style={styles.sriMandirBrandName}>{localizePdfUiText('SRI MANDIR')}</Text>
    <Text style={styles.sriMandirTagline}>
      {localizePdfUiText('Looking for detailed guidance on your birth chart? Speak to our expert astrologers today')}
    </Text>
    <Text style={styles.sriMandirContact}>
      {ACTIVE_PDF_LANGUAGE === 'hi'
        ? 'कॉल या व्हाट्सऐप: 080 711 74417'
        : ACTIVE_PDF_LANGUAGE === 'te'
          ? 'కాల్ లేదా వాట్సాప్: 080 711 74417'
          : 'Call or WhatsApp: 080 711 74417'}
    </Text>
  </View>
);

// Page wrapper (legacy - kept for cover page compatibility)
const PageWrapper = ({ children, style }: { children: React.ReactNode; style?: any }) => (
  <Page
    size="A4"
    style={[
      styles.page,
      { fontFamily: ACTIVE_PDF_FONT_FAMILY, fontSize: ACTIVE_PDF_BODY_FONT_SIZE, lineHeight: ACTIVE_PDF_BODY_LINE_HEIGHT },
      style,
    ]}
  >
    <View style={styles.pageWhitePanel} fixed />
    {children}
    <SriMandirFooter />
  </Page>
);

const ContentPage = ({ sectionName, children, pageKey }: { sectionName?: string; children: React.ReactNode; pageKey?: string | number }) => (
  <Page
    size="A4"
    style={[styles.page, { fontFamily: ACTIVE_PDF_FONT_FAMILY, fontSize: ACTIVE_PDF_BODY_FONT_SIZE, lineHeight: ACTIVE_PDF_BODY_LINE_HEIGHT }]}
    key={pageKey}
  >
    {/* Fixed elements use absolute positioning — they ignore page padding and repeat on every page */}
    <View style={styles.pageWhitePanel} fixed />
    <View style={styles.fixedHeader} fixed>
      <Text style={styles.fixedHeaderTitle}>{localizePdfUiText('Sri Mandir Kundli Report')}</Text>
      {sectionName && <Text style={styles.fixedHeaderSection}>{localizePdfUiText(sectionName)}</Text>}
    </View>
    <SriMandirFooter />
    <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />
    {/* Children flow inside the Page's padding — this is respected on ALL pages including continuations */}
    {children}
  </Page>
);

const SectionDividerPage = ({ partNumber, title, subtitle }: { partNumber: string; title: string; subtitle: string }) => (
  <Page size="A4" style={[styles.dividerPage, { fontFamily: ACTIVE_PDF_FONT_FAMILY }]}>
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 60 }}>
      <Text style={styles.dividerKicker}>{localizePdfUiText(`PART ${partNumber}`)}</Text>
      <View style={{ width: 60, height: 2, backgroundColor: '#ffffff', marginBottom: 24, opacity: 0.6 }} />
      <Text style={styles.dividerTitle}>{localizePdfUiText(title)}</Text>
      <Text style={styles.dividerSubtitle}>{localizePdfUiText(subtitle)}</Text>
    </View>
    <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' }}>
      <Text style={styles.dividerFooter}>
        {ACTIVE_PDF_LANGUAGE === 'hi'
          ? 'श्री मंदिर — धर्म, कर्म, ज्योतिष'
          : ACTIVE_PDF_LANGUAGE === 'te'
            ? 'శ్రీ మందిర్ — ధర్మ, కర్మ, జ్యోతిష్యం'
            : 'Sri Mandir — Dharma, Karma, Jyotish'}
      </Text>
    </View>
  </Page>
);

const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.card}>
    <Text style={styles.cardTitle}>{localizePdfUiText(title)}</Text>
    {children}
  </View>
);

const BulletList = ({ items }: { items: string[] }) => (
  <View style={styles.list}>
    {items
      .map((item) => String(item ?? '').trim())
      .filter((item) => item.length > 0)
      .map((item, idx) => (
        <View key={idx} style={{ flexDirection: 'row', marginBottom: 3, alignItems: 'flex-start' }} wrap={false}>
          <Text style={styles.bullet}>•</Text>
          <Text style={[styles.bodyText, { flex: 1 }]}>{localizePdfUiText(item)}</Text>
        </View>
      ))}
  </View>
);

// SVG Parser - converts SVG string to react-pdf components
const normalizeSvgCoordinate = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text) return undefined;
  const firstToken = text.split(/[,\s]+/).find(Boolean);
  if (!firstToken) return undefined;
  const parsed = Number(firstToken);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseSvgElement = (element: Element, key: number): React.ReactNode | null => {
  const tagName = element.tagName.toLowerCase();
  const attrs: Record<string, any> = {};
  
  // Convert attributes
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    let name = attr.name;
    let value: string | number = attr.value;
    
    // Convert kebab-case to camelCase
    name = name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    
    // Skip class and style (we handle these separately)
    if (name === 'class' || name === 'className') continue;
    
    // Convert numeric values
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      value = parseFloat(value);
    }
    
    attrs[name] = value;
  }
  
  // Parse children
  const children: React.ReactNode[] = [];
  for (let i = 0; i < element.children.length; i++) {
    const child = parseSvgElement(element.children[i], i);
    if (child) children.push(child);
  }
  
  // Handle text content
  if (element.children.length === 0 && element.textContent) {
    const textContent = normalizeChartLabel(element.textContent);
    if (textContent && (tagName === 'text' || tagName === 'tspan')) {
      children.push(textContent);
    }
  }
  
  // Map to react-pdf SVG components - cast to any to bypass strict prop requirements
  switch (tagName) {
    case 'svg':
      return <Svg key={key} {...(attrs as any)}>{children}</Svg>;
    case 'g':
      return <G key={key} {...(attrs as any)}>{children}</G>;
    case 'path':
      if (!attrs.d) return null;
      return <Path key={key} {...(attrs as any)} />;
    case 'rect':
      return <Rect key={key} width={attrs.width || 0} height={attrs.height || 0} {...(attrs as any)} />;
    case 'circle':
      return <Circle key={key} r={attrs.r || 0} {...(attrs as any)} />;
    case 'ellipse':
      return <Ellipse key={key} rx={attrs.rx || 0} ry={attrs.ry || 0} {...(attrs as any)} />;
    case 'line':
      return <Line key={key} x1={attrs.x1 || 0} x2={attrs.x2 || 0} y1={attrs.y1 || 0} y2={attrs.y2 || 0} {...(attrs as any)} />;
    case 'polygon':
      if (!attrs.points) return null;
      return <Polygon key={key} {...(attrs as any)} />;
    case 'text': {
      attrs.fontFamily = 'DejaVuSans';
      const safeX = normalizeSvgCoordinate(attrs.x);
      const safeY = normalizeSvgCoordinate(attrs.y);
      if (safeX !== undefined) attrs.x = safeX; else delete attrs.x;
      if (safeY !== undefined) attrs.y = safeY; else delete attrs.y;
      delete attrs.xCoordinate;
      delete attrs.yCoordinate;
      return <Text key={key} {...(attrs as any)}>{children}</Text>;
    }
    case 'tspan': {
      const tspanText = normalizeChartLabel(element.textContent || '');
      return tspanText || null;
    }
    case 'defs':
      return <Defs key={key}>{children}</Defs>;
    case 'clippath':
      if (!attrs.id) return null;
      return <ClipPath key={key} {...(attrs as any)}>{children}</ClipPath>;
    case 'lineargradient':
      if (!attrs.id) return null;
      return <LinearGradient key={key} {...(attrs as any)}>{children}</LinearGradient>;
    case 'radialgradient':
      if (!attrs.id) return null;
      return <RadialGradient key={key} {...(attrs as any)}>{children}</RadialGradient>;
    case 'stop':
      return <Stop key={key} offset={attrs.offset || '0%'} stopColor={attrs.stopColor || '#000'} {...(attrs as any)} />;
    default:
      return null;
  }
};

const SVGRenderer = ({ svgString, width = 232, height = 232 }: { svgString: string; width?: number; height?: number }) => {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = doc.querySelector('svg');
    
    if (!svgElement) {
      throw new Error('No SVG element found');
    }
    
    // Set dimensions
    svgElement.setAttribute('width', String(width));
    svgElement.setAttribute('height', String(height));
    
    const parsed = parseSvgElement(svgElement, 0);
    return <>{parsed}</>;
  } catch (error) {
    console.error('[SVGRenderer] Failed to parse SVG:', error);
    return (
      <View style={styles.chartContainer}>
        <Text style={{ color: '#6b7280', fontSize: 9, textAlign: 'center' }}>
          Chart available in web view
        </Text>
      </View>
    );
  }
};
interface ChartData {
  type: string;
  name: string;
  nameHindi: string;
  nameTelugu?: string;
  purpose: string;
  svg: string;
  dataUrl?: string | null;
}

interface KundliPDFProps {
  report: any; // Full KundliReport type
}

export const KundliPDFDocument = ({ report }: KundliPDFProps) => {
  applyLanguageTypography(report?.language);

  const parseBirthTime = (rawTime: unknown): { hour: number; minute: number } | null => {
    const input = String(rawTime ?? '').trim();
    if (!input) return null;

    const ampm = input.match(/\b(am|pm)\b/i)?.[1]?.toLowerCase();
    const cleaned = input.replace(/\s*(am|pm)\s*/i, '');
    const parts = cleaned.split(':').map((x) => Number(x));
    let hour = parts[0];
    const minute = parts.length > 1 ? parts[1] : 0;

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (ampm) {
      hour = hour % 12;
      if (ampm === 'pm') hour += 12;
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
  };

  const parseTimezoneOffset = (rawTz: unknown): number => {
    if (typeof rawTz === 'number' && Number.isFinite(rawTz)) return rawTz;
    const input = String(rawTz ?? '').trim();
    if (!input) return 5.5;

    const asNumber = Number(input);
    if (Number.isFinite(asNumber)) return asNumber;

    const m = input.match(/^([+-]?)(\d{1,2})(?::?(\d{2}))?$/);
    if (m) {
      const sign = m[1] === '-' ? -1 : 1;
      const hh = Number(m[2]);
      const mm = Number(m[3] || '0');
      if (Number.isFinite(hh) && Number.isFinite(mm)) return sign * (hh + mm / 60);
    }

    if (input === 'Asia/Kolkata') return 5.5;
    return 5.5;
  };

  const formatUtcOffset = (offsetHours: number): string => {
    const sign = offsetHours >= 0 ? '+' : '-';
    const abs = Math.abs(offsetHours);
    const hh = Math.floor(abs);
    const mm = Math.round((abs - hh) * 60);
    return `UTC${sign}${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  };

  const formatCoordinate = (value: unknown, axis: 'lat' | 'lon'): string => {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) return 'N/A';
    const abs = Math.abs(n).toFixed(4);
    if (axis === 'lat') return `${abs}° ${n >= 0 ? 'North' : 'South'}`;
    return `${abs}° ${n >= 0 ? 'East' : 'West'}`;
  };

  const getWeekday = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-IN', { weekday: 'long' });
  };

  const formatDegreeInSign = (sign: unknown, degree: unknown): string => {
    const signText = String(sign || '').trim();
    const deg = Number(degree);
    if (!signText || !Number.isFinite(deg)) return 'N/A';
    return `${signText} (${deg.toFixed(2)}°)`;
  };

  const parsePlaceDetails = (place: string, fallback: any) => {
    const parts = String(place || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    // Build a lat/lon fallback when no place text is available
    const lat = fallback?.latitude;
    const lon = fallback?.longitude;
    const hasCoords = lat != null && lon != null && (lat !== 0 || lon !== 0);
    const latNum = Number(lat);
    const lonNum = Number(lon);
    const latDir = latNum >= 0 ? 'N' : 'S';
    const lonDir = lonNum >= 0 ? 'E' : 'W';
    const latLonFallback = hasCoords
      ? `${Math.abs(latNum).toFixed(4)}°${latDir}, ${Math.abs(lonNum).toFixed(4)}°${lonDir}`
      : (ACTIVE_PDF_LANGUAGE === 'hi' ? 'उपलब्ध नहीं' : ACTIVE_PDF_LANGUAGE === 'te' ? 'అందుబాటులో లేదు' : 'N/A');
    const city = String(fallback?.city || parts[0] || latLonFallback);
    const state = String(fallback?.state || parts[1] || '');
    const country = String(fallback?.country || (parts.length > 2 ? parts.slice(2).join(', ') : ''));
    return { city, state, country };
  };

  const normalizeDegree360 = (degree: number): number => {
    const normalized = degree % 360;
    return normalized < 0 ? normalized + 360 : normalized;
  };

  const formatDmsFromSignDegree = (degreeInSign: number): string => {
    const d = Math.max(0, degreeInSign);
    const deg = Math.floor(d);
    const minutesRaw = (d - deg) * 60;
    const min = Math.floor(minutesRaw);
    const sec = Math.floor((minutesRaw - min) * 60);
    return `${String(deg).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const getNakshatraMeta = (degree: number) => {
    const normalized = normalizeDegree360(degree);
    const index = Math.floor(normalized / NAKSHATRA_SPAN);
    const nakshatra = NAKSHATRAS[Math.max(0, Math.min(26, index))];
    const degreeInNakshatra = normalized % NAKSHATRA_SPAN;
    const pada = Math.floor(degreeInNakshatra / NAKSHATRA_PADA_SPAN) + 1;
    return {
      name: nakshatra?.name || 'N/A',
      lord: nakshatra?.lord || 'N/A',
      number: index + 1,
      pada: Math.max(1, Math.min(4, pada)),
      degreeInNakshatra,
    };
  };

  const getKpSubLord = (nakshatraLord: string, degreeInNakshatra: number): string => {
    const startIdx = DASHA_ORDER.indexOf(nakshatraLord);
    if (startIdx < 0) return 'N/A';

    const totalSpan = NAKSHATRA_SPAN;
    let accumulated = 0;
    for (let i = 0; i < 9; i++) {
      const lord = DASHA_ORDER[(startIdx + i) % 9];
      const part = (DASHA_YEARS[lord] / 120) * totalSpan;
      accumulated += part;
      if (degreeInNakshatra <= accumulated + 1e-9) return lord;
    }
    return DASHA_ORDER[(startIdx + 8) % 9];
  };

  const getCombustFlag = (planetName: string, planetDegree: number, sunDegree: number): boolean => {
    const thresholds: Record<string, number> = {
      Moon: 12,
      Mars: 17,
      Mercury: 14,
      Jupiter: 11,
      Venus: 10,
      Saturn: 15,
    };
    const threshold = thresholds[planetName];
    if (!threshold) return false;
    const delta = Math.abs(((planetDegree - sunDegree + 540) % 360) - 180);
    return delta <= threshold;
  };

  const getDignityLabel = (planetName: string, signIdx: number): string => {
    const exaltation: Record<string, number> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 1, Ketu: 7 };
    const debilitation: Record<string, number> = { Sun: 6, Moon: 7, Mars: 3, Mercury: 11, Jupiter: 9, Venus: 5, Saturn: 0, Rahu: 7, Ketu: 1 };
    const ownSigns: Record<string, number[]> = {
      Sun: [4], Moon: [3], Mars: [0, 7], Mercury: [2, 5], Jupiter: [8, 11], Venus: [1, 6], Saturn: [9, 10], Rahu: [10], Ketu: [7],
    };
    const friends: Record<string, string[]> = {
      Sun: ['Moon', 'Mars', 'Jupiter'],
      Moon: ['Sun', 'Mercury'],
      Mars: ['Sun', 'Moon', 'Jupiter'],
      Mercury: ['Sun', 'Venus'],
      Jupiter: ['Sun', 'Moon', 'Mars'],
      Venus: ['Mercury', 'Saturn'],
      Saturn: ['Mercury', 'Venus'],
      Rahu: ['Mercury', 'Venus', 'Saturn'],
      Ketu: ['Mars', 'Venus', 'Saturn'],
    };
    const enemies: Record<string, string[]> = {
      Sun: ['Saturn', 'Venus'],
      Moon: [],
      Mars: ['Mercury'],
      Mercury: ['Moon'],
      Jupiter: ['Mercury', 'Venus'],
      Venus: ['Sun', 'Moon'],
      Saturn: ['Sun', 'Moon', 'Mars'],
      Rahu: ['Sun', 'Moon', 'Mars'],
      Ketu: ['Sun', 'Moon'],
    };

    if (exaltation[planetName] === signIdx) return 'Exalted';
    if (debilitation[planetName] === signIdx) return 'Debilitated';
    if (ownSigns[planetName]?.includes(signIdx)) return 'Own';
    const signLord = SIGN_LORDS[signIdx] || '';
    if (friends[planetName]?.includes(signLord)) return 'Friendly';
    if (enemies[planetName]?.includes(signLord)) return 'Enemy';
    return 'Neutral';
  };

  const getVedicRoot = (raw: any) => {
    if (!raw) return null;
    if (raw?.vedic_horoscope) return raw;
    if (raw?.data?.vedic_horoscope) return raw.data;
    if (raw?.data?.data?.vedic_horoscope) return raw.data.data;
    return null;
  };

  const vedicRoot = getVedicRoot(report?.seerRawResponse);
  const rawPlanets = Array.isArray(vedicRoot?.vedic_horoscope?.planets_position)
    ? vedicRoot.vedic_horoscope.planets_position
    : [];
  const rawAstroDetails = vedicRoot?.vedic_horoscope?.astro_details || {};

  const resolveRawPlanet = (name: string) => {
    const nameMap: Record<string, string[]> = {
      Asc: ['लग्न', 'Asc'],
      Sun: ['सूर्य', 'Sun'],
      Moon: ['चन्द्र', 'Moon'],
      Mars: ['मंगल', 'Mars'],
      Mercury: ['बुध', 'Mercury'],
      Jupiter: ['गुरु', 'Jupiter'],
      Venus: ['शुक्र', 'Venus'],
      Saturn: ['शनि', 'Saturn'],
      Rahu: ['राहु', 'Rahu'],
      Ketu: ['केतु', 'Ketu'],
    };
    const aliases = nameMap[name] || [name];
    return rawPlanets.find((p: any) => aliases.includes(String(p?.name || '').trim()));
  };

  const resolveSpeed = (name: string): string => {
    const rawPlanet = resolveRawPlanet(name);
    if (!rawPlanet) return 'N/A';
    const candidates = [
      rawPlanet.speed,
      rawPlanet.planet_speed,
      rawPlanet.motion_speed,
      rawPlanet.gati,
      rawPlanet.daily_motion,
    ];
    const speedVal = candidates.find((v) => v !== undefined && v !== null && String(v).trim() !== '');
    return speedVal ? String(speedVal) : 'N/A';
  };

  const pickAstroValue = (...keys: string[]): string => {
    for (const key of keys) {
      const value = rawAstroDetails?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') return String(value);
    }
    return 'N/A';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return String(dateStr || '');
    if (ACTIVE_PDF_LANGUAGE === 'en') {
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const months = MONTH_NAMES_BY_LANGUAGE[ACTIVE_PDF_LANGUAGE] || MONTH_NAMES_BY_LANGUAGE.en;
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };
  const formatBirthDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    if (ACTIVE_PDF_LANGUAGE === 'en') {
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    const months = MONTH_NAMES_BY_LANGUAGE[ACTIVE_PDF_LANGUAGE] || MONTH_NAMES_BY_LANGUAGE.en;
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };
  const formatMonthYear = (date: Date) =>
    date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const normalizeDashaToken = (value: unknown, which: "first" | "last" = "first") => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const parts = raw.split('/').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) return raw;
    return which === "first" ? parts[0] : parts[parts.length - 1];
  };

  const formatDashaPair = (mahadasha: unknown, antardasha: unknown) => {
    const md = normalizeDashaToken(mahadasha, 'first');
    const ad = normalizeDashaToken(antardasha, 'last');
    if (md && ad) return `${md}/${ad}`;
    return md || ad || 'N/A';
  };

  // Frontend safety-net: recompute Dasha timeline deterministically from Moon degree + birth details.
  // This prevents stale/wrong backend values from leaking into final PDF.
  const dashaTruth = React.useMemo(() => {
    try {
      const moon = report?.planetaryPositions?.find((p: any) => p?.name === 'Moon');
      const moonDegreeRaw = parseFloat(String(moon?.degree ?? ""));
      if (!Number.isFinite(moonDegreeRaw)) return null;

      const signToIdx: Record<string, number> = {
        Aries: 0, Taurus: 1, Gemini: 2, Cancer: 3, Leo: 4, Virgo: 5,
        Libra: 6, Scorpio: 7, Sagittarius: 8, Capricorn: 9, Aquarius: 10, Pisces: 11,
      };

      let moonDegree = moonDegreeRaw;
      if (moonDegree <= 30 && typeof moon.sign === 'string' && moon.sign in signToIdx) {
        moonDegree = signToIdx[moon.sign] * 30 + moonDegree;
      }

      const birthDateRaw = report?.birthDetails?.dateOfBirth;
      const birthTimeRaw = report?.birthDetails?.timeOfBirth || '12:00';
      if (!birthDateRaw || typeof birthDateRaw !== 'string') return null;

      const [year, month, day] = birthDateRaw.split('-').map((n: string) => Number(n));
      const parsedTime = parseBirthTime(birthTimeRaw);
      if (!parsedTime) return null;
      const { hour, minute } = parsedTime;
      const tz = parseTimezoneOffset(report?.birthDetails?.timezone);

      if ([year, month, day, hour, minute].some((n) => Number.isNaN(n))) return null;

      const birthUtcMs = Date.UTC(year, month - 1, day, hour, minute) - tz * 60 * 60 * 1000;
      const birthDate = new Date(birthUtcMs);
      const now = report?.generatedAt ? new Date(report.generatedAt) : new Date();

      const DASHA_YEARS: Record<string, number> = {
        Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16,
        Saturn: 19, Mercury: 17, Ketu: 7, Venus: 20,
      };
      const DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
      const NAKSHATRA_LORDS = [
        "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
        "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury",
        "Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"
      ];
      const MS_PER_DAY = 24 * 60 * 60 * 1000;
      const DAYS_PER_YEAR = 365.25;
      const addYears = (d: Date, y: number) => new Date(d.getTime() + y * DAYS_PER_YEAR * MS_PER_DAY);

      const nakshatraSpan = 360 / 27;
      const nakshatraIdx = Math.floor(moonDegree / nakshatraSpan);
      const startLord = NAKSHATRA_LORDS[nakshatraIdx];
      const progress = (moonDegree % nakshatraSpan) / nakshatraSpan;
      const balanceYears = DASHA_YEARS[startLord] * (1 - progress);

      let cursor = new Date(birthDate);
      let dashaIndex = DASHA_ORDER.indexOf(startLord);
      let firstDasha = true;
      let mahadasha = startLord;
      let mdStart = new Date(birthDate);
      let mdEnd = new Date(birthDate);

      while (cursor < now) {
        const years = firstDasha ? balanceYears : DASHA_YEARS[DASHA_ORDER[dashaIndex]];
        mahadasha = DASHA_ORDER[dashaIndex];
        mdStart = new Date(cursor);
        mdEnd = addYears(cursor, years);
        if (mdEnd > now) break;
        cursor = mdEnd;
        dashaIndex = (dashaIndex + 1) % 9;
        firstDasha = false;
      }

      const mdDuration = mdEnd.getTime() - mdStart.getTime();
      const elapsedInMd = now.getTime() - mdStart.getTime();
      const mdProgress = elapsedInMd / mdDuration;
      const mdYears = DASHA_YEARS[mahadasha];
      const adStartIdx = DASHA_ORDER.indexOf(mahadasha);

      let antardasha = mahadasha;
      let adStart = new Date(mdStart);
      let adEnd = new Date(mdStart);
      const adTimeline: Array<{ antardasha: string; startDate: Date; endDate: Date }> = [];
      let adProgress = 0;
      let antardashaResolved = false;

      for (let i = 0; i < 9; i++) {
        const adPlanet = DASHA_ORDER[(adStartIdx + i) % 9];
        const adYears = (DASHA_YEARS[adPlanet] * mdYears) / 120;
        const adRatio = adYears / mdYears;
        const start = new Date(mdStart.getTime() + adProgress * mdDuration);
        const end = new Date(mdStart.getTime() + (adProgress + adRatio) * mdDuration);
        adTimeline.push({ antardasha: adPlanet, startDate: start, endDate: end });
        if (!antardashaResolved && adProgress + adRatio > mdProgress) {
          antardasha = adPlanet;
          adStart = start;
          adEnd = end;
          antardashaResolved = true;
        }
        adProgress += adRatio;
      }

      const upcomingMahadashas: Array<{ planet: string; startDate: Date; endDate: Date }> = [];
      let nextStart = mdEnd;
      let nextIdx = (DASHA_ORDER.indexOf(mahadasha) + 1) % 9;
      for (let i = 0; i < 3; i++) {
        const p = DASHA_ORDER[nextIdx];
        const s = new Date(nextStart);
        const e = addYears(s, DASHA_YEARS[p]);
        upcomingMahadashas.push({ planet: p, startDate: s, endDate: e });
        nextStart = e;
        nextIdx = (nextIdx + 1) % 9;
      }

      return {
        mahadasha,
        mdStart,
        mdEnd,
        antardasha,
        adStart,
        adEnd,
        adTimeline,
        mdTimeline: [{ planet: mahadasha, startDate: mdStart, endDate: mdEnd }, ...upcomingMahadashas],
        startLord,
        balanceYears,
      };
    } catch {
      return null;
    }
  }, [report]);

  const resolveMdDates = (planet: string, fallbackStart?: string, fallbackEnd?: string) => {
    if (!dashaTruth) return { start: fallbackStart || '', end: fallbackEnd || '' };
    const found = dashaTruth.mdTimeline.find(m => m.planet === planet);
    if (!found) return { start: fallbackStart || '', end: fallbackEnd || '' };
    return { start: formatMonthYear(found.startDate), end: formatMonthYear(found.endDate) };
  };

  const resolveAdDates = (planet: string, fallbackStart?: string, fallbackEnd?: string) => {
    if (!dashaTruth) return { start: fallbackStart || '', end: fallbackEnd || '' };
    const found = dashaTruth.adTimeline.find(a => a.antardasha === planet);
    if (!found) return { start: fallbackStart || '', end: fallbackEnd || '' };
    return { start: formatMonthYear(found.startDate), end: formatMonthYear(found.endDate) };
  };

  const charts: ChartData[] = report.charts || [];
  const birthDetails = report?.birthDetails || {};
  const placeDetails = parsePlaceDetails(birthDetails.placeOfBirth || '', birthDetails);
  const timezoneOffset = parseTimezoneOffset(birthDetails.timezone);
  const timezoneText = typeof birthDetails.timezone === 'string' && birthDetails.timezone.includes('/')
    ? `${birthDetails.timezone} (${formatUtcOffset(timezoneOffset)})`
    : formatUtcOffset(timezoneOffset);
  const genderRaw = String(birthDetails.gender || '').toUpperCase();
  const sex = genderRaw === 'F' || genderRaw === 'FEMALE'
    ? (ACTIVE_PDF_LANGUAGE === 'hi' ? 'महिला' : ACTIVE_PDF_LANGUAGE === 'te' ? 'స్త్రీ' : 'Female')
    : genderRaw === 'O' || genderRaw === 'OTHER'
      ? (ACTIVE_PDF_LANGUAGE === 'hi' ? 'अन्य' : ACTIVE_PDF_LANGUAGE === 'te' ? 'ఇతర' : 'Other')
      : genderRaw === 'M' || genderRaw === 'MALE'
        ? (ACTIVE_PDF_LANGUAGE === 'hi' ? 'पुरुष' : ACTIVE_PDF_LANGUAGE === 'te' ? 'పురుషుడు' : 'Male')
        : (ACTIVE_PDF_LANGUAGE === 'hi' ? 'उपलब्ध नहीं' : ACTIVE_PDF_LANGUAGE === 'te' ? 'లభ్యం కాదు' : 'N/A');
  const birthDateValue = String(birthDetails.dateOfBirth || '');
  const sunPosition = report?.planetaryPositions?.find((planet: any) => planet?.name === 'Sun');
  const tithiName = report?.panchang?.tithi?.name || 'N/A';
  const tithiPaksha = report?.panchang?.tithi?.paksha || '';
  const nakshatraName = report?.panchang?.nakshatra?.name || 'N/A';
  const nakshatraPada = report?.panchang?.nakshatra?.pada;
  const yogaName = report?.panchang?.yoga?.name || 'N/A';
  const karanaName = report?.panchang?.karana?.name || 'N/A';
  const parsedBirthTime = parseBirthTime(birthDetails.timeOfBirth);
  const birthUtcDate = (() => {
    if (!birthDateValue || !parsedBirthTime) return null;
    const [y, m, d] = birthDateValue.split('-').map((x) => Number(x));
    if ([y, m, d].some((n) => Number.isNaN(n))) return null;
    const utcMs = Date.UTC(y, m - 1, d, parsedBirthTime.hour, parsedBirthTime.minute) - timezoneOffset * 60 * 60 * 1000;
    return new Date(utcMs);
  })();
  const lahiriAyanamsha = birthUtcDate
    ? (() => {
        const jd = birthUtcDate.getTime() / 86400000 + 2440587.5;
        const t = (jd - 2451545.0) / 36525;
        return 23.85 + 0.013848 * t * 100;
      })()
    : null;
  const ayanamshaText = pickAstroValue('ayanamsha', 'lahiri_ayanamsha') !== 'N/A'
    ? pickAstroValue('ayanamsha', 'lahiri_ayanamsha')
    : (lahiriAyanamsha ? `${lahiriAyanamsha.toFixed(4)}°` : 'N/A');

  const planetProfileMap = new Map(
    Array.isArray(report?.planets)
      ? report.planets.map((p: any) => [String(p?.planet || ''), p] as const)
      : []
  );
  const sunDegreeAbsolute = Number(sunPosition?.degree);
  const detailedPlanetRows = [
    {
      name: 'Asc',
      sign: report?.ascendant?.sign,
      house: 1,
      degree: Number(report?.ascendant?.degree),
      isRetro: false,
    },
    ...(Array.isArray(report?.planetaryPositions) ? report.planetaryPositions : []),
  ]
    .filter((p: any) => p?.name && Number.isFinite(Number(p?.degree)))
    .map((p: any) => {
      const name = String(p.name);
      const sign = String(p.sign || '');
      const signIdx = SIGN_TO_INDEX[sign];
      const degreeAbs = Number(p.degree);
      const degreeInSign = signIdx !== undefined ? normalizeDegree360(degreeAbs) - signIdx * 30 : degreeAbs % 30;
      const nak = getNakshatraMeta(degreeAbs);
      const profile: any = planetProfileMap.get(name);
      const isRetro = Boolean(p.isRetro || profile?.isRetrograde);
      const isCombust = Number.isFinite(sunDegreeAbsolute)
        ? getCombustFlag(name, degreeAbs, sunDegreeAbsolute)
        : false;
      const signLord = signIdx !== undefined ? SIGN_LORDS[signIdx] : 'N/A';
      const nakLord = profile?.nakshatraLord || nak.lord;
      const compactCellValue = (value: unknown): string => {
        const text = sanitizeText(String(value || ''));
        if (!text) return 'N/A';
        return text.split('(')[0].trim() || 'N/A';
      };
      return {
        name,
        signShort: SIGN_SHORT[sign] || sign || 'N/A',
        degreeText: formatDmsFromSignDegree(Math.max(0, degreeInSign)),
        speed: resolveSpeed(name),
        nakshatra: compactCellValue(profile?.nakshatra || nak.name),
        pada: nak.pada,
        nakNo: nak.number,
        rashiLord: signLord || 'N/A',
        nakLord: nakLord || 'N/A',
        subLord: getKpSubLord(nak.lord, nak.degreeInNakshatra),
        dignity: compactCellValue(profile?.dignity || (signIdx !== undefined ? getDignityLabel(name, signIdx) : 'N/A')),
        retro: isRetro ? 'R' : '',
        combust: isCombust ? 'C' : '',
      };
    });

  const moonPlanet = report?.planetaryPositions?.find((planet: any) => planet?.name === 'Moon');
  const sadeSatiMoonSign = String(report?.sadeSati?.moonSign || moonPlanet?.sign || 'N/A');
  const sadeSatiTransitSign = String(report?.sadeSati?.saturnSign || SATURN_TRANSIT_FALLBACK_SIGN);
  const sadeSatiPhaseFromSigns = computeSadeSatiPhaseFromSigns(sadeSatiMoonSign, sadeSatiTransitSign);
  const sadeSatiPhaseFromText = normalizeSadeSatiPhase(report?.sadeSati?.currentPhase || report?.sadeSati?.phase);
  const sadeSatiPhase = sadeSatiPhaseFromSigns !== 'not_active' || sadeSatiPhaseFromText === 'not_active'
    ? sadeSatiPhaseFromSigns
    : sadeSatiPhaseFromText;
  const sadeSatiIsActive = sadeSatiPhase !== 'not_active';
  const sadeSatiCurrentPhaseLabel = phaseLabel(sadeSatiPhase);

  const originalMajorDoshas = Array.isArray(report?.doshas?.majorDoshas) ? report.doshas.majorDoshas : [];
  const originalMinorDoshas = Array.isArray(report?.doshas?.minorDoshas) ? report.doshas.minorDoshas : [];
  const majorDoshasFiltered = originalMajorDoshas.filter((dosha: any) => !isSadeSatiDoshaName(dosha?.name, dosha?.nameHindi));
  const minorDoshasFiltered = originalMinorDoshas.filter((dosha: any) => !isSadeSatiDoshaName(dosha?.name, dosha?.nameHindi));
  const removedSadeSatiDoshaCount = (originalMajorDoshas.length - majorDoshasFiltered.length) + (originalMinorDoshas.length - minorDoshasFiltered.length);
  const doshaRemediesFiltered = Array.isArray(report?.doshas?.doshaRemedies)
    ? report.doshas.doshaRemedies.filter((r: any) => !isSadeSatiDoshaName(r?.doshaName))
    : [];
  const isDetectedDosha = (d: any) => {
    const status = String(d?.status || '').toLowerCase();
    return Boolean(d?.isPresent) || status === 'present' || status === 'partial' || status === 'nullified';
  };
  const doshaDisplayTotal = majorDoshasFiltered.filter(isDetectedDosha).length + minorDoshasFiltered.filter(isDetectedDosha).length;

  const generatedAtDate = report?.generatedAt ? new Date(report.generatedAt) : new Date();
  const fallbackSadeSatiStartYear = generatedAtDate.getFullYear() + (sadeSatiIsActive ? 0 : 1);
  const explicitSadeSatiStartYear =
    parseYearLike(report?.sadeSati?.startYear) ||
    parseYearLike(report?.sadeSati?.currentSadeSati?.period) ||
    parseYearLike(report?.sadeSati?.nextSadeSati?.approximateStart);
  const sadeSatiAnchorYear = explicitSadeSatiStartYear || fallbackSadeSatiStartYear;
  const sadeSatiPhasesForDisplay = (Array.isArray(report?.sadeSati?.phases) ? report.sadeSati.phases : []).map((phase: any, idx: number) => {
    const estimatedStart = addMonthsUtc(sadeSatiAnchorYear, 2, idx * 30); // March anchor, 30-month Saturn phase
    const estimatedEnd = addMonthsUtc(sadeSatiAnchorYear, 2, ((idx + 1) * 30) - 1);
    const startYear = parseYearLike(phase?.startYear) || estimatedStart.year;
    const endYear = parseYearLike(phase?.endYear) || estimatedEnd.year;
    const langMonths = MONTH_NAMES_BY_LANGUAGE[ACTIVE_PDF_LANGUAGE] || MONTH_NAMES_BY_LANGUAGE.en;
    const startMonth = sanitizeText(String(phase?.startMonth || langMonths[estimatedStart.monthIndex] || langMonths[2]));
    const endMonth = sanitizeText(String(phase?.endMonth || langMonths[estimatedEnd.monthIndex] || langMonths[7]));
    return {
      ...phase,
      startYear,
      endYear,
      startMonth,
      endMonth,
      periodLabel: ACTIVE_PDF_LANGUAGE === 'hi'
        ? `${startMonth} ${startYear} से ${endMonth} ${endYear}`
        : ACTIVE_PDF_LANGUAGE === 'te'
          ? `${startMonth} ${startYear} నుండి ${endMonth} ${endYear} వరకు`
          : `${startMonth} ${startYear} to ${endMonth} ${endYear}`,
    };
  });

  const tocEntries = [
    { num: '01', title: 'Birth Details & Planetary Positions', sub: 'Ascendant, planetary placements, Chara Karakas (Jaimini)' },
    { num: '02', title: 'Panchang Analysis', sub: 'Vaar, Tithi, Nakshatra, Yoga, Karana at birth' },
    { num: '03', title: 'Three Pillars of Your Chart', sub: 'Moon Sign, Ascendant, Birth Nakshatra' },
    { num: '04', title: 'Personal Planetary Profiles', sub: 'Detailed analysis of all 9 planets' },
    { num: '05', title: 'Bhavphal — The 12 Houses', sub: 'Complete house-by-house life analysis' },
    { num: '06', title: 'Career & Professional Life', sub: 'Career calling, wealth potential, suitable fields' },
    { num: '07', title: 'Love, Romance & Marriage', sub: 'Partner profile, marriage timing, compatibility' },
    { num: '08', title: 'Health & Well-Being', sub: 'Age-aware lifestyle guidance and preventive care focus' },
    { num: '09', title: 'Vimshottari Dasha Predictions', sub: 'Current & upcoming planetary periods' },
    { num: '10', title: 'Rahu–Ketu Karmic Axis', sub: 'Past karma, future direction, Kaal Sarp Yoga' },
    { num: '11', title: 'Raja Yogas & Auspicious Combinations', sub: 'Pancha Mahapurusha, Dhana Yogas and more' },
    { num: '12', title: 'Dosha Analysis', sub: 'Mangal Dosha, Kaal Sarp and other planetary afflictions' },
    { num: '13', title: 'Sade Sati — Saturn\'s 7.5-Year Transit', sub: 'Current status, phases, remedies' },
    { num: '14', title: 'Numerology Analysis', sub: 'Birth number, destiny number, personal year' },
    { num: '15', title: 'Spiritual Potential & Dharma', sub: 'Atmakaraka, Ishta Devata, Moksha path' },
    { num: '16', title: 'Vedic Remedies', sub: 'Gemstones, Rudraksha, Mantras, Yantras, Pujas' },
    { num: '17', title: 'Chara Karakas — Jaimini System', sub: 'Atmakaraka, Amatyakaraka, Darakaraka in depth' },
  ];
  const tocSplitIndex = Math.ceil(tocEntries.length / 2);
  const tocColumns = [tocEntries.slice(0, tocSplitIndex), tocEntries.slice(tocSplitIndex)];

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={[styles.coverPage, { fontFamily: ACTIVE_PDF_FONT_FAMILY }]}>
        <View style={styles.coverBackgroundLayer}>
          <Svg width={595} height={842}>
          <Defs>
            {/* Central saffron glow — brand orange radiating from center */}
            <RadialGradient id="cvBrandGlow" cx="50%" cy="50%" r="60%">
              <Stop offset="0%" stopColor="#f97316" stopOpacity={0.50} />
              <Stop offset="30%" stopColor="#ea580c" stopOpacity={0.35} />
              <Stop offset="60%" stopColor="#c2410c" stopOpacity={0.18} />
              <Stop offset="100%" stopColor="#7c2d12" stopOpacity={0} />
            </RadialGradient>
            {/* Top-to-bottom: lighter saffron top → deep burnt orange bottom */}
            <LinearGradient id="cvBrandGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#9a3412" stopOpacity={0.65} />
              <Stop offset="45%" stopColor="#7c2d12" stopOpacity={0.50} />
              <Stop offset="100%" stopColor="#5c1d0c" stopOpacity={0.75} />
            </LinearGradient>
            {/* Soft top highlight — warm saffron wash at the top */}
            <RadialGradient id="cvTopWash" cx="50%" cy="5%" r="50%">
              <Stop offset="0%" stopColor="#f97316" stopOpacity={0.22} />
              <Stop offset="100%" stopColor="#7c2d12" stopOpacity={0} />
            </RadialGradient>
          </Defs>

          {/* Base deep saffron-brown */}
          <Rect x={0} y={0} width={595} height={842} fill="#5c1d0c" />
          <Rect x={0} y={0} width={595} height={842} fill="url(#cvBrandGrad)" />
          <Rect x={0} y={0} width={595} height={842} fill="url(#cvBrandGlow)" />
          <Rect x={0} y={0} width={595} height={842} fill="url(#cvTopWash)" />

          {/* Brand orange top border — like the orange page borders */}
          <Rect x={0} y={0} width={595} height={4} fill="#f97316" opacity={0.85} />
          <Rect x={0} y={838} width={595} height={4} fill="#f97316" opacity={0.85} />
          <Rect x={0} y={0} width={4} height={842} fill="#f97316" opacity={0.45} />
          <Rect x={591} y={0} width={4} height={842} fill="#f97316" opacity={0.45} />

          {/* Inner frame line — gold */}
          <Rect x={18} y={18} width={559} height={1} fill="#fbbf24" opacity={0.35} />
          <Rect x={18} y={823} width={559} height={1} fill="#fbbf24" opacity={0.35} />
          <Rect x={18} y={18} width={1} height={806} fill="#fbbf24" opacity={0.25} />
          <Rect x={576} y={18} width={1} height={806} fill="#fbbf24" opacity={0.25} />

          {/* Corner ornaments — brand orange dots */}
          <Circle cx={18} cy={18} r={3} fill="#f97316" opacity={0.7} />
          <Circle cx={577} cy={18} r={3} fill="#f97316" opacity={0.7} />
          <Circle cx={18} cy={824} r={3} fill="#f97316" opacity={0.7} />
          <Circle cx={577} cy={824} r={3} fill="#f97316" opacity={0.7} />

          {/* Zodiac wheel — subtle concentric rings in brand palette */}
          <Circle cx={297} cy={480} r={210} fill="none" stroke="#f97316" strokeWidth={0.7} opacity={0.12} />
          <Circle cx={297} cy={480} r={175} fill="none" stroke="#ea580c" strokeWidth={1.2} opacity={0.16} />
          <Circle cx={297} cy={480} r={140} fill="none" stroke="#f97316" strokeWidth={0.9} opacity={0.14} />
          <Circle cx={297} cy={480} r={105} fill="none" stroke="#fbbf24" strokeWidth={0.7} opacity={0.12} />

          {/* 12 zodiac rays */}
          {Array.from({ length: 12 }).map((_, idx) => {
            const angle = (idx * 30 - 90) * Math.PI / 180;
            const x1 = 297 + Math.cos(angle) * 105;
            const y1 = 480 + Math.sin(angle) * 105;
            const x2 = 297 + Math.cos(angle) * 210;
            const y2 = 480 + Math.sin(angle) * 210;
            return <Line key={`cv-ray-${idx}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f97316" strokeWidth={0.6} opacity={0.12} />;
          })}

          {/* Zodiac marker dots on middle ring */}
          {Array.from({ length: 12 }).map((_, idx) => {
            const angle = (idx * 30 - 75) * Math.PI / 180;
            const cx = 297 + Math.cos(angle) * 192;
            const cy = 480 + Math.sin(angle) * 192;
            return <Circle key={`cv-dot-${idx}`} cx={cx} cy={cy} r={2.5} fill="#f97316" opacity={0.30} />;
          })}

          {/* Star field — gold and orange dots */}
          <Circle cx={62} cy={68} r={1.4} fill="#fbbf24" opacity={0.65} />
          <Circle cx={145} cy={42} r={1.0} fill="#fcd34d" opacity={0.50} />
          <Circle cx={230} cy={58} r={1.5} fill="#f97316" opacity={0.55} />
          <Circle cx={365} cy={45} r={1.2} fill="#fbbf24" opacity={0.55} />
          <Circle cx={460} cy={70} r={1.1} fill="#fcd34d" opacity={0.45} />
          <Circle cx={530} cy={55} r={1.3} fill="#f97316" opacity={0.60} />
          <Circle cx={50} cy={160} r={0.9} fill="#fcd34d" opacity={0.40} />
          <Circle cx={545} cy={175} r={1.0} fill="#fbbf24" opacity={0.45} />
          <Circle cx={85} cy={400} r={0.8} fill="#f97316" opacity={0.35} />
          <Circle cx={510} cy={380} r={0.9} fill="#fcd34d" opacity={0.40} />
          <Circle cx={55} cy={650} r={1.0} fill="#fbbf24" opacity={0.40} />
          <Circle cx={540} cy={670} r={0.8} fill="#f97316" opacity={0.35} />
          <Circle cx={100} cy={770} r={1.1} fill="#fbbf24" opacity={0.45} />
          <Circle cx={495} cy={760} r={0.9} fill="#fcd34d" opacity={0.40} />
          </Svg>
        </View>

        <View style={styles.coverBrandRow}>
          <Image src={SRI_MANDIR_LOGO_URI} style={styles.coverBrandLogo} />
          <Text style={[styles.coverBrandText, { marginLeft: 10 }]}>Sri Mandir</Text>
        </View>

        <View style={{ marginTop: 22, alignItems: 'center', width: '100%' }}>
          <Text style={styles.coverKicker}>{localizePdfUiText('YOUR')}</Text>
          <Text style={styles.coverMark}>{localizePdfUiText('KUNDLI REPORT')}</Text>
          <Text style={styles.coverSubtitle}>{localizePdfUiText('A Personalized Vedic Astrology Blueprint')}</Text>
        </View>

        <View style={styles.coverDividerRow}>
          <View style={styles.coverDividerLine} />
          <Text style={[styles.coverDividerCenter, { marginHorizontal: 12 }]}>✦</Text>
          <View style={styles.coverDividerLine} />
        </View>

        <View style={styles.coverIdentityCard}>
          <Text style={styles.coverName}>{report.birthDetails.name}</Text>
          <View style={styles.coverInfoBlock}>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>{localizePdfUiText('Date of Birth')}</Text>
              <Text style={styles.coverInfoValue}>{formatBirthDate(report.birthDetails.dateOfBirth)}</Text>
            </View>
            <View style={styles.coverInfoRow}>
              <Text style={styles.coverInfoLabel}>{localizePdfUiText('Time of Birth')}</Text>
              <Text style={styles.coverInfoValue}>{report.birthDetails.timeOfBirth}</Text>
            </View>
            <View style={[styles.coverInfoRow, { marginBottom: 0 }]}>
              <Text style={styles.coverInfoLabel}>{localizePdfUiText('Place of Birth')}</Text>
              <Text style={styles.coverInfoValue}>{placeDetails.city || report.birthDetails.placeOfBirth || (ACTIVE_PDF_LANGUAGE === 'hi' ? 'उपलब्ध नहीं' : ACTIVE_PDF_LANGUAGE === 'te' ? 'అందుబాటులో లేదు' : 'N/A')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.coverFooterWrap}>
          <Text style={styles.coverFooterMeta}>
            {localizePdfUiText('Created by expert astrologers')}
          </Text>
          <Text style={styles.coverFooterBrand}>
            www.srimandir.com
          </Text>
          <Text style={[styles.coverDetails, { marginTop: 8, color: '#fcd34d' }]}>
            {localizePdfUiText('Prepared on')} {formatDate(report.generatedAt)}
          </Text>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════
          DISCLAIMER PAGE
          ═══════════════════════════════════════════════════════════════════════ */}
      {(() => {
        const disc = DISCLAIMER_CONTENT[ACTIVE_PDF_LANGUAGE] || DISCLAIMER_CONTENT.en;
        return (
      <Page size="A4" style={[styles.page, { fontFamily: ACTIVE_PDF_FONT_FAMILY, fontSize: ACTIVE_PDF_BODY_FONT_SIZE, lineHeight: ACTIVE_PDF_BODY_LINE_HEIGHT }]}>
        <View style={styles.pageWhitePanel} fixed />
        <View style={styles.fixedHeader} fixed>
          <Text style={styles.fixedHeaderTitle}>{localizePdfUiText('Sri Mandir Kundli Report')}</Text>
          <Text style={styles.fixedHeaderSection}>{disc.title}</Text>
        </View>
        <SriMandirFooter />
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />

        {/* Shield icon + heading */}
        <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 18 }}>
          <Svg width={44} height={44} viewBox="0 0 24 24">
            <Path
              d="M12 2L3 7v5c0 5.25 3.83 10.16 9 11.33C17.17 22.16 21 17.25 21 12V7l-9-5z"
              fill="none"
              stroke={SRIMANDIR_ORANGE}
              strokeWidth={1.5}
            />
            <Path
              d="M12 2L3 7v5c0 5.25 3.83 10.16 9 11.33C17.17 22.16 21 17.25 21 12V7l-9-5z"
              fill={SRIMANDIR_ORANGE}
              opacity={0.08}
            />
            <Path
              d="M10 12l2 2 4-4"
              fill="none"
              stroke={SRIMANDIR_ORANGE}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: P.primary,
            marginTop: 10,
            letterSpacing: 0.5,
            textAlign: 'center',
          }}>
            {disc.title}
          </Text>
          <View style={{ width: 50, height: 2, backgroundColor: SRIMANDIR_ORANGE, marginTop: 8, opacity: 0.5, borderRadius: 1 }} />
        </View>

        {/* Disclaimer body — styled paragraphs */}
        <View style={{
          backgroundColor: P.cardBg,
          borderWidth: 1,
          borderColor: P.lightBorder,
          borderRadius: 8,
          paddingVertical: 18,
          paddingHorizontal: 20,
          marginBottom: 14,
        }}>
          {disc.paragraphs.slice(0, -1).map((para, idx) => (
            <Text key={`disc-p-${idx}`} style={{
              fontSize: 10,
              color: P.bodyText,
              lineHeight: 1.55,
              marginBottom: 12,
              textAlign: 'justify',
            }}>
              {para}
            </Text>
          ))}
          {/* Last paragraph — closing message, italic + centered */}
          <Text style={{
            fontSize: 10,
            color: P.mutedText,
            lineHeight: 1.55,
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: 4,
            marginBottom: 0,
          }}>
            {disc.paragraphs[disc.paragraphs.length - 1]}
          </Text>
        </View>
      </Page>
        );
      })()}

      {/* ═══════════════════════════════════════════════════════════════════════
          GUIDANCE FOR YOUR JOURNEY AHEAD
          ═══════════════════════════════════════════════════════════════════════ */}
      {(() => {
        const guide = GUIDANCE_CONTENT[ACTIVE_PDF_LANGUAGE] || GUIDANCE_CONTENT.en;
        return (
      <Page size="A4" style={[styles.page, { fontFamily: ACTIVE_PDF_FONT_FAMILY, fontSize: ACTIVE_PDF_BODY_FONT_SIZE, lineHeight: ACTIVE_PDF_BODY_LINE_HEIGHT }]}>
        <View style={styles.pageWhitePanel} fixed />
        <View style={styles.fixedHeader} fixed>
          <Text style={styles.fixedHeaderTitle}>{localizePdfUiText('Sri Mandir Kundli Report')}</Text>
        </View>
        <SriMandirFooter />
        <Text style={styles.pageNumber} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} fixed />

        {/* Compass/star icon + heading */}
        <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 18 }}>
          <Svg width={44} height={44} viewBox="0 0 24 24">
            <Circle cx={12} cy={12} r={10} fill="none" stroke={SRIMANDIR_ORANGE} strokeWidth={1.3} />
            <Circle cx={12} cy={12} r={10} fill={SRIMANDIR_ORANGE} opacity={0.06} />
            {/* 4-pointed star/compass */}
            <Path d="M12 2 L13.5 10 L12 9 L10.5 10 Z" fill={SRIMANDIR_ORANGE} opacity={0.75} />
            <Path d="M12 22 L13.5 14 L12 15 L10.5 14 Z" fill={SRIMANDIR_ORANGE} opacity={0.75} />
            <Path d="M2 12 L10 10.5 L9 12 L10 13.5 Z" fill={SRIMANDIR_ORANGE} opacity={0.75} />
            <Path d="M22 12 L14 10.5 L15 12 L14 13.5 Z" fill={SRIMANDIR_ORANGE} opacity={0.75} />
            <Circle cx={12} cy={12} r={2} fill={SRIMANDIR_ORANGE} opacity={0.4} />
          </Svg>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: P.primary,
            marginTop: 10,
            letterSpacing: 0.3,
            textAlign: 'center',
          }}>
            {guide.title}
          </Text>
          <View style={{ width: 50, height: 2, backgroundColor: SRIMANDIR_ORANGE, marginTop: 8, opacity: 0.5, borderRadius: 1 }} />
        </View>

        {/* Guidance body */}
        <View style={{
          backgroundColor: P.cardBg,
          borderWidth: 1,
          borderColor: P.lightBorder,
          borderRadius: 8,
          paddingVertical: 18,
          paddingHorizontal: 20,
          marginBottom: 14,
        }}>
          {guide.paragraphs.slice(0, -1).map((para, idx) => (
            <Text key={`guide-p-${idx}`} style={{
              fontSize: 10,
              color: P.bodyText,
              lineHeight: 1.55,
              marginBottom: 12,
              textAlign: 'justify',
            }}>
              {para}
            </Text>
          ))}
          {/* Last paragraph — closing inspiration, italic + centered */}
          <Text style={{
            fontSize: 10,
            color: P.mutedText,
            lineHeight: 1.55,
            fontStyle: 'italic',
            textAlign: 'center',
            marginTop: 4,
            marginBottom: 0,
          }}>
            {guide.paragraphs[guide.paragraphs.length - 1]}
          </Text>
        </View>
      </Page>
        );
      })()}

      {/* Table of Contents Page */}
      <ContentPage sectionName="Table of Contents">
        <Section title="Table of Contents">
          <Text style={[styles.paragraph, { marginBottom: 16, fontStyle: 'normal' }]}>
            {localizePdfUiText('This comprehensive Kundli report covers all major dimensions of your birth chart, from your fundamental planetary blueprint to specific life-area predictions and remedial guidance.')}
          </Text>

          <View style={styles.tocColumns}>
            {tocColumns.map((column, cIdx) => (
              <View key={cIdx} style={styles.tocColumn}>
                {column.map((entry) => (
                  <View key={entry.num} style={styles.tocEntryCompact}>
                    <View style={styles.tocEntryCompactTop}>
                      <Text style={styles.tocNumberCompact}>{entry.num}</Text>
                      <Text style={styles.tocTitleCompact}>{localizePdfUiText(entry.title)}</Text>
                    </View>
                    <Text style={styles.tocSubtitleCompact}>{localizePdfUiText(entry.sub)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </Section>
      </ContentPage>

      {/* Kundali Charts — 4 per page in a 2×2 grid */}
      {charts.length > 0 && (() => {
        const CHARTS_PER_PAGE = 4;
        const chartPages: ChartData[][] = [];
        for (let i = 0; i < charts.length; i += CHARTS_PER_PAGE) {
          chartPages.push(charts.slice(i, i + CHARTS_PER_PAGE));
        }

        const chartName = (c: ChartData) =>
          ACTIVE_PDF_LANGUAGE === 'hi' && c.nameHindi ? c.nameHindi
          : ACTIVE_PDF_LANGUAGE === 'te' && c.nameTelugu ? c.nameTelugu
          : c.name;

        const renderChartCell = (chart: ChartData, idx: number) => (
          <View key={idx} style={styles.chartItem} wrap={false}>
            <Text style={styles.chartTitle}>{chart.type}: {chartName(chart)}</Text>
            <View style={styles.chartContainer}>
              {chart.dataUrl ? (
                <Image src={chart.dataUrl} style={{ width: 240, height: 240 }} />
              ) : chart.svg ? (
                <SVGRenderer svgString={chart.svg} />
              ) : (
                <Text style={{ color: '#6b7280', fontSize: 9, textAlign: 'center', paddingHorizontal: 8 }}>
                  {localizePdfUiText('Chart image unavailable for this section.')}
                </Text>
              )}
            </View>
            <Text style={styles.chartPurpose}>{localizePdfUiText(chart.purpose)}</Text>
          </View>
        );

        return chartPages.map((page, pageIdx) => (
          <ContentPage key={`chart-pg-${pageIdx}`} sectionName="Kundali Charts">
            <Section
              title={pageIdx === 0 ? 'Kundali Charts (Divisional Charts)' : 'Divisional Charts (cont.)'}
              keepWithNext={260}
            >
              {pageIdx === 0 && (
                <Text style={styles.paragraph}>
                  {localizePdfUiText('These are the key divisional charts (Varga charts) derived from your birth chart. Each chart reveals specific life areas and is used for deeper analysis of those domains.')}
                </Text>
              )}
              <View style={styles.chartGrid}>
                {page.map((chart, idx) => renderChartCell(chart, idx))}
              </View>
            </Section>
          </ContentPage>
        ));
      })()}
      {/* Birth Details & Planetary Positions */}
      <ContentPage sectionName="Birth Details & Planetary Positions">
        <Section title="Birth Details" wrap={false}>
          <View style={styles.card}>
            <View style={styles.stableTwoCol}>
              <View style={styles.stableCol}>
                <InfoRow label="Name" value={birthDetails.name || 'N/A'} />
                <InfoRow label="Sex" value={sex} />
                <InfoRow label="Date of Birth" value={formatBirthDate(birthDateValue) || birthDateValue || 'N/A'} />
                <InfoRow label="Day" value={report?.panchang?.vaar?.day || getWeekday(birthDateValue)} />
                <InfoRow label="Time of Birth" value={birthDetails.timeOfBirth || 'N/A'} />
                <InfoRow label="Place of Birth" value={birthDetails.placeOfBirth || placeDetails.city || (ACTIVE_PDF_LANGUAGE === 'hi' ? 'उपलब्ध नहीं' : ACTIVE_PDF_LANGUAGE === 'te' ? 'అందుబాటులో లేదు' : 'N/A')} />
                <InfoRow label="City" value={placeDetails.city} />
                <InfoRow label="State" value={placeDetails.state} />
                <InfoRow label="Country" value={placeDetails.country} />
              </View>

              <View style={styles.stableCol}>
                <InfoRow label="Latitude" value={formatCoordinate(birthDetails.latitude, 'lat')} />
                <InfoRow label="Longitude" value={formatCoordinate(birthDetails.longitude, 'lon')} />
                <InfoRow label="Timezone" value={timezoneText} />
                <InfoRow label="Tithi at Birth" value={tithiPaksha ? `${tithiName} (${tithiPaksha})` : tithiName} />
                <InfoRow label="Nakshatra at Birth" value={nakshatraPada ? `${nakshatraName} (Pada ${nakshatraPada})` : nakshatraName} />
                <InfoRow label="Yoga at Birth" value={yogaName} />
                <InfoRow label="Karana at Birth" value={karanaName} />
                <InfoRow
                  label="Sun Degree"
                  value={sunPosition ? formatDegreeInSign(sunPosition.sign, sunPosition.degree) : 'N/A'}
                />
                <InfoRow
                  label="Ascendant Degree"
                  value={report?.ascendant ? formatDegreeInSign(report.ascendant.sign, report.ascendant.degree) : 'N/A'}
                />
              </View>
            </View>
          </View>
        </Section>

        <Section title="Planetary Positions" wrap={false}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Sign')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('House')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Degree')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Status')}</Text>
            </View>
            {report.planetaryPositions.map((planet: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.tableCell}>{localizePdfUiText(planet.name)}</Text>
                <Text style={styles.tableCell}>{localizePdfUiText(planet.sign)}</Text>
                <Text style={styles.tableCell}>{planet.house}</Text>
                <Text style={styles.tableCell}>{planet.degree.toFixed(2)}°</Text>
                <Text style={styles.tableCell}>{localizePdfUiText(planet.isRetro ? 'Retrograde' : 'Direct')}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Detailed Planetary Snapshot" keepWithNext={180}>
          <View style={styles.card} wrap={false}>
            <View style={styles.stableTwoCol}>
              <View style={styles.stableCol}>
                <InfoRow label="Lahiri Ayanamsha" value={ayanamshaText} />
                <InfoRow label="Ishta (if available)" value={pickAstroValue('ishta', 'ishta_kaal', 'ishtkaal', 'isht')} />
                <InfoRow label="Sunrise (if available)" value={pickAstroValue('sunrise', 'sun_rise')} />
                <InfoRow label="Sunset (if available)" value={pickAstroValue('sunset', 'sun_set')} />
              </View>
              <View style={styles.stableCol}>
                <InfoRow label="Local Mean Time (if available)" value={pickAstroValue('local_mean_time', 'lmt')} />
                <InfoRow label="Sidereal Time (if available)" value={pickAstroValue('sidereal_time', 'lst')} />
                <InfoRow label="Tithi Ending Time (if available)" value={pickAstroValue('tithi_ending_time', 'tithi_end_time')} />
                <InfoRow label="Nakshatra Ending Time (if available)" value={pickAstroValue('nakshatra_ending_time', 'nakshatra_end_time')} />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{localizePdfUiText('Planetary Degree Matrix')}</Text>
            <View style={styles.advancedTable}>
              <View style={styles.advancedTableHeader}>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.0 }]}>{localizePdfUiText('Pl')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 0.45 }]}>R</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 0.45 }]}>C</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.0 }]}>{localizePdfUiText('Rasi')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.3 }]}>{localizePdfUiText('Degree')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.2 }]}>{localizePdfUiText('Speed')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.8 }]}>{localizePdfUiText('Nak')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 0.7 }]}>{localizePdfUiText('Pad')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 0.7 }]}>{localizePdfUiText('No.')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.0 }]}>{localizePdfUiText('RL')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.0 }]}>{localizePdfUiText('NL')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.0 }]}>{localizePdfUiText('Sub')}</Text>
                <Text style={[styles.advancedTableHeaderCell, { flex: 1.5 }]}>{localizePdfUiText('Dignity')}</Text>
              </View>
              {detailedPlanetRows.map((row: any, idx: number) => (
                <View
                  key={`${row.name}-${idx}`}
                  style={idx % 2 === 0 ? styles.advancedTableRow : styles.advancedTableRowAlt}
                  wrap={false}
                >
                  <Text style={[styles.advancedCellText, { flex: 1.0 }]}>{localizePdfUiText(row.name)}</Text>
                  <Text style={[styles.advancedCellText, { flex: 0.45 }]}>{row.retro}</Text>
                  <Text style={[styles.advancedCellText, { flex: 0.45 }]}>{row.combust}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.0 }]}>{localizePdfUiText(row.signShort)}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.3 }]}>{row.degreeText}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.2 }]}>{row.speed}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.8 }]}>{localizePdfUiText(row.nakshatra)}</Text>
                  <Text style={[styles.advancedCellText, { flex: 0.7 }]}>{row.pada}</Text>
                  <Text style={[styles.advancedCellText, { flex: 0.7 }]}>{row.nakNo}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.0 }]}>{localizePdfUiText(row.rashiLord)}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.0 }]}>{localizePdfUiText(row.nakLord)}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.0 }]}>{localizePdfUiText(row.subLord)}</Text>
                  <Text style={[styles.advancedCellText, { flex: 1.5 }]}>{localizePdfUiText(row.dignity)}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.tinyNote}>
              {localizePdfUiText('R = Retrograde, C = Combust. Fields marked "if available" are shown when present in source astro data.')}
            </Text>
          </View>
        </Section>

        <Section title="Chara Karakas (Jaimini)" wrap={false}>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Karaka')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Degree')}</Text>
              <Text style={styles.tableHeaderCell}>{localizePdfUiText('Signification')}</Text>
            </View>
            {report.charaKarakas.map((karaka: any, idx: number) => (
              <View key={idx} style={styles.tableRow}>
                <Text style={styles.tableCell}>{localizePdfUiText(karaka.karaka)}</Text>
                <Text style={styles.tableCell}>{localizePdfUiText(karaka.planet)}</Text>
                <Text style={styles.tableCell}>{karaka.degree.toFixed(2)}°</Text>
                <Text style={styles.tableCell}>{localizePdfUiText(karaka.signification)}</Text>
              </View>
            ))}
          </View>
        </Section>
      </ContentPage>

      {/* Panchang Analysis */}
      {report.panchang && (
        <ContentPage sectionName="Panchang Analysis">
          <Section title="Panchang Analysis">
            <Text style={styles.paragraph}>
              {localizePdfUiText("The Panchang (five limbs) provides the foundational cosmic timing of your birth, revealing the day's energy, lunar phase, and celestial influences that shape your destiny.")}
            </Text>
            
            <Card title={`${localizePdfUiText('Vaar (Day)')}: ${localizePdfUiText(report.panchang.vaar?.day || 'N/A')}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.panchang.vaar?.interpretation || '')}</Text>
            </Card>

            <Card title={`${localizePdfUiText('Tithi')}: ${localizePdfUiText(report.panchang.tithi?.name || 'N/A')} (${localizePdfUiText(report.panchang.tithi?.paksha || '')})`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.panchang.tithi?.interpretation || '')}</Text>
            </Card>

            <Card title={`${localizePdfUiText('Nakshatra')}: ${localizePdfUiText(report.panchang.nakshatra?.name || 'N/A')} (${localizePdfUiText('Pada')} ${report.panchang.nakshatra?.pada || ''})`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.panchang.nakshatra?.interpretation || '')}</Text>
            </Card>

            <Card title={`${localizePdfUiText('Yoga')}: ${localizePdfUiText(report.panchang.yoga?.name || 'N/A')}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.panchang.yoga?.interpretation || '')}</Text>
            </Card>

            <Card title={`${localizePdfUiText('Karana')}: ${localizePdfUiText(report.panchang.karana?.name || 'N/A')}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.panchang.karana?.interpretation || '')}</Text>
            </Card>
          </Section>
        </ContentPage>
      )}

      {/* Three Pillars */}
      {report.pillars && (
        <ContentPage sectionName="Three Pillars">
          <Section title="Three Pillars of Your Chart">
            <Text style={styles.paragraph}>
              {localizePdfUiText('The three fundamental pillars—Moon Sign, Ascendant, and Birth Nakshatra—form the core identity markers of your horoscope, revealing your emotional nature, physical constitution, and life purpose.')}
            </Text>

            <SubSection title={`${localizePdfUiText('Moon Sign (Rashi)')}: ${localizePdfUiText(report.pillars.moonSign?.sign || 'N/A')}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.pillars.moonSign?.interpretation || '')}</Text>
              <InfoRow label="Element" value={localizePdfUiText(report.pillars.moonSign?.element || 'N/A')} />
              <InfoRow label="Emotional Nature" value={localizePdfUiText(report.pillars.moonSign?.emotionalNature || 'N/A')} />
            </SubSection>

            <SubSection title={`${localizePdfUiText('Ascendant (Lagna)')}: ${localizePdfUiText(report.pillars.ascendant?.sign || 'N/A')}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.pillars.ascendant?.interpretation || '')}</Text>
              <InfoRow label="Ruling Planet" value={localizePdfUiText(report.pillars.ascendant?.rulingPlanet || 'N/A')} />
              <InfoRow label="Personality" value={localizePdfUiText(report.pillars.ascendant?.personality || 'N/A')} />
            </SubSection>

            <SubSection title={`${localizePdfUiText('Birth Nakshatra')}: ${localizePdfUiText(report.pillars.nakshatra?.name || 'N/A')}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.pillars.nakshatra?.interpretation || '')}</Text>
              <InfoRow label="Deity" value={localizePdfUiText(report.pillars.nakshatra?.deity || 'N/A')} />
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* Planetary Profiles */}
      {report.planets && report.planets.length > 0 && (
        <>
          {report.planets.map((planet: any, idx: number) => (
            <ContentPage key={idx} sectionName={`Planet: ${planet.planet}`}>
              <Section title={`${localizePdfUiText(planet.planet)} - ${localizePdfUiText('Planetary Analysis')}`}>
                <InfoStrip items={[
                  { label: 'Sign', value: localizePdfUiText(planet.sign || 'N/A') },
                  { label: 'House', value: `${planet.house || 'N/A'}` },
                  { label: 'Dignity', value: localizePdfUiText(planet.dignity || 'N/A') },
                  { label: 'Motion', value: localizePdfUiText(planet.isRetrograde ? 'Retrograde' : 'Direct') },
                ]} />

                <SubSection title="Placement Analysis">
                  <Text style={styles.paragraph}>{planet.placementAnalysis || ''}</Text>
                </SubSection>

                {planet.houseSignificance && (
                  <SubSection title="House Significance">
                    <Text style={styles.paragraph}>{planet.houseSignificance}</Text>
                  </SubSection>
                )}

                {planet.aspects && planet.aspects.length > 0 && (
                  <SubSection title="Aspects">
                    {planet.aspects.map((aspect: any, aIdx: number) => (
                      <Card key={aIdx} title={`${localizePdfUiText(aspect.aspectType)} ${localizePdfUiText('Aspect')} → ${localizePdfUiText('House')} ${aspect.targetHouse}`}>
                        <Text style={styles.paragraph}>{aspect.interpretation || ''}</Text>
                      </Card>
                    ))}
                  </SubSection>
                )}

                {planet.retrogradeEffect && planet.isRetrograde && (
                  <SubSection title="Retrograde Effect">
                    <View style={styles.highlight}>
                      <Text style={styles.bodyText}>{planet.retrogradeEffect}</Text>
                    </View>
                  </SubSection>
                )}

                {planet.dashaInfluence && (
                  <SubSection title="Dasha Influence">
                    <Text style={styles.paragraph}>{planet.dashaInfluence}</Text>
                  </SubSection>
                )}

                {planet.remedies && planet.remedies.length > 0 && (
                  <SubSection title="Remedies">
                    <BulletList items={planet.remedies} />
                  </SubSection>
                )}
              </Section>
            </ContentPage>
          ))}
        </>
      )}

      {/* House Analysis (Bhavphal) */}
      {report.houses && report.houses.length > 0 && (
        <>
          <ContentPage sectionName="House Analysis (Bhavphal)">
            <Section title="Bhavphal - House Analysis Overview">
              <Text style={styles.paragraph}>
                {localizePdfUiText('The twelve houses (Bhavas) of your horoscope govern different areas of life. Each house is colored by its sign, lord placement, and any planetary occupants. This comprehensive analysis reveals the potential in each life domain.')}
              </Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('House')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Sign')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Lord')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Lord in')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Occupants')}</Text>
                </View>
                {report.houses.map((house: any, idx: number) => {
                  const houseSign = localizePdfUiText(sanitizeText(String(house.sign || 'N/A')) || 'N/A');
                  const houseLord = localizePdfUiText(sanitizeText(String(house.lord || 'N/A')) || 'N/A');
                  const occupantsText = Array.isArray(house.occupants)
                    ? house.occupants
                        .map((o: any) => localizePdfUiText(sanitizeText(String(o || '')).trim()))
                        .filter(Boolean)
                        .join(', ')
                    : '';
                  return (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{house.house}</Text>
                      <Text style={styles.tableCell}>{houseSign}</Text>
                      <Text style={styles.tableCell}>{houseLord}</Text>
                      <Text style={styles.tableCell}>H{house.lordHouse}</Text>
                      <Text style={styles.tableCell}>{occupantsText || localizePdfUiText('Empty')}</Text>
                    </View>
                  );
                })}
              </View>
            </Section>
          </ContentPage>

          {report.houses.map((house: any, idx: number) => (
            <ContentPage key={idx} sectionName={`House ${house.house}`}>
              <Section title={`House ${house.house}${ACTIVE_PDF_LANGUAGE !== 'en' && house.houseHindi ? ' - ' + sanitizeText(house.houseHindi) : ''}`}>
                <InfoStrip items={[
                  { label: 'Sign', value: localizePdfUiText(sanitizeText(String(house.sign || 'N/A')) || 'N/A') },
                  { label: 'Lord', value: localizePdfUiText(sanitizeText(String(house.lord || 'N/A')) || 'N/A') },
                  { label: 'Nature', value: localizePdfUiText(sanitizeText(String(house.houseNature || 'N/A')) || 'N/A') },
                ]} />

                <SubSection title="Significance">
                  <Text style={styles.paragraph}>{house.significance || ''}</Text>
                </SubSection>

                <SubSection title="Detailed Analysis">
                  <Text style={styles.paragraph}>{house.interpretation || ''}</Text>
                </SubSection>

                {house.predictions && house.predictions.length > 0 && (
                  <SubSection title="Predictions">
                    <BulletList items={house.predictions} />
                  </SubSection>
                )}

                <View style={styles.grid2} wrap={false}>
                  {house.strengths && house.strengths.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Strengths')}</Text>
                      <BulletList items={house.strengths} />
                    </View>
                  )}
                  {house.challenges && house.challenges.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Challenges')}</Text>
                      <BulletList items={house.challenges} />
                    </View>
                  )}
                </View>

                {house.timing && (
                  <SubSection title="Timing">
                    <Text style={styles.paragraph}>{house.timing}</Text>
                  </SubSection>
                )}
              </Section>
            </ContentPage>
          ))}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          PART 04 — LIFE PREDICTIONS
          ═══════════════════════════════════════════════════════ */}
      <SectionDividerPage
        partNumber="04"
        title="Life Predictions"
        subtitle="Career, marriage, wealth, health — what the stars reveal about every major chapter of your life"
      />

      {/* Career Analysis */}
      {report.career && (
        <ContentPage sectionName="Career Analysis">
          <Section title="Career Calling">
            <Text style={styles.paragraph}>{localizePdfUiText(report.career.overview || '')}</Text>

            {report.career.careerDirection && (
              <SubSection title="Right Career For You">
                <View style={styles.highlight}>
                  <Text style={styles.boldLabel}>{localizePdfUiText(report.career.careerDirection.rightCareerForYou || '')}</Text>
                </View>
                {report.career.careerDirection.coreStrengths && report.career.careerDirection.coreStrengths.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Core Strengths')}</Text>
                    <BulletList items={report.career.careerDirection.coreStrengths} />
                  </>
                )}
                {report.career.careerDirection.idealRoles && report.career.careerDirection.idealRoles.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Ideal Roles')}</Text>
                    <BulletList items={report.career.careerDirection.idealRoles} />
                  </>
                )}
                <InfoRow label="Ideal Work Environment" value={report.career.careerDirection.idealWorkEnvironment || 'N/A'} />
              </SubSection>
            )}

            <SubSection title="10th House Analysis">
              <Text style={styles.paragraph}>{localizePdfUiText(report.career.tenthHouse?.interpretation || '')}</Text>
              {report.career.tenthHouse?.careerThemes && (
                <BulletList items={report.career.tenthHouse.careerThemes} />
              )}
            </SubSection>

            <SubSection title="Sun Analysis (Authority)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.career.sunAnalysis?.interpretation || '')}</Text>
            </SubSection>

            <SubSection title="Saturn Analysis (Work Ethic)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.career.saturnAnalysis?.interpretation || '')}</Text>
            </SubSection>

            <SubSection title="Amatyakaraka (Career Significator)">
              <InfoRow label="Planet" value={localizePdfUiText(report.career.amatyakaraka?.planet || 'N/A')} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.career.amatyakaraka?.interpretation || '')}</Text>
            </SubSection>

            <SubSection title="Suitable Career Fields">
              <BulletList items={report.career.suitableFields || []} />
            </SubSection>

            {report.career.avoidFields && report.career.avoidFields.length > 0 && (
              <SubSection title="Fields to Avoid">
                <BulletList items={report.career.avoidFields} />
              </SubSection>
            )}

            {report.career.careerTiming && (
              <SubSection title="Career Timing & Phases">
                <View style={styles.calloutBox}>
                  <Text style={styles.calloutTitle}>{localizePdfUiText('Current Career Phase')}</Text>
                  <Text style={styles.bodyText}>{localizePdfUiText(report.career.careerTiming.currentPhase || '')}</Text>
                </View>
                {report.career.careerTiming.upcomingOpportunities && report.career.careerTiming.upcomingOpportunities.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Upcoming Opportunities')}</Text>
                    <BulletList items={report.career.careerTiming.upcomingOpportunities} />
                  </>
                )}
                {report.career.careerTiming.challenges && report.career.careerTiming.challenges.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Challenges to Navigate')}</Text>
                    <BulletList items={report.career.careerTiming.challenges} />
                  </>
                )}
              </SubSection>
            )}

            {report.career.careerSwitchInsights && (
              <SubSection title="Career Switch Insights">
                <InfoRow label="Is Switch Due Now?" value={report.career.careerSwitchInsights.isSwitchDueNow || 'N/A'} />
                <InfoRow label="Next Switch Window" value={report.career.careerSwitchInsights.nextSwitchWindow || 'N/A'} />
                {report.career.careerSwitchInsights.oneOrTwoFutureChanges && report.career.careerSwitchInsights.oneOrTwoFutureChanges.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Future Career Changes')}</Text>
                    <BulletList items={report.career.careerSwitchInsights.oneOrTwoFutureChanges} />
                  </>
                )}
                <Text style={styles.paragraph}>{localizePdfUiText(report.career.careerSwitchInsights.rationale || '')}</Text>
                {report.career.careerSwitchInsights.preparationPlan && report.career.careerSwitchInsights.preparationPlan.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Preparation Plan')}</Text>
                    <BulletList items={report.career.careerSwitchInsights.preparationPlan} />
                  </>
                )}
              </SubSection>
            )}

            <SubSection title="Success Formula">
              <View style={styles.highlight}>
                <Text style={styles.bodyText}>{localizePdfUiText(report.career.successFormula || '')}</Text>
              </View>
            </SubSection>

            <SubSection title="Wealth Potential">
              <Text style={styles.paragraph}>{localizePdfUiText(report.career.wealthPotential || '')}</Text>
            </SubSection>

            <SubSection title="Business vs Job">
              <Text style={styles.paragraph}>{localizePdfUiText(report.career.businessVsJob || '')}</Text>
            </SubSection>

            <SubSection title="Recommendations">
              <BulletList items={report.career.recommendations || []} />
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* Marriage Analysis */}
      {report.marriage && (
        <ContentPage sectionName="Love & Marriage">
          <Section title="Love & Marriage">
            <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.overview || '')}</Text>

            {report.marriage.maritalSafety && (
              <SubSection title="Relationship Safety Framework">
                <InfoRow label="Status Assumption" value={localizePdfUiText(report.marriage.maritalSafety.statusAssumption || 'N/A')} />
                <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.maritalSafety.safeguardPolicy || '')}</Text>
                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>{localizePdfUiText(report.marriage.maritalSafety.alreadyMarriedGuidance || '')}</Text>
                </View>
              </SubSection>
            )}

            <SubSection title="5th House (Romance)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.fifthHouse?.interpretation || '')}</Text>
              <InfoRow label="Love Nature" value={report.marriage.fifthHouse?.loveNature || 'N/A'} />
            </SubSection>

            <SubSection title="7th House (Marriage)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.seventhHouse?.interpretation || '')}</Text>
              <InfoRow label="Marriage Prospects" value={report.marriage.seventhHouse?.marriageProspects || 'N/A'} />
            </SubSection>

            <SubSection title="Venus Analysis">
              <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.venusAnalysis?.interpretation || '')}</Text>
              <InfoRow label="Attraction Style" value={report.marriage.venusAnalysis?.attractionStyle || 'N/A'} />
            </SubSection>

            <SubSection title="Darakaraka (Spouse Significator)">
              <InfoRow label="Planet" value={localizePdfUiText(report.marriage.darakaraka?.planet || 'N/A')} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.darakaraka?.interpretation || '')}</Text>
              {report.marriage.darakaraka?.partnerQualities && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Partner Qualities')}</Text>
                  <BulletList items={report.marriage.darakaraka.partnerQualities} />
                </>
              )}
            </SubSection>

            <SubSection title="Partner Profile">
              <InfoRow label="Physical Traits" value={report.marriage.partnerProfile?.physicalTraits || 'N/A'} />
              <InfoRow label="Personality" value={report.marriage.partnerProfile?.personality || 'N/A'} />
              <InfoRow label="Background" value={report.marriage.partnerProfile?.background || 'N/A'} />
              <InfoRow label="Meeting" value={report.marriage.partnerProfile?.meetingCircumstances || 'N/A'} />
            </SubSection>

            {report.marriage.idealPartnerForUnmarried && (
              <SubSection title="Ideal Partner (If Unmarried)">
                <InfoRow label="Applicability" value={report.marriage.idealPartnerForUnmarried.whenApplicable || 'N/A'} />
                {report.marriage.idealPartnerForUnmarried.keyQualities && report.marriage.idealPartnerForUnmarried.keyQualities.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Key Qualities')}</Text>
                    <BulletList items={report.marriage.idealPartnerForUnmarried.keyQualities} />
                  </>
                )}
                {report.marriage.idealPartnerForUnmarried.cautionTraits && report.marriage.idealPartnerForUnmarried.cautionTraits.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Caution Traits')}</Text>
                    <BulletList items={report.marriage.idealPartnerForUnmarried.cautionTraits} />
                  </>
                )}
                <Text style={styles.paragraph}>{localizePdfUiText(report.marriage.idealPartnerForUnmarried.practicalAdvice || '')}</Text>
              </SubSection>
            )}

            {report.marriage.guidanceForMarriedNatives && (
              <SubSection title="Guidance If Married">
                {report.marriage.guidanceForMarriedNatives.focusAreas && report.marriage.guidanceForMarriedNatives.focusAreas.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Focus Areas')}</Text>
                    <BulletList items={report.marriage.guidanceForMarriedNatives.focusAreas} />
                  </>
                )}
                {report.marriage.guidanceForMarriedNatives.relationshipStrengthening && report.marriage.guidanceForMarriedNatives.relationshipStrengthening.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Relationship Strengthening')}</Text>
                    <BulletList items={report.marriage.guidanceForMarriedNatives.relationshipStrengthening} />
                  </>
                )}
                {report.marriage.guidanceForMarriedNatives.conflictsToAvoid && report.marriage.guidanceForMarriedNatives.conflictsToAvoid.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Conflicts to Avoid')}</Text>
                    <BulletList items={report.marriage.guidanceForMarriedNatives.conflictsToAvoid} />
                  </>
                )}
              </SubSection>
            )}

            <SubSection title="Marriage Timing">
              <InfoRow label="Ideal Age Range" value={report.marriage.marriageTiming?.idealAgeRange || 'N/A'} />
              <InfoRow label="Ideal Time for Young Natives" value={report.marriage.marriageTiming?.idealTimeForYoungNatives || 'N/A'} />
              <InfoRow label="Current Prospects" value={report.marriage.marriageTiming?.currentProspects || 'N/A'} />
              {report.marriage.marriageTiming?.favorablePeriods && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Favorable Periods')}</Text>
                  <BulletList items={report.marriage.marriageTiming.favorablePeriods} />
                </>
              )}
              {report.marriage.marriageTiming?.challengingPeriods && report.marriage.marriageTiming.challengingPeriods.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Challenging Periods')}</Text>
                  <BulletList items={report.marriage.marriageTiming.challengingPeriods} />
                </>
              )}
            </SubSection>

            {report.marriage.mangalDosha?.present && (
              <SubSection title="Mangal Dosha">
                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>{localizePdfUiText('Severity')}: {report.marriage.mangalDosha.severity}</Text>
                </View>
                <BulletList items={report.marriage.mangalDosha.remedies || []} />
              </SubSection>
            )}
          </Section>
        </ContentPage>
      )}

      {/* Health Analysis */}
      {(report.remedies?.healthGuidance || report.remedies?.generalAdvice) && (
        <ContentPage sectionName="Health & Well-Being">
          <Section title="Health & Well-Being">
            <Text style={styles.paragraph}>
              {localizePdfUiText(report.remedies?.healthGuidance?.whyThisMatters || 'This guidance focuses on sustainable, age-appropriate health habits and long-term stability.')}
            </Text>

            {report.remedies?.healthGuidance && (
              <>
                <SubSection title="Age Context & Safety">
                  <InfoRow label="Age Group Context" value={report.remedies.healthGuidance.ageGroup || 'N/A'} />
                  {report.remedies.healthGuidance.medicalDisclaimer && (
                    <Text style={styles.scriptural}>{localizePdfUiText(report.remedies.healthGuidance.medicalDisclaimer)}</Text>
                  )}
                </SubSection>

                {report.remedies.healthGuidance.safeMovement && report.remedies.healthGuidance.safeMovement.length > 0 && (
                  <SubSection title="Safe Movement Guidance">
                    <BulletList items={report.remedies.healthGuidance.safeMovement} />
                  </SubSection>
                )}

                {report.remedies.healthGuidance.nutritionAndHydration && report.remedies.healthGuidance.nutritionAndHydration.length > 0 && (
                  <SubSection title="Nutrition & Hydration">
                    <BulletList items={report.remedies.healthGuidance.nutritionAndHydration} />
                  </SubSection>
                )}

                {report.remedies.healthGuidance.recoveryAndSleep && report.remedies.healthGuidance.recoveryAndSleep.length > 0 && (
                  <SubSection title="Recovery & Sleep">
                    <BulletList items={report.remedies.healthGuidance.recoveryAndSleep} />
                  </SubSection>
                )}

                {report.remedies.healthGuidance.preventiveChecks && report.remedies.healthGuidance.preventiveChecks.length > 0 && (
                  <SubSection title="Preventive Health Checks">
                    <BulletList items={report.remedies.healthGuidance.preventiveChecks} />
                  </SubSection>
                )}

                {report.remedies.healthGuidance.avoidOverstrain && report.remedies.healthGuidance.avoidOverstrain.length > 0 && (
                  <SubSection title="What to Avoid">
                    <BulletList items={report.remedies.healthGuidance.avoidOverstrain} />
                  </SubSection>
                )}
              </>
            )}

            {report.remedies?.generalAdvice && (
              <SubSection title="General Wellness Note">
                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>{localizePdfUiText(report.remedies.generalAdvice)}</Text>
                </View>
              </SubSection>
            )}
          </Section>
        </ContentPage>
      )}

      {/* ═══════════════════════════════════════════════════════
          PART 05 — YOUR DASHA TIMELINE
          ═══════════════════════════════════════════════════════ */}
      <SectionDividerPage
        partNumber="05"
        title="Your Dasha Timeline"
        subtitle="The planetary periods that govern each phase of your life — your cosmic roadmap from birth to liberation"
      />

      {/* Dasha Predictions - Page 1: Current Mahadasha & Antardasha */}
      {report.dasha && (
        <ContentPage sectionName="Dasha Predictions">
          <Section title="Vimshottari Dasha Predictions">
            <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.overview || '')}</Text>
            <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.vimshottariSystem || '')}</Text>

            <SubSection title="Birth Nakshatra">
              <InfoRow label="Nakshatra" value={localizePdfUiText(report.dasha.birthNakshatra?.name || 'N/A')} />
              <InfoRow label="Lord" value={localizePdfUiText(dashaTruth?.startLord || report.dasha.birthNakshatra?.lord || 'N/A')} />
              <InfoRow label="Starting Dasha" value={localizePdfUiText(dashaTruth?.startLord || report.dasha.birthNakshatra?.startingDasha || 'N/A')} />
              <InfoRow label="Balance at Birth" value={dashaTruth ? `${dashaTruth.balanceYears.toFixed(2)} years` : (report.dasha.birthNakshatra?.balance || 'N/A')} />
            </SubSection>

            <SubSection title={`${localizePdfUiText('Current Mahadasha')}: ${localizePdfUiText(dashaTruth?.mahadasha || report.dasha.currentMahadasha?.planet || 'N/A')}`}>
              <View style={styles.card}>
                <InfoRow
                  label="Period"
                  value={`${dashaTruth ? formatMonthYear(dashaTruth.mdStart) : (report.dasha.currentMahadasha?.startDate || '')} to ${dashaTruth ? formatMonthYear(dashaTruth.mdEnd) : (report.dasha.currentMahadasha?.endDate || '')}`}
                />
                <Text style={[styles.accentText, { marginTop: 5 }]}>
                  {localizePdfUiText(report.dasha.currentMahadasha?.planetSignificance || '')}
                </Text>
              </View>
              <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.currentMahadasha?.interpretation || '')}</Text>
              
              {report.dasha.currentMahadasha?.majorThemes && report.dasha.currentMahadasha.majorThemes.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Life Themes')}</Text>
                  <BulletList items={report.dasha.currentMahadasha.majorThemes} />
                </>
              )}
              
              {report.dasha.currentMahadasha?.opportunities && report.dasha.currentMahadasha.opportunities.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Opportunities')}</Text>
                  <BulletList items={report.dasha.currentMahadasha.opportunities} />
                </>
              )}
              
              {report.dasha.currentMahadasha?.challenges && report.dasha.currentMahadasha.challenges.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Challenges')}</Text>
                  <BulletList items={report.dasha.currentMahadasha.challenges} />
                </>
              )}

              {report.dasha.currentMahadasha?.advice && (
                <View style={styles.highlight}>
                  <Text style={styles.boldLabel}>{localizePdfUiText('Advice')}: </Text>
                  <Text style={styles.bodyText}>{localizePdfUiText(report.dasha.currentMahadasha.advice)}</Text>
                </View>
              )}
            </SubSection>

            <SubSection title={`${localizePdfUiText('Current Antardasha')}: ${localizePdfUiText(dashaTruth?.antardasha || report.dasha.currentAntardasha?.planet || 'N/A')}`}>
              <View style={styles.card}>
                <InfoRow
                  label="Period"
                  value={`${dashaTruth ? formatMonthYear(dashaTruth.adStart) : (report.dasha.currentAntardasha?.startDate || '')} to ${dashaTruth ? formatMonthYear(dashaTruth.adEnd) : (report.dasha.currentAntardasha?.endDate || '')}`}
                />
              </View>
              <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.currentAntardasha?.interpretation || '')}</Text>
              
              {report.dasha.currentAntardasha?.keyEvents && report.dasha.currentAntardasha.keyEvents.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Key Events to Watch')}</Text>
                  <BulletList items={report.dasha.currentAntardasha.keyEvents} />
                </>
              )}

              {report.dasha.currentAntardasha?.recommendations && report.dasha.currentAntardasha.recommendations.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Recommendations')}</Text>
                  <BulletList items={report.dasha.currentAntardasha.recommendations} />
                </>
              )}
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* Dasha Predictions - Page 2: Detailed Mahadasha Predictions */}
      {report.dasha?.mahadashaPredictions && report.dasha.mahadashaPredictions.length > 0 && (
        <>
          {report.dasha.mahadashaPredictions.map((md: any, idx: number) => (
            <ContentPage key={`md-${idx}`} sectionName={`${md.planet} Mahadasha`}>
              <Section title={`${localizePdfUiText(md.planet)} ${localizePdfUiText('Mahadasha Predictions')}`}>
                {(() => {
                  const mdDates = resolveMdDates(md.planet, md.startDate, md.endDate);
                  return (
                <View style={styles.card}>
                      <InfoRow label="Period" value={`${mdDates.start} to ${mdDates.end}`} />
                  <InfoRow label="Duration" value={md.duration || ''} />
                </View>
                  );
                })()}
                
                <Text style={styles.paragraph}>{md.overview || ''}</Text>

                <SubSection title="Career Impact">
                  <Text style={styles.paragraph}>{md.careerImpact || ''}</Text>
                </SubSection>

                <SubSection title="Relationship Impact">
                  <Text style={styles.paragraph}>{md.relationshipImpact || ''}</Text>
                </SubSection>

                <SubSection title="Health Impact">
                  <Text style={styles.paragraph}>{md.healthImpact || ''}</Text>
                </SubSection>

                <SubSection title="Financial Impact">
                  <Text style={styles.paragraph}>{md.financialImpact || ''}</Text>
                </SubSection>

                <SubSection title="Spiritual Growth">
                  <Text style={styles.paragraph}>{md.spiritualGrowth || ''}</Text>
                </SubSection>

                {md.keyEvents && md.keyEvents.length > 0 && (
                  <SubSection title="Key Events">
                    <BulletList items={md.keyEvents} />
                  </SubSection>
                )}

                <View style={styles.grid2}>
                  {md.opportunities && md.opportunities.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Opportunities')}</Text>
                      <BulletList items={md.opportunities} />
                    </View>
                  )}
                  {md.challenges && md.challenges.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Challenges')}</Text>
                      <BulletList items={md.challenges} />
                    </View>
                  )}
                </View>

                {md.remedies && md.remedies.length > 0 && (
                  <SubSection title="Recommended Remedies">
                    <BulletList items={md.remedies} />
                  </SubSection>
                )}
              </Section>
            </ContentPage>
          ))}
        </>
      )}

      {/* Dasha Predictions - Antardasha Details */}
      {report.dasha?.antardashaPredictions && report.dasha.antardashaPredictions.length > 0 && (
        <ContentPage sectionName="Antardasha Predictions">
          <Section title="Antardasha Predictions (Current Mahadasha)">
            <Text style={styles.paragraph}>
              {localizePdfUiText('The following are the current and upcoming sub-periods (Antardashas) within your current Mahadasha. Completed past Antardashas are intentionally excluded so this section stays forward-looking and actionable.')}
            </Text>
            
            {report.dasha.antardashaPredictions.map((ad: any, idx: number) => (
              <Card key={idx} title={`${localizePdfUiText(formatDashaPair(ad.mahadasha, ad.antardasha))} (${ad.duration || ''})`}>
                {(() => {
                  const adDates = resolveAdDates(ad.antardasha, ad.startDate, ad.endDate);
                  return <InfoRow label="Period" value={`${adDates.start} to ${adDates.end}`} />;
                })()}
                <Text style={styles.paragraph}>{ad.overview || ''}</Text>
                
                {ad.focusAreas && ad.focusAreas.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Focus Areas')}</Text>
                    <BulletList items={ad.focusAreas} />
                  </>
                )}
                
                {ad.predictions && ad.predictions.length > 0 && (
                  <>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Predictions')}</Text>
                    <BulletList items={ad.predictions} />
                  </>
                )}
                
                {ad.advice && (
                  <View style={styles.highlight}>
                    <Text style={styles.bodyText}>{ad.advice}</Text>
                  </View>
                )}
              </Card>
            ))}
          </Section>
        </ContentPage>
      )}

      {/* Dasha Predictions - Upcoming Mahadasha Antardasha Details */}
      {report.dasha?.upcomingMahadashaAntardashaPredictions && report.dasha.upcomingMahadashaAntardashaPredictions.length > 0 && (
        <>
          {report.dasha.upcomingMahadashaAntardashaPredictions.map((mdGroup: any, mdIdx: number) => (
            <ContentPage key={`upcoming-md-ad-${mdIdx}`} sectionName={`${mdGroup.mahadasha} Antardashas`}>
              <Section title={`${mdGroup.mahadasha} Mahadasha - Antardasha Predictions`}>
                <View style={styles.card}>
                  <InfoRow label="Mahadasha Period" value={`${mdGroup.startDate || ''} to ${mdGroup.endDate || ''}`} />
                </View>
                <Text style={styles.paragraph}>{mdGroup.overview || ''}</Text>

                {(mdGroup.antardashas || []).map((ad: any, idx: number) => (
                  <Card key={idx} title={`${mdGroup.mahadasha}/${ad.antardasha} (${ad.duration || ''})`}>
                    <InfoRow label="Period" value={`${ad.startDate || ''} to ${ad.endDate || ''}`} />
                    <Text style={styles.paragraph}>{ad.interpretation || ''}</Text>

                    {ad.focusAreas && ad.focusAreas.length > 0 && (
                      <>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Focus Areas')}</Text>
                        <BulletList items={ad.focusAreas} />
                      </>
                    )}

                    {ad.advice && (
                      <View style={styles.highlight}>
                        <Text style={styles.bodyText}>{ad.advice}</Text>
                      </View>
                    )}
                  </Card>
                ))}
              </Section>
            </ContentPage>
          ))}
        </>
      )}

      {/* Yogini Dasha Section */}
      {report.dasha?.yoginiDasha && (
        <ContentPage sectionName="Yogini Dasha">
          <Section title="Yogini Dasha System">
            <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.yoginiDasha.systemExplanation || '')}</Text>

            <SubSection title={`${localizePdfUiText('Current Yogini')}: ${localizePdfUiText(report.dasha.yoginiDasha.currentYogini?.name || 'N/A')}`}>
              <View style={styles.card}>
                <InfoRow label="Associated Planet" value={localizePdfUiText(report.dasha.yoginiDasha.currentYogini?.planet || 'N/A')} />
                <InfoRow label="Duration" value={`${report.dasha.yoginiDasha.currentYogini?.years || 0} ${localizePdfUiText('years')}`} />
                <InfoRow label="Period" value={`${report.dasha.yoginiDasha.currentYogini?.startDate || ''} to ${report.dasha.yoginiDasha.currentYogini?.endDate || ''}`} />
              </View>

              <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.yoginiDasha.currentYogini?.characteristics || '')}</Text>
              
              {report.dasha.yoginiDasha.currentYogini?.lifeThemes && report.dasha.yoginiDasha.currentYogini.lifeThemes.length > 0 && (
                <>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Life Themes')}</Text>
                  <BulletList items={report.dasha.yoginiDasha.currentYogini.lifeThemes} />
                </>
              )}
              
              <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.yoginiDasha.currentYogini?.predictions || '')}</Text>
            </SubSection>

            <SubSection title="Upcoming Yogini Periods">
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Yogini')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Years')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Period')}</Text>
                </View>
                {(report.dasha.yoginiDasha.upcomingYoginis || []).map((y: any, idx: number) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{localizePdfUiText(y.name)}</Text>
                    <Text style={styles.tableCell}>{localizePdfUiText(y.planet)}</Text>
                    <Text style={styles.tableCell}>{y.years}</Text>
                    <Text style={styles.tableCell}>{y.approximatePeriod}</Text>
                  </View>
                ))}
              </View>

              {(report.dasha.yoginiDasha.upcomingYoginis || []).slice(0, 3).map((y: any, idx: number) => (
                <Card key={idx} title={`${localizePdfUiText(y.name)} (${localizePdfUiText(y.planet)})`}>
                  <Text style={styles.paragraph}>{localizePdfUiText(y.briefPrediction)}</Text>
                </Card>
              ))}
            </SubSection>

            <SubSection title="Complete Yogini Dasha Cycle (36 Years)">
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Yogini')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Years')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Nature')}</Text>
                </View>
                {(report.dasha.yoginiDasha.yoginiSequence || []).map((y: any, idx: number) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{localizePdfUiText(y.name)}</Text>
                    <Text style={styles.tableCell}>{localizePdfUiText(y.planet)}</Text>
                    <Text style={styles.tableCell}>{y.years}</Text>
                    <Text style={styles.tableCell}>{localizePdfUiText(y.nature)}</Text>
                  </View>
                ))}
              </View>
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* Dasha Predictions - Page 3: Upcoming Periods & Sequence */}
      {report.dasha && (
        <ContentPage sectionName="Dasha Sequence">
          <Section title="Dasha Sequence & Timing">
            {/* Upcoming Antardashas within current Mahadasha */}
            {report.dasha.upcomingDashas && report.dasha.upcomingDashas.length > 0 && (
              <SubSection title="Upcoming Periods">
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Type')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Period')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Focus')}</Text>
                  </View>
                  {report.dasha.upcomingDashas.map((dasha: any, idx: number) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{localizePdfUiText(dasha.type)}</Text>
                      <Text style={styles.tableCell}>{localizePdfUiText(dasha.planet)}</Text>
                      <Text style={styles.tableCell}>{dasha.period}</Text>
                      <Text style={styles.tableCell}>{localizePdfUiText(dasha.focus)}</Text>
                    </View>
                  ))}
                </View>
              </SubSection>
            )}

            <SubSection title="Complete Dasha Sequence (Vimshottari 120-Year Cycle)">
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Years')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Approximate Period')}</Text>
                  <Text style={styles.tableHeaderCell}>{localizePdfUiText('Life Focus')}</Text>
                </View>
                {(report.dasha.dashaSequence || []).map((dasha: any, idx: number) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{localizePdfUiText(dasha.planet)}</Text>
                    <Text style={styles.tableCell}>{dasha.years}</Text>
                    <Text style={styles.tableCell}>{dasha.approximatePeriod}</Text>
                    <Text style={styles.tableCell}>{localizePdfUiText(dasha.lifeFocus)}</Text>
                  </View>
                ))}
              </View>
            </SubSection>

            {report.dasha.currentTransitImpact && (
              <SubSection title="Current Transit Impact">
                <Text style={styles.paragraph}>{localizePdfUiText(report.dasha.currentTransitImpact)}</Text>
              </SubSection>
            )}

            {report.dasha.periodRecommendations && report.dasha.periodRecommendations.length > 0 && (
              <SubSection title="Period Recommendations">
                <BulletList items={report.dasha.periodRecommendations} />
              </SubSection>
            )}

            <SubSection title="Spiritual Guidance">
              <View style={styles.highlight}>
                <Text style={styles.bodyText}>{localizePdfUiText(report.dasha.spiritualGuidance || '')}</Text>
              </View>
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* ═══════════════════════════════════════════════════════
          PART 06 — DOSHAS, YOGAS & KARMA
          ═══════════════════════════════════════════════════════ */}
      <SectionDividerPage
        partNumber="06"
        title="Doshas, Yogas & Karma"
        subtitle="Karmic imbalances, auspicious combinations, and the Rahu-Ketu axis that defines your soul's evolutionary mission"
      />

      {/* Rahu-Ketu Analysis */}
      {report.rahuKetu && (
        <ContentPage sectionName="Rahu-Ketu Axis">
          <Section title="Rahu-Ketu Karmic Axis">
            <Text style={styles.paragraph}>{localizePdfUiText(report.rahuKetu.overview || '')}</Text>

            <SubSection title="Karmic Axis">
              <InfoRow label="Rahu" value={`${localizePdfUiText(report.rahuKetu.karmicAxis?.rahuSign || '')} (${localizePdfUiText('House')} ${report.rahuKetu.karmicAxis?.rahuHouse || ''})`} />
              <InfoRow label="Ketu" value={`${localizePdfUiText(report.rahuKetu.karmicAxis?.ketuSign || '')} (${localizePdfUiText('House')} ${report.rahuKetu.karmicAxis?.ketuHouse || ''})`} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.rahuKetu.karmicAxis?.axisInterpretation || '')}</Text>
              <View style={styles.highlight}>
                <Text style={styles.boldLabel}>{localizePdfUiText('Life Lesson')}: </Text>
                <Text style={styles.bodyText}>{localizePdfUiText(report.rahuKetu.karmicAxis?.lifeLesson || '')}</Text>
              </View>
            </SubSection>

            <SubSection title="Rahu Analysis (Future Direction)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.rahuKetu.rahuAnalysis?.interpretation || '')}</Text>
              <InfoRow label="Desires" value={report.rahuKetu.rahuAnalysis?.desires || 'N/A'} />
              <InfoRow label="Growth Areas" value={report.rahuKetu.rahuAnalysis?.growthAreas || 'N/A'} />
            </SubSection>

            <SubSection title="Ketu Analysis (Past Life Karma)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.rahuKetu.ketuAnalysis?.interpretation || '')}</Text>
              <InfoRow label="Natural Talents" value={report.rahuKetu.ketuAnalysis?.naturalTalents || 'N/A'} />
              <InfoRow label="Spiritual Gifts" value={report.rahuKetu.ketuAnalysis?.spiritualGifts || 'N/A'} />
            </SubSection>

            {report.rahuKetu.kaalSarpYoga?.present && (
              <SubSection title="Kaal Sarp Yoga">
                <View style={styles.highlight}>
                  <Text style={styles.boldLabel}>{localizePdfUiText('Type')}: {report.rahuKetu.kaalSarpYoga.type}</Text>
                  <Text style={styles.bodyText}>{localizePdfUiText('Severity')}: {report.rahuKetu.kaalSarpYoga.severity}</Text>
                </View>
                <Text style={styles.paragraph}>{localizePdfUiText(report.rahuKetu.kaalSarpYoga.effects || '')}</Text>
                <Text style={styles.subSubHeader}>{localizePdfUiText('Remedies')}</Text>
                <BulletList items={report.rahuKetu.kaalSarpYoga.remedies || []} />
              </SubSection>
            )}

            <SubSection title="Spiritual Path">
              <Text style={styles.paragraph}>{localizePdfUiText(report.rahuKetu.spiritualPath || '')}</Text>
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* Doshas Analysis - Standardized Template */}
      {report.doshas && (
        <>
          <ContentPage sectionName="Dosha Analysis">
            <Section title="Dosha Analysis">
              <Text style={styles.paragraph}>{localizePdfUiText(report.doshas.overview || '')}</Text>
              
              <View style={styles.highlight}>
                <Text style={styles.boldLabel}>{localizePdfUiText('Total Doshas Detected')}: {doshaDisplayTotal}</Text>
              </View>
              {removedSadeSatiDoshaCount > 0 && (
                <View style={styles.infoBox}>
                  <Text style={styles.bodyText}>
                    {localizePdfUiText('Sade Sati cards are intentionally removed from Dosha pages and handled only in the dedicated Sade Sati section to prevent conflicting status.')}
                  </Text>
                </View>
              )}

              <SubSection title="Major Doshas">
                {majorDoshasFiltered.map((dosha: any, idx: number) => (
                  <Card key={idx} title={`${ACTIVE_PDF_LANGUAGE !== 'en' && dosha.nameHindi ? sanitizeText(dosha.nameHindi) : dosha.name}`}>
                    <InfoStrip items={[
                      { label: 'Status', value: localizePdfUiText(dosha.status?.toUpperCase() || 'N/A') },
                      { label: 'Severity', value: localizePdfUiText(dosha.severity?.toUpperCase() || 'N/A') },
                    ]} />
                    
                    <Text style={styles.paragraph}>{localizePdfUiText(dosha.description)}</Text>

                    {dosha.cause && (
                      <>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Cause')}</Text>
                        <Text style={styles.bodyText}>{localizePdfUiText(dosha.cause)}</Text>
                      </>
                    )}
                    
                    {dosha.effects && dosha.effects.length > 0 && (
                      <>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Effects')}</Text>
                        <BulletList items={dosha.effects} />
                      </>
                    )}
                    
                    {dosha.affectedLifeAreas && dosha.affectedLifeAreas.length > 0 && (
                      <InfoRow label="Affected Areas" value={dosha.affectedLifeAreas.join(', ')} />
                    )}
                    
                    {dosha.nullificationReason && (
                      <View style={styles.highlight}>
                        <Text style={styles.successText}>{localizePdfUiText('Nullified')}: {dosha.nullificationReason}</Text>
                      </View>
                    )}
                    
                    <Text style={styles.scriptural}>{localizePdfUiText(dosha.scripturalReference)}</Text>
                  </Card>
                ))}
              </SubSection>
            </Section>
          </ContentPage>

          {/* Minor Doshas */}
          {minorDoshasFiltered.length > 0 && (
            <ContentPage sectionName="Minor Doshas">
              <Section title="Minor Doshas">
                {minorDoshasFiltered.map((dosha: any, idx: number) => (
                  <Card key={idx} title={`${ACTIVE_PDF_LANGUAGE !== 'en' && dosha.nameHindi ? sanitizeText(dosha.nameHindi) : dosha.name}`}>
                    <InfoStrip items={[
                      { label: 'Status', value: localizePdfUiText(dosha.status?.toUpperCase() || 'N/A') },
                    ]} />
                    <Text style={styles.paragraph}>{localizePdfUiText(dosha.description)}</Text>
                    {dosha.cause && <Text style={styles.bodyText}>{localizePdfUiText('Cause')}: {localizePdfUiText(dosha.cause)}</Text>}
                    {dosha.effects && dosha.effects.length > 0 && <BulletList items={dosha.effects} />}
                  </Card>
                ))}
              </Section>
            </ContentPage>
          )}

          {/* Dosha Remedies */}
          {doshaRemediesFiltered.length > 0 && (
            <ContentPage sectionName="Dosha Remedies">
              <Section title="Dosha Remedies">
                <SubSection title="Priority Remedies">
                  {report.doshas.priorityRemedies && (
                    <>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Immediate (Start Now)')}</Text>
                      <BulletList items={report.doshas.priorityRemedies.immediate || []} />

                      <Text style={styles.subSubHeader}>{localizePdfUiText('Short-Term (1-3 Months)')}</Text>
                      <BulletList items={report.doshas.priorityRemedies.shortTerm || []} />

                      <Text style={styles.subSubHeader}>{localizePdfUiText('Long-Term (Ongoing)')}</Text>
                      <BulletList items={report.doshas.priorityRemedies.longTerm || []} />
                    </>
                  )}
                </SubSection>

                {doshaRemediesFiltered.map((remedy: any, idx: number) => (
                  <Card key={idx} title={`${localizePdfUiText('Remedies for')} ${remedy.doshaName}`}>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Primary Remedy')}: {remedy.primaryRemedy?.name}</Text>
                    <InfoRow label="Type" value={remedy.primaryRemedy?.type || 'N/A'} />
                    <Text style={styles.bodyText}>{localizePdfUiText(remedy.primaryRemedy?.description)}</Text>

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Procedure')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(remedy.primaryRemedy?.procedure)}</Text>

                    <InfoRow label="Timing" value={remedy.primaryRemedy?.timing || 'N/A'} />

                    {remedy.primaryRemedy?.expectedBenefits && (
                      <>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Expected Benefits')}</Text>
                        <BulletList items={remedy.primaryRemedy.expectedBenefits} />
                      </>
                    )}
                    
                    <Text style={styles.scriptural}>{localizePdfUiText(remedy.primaryRemedy?.scripturalBasis)}</Text>
                    
                    {remedy.mantras && remedy.mantras.length > 0 && (
                      <>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Mantras')}</Text>
                        {remedy.mantras.map((m: any, mIdx: number) => (
                          <View key={mIdx} style={{ marginBottom: 5 }}>
                            <Text style={[styles.boldLabel, { color: '#c2410c' }]}>{m.mantra}</Text>
                            <Text style={styles.bodyText}>{localizePdfUiText('Deity')}: {m.deity} | {localizePdfUiText('Count')}: {m.japaCount} | {localizePdfUiText('Timing')}: {m.timing}</Text>
                          </View>
                        ))}
                      </>
                    )}
                  </Card>
                ))}

                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>{localizePdfUiText(report.doshas.generalGuidance || '')}</Text>
                </View>

                <Text style={styles.scriptural}>{localizePdfUiText(report.doshas.disclaimerNote || '')}</Text>
              </Section>
            </ContentPage>
          )}
        </>
      )}

      {/* Raj Yogs Analysis - Standardized Template */}
      {report.rajYogs && (
        <>
          <ContentPage sectionName="Raja Yogas">
            <Section title="Raja Yogas (Auspicious Combinations)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.rajYogs.overview || '')}</Text>

              <View style={styles.highlight}>
                <Text style={styles.boldLabel}>{localizePdfUiText('Total Yogas Detected')}: {report.rajYogs.totalYogasDetected || 0}</Text>
                <Text style={styles.bodyText}>{localizePdfUiText('Overall Strength')}: {localizePdfUiText(report.rajYogs.overallYogaStrength?.rating?.toUpperCase() || 'N/A')}</Text>
              </View>

              <Text style={styles.paragraph}>{localizePdfUiText(report.rajYogs.overallYogaStrength?.description || '')}</Text>

              <SubSection title="Raja Yogas (Power & Success)">
                {(report.rajYogs.rajYogas || []).filter((y: any) => y.isPresent).map((yoga: any, idx: number) => (
                  <Card key={idx} title={`${ACTIVE_PDF_LANGUAGE !== 'en' && yoga.nameHindi ? sanitizeText(yoga.nameHindi) : yoga.name}`}>
                    <InfoStrip items={[
                      { label: 'Strength', value: yoga.strength?.toUpperCase() || 'N/A' },
                      { label: 'Activation', value: yoga.activationPeriod || 'N/A' },
                    ]} />
                    
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Definition')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(yoga.definition)}</Text>

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Formation in Your Chart')}</Text>
                    <View style={styles.highlight}>
                      <Text style={styles.bodyText}>{localizePdfUiText(yoga.formationInChart)}</Text>
                    </View>

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Benefits')}</Text>
                    <BulletList items={yoga.benefits || []} />

                    <InfoRow label="Activation Period" value={localizePdfUiText(yoga.activationPeriod || 'N/A')} />

                    <Text style={styles.scriptural}>{localizePdfUiText(yoga.scripturalReference)}</Text>
                  </Card>
                ))}
              </SubSection>
            </Section>
          </ContentPage>

          {/* Dhana Yogas */}
          {report.rajYogs.dhanaYogas && report.rajYogs.dhanaYogas.filter((y: any) => y.isPresent).length > 0 && (
            <ContentPage sectionName="Dhana Yogas">
              <Section title="Dhana Yogas (Wealth Combinations)">
                {report.rajYogs.dhanaYogas.filter((y: any) => y.isPresent).map((yoga: any, idx: number) => (
                  <Card key={idx} title={`${ACTIVE_PDF_LANGUAGE !== 'en' && yoga.nameHindi ? sanitizeText(yoga.nameHindi) : yoga.name}`}>
                    <InfoStrip items={[
                      { label: 'Strength', value: yoga.strength?.toUpperCase() || 'N/A' },
                    ]} />
                    <Text style={styles.bodyText}>{localizePdfUiText(yoga.definition)}</Text>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('In Your Chart')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(yoga.formationInChart)}</Text>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Benefits')}</Text>
                    <BulletList items={yoga.benefits || []} />
                    <InfoRow label="Activation" value={localizePdfUiText(yoga.activationPeriod || 'N/A')} />
                  </Card>
                ))}
              </Section>
            </ContentPage>
          )}

          {/* Life Predictions from Yogas */}
          {report.rajYogs.lifePredictions && (
            <ContentPage sectionName="Life Predictions from Yogas">
              <Section title="Life Predictions Based on Yogas">
                <SubSection title="Career">
                  <InfoRow label="Strength" value={localizePdfUiText(report.rajYogs.lifePredictions.career?.strength || 'N/A')} />
                  <Text style={styles.paragraph}>{localizePdfUiText(report.rajYogs.lifePredictions.career?.prediction || '')}</Text>
                  <InfoRow label="Peak Period" value={report.rajYogs.lifePredictions.career?.peakPeriod || 'N/A'} />
                </SubSection>

                <SubSection title="Wealth">
                  <InfoRow label="Strength" value={localizePdfUiText(report.rajYogs.lifePredictions.wealth?.strength || 'N/A')} />
                  <Text style={styles.paragraph}>{localizePdfUiText(report.rajYogs.lifePredictions.wealth?.prediction || '')}</Text>
                  <InfoRow label="Peak Period" value={report.rajYogs.lifePredictions.wealth?.peakPeriod || 'N/A'} />
                </SubSection>

                <SubSection title="Fame & Recognition">
                  <InfoRow label="Strength" value={localizePdfUiText(report.rajYogs.lifePredictions.fame?.strength || 'N/A')} />
                  <Text style={styles.paragraph}>{localizePdfUiText(report.rajYogs.lifePredictions.fame?.prediction || '')}</Text>
                  <InfoRow label="Peak Period" value={report.rajYogs.lifePredictions.fame?.peakPeriod || 'N/A'} />
                </SubSection>

                <SubSection title="Spirituality">
                  <InfoRow label="Strength" value={localizePdfUiText(report.rajYogs.lifePredictions.spirituality?.strength || 'N/A')} />
                  <Text style={styles.paragraph}>{localizePdfUiText(report.rajYogs.lifePredictions.spirituality?.prediction || '')}</Text>
                  <InfoRow label="Peak Period" value={report.rajYogs.lifePredictions.spirituality?.peakPeriod || 'N/A'} />
                </SubSection>

                {report.rajYogs.yogaEnhancement && (
                  <SubSection title="Yoga Enhancement">
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Practices to Strengthen Yogas')}</Text>
                    <BulletList items={report.rajYogs.yogaEnhancement.practices || []} />
                    
                    {report.rajYogs.yogaEnhancement.mantras && report.rajYogs.yogaEnhancement.mantras.length > 0 && (
                      <>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Mantras')}</Text>
                        {report.rajYogs.yogaEnhancement.mantras.map((m: any, idx: number) => (
                          <View key={idx} style={{ marginBottom: 5 }}>
                            <Text style={styles.boldLabel}>{m.mantra}</Text>
                            <Text style={styles.bodyText}>{localizePdfUiText('Purpose')}: {m.purpose} | {localizePdfUiText('Timing')}: {m.timing}</Text>
                          </View>
                        ))}
                      </>
                    )}
                    
                    <InfoRow label="Recommended Gemstones" value={(report.rajYogs.yogaEnhancement.gemstones || []).join(', ')} />
                    <InfoRow label="Favorable Periods" value={(report.rajYogs.yogaEnhancement.favorablePeriods || []).join(', ')} />
                  </SubSection>
                )}

                <View style={styles.highlight}>
                  <Text style={styles.bodyText}>{localizePdfUiText(report.rajYogs.summaryNote || '')}</Text>
                </View>
              </Section>
            </ContentPage>
          )}

          {/* Challenging Yogas */}
          {report.rajYogs.challengingYogas && report.rajYogs.challengingYogas.filter((y: any) => y.isPresent).length > 0 && (
            <ContentPage sectionName="Challenging Yogas">
              <Section title="Challenging Yogas (For Awareness)">
                <Text style={styles.paragraph}>
                  {localizePdfUiText('The following challenging combinations are present in your chart. Awareness of these helps you navigate difficulties and apply appropriate remedies.')}
                </Text>
                {report.rajYogs.challengingYogas.filter((y: any) => y.isPresent).map((yoga: any, idx: number) => (
                  <Card key={idx} title={`${ACTIVE_PDF_LANGUAGE !== 'en' && yoga.nameHindi ? sanitizeText(yoga.nameHindi) : yoga.name}`}>
                    <Text style={styles.bodyText}>{localizePdfUiText(yoga.definition)}</Text>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('In Your Chart')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(yoga.formationInChart)}</Text>
                    <Text style={styles.subSubHeader}>{localizePdfUiText('Effects')}</Text>
                    <BulletList items={yoga.benefits || []} />
                  </Card>
                ))}
              </Section>
            </ContentPage>
          )}
        </>
      )}

      {/* ─── Sade Sati — Saturn's 7.5-Year Transit ─────────────────────────── */}
      {report.sadeSati && (
        <>
          {/* Page 1: Overview & Current Status */}
          <ContentPage sectionName="Sade Sati">
            <Section title="Sade Sati — Saturn's 7.5-Year Transit">
              <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.overview || '')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.importanceExplanation || '')}</Text>

              <SubSection title="Your Sade Sati Status">
                <View style={styles.highlight}>
                  <View style={styles.row}>
                    <Text style={styles.label}>{localizePdfUiText('Moon Sign')}</Text>
                    <Text style={[styles.value, { fontWeight: 'bold' }]}>
                      {sadeSatiMoonSign || 'N/A'}{ACTIVE_PDF_LANGUAGE !== 'en' && report.sadeSati.moonSignHindi ? ` (${sanitizeText(report.sadeSati.moonSignHindi)})` : ''}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>{localizePdfUiText('Transit Saturn')}</Text>
                    <Text style={styles.value}>{sadeSatiTransitSign}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>{localizePdfUiText('Currently Active')}</Text>
                    <Text style={[styles.value, { fontWeight: 'bold', color: sadeSatiIsActive ? '#dc2626' : '#059669' }]}>
                      {sadeSatiIsActive
                        ? localizePdfUiText('YES — ACTIVE NOW')
                        : localizePdfUiText('Not Currently Active')}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.label}>{localizePdfUiText('Current Phase')}</Text>
                    <Text style={styles.value}>
                      {sadeSatiCurrentPhaseLabel}
                    </Text>
                  </View>
                </View>
                {report.sadeSati.currentPhaseInterpretation && (
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.currentPhaseInterpretation)}</Text>
                )}
              </SubSection>

              <SubSection title="The Moon-Saturn Relationship in Your Chart">
                <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.moonSaturnRelationship || '')}</Text>
              </SubSection>
            </Section>
          </ContentPage>

          {/* Page 2: The Three Phases */}
          {sadeSatiPhasesForDisplay.length > 0 && (
            <ContentPage sectionName="Sade Sati">
              <Section title="The Three Phases of Your Sade Sati">
                <Text style={styles.scriptural}>
                  {localizePdfUiText('Month-level periods below are approximate transit windows derived from Saturn phase sequencing.')}
                </Text>
                {sadeSatiPhasesForDisplay.map((phase: any, idx: number) => (
                  <View key={idx} style={{ marginBottom: 6 }}>
                    <Text style={styles.subHeader}>{phase.phaseName}</Text>
                    <View style={styles.card}>
                      <View style={styles.row}>
                        <Text style={styles.label}>{localizePdfUiText('Saturn Sign')}</Text>
                        <Text style={styles.value}>{phase.saturnSign || 'N/A'}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>{localizePdfUiText('Period')}</Text>
                        <Text style={styles.value}>{phase.periodLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.paragraph}>{localizePdfUiText(phase.description || '')}</Text>
                    <View style={styles.grid2}>
                      {phase.challenges && phase.challenges.length > 0 && (
                        <View style={styles.gridItem}>
                          <Text style={styles.subSubHeader}>{localizePdfUiText('Challenges to Navigate')}</Text>
                          <BulletList items={phase.challenges} />
                        </View>
                      )}
                      {phase.hidden_blessings && phase.hidden_blessings.length > 0 && (
                        <View style={styles.gridItem}>
                          <Text style={styles.subSubHeader}>{localizePdfUiText('Hidden Blessings')}</Text>
                          <BulletList items={phase.hidden_blessings} />
                        </View>
                      )}
                    </View>
                    {phase.advice && (
                      <View style={styles.highlight}>
                        <Text style={[styles.boldLabel, { marginBottom: 2 }]}>{localizePdfUiText('Guidance for This Phase')}</Text>
                        <Text style={styles.bodyText}>{localizePdfUiText(phase.advice)}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </Section>
            </ContentPage>
          )}

          {/* Page 3: Detailed Period Analysis */}
          <ContentPage sectionName="Sade Sati">
            <Section title="Sade Sati — Detailed Analysis">
              {/* Current / Past Sade Sati */}
              {report.sadeSati.currentSadeSati && (
                <SubSection title={`Current Sade Sati: ${report.sadeSati.currentSadeSati.period}`}>
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.currentSadeSati.overallTheme || '')}</Text>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Phase 1 — The Rising (Building Pressure)')}</Text>
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.currentSadeSati.phase1 || '')}</Text>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Phase 2 — The Peak (Maximum Intensity)')}</Text>
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.currentSadeSati.phase2 || '')}</Text>
                  <Text style={styles.subSubHeader}>{localizePdfUiText('Phase 3 — The Setting (Harvest & Release)')}</Text>
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.currentSadeSati.phase3 || '')}</Text>
                  <View style={styles.grid2}>
                    {report.sadeSati.currentSadeSati.whatToExpect && (
                      <View style={styles.gridItem}>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('What to Expect')}</Text>
                        <BulletList items={report.sadeSati.currentSadeSati.whatToExpect} />
                      </View>
                    )}
                    {report.sadeSati.currentSadeSati.opportunities && (
                      <View style={styles.gridItem}>
                        <Text style={styles.subSubHeader}>{localizePdfUiText('Unique Opportunities')}</Text>
                        <BulletList items={report.sadeSati.currentSadeSati.opportunities} />
                      </View>
                    )}
                  </View>
                  {report.sadeSati.currentSadeSati.whatNotToDo && (
                    <>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('What to Avoid')}</Text>
                      <BulletList items={report.sadeSati.currentSadeSati.whatNotToDo} />
                    </>
                  )}
                  {report.sadeSati.currentSadeSati.advice && (
                    <View style={[styles.highlight, { marginTop: 4 }]}>
                      <Text style={[styles.boldLabel, { marginBottom: 4 }]}>{localizePdfUiText('Master Guidance for Your Sade Sati')}</Text>
                      <Text style={styles.bodyText}>{localizePdfUiText(report.sadeSati.currentSadeSati.advice)}</Text>
                    </View>
                  )}
                </SubSection>
              )}

              {report.sadeSati.pastSadeSati && !report.sadeSati.currentSadeSati && (
                <SubSection title={`Past Sade Sati: ${report.sadeSati.pastSadeSati.period}`}>
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.pastSadeSati.keyLessons || '')}</Text>
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.pastSadeSati.lifeEvents || '')}</Text>
                </SubSection>
              )}

              {report.sadeSati.nextSadeSati && (
                <SubSection title={`Next Sade Sati: ${report.sadeSati.nextSadeSati.period}`}>
                  <InfoRow label="Approximate Start" value={report.sadeSati.nextSadeSati.approximateStart || 'N/A'} />
                  <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.nextSadeSati.preparationAdvice || '')}</Text>
                </SubSection>
              )}
            </Section>
          </ContentPage>

          {/* Page 4: Remedies & Spiritual Significance */}
          <ContentPage sectionName="Sade Sati">
            <Section title="Sade Sati — Remedies & Spiritual Significance">
              <SubSection title="Spiritual Significance">
                <Text style={styles.paragraph}>{localizePdfUiText(report.sadeSati.spiritualSignificance || '')}</Text>
              </SubSection>

              {report.sadeSati.remedies && report.sadeSati.remedies.length > 0 && (
                <SubSection title="Powerful Remedies for Sade Sati">
                  <BulletList items={report.sadeSati.remedies} />
                </SubSection>
              )}

              {report.sadeSati.mantras && report.sadeSati.mantras.length > 0 && (
                <SubSection title="Sacred Mantras">
                  {report.sadeSati.mantras.map((m: any, idx: number) => (
                    <View key={idx} style={[styles.card, { marginBottom: 8 }]}>
                      <Text style={[styles.boldLabel, { color: '#9a3412', marginBottom: 2 }]}>{m.mantra}</Text>
                      <View style={styles.row}>
                        <Text style={styles.label}>{localizePdfUiText('Purpose')}</Text>
                        <Text style={styles.value}>{m.purpose}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={styles.label}>{localizePdfUiText('Best Time')}</Text>
                        <Text style={styles.value}>{m.timing}</Text>
                      </View>
                    </View>
                  ))}
                </SubSection>
              )}

              {report.sadeSati.famousPeopleThrivedDuringSadeSati && (
                <View style={styles.highlight}>
                  <Text style={[styles.boldLabel, { marginBottom: 2 }]}>{localizePdfUiText('Inspiration — Famous People Who Thrived During Sade Sati')}</Text>
                  <Text style={styles.scriptural}>{localizePdfUiText(report.sadeSati.famousPeopleThrivedDuringSadeSati)}</Text>
                </View>
              )}
            </Section>
          </ContentPage>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════
          PART 07 — NUMEROLOGY & SPIRITUAL POTENTIAL
          ═══════════════════════════════════════════════════════ */}
      <SectionDividerPage
        partNumber="07"
        title="Numerology & Spiritual Potential"
        subtitle="Sacred numbers, your soul's purpose, and the spiritual path written in your chart"
      />

      {/* Numerology */}
      {report.numerology && (
        <ContentPage sectionName="Numerology Analysis">
          <Section title="Numerology Analysis">
            <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.overview || '')}</Text>

            <SubSection title={`${localizePdfUiText('Birth Number (Mulank)')}: ${report.numerology.birthNumber?.number || ''}`}>
              <InfoRow label="Planet" value={localizePdfUiText(report.numerology.birthNumber?.planet || 'N/A')} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.birthNumber?.interpretation || '')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.birthNumber?.personality || '')}</Text>
            </SubSection>

            <SubSection title={`${localizePdfUiText('Destiny Number (Bhagyank)')}: ${report.numerology.destinyNumber?.number || ''}`}>
              <InfoRow label="Planet" value={localizePdfUiText(report.numerology.destinyNumber?.planet || 'N/A')} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.destinyNumber?.interpretation || '')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.destinyNumber?.lifePath || '')}</Text>
            </SubSection>

            <SubSection title={`${localizePdfUiText('Name Number')}: ${report.numerology.nameNumber?.number || ''}`}>
              <InfoRow label="Planet" value={localizePdfUiText(report.numerology.nameNumber?.planet || 'N/A')} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.nameNumber?.interpretation || '')}</Text>
            </SubSection>

            <SubSection title="Lucky Associations">
              <InfoRow label="Lucky Numbers" value={(report.numerology.luckyNumbers || []).join(', ')} />
              <InfoRow label="Unlucky Numbers" value={(report.numerology.unluckyNumbers || []).join(', ')} />
              <InfoRow label="Lucky Days" value={(report.numerology.luckyDays || []).join(', ')} />
              <InfoRow label="Lucky Colors" value={(report.numerology.luckyColors || []).join(', ')} />
            </SubSection>

            <SubSection title={`Personal Year ${new Date().getFullYear()}: ${report.numerology.yearPrediction?.personalYear || ''}`}>
              <Text style={styles.paragraph}>{localizePdfUiText(report.numerology.yearPrediction?.interpretation || '')}</Text>
              {report.numerology.yearPrediction?.themes && (
                <BulletList items={report.numerology.yearPrediction.themes} />
              )}
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* Spiritual Potential */}
      {report.spiritual && (
        <ContentPage sectionName="Spiritual Potential">
          <Section title="Spiritual Potential">
            <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.overview || '')}</Text>

            <SubSection title="Spiritual Rating">
              <View style={styles.highlight}>
                <Text style={styles.boldLabel}>{localizePdfUiText(report.spiritual.spiritualPotential?.rating || 'N/A')}</Text>
              </View>
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.spiritualPotential?.interpretation || '')}</Text>
            </SubSection>

            <SubSection title="Atmakaraka (Soul Purpose)">
              <InfoRow label="Planet" value={localizePdfUiText(report.spiritual.atmakaraka?.planet || 'N/A')} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.atmakaraka?.soulPurpose || '')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.atmakaraka?.spiritualLesson || '')}</Text>
            </SubSection>

            <SubSection title="9th House (Dharma)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.ninthHouse?.interpretation || '')}</Text>
              <InfoRow label="Dharma Path" value={report.spiritual.ninthHouse?.dharmaPath || 'N/A'} />
            </SubSection>

            <SubSection title="12th House (Moksha)">
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.twelfthHouse?.interpretation || '')}</Text>
              <InfoRow label="Liberation Path" value={report.spiritual.twelfthHouse?.mokshaIndications || 'N/A'} />
            </SubSection>

            <SubSection title="Ishta Devata (Personal Deity)">
              <InfoRow label="Deity" value={report.spiritual.ishtaDevata?.deity || 'N/A'} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.ishtaDevata?.reason || '')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.ishtaDevata?.worship || '')}</Text>
            </SubSection>

            <SubSection title="Meditation Guidance">
              <InfoRow label="Style" value={report.spiritual.meditationStyle?.recommended || 'N/A'} />
              <InfoRow label="Best Timing" value={report.spiritual.meditationStyle?.timing || 'N/A'} />
              {report.spiritual.meditationStyle?.techniques && (
                <BulletList items={report.spiritual.meditationStyle.techniques} />
              )}
            </SubSection>

            <SubSection title="Moksha Path">
              <Text style={styles.paragraph}>{localizePdfUiText(report.spiritual.mokshaPath || '')}</Text>
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* ═══════════════════════════════════════════════════════
          PART 08 — VEDIC REMEDIES
          ═══════════════════════════════════════════════════════ */}
      <SectionDividerPage
        partNumber="08"
        title="Vedic Remedies"
        subtitle="Gemstones, mantras, rituals, fasting, and lifestyle practices to harmonize your planetary energies"
      />

      {/* Remedies - Understanding the Science */}
      {report.remedies?.remediesPhilosophy && (
        <ContentPage sectionName="Vedic Remedies">
          <Section title="Understanding Vedic Remedies">
            <Text style={styles.paragraph}>
              {localizePdfUiText('Before exploring specific remedies, it is essential to understand the profound science and tradition behind Vedic Upayas (remedial measures). This section explains why these remedies work and how they have been validated through millennia of practice.')}
            </Text>

            <SubSection title="Vedic Foundation">
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.remediesPhilosophy.vedicFoundation || '')}</Text>
            </SubSection>

            <SubSection title="How Remedies Work">
              <View style={styles.card}>
                <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.remediesPhilosophy.howRemediesWork || '')}</Text>
              </View>
            </SubSection>

            <SubSection title="The Role of Faith and Intention">
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.remediesPhilosophy.importanceOfFaith || '')}</Text>
            </SubSection>

            <SubSection title="Scientific Perspective">
              <View style={styles.highlight}>
                <Text style={styles.bodyText}>{localizePdfUiText(report.remedies.remediesPhilosophy.scientificPerspective || '')}</Text>
              </View>
            </SubSection>

            <SubSection title="Traditional Wisdom">
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.remediesPhilosophy.traditionalWisdom || '')}</Text>
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* Remedies - Gemstones with Trust Details */}
      {report.remedies && (
        <ContentPage sectionName="Gemstone Therapy">
          <Section title="Gemstone Therapy (Ratna Shastra)">
            <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.gemologyExplanation || 'Gemstones have been used in Vedic astrology for millennia to harness planetary energies and balance cosmic influences.')}</Text>

            <SubSection title={`${localizePdfUiText('Primary Gemstone')}: ${localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.stone || 'N/A')}`}>
              <View style={styles.card}>
                <InfoRow label="Planet" value={localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.planet || 'N/A')} />
                <InfoRow label="Weight" value={localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.weight || 'N/A')} />
                <InfoRow label="Metal" value={localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.metal || 'N/A')} />
                <InfoRow label="Finger" value={localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.finger || 'N/A')} />
                <InfoRow label="Day to Wear" value={localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.day || 'N/A')} />
              </View>
              
              <Text style={styles.subSubHeader}>{localizePdfUiText('Benefits')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.benefits || '')}</Text>

              <Text style={styles.subSubHeader}>{localizePdfUiText('Scriptural Reference')}</Text>
              <View style={styles.highlight}>
                <Text style={styles.scriptural}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.scripturalReference || '')}</Text>
              </View>

              <Text style={styles.subSubHeader}>{localizePdfUiText('How It Works')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.howItWorks || '')}</Text>

              <Text style={styles.subSubHeader}>{localizePdfUiText('Scientific Basis')}</Text>
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.scientificBasis || '')}</Text>

              <Text style={styles.subSubHeader}>{localizePdfUiText('Quality Guidelines')}</Text>
              <View style={styles.card}>
                <Text style={styles.bodyText}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.qualityGuidelines || '')}</Text>
              </View>

              <Text style={styles.subSubHeader}>{localizePdfUiText('Cautions')}</Text>
              <Text style={styles.cautionText}>{localizePdfUiText(report.remedies.gemstoneRecommendations?.primary?.cautions || '')}</Text>
            </SubSection>

            {report.remedies.gemstoneRecommendations?.secondary && (
              <SubSection title={`${localizePdfUiText('Secondary Gemstone')}: ${localizePdfUiText(report.remedies.gemstoneRecommendations.secondary.stone)}`}>
                <InfoRow label="Planet" value={localizePdfUiText(report.remedies.gemstoneRecommendations.secondary.planet || 'N/A')} />
                <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.gemstoneRecommendations.secondary.benefits || '')}</Text>
                <Text style={styles.scriptural}>{localizePdfUiText(report.remedies.gemstoneRecommendations.secondary.scripturalReference || '')}</Text>
              </SubSection>
            )}

            {report.remedies.gemstoneRecommendations?.avoid && report.remedies.gemstoneRecommendations.avoid.length > 0 && (
              <SubSection title="Gemstones to Avoid">
                <BulletList items={report.remedies.gemstoneRecommendations.avoid} />
              </SubSection>
            )}
          </Section>
        </ContentPage>
      )}

      {/* Remedies - Rudraksha with Trust Details */}
      {report.remedies?.rudrakshaRecommendations && report.remedies.rudrakshaRecommendations.length > 0 && (
        <ContentPage sectionName="Rudraksha Therapy">
          <Section title="Rudraksha Therapy">
            <Text style={styles.paragraph}>
              {localizePdfUiText('Rudraksha beads are sacred seeds from the Elaeocarpus ganitrus tree, revered for their spiritual and healing properties. Each Mukhi (face) of Rudraksha resonates with specific planetary energies.')}
            </Text>

            {report.remedies.rudrakshaRecommendations.map((rud: any, idx: number) => (
              <Card key={idx} title={`${rud.mukhi} ${localizePdfUiText('Mukhi Rudraksha')} - ${localizePdfUiText(rud.name)}`}>
                <InfoRow label="Associated Planet" value={localizePdfUiText(rud.planet)} />

                <Text style={styles.subSubHeader}>{localizePdfUiText('Benefits')}</Text>
                <Text style={styles.paragraph}>{localizePdfUiText(rud.benefits)}</Text>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Wearing Instructions')}</Text>
                <Text style={styles.bodyText}>{localizePdfUiText(rud.wearingInstructions)}</Text>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Scriptural Reference')}</Text>
                <View style={styles.highlight}>
                  <Text style={styles.scriptural}>{localizePdfUiText(rud.scripturalReference || '')}</Text>
                </View>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Scientific Basis')}</Text>
                <Text style={styles.bodyText}>{localizePdfUiText(rud.scientificBasis || '')}</Text>

                <Text style={styles.subSubHeader}>{localizePdfUiText('How to Verify Authenticity')}</Text>
                <Text style={styles.successText}>{localizePdfUiText(rud.authenticity || '')}</Text>
              </Card>
            ))}
          </Section>
        </ContentPage>
      )}

      {/* Remedies - Mantras with Trust Details */}
      {report.remedies?.mantras && report.remedies.mantras.length > 0 && (
        <ContentPage sectionName="Mantra Therapy">
          <Section title="Mantra Therapy (Mantra Shastra)">
            <Text style={styles.paragraph}>
              {localizePdfUiText('Mantras are sacred sound vibrations that connect the practitioner to cosmic energies. The science of Mantra Shastra explains how specific sound frequencies can influence planetary energies and transform consciousness.')}
            </Text>

            {report.remedies.mantras.map((mantra: any, idx: number) => (
              <Card key={idx} title={`${localizePdfUiText(mantra.planet)} ${localizePdfUiText('Mantra')}`}>
                <Text style={[styles.boldLabel, { color: '#c2410c', marginBottom: 2 }]}>{mantra.mantra}</Text>

                <View style={styles.row}>
                  <InfoRow label="Japa Count" value={String(mantra.japaCount)} />
                </View>
                <InfoRow label="Timing" value={localizePdfUiText(mantra.timing)} />
                <InfoRow label="Pronunciation" value={mantra.pronunciation} />

                <Text style={styles.subSubHeader}>{localizePdfUiText('Benefits')}</Text>
                <Text style={styles.paragraph}>{localizePdfUiText(mantra.benefits)}</Text>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Scriptural Source')}</Text>
                <View style={styles.highlight}>
                  <Text style={styles.scriptural}>{localizePdfUiText(mantra.scripturalSource || '')}</Text>
                </View>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Vibrational Science')}</Text>
                <Text style={styles.bodyText}>{localizePdfUiText(mantra.vibrationalScience || '')}</Text>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Proper Method')}</Text>
                <Text style={styles.bodyText}>{localizePdfUiText(mantra.properMethod || '')}</Text>
              </Card>
            ))}
          </Section>
        </ContentPage>
      )}

      {/* Remedies - Yantras and Pujas */}
      {report.remedies && (
        <ContentPage sectionName="Yantras & Pujas">
          <Section title="Yantras & Puja Recommendations">
            {report.remedies.yantras && report.remedies.yantras.length > 0 && (
              <SubSection title="Yantra Recommendations">
                <Text style={styles.paragraph}>
                  {localizePdfUiText('Yantras are sacred geometric diagrams that serve as focal points for meditation and planetary propitiation. Each Yantra embodies specific cosmic energies through precise mathematical proportions.')}
                </Text>
                {report.remedies.yantras.map((yantra: any, idx: number) => (
                  <Card key={idx} title={localizePdfUiText(yantra.name)}>
                    <InfoRow label="Planet" value={localizePdfUiText(yantra.planet)} />
                    <InfoRow label="Placement" value={localizePdfUiText(yantra.placement)} />
                    <Text style={styles.paragraph}>{localizePdfUiText(yantra.benefits)}</Text>

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Geometric Significance')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(yantra.geometricSignificance || '')}</Text>

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Consecration Method')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(yantra.consecrationMethod || '')}</Text>

                    <Text style={styles.scriptural}>{localizePdfUiText(yantra.scripturalReference || '')}</Text>
                  </Card>
                ))}
              </SubSection>
            )}

            {report.remedies.pujaRecommendations && report.remedies.pujaRecommendations.length > 0 && (
              <SubSection title="Recommended Pujas">
                {report.remedies.pujaRecommendations.map((puja: any, idx: number) => (
                  <Card key={idx} title={localizePdfUiText(puja.name)}>
                    <InfoRow label="Deity" value={localizePdfUiText(puja.deity)} />
                    <InfoRow label="Purpose" value={localizePdfUiText(puja.purpose)} />
                    <InfoRow label="Frequency" value={localizePdfUiText(puja.frequency)} />

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Benefits')}</Text>
                    <BulletList items={puja.benefits || []} />

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Scriptural Basis')}</Text>
                    <Text style={styles.scriptural}>{localizePdfUiText(puja.scripturalBasis || '')}</Text>

                    <Text style={styles.subSubHeader}>{localizePdfUiText('Procedure')}</Text>
                    <Text style={styles.bodyText}>{localizePdfUiText(puja.procedure || '')}</Text>
                  </Card>
                ))}
              </SubSection>
            )}
          </Section>
        </ContentPage>
      )}

      {/* Remedies - Ishta Devata and Spiritual Practices */}
      {report.remedies && (
        <ContentPage sectionName="Ishta Devata & Spiritual Practices">
          <Section title="Ishta Devata & Spiritual Practices">
            <SubSection title="Your Ishta Devata (Personal Deity)">
              <Card title={localizePdfUiText(report.remedies.ishtaDevata?.deity || 'N/A')}>
                <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.ishtaDevata?.reason || '')}</Text>

                <InfoRow label="Worship Method" value={localizePdfUiText(report.remedies.ishtaDevata?.worship || 'N/A')} />
                <InfoRow label="Mantra" value={report.remedies.ishtaDevata?.mantra || 'N/A'} />
                <InfoRow label="Temple Visit" value={localizePdfUiText(report.remedies.ishtaDevata?.templeVisit || 'N/A')} />

                <Text style={styles.subSubHeader}>{localizePdfUiText('Scriptural Derivation')}</Text>
                <View style={styles.highlight}>
                  <Text style={styles.scriptural}>{localizePdfUiText(report.remedies.ishtaDevata?.scripturalDerivation || '')}</Text>
                </View>

                <Text style={styles.subSubHeader}>{localizePdfUiText('Significance')}</Text>
                <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.ishtaDevata?.significance || '')}</Text>
              </Card>
            </SubSection>

            <SubSection title="Fasting Recommendations (Vrata)">
              {(report.remedies.fasting || []).map((fast: any, idx: number) => (
                <Card key={idx} title={`${localizePdfUiText(fast.day)} - ${localizePdfUiText(fast.planet)}`}>
                  <Text style={styles.paragraph}>{localizePdfUiText(fast.method)}</Text>
                  <Text style={styles.paragraph}>{localizePdfUiText(fast.benefits)}</Text>

                  <Text style={styles.subSubHeader}>{localizePdfUiText('Scriptural Reference')}</Text>
                  <Text style={styles.scriptural}>{localizePdfUiText(fast.scripturalReference || '')}</Text>

                  <Text style={styles.subSubHeader}>{localizePdfUiText('Physiological Benefits')}</Text>
                  <Text style={styles.bodyText}>{localizePdfUiText(fast.physiologicalBenefits || '')}</Text>
                </Card>
              ))}
            </SubSection>

            <SubSection title="Donations (Daan)">
              {(report.remedies.donations || []).map((don: any, idx: number) => (
                <View key={idx} style={{ marginBottom: 5 }}>
                  <Text style={styles.boldLabel}>{localizePdfUiText(don.day)} - {localizePdfUiText(don.item)}</Text>
                  <Text style={styles.bodyText}>{localizePdfUiText('Planet')}: {localizePdfUiText(don.planet)} | {localizePdfUiText(don.reason)}</Text>
                  <Text style={styles.scriptural}>{localizePdfUiText(don.scripturalReference || '')}</Text>
                  <Text style={styles.successText}>{localizePdfUiText(don.karmaScience || '')}</Text>
                </View>
              ))}
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* Remedies - Lifestyle Guidance */}
      {report.remedies && (
        <ContentPage sectionName="Lifestyle Remedies">
          <Section title="Lifestyle Remedies & Guidance">
            <SubSection title="Color Therapy">
              <InfoRow label="Favorable Colors" value={(report.remedies.colorTherapy?.favorable || []).join(', ')} />
              <InfoRow label="Colors to Avoid" value={(report.remedies.colorTherapy?.avoid || []).join(', ')} />
              <Text style={styles.paragraph}>{localizePdfUiText(report.remedies.colorTherapy?.explanation || '')}</Text>

              <Text style={styles.subSubHeader}>{localizePdfUiText('Scientific Basis')}</Text>
              <Text style={styles.bodyText}>{localizePdfUiText(report.remedies.colorTherapy?.scientificBasis || '')}</Text>
            </SubSection>

            <SubSection title="Direction Guidance (Vastu)">
              <InfoRow label="Favorable Directions" value={(report.remedies.directionGuidance?.favorable || []).join(', ')} />
              <InfoRow label="Directions to Avoid" value={(report.remedies.directionGuidance?.avoid || []).join(', ')} />
              <InfoRow label="Sleep Direction" value={report.remedies.directionGuidance?.sleepDirection || 'N/A'} />
              <InfoRow label="Work Direction" value={report.remedies.directionGuidance?.workDirection || 'N/A'} />
              
              <Text style={styles.subSubHeader}>{localizePdfUiText('Vastu Explanation')}</Text>
              <Text style={styles.bodyText}>{localizePdfUiText(report.remedies.directionGuidance?.vastuExplanation || '')}</Text>
            </SubSection>

            <SubSection title="Daily Routine Recommendations">
              <BulletList items={report.remedies.dailyRoutine || []} />
            </SubSection>

            <SubSection title="Daily Spiritual Practices">
              <BulletList items={report.remedies.spiritualPractices || []} />
            </SubSection>

            <SubSection title="General Advice">
              <View style={styles.highlight}>
                <Text style={styles.bodyText}>{localizePdfUiText(report.remedies.generalAdvice || '')}</Text>
              </View>
            </SubSection>

            <SubSection title="Weak Planets Summary">
              {(report.remedies.weakPlanets || []).map((wp: any, idx: number) => (
                <View key={idx} style={styles.row}>
                  <Text style={styles.label}>{localizePdfUiText(wp.planet)}:</Text>
                  <Text style={styles.value}>{localizePdfUiText(wp.reason)} ({localizePdfUiText('Severity')}: {localizePdfUiText(wp.severity)})</Text>
                </View>
              ))}
            </SubSection>
          </Section>
        </ContentPage>
      )}

      {/* Chara Karakas (Jaimini) - Detailed Analysis */}
      {report.charaKarakasDetailed && (
        <>
          <ContentPage sectionName="Chara Karakas (Jaimini)">
            <Section title="Chara Karakas - Jaimini Astrology">
              <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.overview || '')}</Text>

              <SubSection title="Understanding the Jaimini System">
                <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.jaiminiSystemExplanation || '')}</Text>
              </SubSection>

              <SubSection title="Your Chara Karakas">
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Karaka')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Planet')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Sign')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('House')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Signification')}</Text>
                  </View>
                  {(report.charaKarakasDetailed.karakaInterpretations || []).map((k: any, idx: number) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{localizePdfUiText(k.karaka)}</Text>
                      <Text style={styles.tableCell}>{localizePdfUiText(k.planet)}</Text>
                      <Text style={styles.tableCell}>{localizePdfUiText(k.sign)}</Text>
                      <Text style={styles.tableCell}>{k.house}</Text>
                      <Text style={styles.tableCell}>{localizePdfUiText(k.signification)}</Text>
                    </View>
                  ))}
                </View>
              </SubSection>
            </Section>
          </ContentPage>

          {/* Atmakaraka Special Analysis */}
          {report.charaKarakasDetailed.atmakarakaSpecial && (
            <ContentPage sectionName="Atmakaraka Analysis">
              <Section title={`${localizePdfUiText('Atmakaraka')}: ${report.charaKarakasDetailed.atmakarakaSpecial.planet} - ${localizePdfUiText('Soul Significator')}`}>
                <View style={styles.card}>
                  <Text style={[styles.boldLabel, { color: '#c2410c', marginBottom: 4 }]}>
                    {localizePdfUiText('The Atmakaraka is the most important planet in Jaimini astrology, representing your soul\'s purpose.')}
                  </Text>
                </View>

                <SubSection title="Soul Purpose">
                  <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.atmakarakaSpecial.soulPurpose || '')}</Text>
                </SubSection>

                <SubSection title="Spiritual Lesson">
                  <View style={styles.highlight}>
                    <Text style={styles.bodyText}>{localizePdfUiText(report.charaKarakasDetailed.atmakarakaSpecial.spiritualLesson || '')}</Text>
                  </View>
                </SubSection>

                <SubSection title={`${localizePdfUiText('Karakamsa')}: ${localizePdfUiText(report.charaKarakasDetailed.atmakarakaSpecial.karakamsaSign || '')}`}>
                  <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.atmakarakaSpecial.karakamsaInterpretation || '')}</Text>
                </SubSection>
              </Section>

              {/* Darakaraka Special Analysis */}
              {report.charaKarakasDetailed.darakarakaSpecial && (
                <Section title={`${localizePdfUiText('Darakaraka')}: ${report.charaKarakasDetailed.darakarakaSpecial.planet} - ${localizePdfUiText('Spouse Significator')}`}>
                  <SubSection title="Spouse Characteristics">
                    <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.darakarakaSpecial.spouseCharacteristics || '')}</Text>
                  </SubSection>

                  <SubSection title="Marriage Indications">
                    <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.darakarakaSpecial.marriageIndications || '')}</Text>
                  </SubSection>

                  {report.charaKarakasDetailed.darakarakaSpecial.partnerQualities && (
                    <SubSection title="Partner Qualities">
                      <BulletList items={report.charaKarakasDetailed.darakarakaSpecial.partnerQualities} />
                    </SubSection>
                  )}
                </Section>
              )}
            </ContentPage>
          )}

          {/* Amatyakaraka and Karaka Details */}
          <ContentPage sectionName="Amatyakaraka Analysis">
            {report.charaKarakasDetailed.amatyakarakaSpecial && (
              <Section title={`${localizePdfUiText('Amatyakaraka')}: ${report.charaKarakasDetailed.amatyakarakaSpecial.planet} - ${localizePdfUiText('Career Significator')}`}>
                <SubSection title="Career Direction">
                  <Text style={styles.paragraph}>{localizePdfUiText(report.charaKarakasDetailed.amatyakarakaSpecial.careerDirection || '')}</Text>
                </SubSection>

                {report.charaKarakasDetailed.amatyakarakaSpecial.professionalStrengths && (
                  <SubSection title="Professional Strengths">
                    <BulletList items={report.charaKarakasDetailed.amatyakarakaSpecial.professionalStrengths} />
                  </SubSection>
                )}

                {report.charaKarakasDetailed.amatyakarakaSpecial.suitableProfessions && (
                  <SubSection title="Suitable Professions">
                    <BulletList items={report.charaKarakasDetailed.amatyakarakaSpecial.suitableProfessions} />
                  </SubSection>
                )}
              </Section>
            )}

            {report.charaKarakasDetailed.karakaInteractions && report.charaKarakasDetailed.karakaInteractions.length > 0 && (
              <Section title="Karaka Interactions">
                {report.charaKarakasDetailed.karakaInteractions.map((interaction: any, idx: number) => (
                  <Card key={idx} title={interaction.karakas?.join(' + ') || ''}>
                    <Text style={styles.paragraph}>{localizePdfUiText(interaction.interaction)}</Text>
                    <View style={styles.highlight}>
                      <Text style={styles.bodyText}>{localizePdfUiText('Effect')}: {localizePdfUiText(interaction.effect)}</Text>
                    </View>
                  </Card>
                ))}
              </Section>
            )}

            <SubSection title="Scriptural References">
              <View style={styles.card}>
                <Text style={styles.scriptural}>{localizePdfUiText(report.charaKarakasDetailed.scripturalReferences || '')}</Text>
              </View>
            </SubSection>

            {report.charaKarakasDetailed.recommendations && (
              <SubSection title="Recommendations">
                <BulletList items={report.charaKarakasDetailed.recommendations} />
              </SubSection>
            )}
          </ContentPage>

          {/* Detailed Karaka Interpretations */}
          {(report.charaKarakasDetailed.karakaInterpretations || []).map((karaka: any, idx: number) => (
            <ContentPage key={`karaka-${idx}`} sectionName={`${karaka.karaka}`}>
              <Section title={`${localizePdfUiText(karaka.karaka)}: ${localizePdfUiText(karaka.planet)} ${localizePdfUiText('in')} ${localizePdfUiText(karaka.sign)}`}>
                <View style={styles.card}>
                  <InfoRow label="House" value={String(karaka.house)} />
                  <InfoRow label="Degree" value={`${karaka.degree?.toFixed(2) || 0}°`} />
                  <InfoRow label="Signification" value={localizePdfUiText(karaka.signification || '')} />
                </View>

                <SubSection title="Detailed Interpretation">
                  <Text style={styles.paragraph}>{karaka.detailedInterpretation || ''}</Text>
                </SubSection>

                <SubSection title="Life Impact">
                  <Text style={styles.paragraph}>{karaka.lifeImpact || ''}</Text>
                </SubSection>

                <View style={styles.grid2}>
                  {karaka.strengths && karaka.strengths.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Strengths')}</Text>
                      <BulletList items={karaka.strengths} />
                    </View>
                  )}
                  {karaka.challenges && karaka.challenges.length > 0 && (
                    <View style={styles.gridItem}>
                      <Text style={styles.subSubHeader}>{localizePdfUiText('Challenges')}</Text>
                      <BulletList items={karaka.challenges} />
                    </View>
                  )}
                </View>

                {karaka.remedies && karaka.remedies.length > 0 && (
                  <SubSection title="Remedies">
                    <BulletList items={karaka.remedies} />
                  </SubSection>
                )}

                {karaka.timing && (
                  <SubSection title="Timing">
                    <Text style={styles.paragraph}>{karaka.timing}</Text>
                  </SubSection>
                )}
              </Section>
            </ContentPage>
          ))}
        </>
      )}

      {/* Glossary of Astrological Terms */}
      {report.glossary && (
        <>
          <ContentPage sectionName="Glossary">
            <Section title="Glossary of Vedic Astrology Terms">
              <Text style={styles.paragraph}>{localizePdfUiText(report.glossary.introduction || '')}</Text>

              <SubSection title="Quick Reference">
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Term')}</Text>
                    <Text style={styles.tableHeaderCell}>{localizePdfUiText('Definition')}</Text>
                  </View>
                  {(report.glossary.quickReference || []).slice(0, 15).map((term: any, idx: number) => (
                    <View key={idx} style={styles.tableRow}>
                      <Text style={styles.tableCell}>{term.term}</Text>
                      <Text style={styles.tableCell}>{term.briefDefinition}</Text>
                    </View>
                  ))}
                </View>
              </SubSection>
            </Section>
          </ContentPage>

          {/* Glossary Sections */}
          {(report.glossary.sections || []).map((section: any, sIdx: number) => (
            <ContentPage key={`glossary-${sIdx}`} sectionName="Glossary">
              <Section title={section.category}>
                <Text style={styles.paragraph}>{section.categoryDescription || ''}</Text>

                {(section.terms || []).map((term: any, tIdx: number) => (
                  <Card key={tIdx} title={`${term.term}${term.termSanskrit ? ' (' + sanitizeText(term.termSanskrit) + ')' : ''}`}>
                    <Text style={[styles.scriptural, { marginBottom: 4 }]}>{localizePdfUiText('Pronunciation')}: {term.pronunciation}</Text>

                    <Text style={[styles.boldLabel, { marginBottom: 3 }]}>{term.definition}</Text>

                    <Text style={styles.paragraph}>{term.detailedExplanation}</Text>

                    {term.example && (
                      <View style={styles.highlight}>
                        <Text style={styles.bodyText}>{localizePdfUiText('Example')}: {term.example}</Text>
                      </View>
                    )}

                    {term.relatedTerms && term.relatedTerms.length > 0 && (
                      <Text style={styles.accentText}>{localizePdfUiText('Related')}: {term.relatedTerms.join(', ')}</Text>
                    )}
                  </Card>
                ))}
              </Section>
            </ContentPage>
          ))}

        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          THANK YOU / CLOSING PAGE
          ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={[styles.coverPage, { fontFamily: ACTIVE_PDF_FONT_FAMILY }]}>

        {/* Spacer to push content toward vertical center */}
        <View style={{ marginTop: 260 }} />

        {/* Decorative line above */}
        <View style={{ width: 60, height: 2, backgroundColor: '#f59e0b', marginBottom: 28, opacity: 0.7 }} />

        <Text style={{
          fontSize: 38,
          fontWeight: 'bold',
          color: '#ffffff',
          textAlign: 'center',
          marginBottom: 8,
          letterSpacing: 2,
        }}>
          {localizePdfUiText('THANK YOU')}
        </Text>

        {/* Divider ornament */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30 }}>
          <View style={{ width: 40, height: 1, backgroundColor: '#fbbf24', opacity: 0.5 }} />
          <Text style={{ color: '#fbbf24', fontSize: 12, marginHorizontal: 12, opacity: 0.8 }}>✦</Text>
          <View style={{ width: 40, height: 1, backgroundColor: '#fbbf24', opacity: 0.5 }} />
        </View>

        <Text style={{
          fontSize: 11,
          color: '#fff7ed',
          textAlign: 'center',
          lineHeight: 1.6,
          marginBottom: 36,
          paddingHorizontal: 60,
          opacity: 0.9,
        }}>
          {localizePdfUiText('Thank you for choosing Sri Mandir for your Kundli report. We hope this personalized Vedic astrology blueprint brings you clarity, guidance, and confidence on your life journey.')}
        </Text>

        {/* Consultation CTA */}
        <View style={{
          backgroundColor: 'rgba(92, 29, 12, 0.70)',
          borderWidth: 1,
          borderColor: 'rgba(249, 115, 22, 0.45)',
          borderRadius: 8,
          paddingVertical: 16,
          paddingHorizontal: 24,
          marginBottom: 28,
          marginHorizontal: 60,
          alignItems: 'center',
        }}>
          <Text style={{ fontSize: 10, color: '#fcd34d', marginBottom: 8, opacity: 0.85 }}>
            {localizePdfUiText('For personalized consultations with our expert astrologers')}
          </Text>
          <Text style={{ fontSize: 13, color: '#ffffff', fontWeight: 'bold', letterSpacing: 0.5 }}>
            {ACTIVE_PDF_LANGUAGE === 'hi'
              ? 'कॉल या व्हाट्सऐप: 080 711 74417'
              : ACTIVE_PDF_LANGUAGE === 'te'
                ? 'కాల్ లేదా వాట్సాప్: 080 711 74417'
                : 'Call or WhatsApp: 080 711 74417'}
          </Text>
        </View>

        {/* Website link */}
        <Text style={{
          fontSize: 11,
          color: '#fbbf24',
          letterSpacing: 0.8,
          marginBottom: 6,
        }}>
          www.srimandir.com
        </Text>
        {/* Blessing */}
        <Text style={{
          fontSize: 12,
          color: '#fbbf24',
          textAlign: 'center',
          fontWeight: 'bold',
          fontStyle: 'italic',
          opacity: 0.85,
          letterSpacing: 0.4,
        }}>
          {localizePdfUiText('May the stars guide your path')}
        </Text>

        {/* Footer */}
        <View style={{ position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' }}>
          <Text style={styles.dividerFooter}>
            {ACTIVE_PDF_LANGUAGE === 'hi'
              ? 'श्री मंदिर — धर्म, कर्म, ज्योतिष'
              : ACTIVE_PDF_LANGUAGE === 'te'
                ? 'శ్రీ మందిర్ — ధర్మ, కర్మ, జ్యోతిష్యం'
                : 'Sri Mandir — Dharma, Karma, Jyotish'}
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default KundliPDFDocument;

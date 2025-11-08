import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Determine initial language from localStorage or browser
const savedLang = (typeof window !== 'undefined' && localStorage.getItem('lang')) || undefined;
const browserLang = typeof navigator !== 'undefined' ? navigator.language : 'en';
const initialLang = savedLang || (browserLang.startsWith('hi') ? 'hi' : 'en');

const resources = {
  en: {
    translation: {
      common: {
        switchToHindi: 'Switch to Hindi',
        switchToEnglish: 'Switch to English',
        next: 'Next',
        back: 'Back',
        bookNow: 'Book Now',
        mySolutionFinder: 'My Solution Finder',
      },
      index: {
        heroTitlePart1: 'Find Your Perfect',
        heroTitlePart2: 'Spiritual Solution',
        heroSubtitle: 'Get personalized puja recommendations to guide your spiritual practice.',
        cta: 'My Solution Finder',
        clickHere: 'Click here',
      },
      trust: {
        trust1: 'Trusted by 30 million+ people',
        trust2: "India's largest app for Hindu devotees",
        trust3: '100% secure',
      },
      reviews: {
        heading: 'What Our Devotees Say',
        subheading: 'Trusted by thousands of families across India',
      },
      footer: {
        company: 'Company',
        ourServices: 'Our Services',
        ourAddress: 'Our Address',
        aboutUs: 'About Us',
        contactUs: 'Contact Us',
        privacyPolicy: 'Privacy Policy',
        terms: 'Terms and Conditions',
        copyright: '© 2024 Sri Mandir. All rights reserved.'
      },
      solutionFinder: {
        title: 'My Solution Finder',
        description:
          "My Solution Finder is a 4-step tool that recommends the most suitable puja based on your birth details and life concerns. Enter your date of birth, select the area for which you need blessings, and receive personalised puja recommendations. With one click, book the puja that's right for you.",
        enterDob: 'Enter your DOB',
        day: 'Day',
        month: 'Month',
        year: 'Year',
        readingMap: 'Reading Your Celestial Map...',
        astrologicalDetails: 'Your Astrological Details',
        yourRashi: 'Your Rashi',
        yourMoolank: 'Your Moolank',
        selectAreasHeading: 'What area of life do you need blessings for?',
        selectAreasSub: 'You can select multiple areas',
        areas: {
          health: 'Health',
          career: 'Career',
          love: 'Love / Relationships',
          family: 'Family Issues',
          finances: 'Finances',
          peace: 'Peace of Mind',
          child: 'Child Well-being',
        },
        recommendedTitle: 'Your Recommended Pujas',
        basedOn: 'Based on your birth details and selected areas: {{areas}}',
        noPujas: 'No specific pujas found for your selected areas. Please try selecting different areas.'
      },
      dosha: {
        heroTitle: 'Identify Your Dosha',
        heroSubtitle: 'Share your birth details to find out which doshas (if any) appear in your Vedic chart—and see gentle, traditional remedies.',
        whatIsDosha: 'What is a dosha?',
        whatIsDoshaAnswer: 'In Vedic astrology, a dosha is a specific planetary pattern believed to create challenges or imbalances in life.',
        whyImportant: 'Why is it important?',
        whyImportantAnswer: 'Identifying doshas helps you understand potential friction points and explore time-tested, gentle remedies.',
        howImpact: 'How can it impact life?',
        howImpactAnswer: 'Traditionally, doshas are linked to areas like relationships, career, health, and peace of mind—always interpreted with discretion.',
        calculatorTitle: 'Vedic Dosha Calculator',
        calculatorDesc: 'Discover potential doshas in your birth chart based on classical Jyotish principles',
        refresh: 'Refresh',
        nameOptional: 'Name (Optional)',
        enterName: 'Enter your name',
        dateOfBirth: 'Date of Birth',
        timeOfBirth: 'Exact Time of Birth',
        dontKnowTime: "I don't know my birth time",
        timeFormat: 'Format: hh:mm AM/PM',
        unknownTimeWarning: "⚠️ Without exact birth time, accuracy will be reduced. We'll run Moon-based checks only.",
        placeOfBirth: 'Place of Birth',
        typeChars: 'Type 2+ characters',
        placePlaceholder: 'e.g. Jaipur, Mumbai, Varanasi',
        latitude: 'Latitude',
        longitude: 'Longitude',
        timeZone: 'Time Zone (India)',
        privacyNote: "🔒 Privacy: We don't store your details server-side unless you generate a share link.",
        privacyPlace: '🔒 We only use your input to look up the place; nothing is stored.',
        calculating: 'Calculating...',
        calculateButton: 'Calculate My Doshas',
        disclaimer: '⚠️ This is an educational tool based on classical Jyotish rules; not medical, legal, or financial advice.',
        formRefreshed: 'Form refreshed',
        locationSelected: 'Location selected. Time zone: Asia/Kolkata',
        enterTimeError: 'Please enter birth time or mark it as unknown',
        calculationSuccess: 'Doshas calculated successfully!',
        calculationError: 'Failed to calculate doshas. Please try again.',
      },
      doshaResults: {
        summary: 'Your Dosha Summary',
        detailedAnalysis: 'Detailed Analysis & Remedies',
        basedOnChart: 'Based on your birth chart calculations',
        status: 'Status',
        severity: 'Severity',
        type: 'Type',
        phase: 'Phase',
        explanation: 'Explanation',
        placements: 'Placements',
        traditionalRemedies: 'Traditional Remedies',
        sriMandirRemedies: 'Sri Mandir Offered Remedies',
        upcomingPujas: 'upcoming pujas available',
        disclaimer: '⚠️ Important: These results depend on birth-time precision and the chosen ayanamsha (Lahiri). This is an educational tool based on classical Jyotish rules; not medical, legal, or financial advice. Consult a qualified Vedic astrologer for personalized guidance.',
        educationalTool: '⚠️ This is an educational tool based on popular Jyotish rules. Interpret with discretion.',
        mangal: {
          name: 'Mangal Dosha (Manglik)',
          description: 'Mangal (Manglik/Kuja) Dosha — Linked with Mars in certain houses; traditionally associated with friction in relationships and decisiveness.',
          impact: 'Impact if present: Greater likelihood of friction in close relationships, impatience/anger spikes, or delays and stops/starts in marriage or partnerships.',
          remedies: [
            'Recite Hanuman Chalisa',
            'Fast on Tuesdays',
            'Donate red items',
            'Do a Mangal Dosha Nivaran Puja.'
          ]
        },
        kaalSarp: {
          name: 'Kaal Sarp Dosha',
          description: 'Kaal Sarp Dosha — All planets hemmed between Rahu and Ketu; often framed as a pattern indicating inner tension and transformation.',
          impact: 'Impact if present: A pattern of inner restlessness and periodic setbacks; plans may feel blocked or get delayed despite effort, requiring extra persistence.',
          remedies: [
            'Visit Trimbakeshwar temple',
            'Recite Maha Mrityunjaya Mantra',
            'Feed stray dogs',
            'Do a Kaal Sarp Dosha Nivaran Puja.'
          ]
        },
        pitra: {
          name: 'Pitra Dosha',
          description: 'Pitra (Pitru) Dosha — Traditional indicators around the 9th house and Sun–node links; associated with duties, lineage, and guidance.',
          impact: 'Impact if present: Recurring duties/obligations toward family or elders; guilt, disputes, or legacy issues can surface and demand resolution.',
          remedies: [
            'Perform Shraddha ceremony',
            'Feed brahmins on amavasya',
            'Recite Pitra Gayatri',
            'Do a Pitra Dosha Nivaran Puja.'
          ]
        },
        sadeSati: {
          name: 'Shani Sade Sati',
          description: "Shani Sade Sati — Saturn's transit across the natal Moon's neighborhood; a 7.5-year cycle emphasizing discipline and patience.",
          impact: 'Impact if active: Heavier responsibilities, slower progress, and tests of patience; results tend to come with consistent discipline rather than speed.',
          remedies: [
            'Recite Shani mantra',
            'Light mustard oil lamp on Saturdays',
            'Donate black items',
            'Do a Sade Sati Nivaran Puja.'
          ]
        }
      },
    },
  },
  hi: {
    translation: {
      common: {
        switchToHindi: 'हिंदी में बदलें',
        switchToEnglish: 'अंग्रेज़ी में बदलें',
        next: 'आगे',
        back: 'वापस',
        bookNow: 'अभी बुक करें',
        mySolutionFinder: 'मेरा समाधान खोजक',
      },
      index: {
        heroTitlePart1: 'अपना सर्वोत्तम',
        heroTitlePart2: 'आध्यात्मिक समाधान',
        heroSubtitle: 'अपनी आध्यात्मिक यात्रा के लिए व्यक्तिगत पूजा सिफ़ारिशें प्राप्त करें।',
        cta: 'मेरा समाधान खोजक',
        clickHere: 'यहाँ क्लिक करें',
      },
      trust: {
        trust1: '3 करोड़+ लोगों का भरोसा',
        trust2: 'हिन्दू भक्तों के लिए भारत का सबसे बड़ा ऐप',
        trust3: '100% सुरक्षित',
      },
      reviews: {
        heading: 'हमारे भक्त क्या कहते हैं',
        subheading: 'भारत भर के हज़ारों परिवारों का भरोसा',
      },
      footer: {
        company: 'कंपनी',
        ourServices: 'हमारी सेवाएँ',
        ourAddress: 'हमारा पता',
        aboutUs: 'हमारे बारे में',
        contactUs: 'संपर्क करें',
        privacyPolicy: 'गोपनीयता नीति',
        terms: 'नियम और शर्तें',
        copyright: '© 2024 श्री मंदिर। सर्वाधिकार सुरक्षित।'
      },
      solutionFinder: {
        title: 'मेरा समाधान खोजक',
        description:
          'मेरा समाधान खोजक एक 4-चरणीय उपकरण है जो आपकी जन्म जानकारी और जीवन की चिंताओं के आधार पर सबसे उपयुक्त पूजा की सिफारिश करता है। अपनी जन्म तिथि दर्ज करें, आशीर्वाद के लिए क्षेत्र चुनें, और व्यक्तिगत पूजा सिफारिशें प्राप्त करें। एक क्लिक में, अपने लिए सही पूजा बुक करें।',
        enterDob: 'अपनी जन्म तिथि दर्ज करें',
        day: 'दिन',
        month: 'महीना',
        year: 'साल',
        readingMap: 'आपका ज्योतिषीय नक्शा पढ़ा जा रहा है...',
        astrologicalDetails: 'आपके ज्योतिषीय विवरण',
        yourRashi: 'आपकी राशि',
        yourMoolank: 'आपका मूलांक',
        selectAreasHeading: 'जीवन के किस क्षेत्र के लिए आप आशीर्वाद चाहते हैं?',
        selectAreasSub: 'आप एक से अधिक क्षेत्र चुन सकते हैं',
        areas: {
          health: 'स्वास्थ्य',
          career: 'करियर',
          love: 'प्रेम / रिश्ते',
          family: 'परिवार से जुड़े मुद्दे',
          finances: 'वित्त',
          peace: 'मानसिक शांति',
          child: 'बच्चे का कल्याण',
        },
        recommendedTitle: 'आपके लिए अनुशंसित पूजाएँ',
        basedOn: 'आपकी जन्म जानकारी और चयनित क्षेत्रों के आधार पर: {{areas}}',
        noPujas: 'आपके चयनित क्षेत्रों के लिए कोई विशिष्ट पूजा नहीं मिली। कृपया अन्य क्षेत्र चुनें।'
      },
      dosha: {
        heroTitle: 'अपने दोष की पहचान करें',
        heroSubtitle: 'अपने जन्म विवरण साझा करें और पता लगाएं कि आपके वैदिक चार्ट में कौन से दोष (यदि कोई हो) दिखाई देते हैं—और पारंपरिक उपचार देखें।',
        whatIsDosha: 'दोष क्या है?',
        whatIsDoshaAnswer: 'वैदिक ज्योतिष में, दोष एक विशिष्ट ग्रह पैटर्न है जो जीवन में चुनौतियां या असंतुलन पैदा करने के लिए माना जाता है।',
        whyImportant: 'यह क्यों महत्वपूर्ण है?',
        whyImportantAnswer: 'दोषों की पहचान करने से आपको संभावित समस्याओं को समझने और समय-परीक्षित उपचारों का पता लगाने में मदद मिलती है।',
        howImpact: 'यह जीवन को कैसे प्रभावित कर सकता है?',
        howImpactAnswer: 'पारंपरिक रूप से, दोष रिश्तों, करियर, स्वास्थ्य और मन की शांति जैसे क्षेत्रों से जुड़े होते हैं—हमेशा विवेक के साथ व्याख्या की जाती है।',
        calculatorTitle: 'वैदिक दोष कैलकुलेटर',
        calculatorDesc: 'शास्त्रीय ज्योतिष सिद्धांतों के आधार पर अपने जन्म चार्ट में संभावित दोषों की खोज करें',
        refresh: 'रीफ्रेश करें',
        nameOptional: 'नाम (वैकल्पिक)',
        enterName: 'अपना नाम दर्ज करें',
        dateOfBirth: 'जन्म तिथि',
        timeOfBirth: 'जन्म का सही समय',
        dontKnowTime: 'मुझे अपना जन्म समय नहीं पता',
        timeFormat: 'प्रारूप: hh:mm AM/PM',
        unknownTimeWarning: '⚠️ सही जन्म समय के बिना, सटीकता कम हो जाएगी। हम केवल चंद्रमा-आधारित जांच चलाएंगे।',
        placeOfBirth: 'जन्म स्थान',
        typeChars: '2+ अक्षर टाइप करें',
        placePlaceholder: 'उदाहरण: जयपुर, मुंबई, वाराणसी',
        latitude: 'अक्षांश',
        longitude: 'देशांतर',
        timeZone: 'समय क्षेत्र (भारत)',
        privacyNote: '🔒 गोपनीयता: हम आपकी जानकारी सर्वर-साइड पर संग्रहीत नहीं करते हैं जब तक कि आप शेयर लिंक न बनाएं।',
        privacyPlace: '🔒 हम केवल स्थान खोजने के लिए आपके इनपुट का उपयोग करते हैं; कुछ भी संग्रहीत नहीं किया जाता है।',
        calculating: 'गणना हो रही है...',
        calculateButton: 'मेरे दोषों की गणना करें',
        disclaimer: '⚠️ यह शास्त्रीय ज्योतिष नियमों पर आधारित एक शैक्षिक उपकरण है; चिकित्सा, कानूनी या वित्तीय सलाह नहीं।',
        formRefreshed: 'फॉर्म रीफ्रेश किया गया',
        locationSelected: 'स्थान चयनित। समय क्षेत्र: Asia/Kolkata',
        enterTimeError: 'कृपया जन्म समय दर्ज करें या इसे अज्ञात के रूप में चिह्नित करें',
        calculationSuccess: 'दोष सफलतापूर्वक गणना की गई!',
        calculationError: 'दोष गणना विफल रही। कृपया पुनः प्रयास करें।',
      },
      doshaResults: {
        summary: 'आपका दोष सारांश',
        detailedAnalysis: 'विस्तृत विश्लेषण और उपचार',
        basedOnChart: 'आपके जन्म चार्ट गणना के आधार पर',
        status: 'स्थिति',
        severity: 'गंभीरता',
        type: 'प्रकार',
        phase: 'चरण',
        explanation: 'व्याख्या',
        placements: 'स्थान',
        traditionalRemedies: 'पारंपरिक उपचार',
        sriMandirRemedies: 'श्री मंदिर की पेशकश किए गए उपचार',
        upcomingPujas: 'आगामी पूजाएं उपलब्ध',
        disclaimer: '⚠️ महत्वपूर्ण: ये परिणाम जन्म-समय की सटीकता और चुने गए अयनांश (लाहिड़ी) पर निर्भर करते हैं। यह शास्त्रीय ज्योतिष नियमों पर आधारित एक शैक्षिक उपकरण है; चिकित्सा, कानूनी या वित्तीय सलाह नहीं। व्यक्तिगत मार्गदर्शन के लिए एक योग्य वैदिक ज्योतिषी से परामर्श करें।',
        educationalTool: '⚠️ यह लोकप्रिय ज्योतिष नियमों पर आधारित एक शैक्षिक उपकरण है। विवेक के साथ व्याख्या करें।',
        mangal: {
          name: 'मंगल दोष (मांगलिक)',
          description: 'मंगल (मांगलिक/कुजा) दोष — कुछ घरों में मंगल से जुड़ा; पारंपरिक रूप से रिश्तों में घर्षण और निर्णायकता से जुड़ा है।',
          impact: 'यदि उपस्थित हो तो प्रभाव: करीबी रिश्तों में घर्षण की अधिक संभावना, अधीरता/क्रोध के झटके, या विवाह या साझेदारी में देरी और रुक-रुक कर शुरुआत।',
          remedies: [
            'हनुमान चालीसा का पाठ करें',
            'मंगलवार को व्रत रखें',
            'लाल वस्तुओं का दान करें',
            'मंगल दोष निवारण पूजा करें।'
          ]
        },
        kaalSarp: {
          name: 'काल सर्प दोष',
          description: 'काल सर्प दोष — सभी ग्रह राहु और केतु के बीच फंसे; अक्सर आंतरिक तनाव और परिवर्तन के पैटर्न के रूप में तैयार किया जाता है।',
          impact: 'यदि उपस्थित हो तो प्रभाव: आंतरिक बेचैनी और आवधिक असफलताओं का एक पैटर्न; प्रयास के बावजूद योजनाएं अवरुद्ध या विलंबित हो सकती हैं, अतिरिक्त दृढ़ता की आवश्यकता है।',
          remedies: [
            'त्रिम्बकेश्वर मंदिर जाएं',
            'महा मृत्युंजय मंत्र का जाप करें',
            'आवारा कुत्तों को खाना खिलाएं',
            'काल सर्प दोष निवारण पूजा करें।'
          ]
        },
        pitra: {
          name: 'पितृ दोष',
          description: 'पितृ (पितृ) दोष — 9वें घर और सूर्य-नोड लिंक के आसपास पारंपरिक संकेतक; कर्तव्यों, वंश और मार्गदर्शन से जुड़े।',
          impact: 'यदि उपस्थित हो तो प्रभाव: परिवार या बड़ों के प्रति बार-बार कर्तव्य/दायित्व; अपराधबोध, विवाद, या विरासत के मुद्दे सामने आ सकते हैं और समाधान की मांग कर सकते हैं।',
          remedies: [
            'श्राद्ध समारोह करें',
            'अमावस्या को ब्राह्मणों को भोजन कराएं',
            'पितृ गायत्री का पाठ करें',
            'पितृ दोष निवारण पूजा करें।'
          ]
        },
        sadeSati: {
          name: 'शनि साढ़े साती',
          description: 'शनि साढ़े साती — जन्म चंद्रमा के पड़ोस में शनि का संक्रमण; अनुशासन और धैर्य पर जोर देने वाला 7.5 साल का चक्र।',
          impact: 'यदि सक्रिय हो तो प्रभाव: भारी जिम्मेदारियां, धीमी प्रगति, और धैर्य की परीक्षा; गति के बजाय लगातार अनुशासन के साथ परिणाम आते हैं।',
          remedies: [
            'शनि मंत्र का जाप करें',
            'शनिवार को सरसों के तेल का दीपक जलाएं',
            'काली वस्तुओं का दान करें',
            'साढ़े साती निवारण पूजा करें।'
          ]
        }
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

// Persist language changes
i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('lang', lng);
  } catch { /* ignore */ }
});

export default i18n;

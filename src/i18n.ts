import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Determine initial language; default to Hindi unless user previously chose
const savedLang = (typeof window !== 'undefined' && localStorage.getItem('lang')) || undefined;
const initialLang = savedLang || 'hi';

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
        description: 'Sri Mandir has brought religious services to the masses in India by connecting devotees, pundits, and temples. Partnering with over 50 renowned temples, we provide exclusive pujas and offering services performed by expert pandits and share videos of the completed puja rituals.',
        company: 'Company',
        ourServices: 'Our Services',
        services: {
          puja: 'Puja',
          chadhava: 'Chadhava',
          panchang: 'Panchang',
          temples: 'Temples',
        },
        ourAddress: 'Our Address',
        address: 'Firstprinciple AppsForBharat Pvt. Ltd. 435, 1st Floor 17th Cross, 19th Main Rd, above Axis Bank, Sector 4, HSR Layout, Bengaluru, Karnataka 560102',
        aboutUs: 'About Us',
        contactUs: 'Contact Us',
        privacyPolicy: 'Privacy Policy',
        terms: 'Terms and Conditions',
        copyright: '© 2025 Sri Mandir. All rights reserved.'
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
        heroTitle: 'Analyse your Kundali',
        heroSubtitle: 'Share your birth details to find out which doshas (if any) appear in your Vedic chart—and see devotional remedies.',
        whatIsDosha: 'What is a dosha?',
        whatIsDoshaAnswer: 'In Vedic astrology, a dosha is a specific planetary pattern believed to create challenges or imbalances in life.',
        whyImportant: 'Why is it important?',
        whyImportantAnswer: 'Identifying doshas helps you understand potential friction points and explore time-tested, gentle remedies.',
        howImpact: 'How can it impact life?',
        howImpactAnswer: 'Traditionally, doshas are linked to areas like relationships, career, health, and peace of mind—always interpreted with discretion.',
        calculatorTitle: 'Vedic Dosha Calculator',
        calculatorDesc: 'Discover potential doshas in your birth chart based on classical Jyotish principles',
        refresh: 'Refresh',
        name: 'Name',
        enterName: 'Enter your name',
        gender: 'Gender',
        male: 'Male',
        female: 'Female',
        dateOfBirth: 'Date of Birth',
        timeOfBirth: 'Exact Time of Birth',
        dontKnowTime: "I don't know my birth time",
        timeFormat: 'Format: hh:mm AM/PM',
        unknownTimeWarning: "⚠️ Without exact birth time, accuracy will be reduced. We'll run Moon-based checks only.",
        placeOfBirth: 'Place of Birth (City)',
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
        statusValues: {
          present: 'Present',
          absent: 'Absent',
          inactive: 'Inactive',
          active: 'Active',
          suggested: 'Suggested',
          someDoshasActive: 'Some doshas active',
          noDoshasFound: 'No doshas found'
        },
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
        },
        otherDoshas: {
          title: 'Other Doshas',
          rahuKetu: {
            name: 'Rahu–Ketu / Grahan Dosha',
            whatItIs: 'Sun or Moon closely aligned with Rahu/Ketu (eclipse pattern); often called Grahan Dosha.',
            impact: 'Mood swings, detours, and anxiety; plans can feel eclipsed or delayed despite effort.',
            remedies: [
              'Mindfulness, stable routines, breath practices.',
              'Charity on eclipse-related days; light devotional worship.',
              'Do a Rahu–Ketu / Grahan Dosha Nivaran Puja.'
            ]
          },
          shrapit: {
            name: 'Shrapit Dosha (Saturn–Rahu)',
            whatItIs: 'Saturn and Rahu together or in a strong mutual aspect.',
            impact: 'Recurring obstacles, karmic delays, heavier duties; progress comes slowly.',
            remedies: [
              'Saturday discipline; service and humility.',
              'Rudrabhishek / Shani-focused prayers.',
              'Do a Shrapit Dosha Nivaran Puja.'
            ]
          },
          guruChandal: {
            name: 'Guru Chandal Dosha (Jupiter–Rahu/Ketu)',
            whatItIs: 'Jupiter with Rahu or Ketu.',
            impact: 'Judgment/mentor issues; promises vs. outcomes may misalign.',
            remedies: [
              'Study with grounded mentors; donation of knowledge/education items.',
              'Guru-focused prayers.',
              'Do a Guru Chandal Dosha Nivaran Puja.'
            ]
          },
          punarphoo: {
            name: 'Punarphoo Dosha (Saturn–Moon)',
            whatItIs: 'Moon with Saturn or under tight Saturn influence.',
            impact: 'On–off outcomes, emotional heaviness; delays that demand patience.',
            remedies: [
              'Monday calm practices; moon-soothing disciplines.',
              'Chandra–Shani pacification prayers.',
              'Do a Punarphoo Dosha Nivaran Puja.'
            ]
          },
          kemadruma: {
            name: 'Kemadruma Yoga (Moon isolated)',
            whatItIs: 'Moon without planetary neighbors on either side (classical isolation).',
            impact: 'Feelings of isolation; fluctuating support or finances.',
            remedies: [
              'Community seva; gratitude and consistency rituals.',
              'Chandra pacification; Navagraha Shanti.',
              'Do a Kemadruma Yoga Nivaran Puja.'
            ]
          },
          gandmool: {
            name: 'Gandmool Dosha (Moon in specific nakshatras)',
            whatItIs: 'Moon in Ashwini, Ashlesha, Magha, Jyeshtha, Moola, or Revati.',
            impact: 'Sensitive beginnings; requires mindful rites and guidance.',
            remedies: [
              'Gandmool Shanti with family blessings.',
              'Do a Gandmool Dosha Nivaran Puja.'
            ]
          },
          kalathra: {
            name: 'Kalathra Dosha (7th-house/partner affliction)',
            whatItIs: 'Strong malefic influence on the 7th house, its lord, or Venus.',
            impact: 'Relationship friction, delays, or breaks; partnership lessons.',
            remedies: [
              'Friday harmony practices; counseling/mediation mindset.',
              'Venus pacification where appropriate.',
              'Do a Kalathra Dosha Nivaran Puja.'
            ]
          },
          vishDaridra: {
            name: 'Vish/Daridra Yoga (Mars–Saturn harsh combo)',
            whatItIs: 'Tight Mars–Saturn conjunction/aspect in key houses.',
            impact: 'Stop–go outcomes; conflict between drive and restraint.',
            remedies: [
              'Structured effort; conflict-avoidance sadhana.',
              'Hanuman devotion; Navagraha Shanti.',
              'Do a Vish/Daridra Yoga Nivaran Puja.'
            ]
          },
          ketuNaga: {
            name: 'Ketu/Naga (Sarpa) Dosha (non-Kaal Sarp)',
            whatItIs: 'Ketu in key houses or afflicting Moon/Venus without full Kaal Sarp pattern.',
            impact: 'Detachment themes; relationship coolness vs. spiritual pull.',
            remedies: [
              'Naga devotion where traditional; steady devotional routines.',
              'Do a Ketu/Naga Dosha Nivaran Puja.'
            ]
          },
          navagraha: {
            name: 'Navagraha Shanti (umbrella suggestion)',
            whatItIs: 'General graha stress when multiple minor flags appear together.',
            impact: 'Diffuse obstacles across areas of life; benefits from balanced pacification.',
            remedies: [
              'Balanced discipline; regular simple worship.',
              'Do a Navagraha Shanti Puja.'
            ]
          }
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
        description: 'श्री मंदिर ने भक्तों, पंडितों और मंदिरों को जोड़कर भारत में धार्मिक सेवाओं को जन-जन तक पहुंचाया है। 50 से अधिक प्रसिद्ध मंदिरों के साथ साझेदारी में, हम विशेषज्ञ पंडितों द्वारा की गई विशेष पूजा और चढ़ावा सेवाएं प्रदान करते हैं और पूर्ण की गई पूजा अनुष्ठानों के वीडियो साझा करते हैं।',
        company: 'कंपनी',
        ourServices: 'हमारी सेवाएँ',
        services: {
          puja: 'पूजा',
          chadhava: 'चढ़ावा',
          panchang: 'पंचांग',
          temples: 'मंदिर',
        },
        ourAddress: 'हमारा पता',
        address: 'फर्स्टप्रिंसिपल एप्सफॉरभारत प्रा. लि. 435, पहली मंजिल 17वीं क्रॉस, 19वीं मेन रोड, एक्सिस बैंक के ऊपर, सेक्टर 4, एचएसआर लेआउट, बेंगलुरु, कर्नाटक 560102',
        aboutUs: 'हमारे बारे में',
        contactUs: 'संपर्क करें',
        privacyPolicy: 'गोपनीयता नीति',
        terms: 'नियम और शर्तें',
        copyright: '© 2025 श्री मंदिर। सर्वाधिकार सुरक्षित।'
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
        heroTitle: 'अपनी कुंडली का विश्लेषण करें',
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
        name: 'नाम',
        enterName: 'अपना नाम दर्ज करें',
        gender: 'लिंग',
        male: 'पुरुष',
        female: 'महिला',
        dateOfBirth: 'जन्म तिथि',
        timeOfBirth: 'जन्म का सही समय',
        dontKnowTime: 'मुझे अपना जन्म समय नहीं पता',
        timeFormat: 'प्रारूप: hh:mm AM/PM',
        unknownTimeWarning: '⚠️ सही जन्म समय के बिना, सटीकता कम हो जाएगी। हम केवल चंद्रमा-आधारित जांच चलाएंगे।',
        placeOfBirth: 'जन्म स्थान (शहर)',
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
        statusValues: {
          present: 'उपस्थित',
          absent: 'अनुपस्थित',
          inactive: 'निष्क्रिय',
          active: 'सक्रिय',
          suggested: 'सुझाया गया',
          someDoshasActive: 'कुछ दोष सक्रिय',
          noDoshasFound: 'कोई दोष नहीं मिला'
        },
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
        },
        otherDoshas: {
          title: 'अन्य दोष',
          rahuKetu: {
            name: 'राहु–केतु / ग्रहण दोष',
            whatItIs: 'सूर्य या चंद्रमा राहु/केतु के साथ निकट संरेखित (ग्रहण पैटर्न); अक्सर ग्रहण दोष कहा जाता है।',
            impact: 'मिजाज में बदलाव, विचलन, और चिंता; प्रयास के बावजूद योजनाएं ग्रहण या विलंबित महसूस हो सकती हैं।',
            remedies: [
              'माइंडफुलनेस, स्थिर दिनचर्या, श्वास अभ्यास।',
              'ग्रहण संबंधी दिनों में दान; हल्की भक्ति पूजा।',
              'राहु–केतु / ग्रहण दोष निवारण पूजा करें।'
            ]
          },
          shrapit: {
            name: 'श्रापित दोष (शनि–राहु)',
            whatItIs: 'शनि और राहु एक साथ या मजबूत पारस्परिक दृष्टि में।',
            impact: 'बार-बार बाधाएं, कर्म विलंब, भारी कर्तव्य; प्रगति धीरे-धीरे आती है।',
            remedies: [
              'शनिवार अनुशासन; सेवा और विनम्रता।',
              'रुद्राभिषेक / शनि-केंद्रित प्रार्थना।',
              'श्रापित दोष निवारण पूजा करें।'
            ]
          },
          guruChandal: {
            name: 'गुरु चांडाल दोष (बृहस्पति–राहु/केतु)',
            whatItIs: 'बृहस्पति राहु या केतु के साथ।',
            impact: 'निर्णय/गुरु मुद्दे; वादे बनाम परिणाम गलत संरेखित हो सकते हैं।',
            remedies: [
              'आधारित गुरुओं के साथ अध्ययन; ज्ञान/शिक्षा वस्तुओं का दान।',
              'गुरु-केंद्रित प्रार्थनाएं।',
              'गुरु चांडाल दोष निवारण पूजा करें।'
            ]
          },
          punarphoo: {
            name: 'पुनर्फू दोष (शनि–चंद्र)',
            whatItIs: 'चंद्रमा शनि के साथ या तंग शनि प्रभाव के तहत।',
            impact: 'चालू-बंद परिणाम, भावनात्मक भारीपन; धैर्य की मांग करने वाली देरी।',
            remedies: [
              'सोमवार शांत अभ्यास; चंद्र-शांत करने वाले अनुशासन।',
              'चंद्र–शनि शांति प्रार्थनाएं।',
              'पुनर्फू दोष निवारण पूजा करें।'
            ]
          },
          kemadruma: {
            name: 'केमद्रुम योग (चंद्र अलग-थलग)',
            whatItIs: 'चंद्रमा बिना दोनों तरफ ग्रह पड़ोसियों के (शास्त्रीय अलगाव)।',
            impact: 'अलगाव की भावनाएं; उतार-चढ़ाव समर्थन या वित्त।',
            remedies: [
              'सामुदायिक सेवा; कृतज्ञता और निरंतरता अनुष्ठान।',
              'चंद्र शांति; नवग्रह शांति।',
              'केमद्रुम योग निवारण पूजा करें।'
            ]
          },
          gandmool: {
            name: 'गण्डमूल दोष (विशिष्ट नक्षत्रों में चंद्र)',
            whatItIs: 'अश्विनी, अश्लेषा, मघा, ज्येष्ठा, मूल, या रेवती में चंद्रमा।',
            impact: 'संवेदनशील शुरुआत; सचेत संस्कारों और मार्गदर्शन की आवश्यकता है।',
            remedies: [
              'परिवार के आशीर्वाद के साथ गण्डमूल शांति।',
              'गण्डमूल दोष निवारण पूजा करें।'
            ]
          },
          kalathra: {
            name: 'कलात्र दोष (7वां घर/साथी पीड़ा)',
            whatItIs: '7वें घर, इसके स्वामी, या शुक्र पर मजबूत अशुभ प्रभाव।',
            impact: 'रिश्ते में घर्षण, देरी, या ब्रेक; साझेदारी सबक।',
            remedies: [
              'शुक्रवार सद्भाव अभ्यास; परामर्श/मध्यस्थता मानसिकता।',
              'जहां उपयुक्त हो शुक्र शांति।',
              'कलात्र दोष निवारण पूजा करें।'
            ]
          },
          vishDaridra: {
            name: 'विष/दरिद्र योग (मंगल–शनि कठोर संयोजन)',
            whatItIs: 'मुख्य घरों में तंग मंगल–शनि संयोजन/दृष्टि।',
            impact: 'रुक-रुक कर परिणाम; ड्राइव और संयम के बीच संघर्ष।',
            remedies: [
              'संरचित प्रयास; संघर्ष-परिहार साधना।',
              'हनुमान भक्ति; नवग्रह शांति।',
              'विष/दरिद्र योग निवारण पूजा करें।'
            ]
          },
          ketuNaga: {
            name: 'केतु/नाग (सर्प) दोष (गैर-काल सर्प)',
            whatItIs: 'मुख्य घरों में केतु या पूर्ण काल सर्प पैटर्न के बिना चंद्र/शुक्र को पीड़ित करना।',
            impact: 'अलगाव विषय; रिश्ते में ठंडापन बनाम आध्यात्मिक खिंचाव।',
            remedies: [
              'जहां पारंपरिक हो नाग भक्ति; स्थिर भक्ति दिनचर्या।',
              'केतु/नाग दोष निवारण पूजा करें।'
            ]
          },
          navagraha: {
            name: 'नवग्रह शांति (व्यापक सुझाव)',
            whatItIs: 'सामान्य ग्रह तनाव जब कई छोटे झंडे एक साथ दिखाई देते हैं।',
            impact: 'जीवन के क्षेत्रों में फैली बाधाएं; संतुलित शांति से लाभ।',
            remedies: [
              'संतुलित अनुशासन; नियमित सरल पूजा।',
              'नवग्रह शांति पूजा करें।'
            ]
          }
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

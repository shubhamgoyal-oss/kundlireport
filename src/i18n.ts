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

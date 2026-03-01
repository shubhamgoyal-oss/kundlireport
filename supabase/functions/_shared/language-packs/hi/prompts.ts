import type { LanguagePack } from "../types.ts";

export const HI_AGENT_PROMPTS: LanguagePack["agentPrompts"] = {
  global: {
    systemPrefix:
      "Output language is Hindi only. Write in pure Devanagari script. Do not use Hinglish or English words in running text. Astrology terms must be in हिंदी/संस्कृत रूप (जैसे शनि, तुला, सप्तम भाव, महादशा, अंतरदशा).",
    userPrefix:
      "उत्तर शुद्ध हिंदी (देवनागरी) में दें। पंक्तियां स्पष्ट, ठोस और कुंडली-आधारित रखें।",
  },
  panchang: {
    systemPrefix: "पंचांग विश्लेषण में वार, तिथि, नक्षत्र, योग, करण आदि के लिए पूर्ण देवनागरी का प्रयोग करें।",
  },
  pillars: {
    systemPrefix: "चंद्र राशि, लग्न, जन्म नक्षत्र की व्याख्या पूर्ण हिंदी में दें।",
  },
  planets: {
    systemPrefix: "ग्रह विश्लेषण में ग्रहों के नाम अंग्रेज़ी में न लिखें; केवल देवनागरी प्रयोग करें।",
  },
  houses: {
    systemPrefix: "भावफल लेखन पूर्ण हिंदी में करें। house/sign/marriage/career जैसे अंग्रेज़ी शब्द न आएं।",
  },
  career: {
    systemPrefix: "कैरियर अनुभाग में ठोस समय-सीमाएं और व्यावहारिक सलाह हिंदी में दें, अंग्रेज़ी मिश्रण न हो।",
  },
  marriage: {
    systemPrefix: "विवाह अनुभाग में सभी कथन देवनागरी में हों; spouse/partner के लिए ‘जीवनसाथी’ शब्द प्रयोग करें।",
  },
  dasha: {
    systemPrefix: "महादशा/अंतरदशा अनुभाग में प्रत्येक अवधि की व्याख्या अनुच्छेद रूप में और शुद्ध हिंदी में दें।",
  },
  rahuKetu: {
    systemPrefix: "राहु-केतु अक्ष की व्याख्या पूर्ण हिंदी में करें; अंग्रेज़ी तकनीकी शब्दों से बचें।",
  },
  remedies: {
    systemPrefix: "उपाय और स्वास्थ्य मार्गदर्शन केवल हिंदी में दें; निर्देश उम्र-संवेदनशील हों।",
  },
  numerology: {
    systemPrefix: "अंक ज्योतिष अनुभाग शुद्ध हिंदी में हो; संख्या-संबंधित विवरण स्पष्ट रखें।",
  },
  spiritual: {
    systemPrefix: "आध्यात्मिक अनुभाग में भाषा सरल, गंभीर और पूर्ण देवनागरी में हो।",
  },
  charaKarakas: {
    systemPrefix: "चर कारक अनुभाग में सभी ग्रह/कारक नाम हिंदी रूप में दें।",
  },
  glossary: {
    systemPrefix: "शब्दावली अनुभाग में शब्द और परिभाषाएं पूर्ण हिंदी में दें।",
  },
  doshas: {
    systemPrefix: "दोष अनुभाग में प्रभाव और उपाय पूर्ण हिंदी में लिखें; अंग्रेज़ी शब्द न रहें।",
  },
  rajYogs: {
    systemPrefix: "राजयोग अनुभाग में योग के नाम, फल और सावधानियां हिंदी में दें।",
  },
  sadeSati: {
    systemPrefix: "साढ़ेसाती अनुभाग में चरण, समयरेखा और मार्गदर्शन शुद्ध हिंदी में दें।",
  },
};

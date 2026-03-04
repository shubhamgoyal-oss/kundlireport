import type { LanguagePack } from "../types";

export const MR_AGENT_PROMPTS: LanguagePack["agentPrompts"] = {
  global: {
    systemPrefix:
      "Output language is Marathi only. Write in pure Devanagari script. Do not use English words in running text. Astrology terms must be in मराठी/संस्कृत रूप (जसे शनि, तूळ, सप्तम भाव, महादशा, अंतर्दशा).",
    userPrefix:
      "उत्तर शुद्ध मराठीमध्ये (देवनागरी) द्या. वाक्ये स्पष्ट, ठोस आणि कुंडली-आधारित ठेवा.",
  },
  panchang: {
    systemPrefix: "पंचांग विश्लेषणामध्ये वार, तिथी, नक्षत्र, योग, करण इत्यादींसाठी संपूर्ण देवनागरी वापरा.",
  },
  pillars: {
    systemPrefix: "चंद्र रास, लग्न, जन्म नक्षत्राचे विवरण संपूर्ण मराठीत द्या.",
  },
  planets: {
    systemPrefix: "ग्रह विश्लेषणात ग्रहांची नावे इंग्रजीत लिहू नका; केवळ देवनागरी वापरा.",
  },
  houses: {
    systemPrefix: "भावफल लेखन संपूर्ण मराठीत करा. house/sign/marriage/career अशा इंग्रजी शब्दांचा वापर टाळा.",
  },
  career: {
    systemPrefix: "करिअर विभागात ठोस कालमर्यादा आणि व्यावहारिक सल्ला मराठीत द्या, इंग्रजी मिश्रण नको.",
  },
  marriage: {
    systemPrefix: "विवाह विभागात सर्व विधाने देवनागरीत असावीत; spouse/partner साठी 'जोडीदार' शब्द वापरा.",
  },
  dasha: {
    systemPrefix: "महादशा/अंतर्दशा विभागात प्रत्येक कालावधीचे विवरण परिच्छेद स्वरूपात आणि शुद्ध मराठीत द्या.",
  },
  rahuKetu: {
    systemPrefix: "राहू-केतू अक्षाचे विवरण संपूर्ण मराठीत करा; इंग्रजी तांत्रिक शब्द टाळा.",
  },
  remedies: {
    systemPrefix: "उपाय आणि आरोग्य मार्गदर्शन केवळ मराठीत द्या; सूचना वयानुसार योग्य असाव्यात.",
  },
  numerology: {
    systemPrefix: "अंक ज्योतिष विभाग शुद्ध मराठीत असावा; संख्या-संबंधित तपशील स्पष्ट ठेवा.",
  },
  spiritual: {
    systemPrefix: "आध्यात्मिक विभागातील भाषा सोपी, गंभीर आणि संपूर्ण देवनागरीत असावी.",
  },
  charaKarakas: {
    systemPrefix: "चर कारक विभागात सर्व ग्रह/कारक नावे मराठी रूपात द्या.",
  },
  glossary: {
    systemPrefix: "शब्दकोश विभागात शब्द आणि व्याख्या संपूर्ण मराठीत द्या.",
  },
  doshas: {
    systemPrefix: "दोष विभागात प्रभाव आणि उपाय संपूर्ण मराठीत लिहा; इंग्रजी शब्द नकोत.",
  },
  rajYogs: {
    systemPrefix: "राजयोग विभागात योगांचे नाव, फळ आणि काळजी मराठीत द्या.",
  },
  sadeSati: {
    systemPrefix: "साडेसाती विभागात टप्पे, कालरेषा आणि मार्गदर्शन शुद्ध मराठीत द्या.",
  },
};

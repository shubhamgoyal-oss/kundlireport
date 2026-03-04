// Marathi template strings extracted from agent files (Phase 2)
// Keys follow the pattern: agent.section.subsection
// Placeholders use {variableName} syntax and are substituted by tmpl()

export const MR_TEMPLATES: Record<string, string> = {
  // ── Sade Sati: Phase labels ──────────────────────────────────────────────
  "sadeSati.phaseLabel.rising": "उदय टप्पा",
  "sadeSati.phaseLabel.peak": "शिखर टप्पा",
  "sadeSati.phaseLabel.setting": "अस्त टप्पा",
  "sadeSati.phaseLabel.notActive": "सक्रिय नाही",

  // ── Sade Sati: Phase descriptions ────────────────────────────────────────
  "sadeSati.phaseDesc.rising": "शनि आपल्या चंद्र राशीच्या मागील राशीत आहे. जबाबदाऱ्या वाढतात आणि जीवनाची पुनर्रचना हळूहळू सुरू होते.",
  "sadeSati.phaseDesc.peak": "शनि आपल्या चंद्र राशीवर गोचर करत आहे. भावनिक ताण सर्वाधिक असतो आणि शिस्त अनिवार्य होते.",
  "sadeSati.phaseDesc.setting": "शनि आपल्या चंद्र राशीनंतरच्या राशीत गेला आहे. निकाल परिपक्व होतात, उरलेले धडे पूर्ण होतात आणि स्थिरता परत येते.",
  "sadeSati.phaseDesc.notActive": "शनि सध्या आपल्या जन्म चंद्रापासून 12वी, 1ली किंवा 2री राशीत गोचर करत नाही.",

  // ── Sade Sati: Phase window – Rising ─────────────────────────────────────
  "sadeSati.window.rising.name": "उदय टप्पा (चंद्रापासून 12वी)",
  "sadeSati.window.rising.desc": "खर्च, स्थलांतर आणि मानसिक पुनर्रचनेमुळे ताण वाढतो. हा टप्पा दृश्यमान लाभांपूर्वी शिस्तीची मागणी करतो.",
  "sadeSati.window.rising.challenge0": "वाढत्या खर्चांचा आणि जबाबदाऱ्यांचा भार",
  "sadeSati.window.rising.challenge1": "भावनिक अशांती आणि निद्रा विकार",
  "sadeSati.window.rising.challenge2": "अनावश्यक जबाबदाऱ्या कमी करण्याची गरज",
  "sadeSati.window.rising.blessing0": "कमकुवत दिनचर्यांमध्ये लवकर सुधारणा",
  "sadeSati.window.rising.blessing1": "दीर्घकालीन आर्थिक शिस्त",
  "sadeSati.window.rising.blessing2": "नातेसंबंधांमध्ये स्पष्ट सीमांचे निर्धारण",
  "sadeSati.window.rising.advice": "अनावश्यक जबाबदाऱ्या कमी करा, दैनंदिन दिनचर्या सुरक्षित ठेवा आणि आपत्कालीन निधी जमा करा.",

  // ── Sade Sati: Phase window – Peak ───────────────────────────────────────
  "sadeSati.window.peak.name": "शिखर टप्पा (चंद्रावर)",
  "sadeSati.window.peak.desc": "हा मानसिकदृष्ट्या सर्वात तीव्र टप्पा आहे. शनि भावनिक परिपक्वता, जबाबदारी आणि सहनशीलतेची परीक्षा घेतो.",
  "sadeSati.window.peak.challenge0": "अधिक भावनिक ताण आणि आत्मसंशय",
  "sadeSati.window.peak.challenge1": "अपेक्षित निकालांमध्ये विलंब",
  "sadeSati.window.peak.challenge2": "प्रतिक्रियात्मक संवादामुळे नातेसंबंधांवर ताण",
  "sadeSati.window.peak.blessing0": "सखोल भावनिक परिपक्वता",
  "sadeSati.window.peak.blessing1": "स्थिर व्यावसायिक पाया",
  "sadeSati.window.peak.blessing2": "तणावात उत्तम निर्णय क्षमता",
  "sadeSati.window.peak.advice": "वेगापेक्षा स्थिरतेला प्राधान्य द्या, घाईचे निर्णय टाळा आणि संयमाने अपेक्षा ठेवा.",

  // ── Sade Sati: Phase window – Setting ────────────────────────────────────
  "sadeSati.window.setting.name": "अस्त टप्पा (चंद्रापासून 2री)",
  "sadeSati.window.setting.desc": "समाप्ती आणि एकत्रीकरणाचा टप्पा. मागील प्रयत्न शाश्वत निकालांमध्ये बदलू लागतात आणि कर्माचे धडे पूर्ण होतात.",
  "sadeSati.window.setting.challenge0": "कुटुंब/आर्थिक पुनर्रचनेचे निर्णय",
  "sadeSati.window.setting.challenge1": "दीर्घकालीन ताण चक्रामुळे थकवा",
  "sadeSati.window.setting.challenge2": "निराकरण न झालेल्या जबाबदाऱ्या पूर्ण करण्याची गरज",
  "sadeSati.window.setting.blessing0": "आर्थिक स्थिरीकरण",
  "sadeSati.window.setting.blessing1": "उत्तम व्यावहारिक निर्णय क्षमता",
  "sadeSati.window.setting.blessing2": "अनुत्पादक पद्धतींपासून मुक्ती",
  "sadeSati.window.setting.advice": "संपत्ती एकत्रित करा, बाकी जबाबदाऱ्या पूर्ण करा आणि दीर्घकालीन सामंजस्य जपा.",

  // ── Sade Sati: Normalization fallbacks ───────────────────────────────────
  "sadeSati.transitWindowFallback": "सध्याच्या शनि चक्रावर आधारित गोचर कालावधी",
  "sadeSati.nextPeriodFallback": "भविष्यातील शनि गोचरांवरून निर्धारित केले जाईल",
  "sadeSati.overview": "साडेसाती आपल्या जन्म चंद्र राशी ({moonSign}) वर शनिच्या गोचरावरून मूल्यांकित केली जाते. सध्या गोचर शनि {saturnSign} मध्ये असल्याने, आपली सध्याची स्थिती {activeStatus} आहे. हा कालावधी शिक्षा चक्र नाही; हे शिस्त, वास्तववाद आणि सातत्यपूर्ण प्रयत्नांचे प्रतिफल देणारे दीर्घकालीन कर्म पुनर्रचना चक्र आहे. या चक्रात निकाल सामान्यतः संयम, साध्या प्राधान्यक्रमांमुळे आणि सातत्यपूर्ण श्रमांमुळे येतात, अकस्मात नशिबाने नाही.",
  "sadeSati.importanceExplanation": "साडेसाती महत्त्वाची आहे कारण ती शनिच्या दबावाखाली भावनिक स्थिरतेची (चंद्र) थेट परीक्षा घेते. व्यावहारिकदृष्ट्या, ती निर्णय गुणवत्ता, जोखीम सहनशीलता, कुटुंब गतिशीलता आणि आर्थिक वर्तन बदलू शकते. योग्य दृष्टिकोन — शिस्तबद्ध सवयी, वास्तव-आधारित नियोजन आणि भावनिक संयम. आपली शिस्त जितकी मजबूत असेल, शनिचे निकाल तितकेच रचनात्मक असतील.",
  "sadeSati.moonSaturnRelationship": "आपला जन्म चंद्र {moonSign}{moonHouseClause} मध्ये आहे, गोचर शनि {saturnSign} मध्ये विचारात घेतला आहे. हा चंद्र-शनि संबंध टप्प्याची तीव्रता आणि ताण आधी अनुभवल्या जाणाऱ्या जीवन क्षेत्रांना ठरवतो. भावनिकदृष्ट्या, ही संयोजन परिपक्वता आणि संयमाची मागणी करतो. व्यावहारिकदृष्ट्या, सातत्यपूर्ण प्रयत्न, वास्तविक कालमर्यादा आणि कमी प्रतिक्रियात्मक निर्णयांवर लक्ष केंद्रित करायला हवे.",
  "sadeSati.overallGuidance": "या चक्राला दीर्घकालीन शिस्तीचा अध्याय समजा: जबाबदाऱ्या सरळ करा, आर्थिक राखीव ठेवा आणि प्राधान्यक्रम नियोजनबद्धपणे राबवा. शनि रचनात्मकता, प्रामाणिकपणा आणि स्थिरतेचे प्रतिफल देतो.",
  "sadeSati.spiritualSignificance": "आध्यात्मिकदृष्ट्या, साडेसाती अहंकाराची प्रतिक्रियाशीलता कमी करते आणि आंतरिक स्थिरता मजबूत करते. ती नम्रता, सेवा, शिस्तबद्ध सराव आणि सत्यावर आधारित जगण्याचे प्रतिफल देते. तिचे सर्वात खोल योगदान सुख नाही, तर व्यक्तिमत्व निर्माण आहे.",
  "sadeSati.famousPeople": "अनेक यशस्वी व्यक्तींनी सांगितले की त्यांची प्रमुख शिस्त, नेतृत्व आणि वारसा-निर्माणाची वर्षे शनिच्या दबाव चक्रांदरम्यान घडली, कारण दीर्घकालीन रचना स्थापन करण्यास भाग पाडले गेले.",

  // ── Sade Sati: Remedies (active) ─────────────────────────────────────────
  "sadeSati.remedy.active.0": "शनिवारी कठोर शिस्त पाळा: बाकी कामे पूर्ण करा आणि अनावश्यक वादविवाद टाळा.",
  "sadeSati.remedy.active.1": "शनिवारी तिळाच्या तेलाचा दिवा किंवा शनि प्रार्थना नियमितपणे करा.",
  "sadeSati.remedy.active.2": "शनि कर्म संतुलित करण्यासाठी सेवा-आधारित दान (विशेषतः कामगार/वृद्धांना) करा.",

  // ── Sade Sati: Remedies (inactive) ───────────────────────────────────────
  "sadeSati.remedy.inactive.0": "साडेसाती सक्रिय नसल्याने, तीव्र शनि उपाय आवश्यक नाहीत.",
  "sadeSati.remedy.inactive.1": "भविष्यातील शनि चक्रांसाठी तयार राहण्याकरिता आर्थिक शिस्त आणि दिनचर्या स्थिरता टिकवा.",
  "sadeSati.remedy.inactive.2": "दीर्घकालीन सहनशीलतेसाठी साप्ताहिक प्रार्थना/ध्यान/सेवा सराव सुरू ठेवा.",

  // ── Sade Sati: Effects fallback ──────────────────────────────────────────
  "sadeSati.effect.0": "हा कालावधी जबाबदारी, संयम आणि भावनिक परिपक्वतेवर भर देतो.",
  "sadeSati.effect.1": "प्रगतीसाठी स्थिरता आणि नियोजनबद्ध योजना आवश्यक आहे.",
  "sadeSati.effect.2": "घाईचे निर्णय टाळल्यास दीर्घकालीन स्थिरता सुधारते.",

  // ── Sade Sati: Current – whatToExpect ────────────────────────────────────
  "sadeSati.current.whatToExpect.0": "अचानक उड्यांऐवजी शिस्तबद्ध, टप्प्याटप्प्याने अंमलबजावणीतून प्रगती.",
  "sadeSati.current.whatToExpect.1": "कुटुंब, व्यवसाय आणि आर्थिक निवडींमध्ये अधिक जबाबदारी.",
  "sadeSati.current.whatToExpect.2": "संवेदनशील संवादांमध्ये भावनिक संयमाची गरज.",

  // ── Sade Sati: Current – opportunities ───────────────────────────────────
  "sadeSati.current.opportunities.0": "टिकाऊ व्यवस्था आणि पुनरावृत्ती दिनचर्या तयार करा.",
  "sadeSati.current.opportunities.1": "दीर्घकालीन आर्थिक शिस्त आणि जोखीम विश्लेषण सुधारा.",
  "sadeSati.current.opportunities.2": "संयम आणि स्थिरतेतून परिपक्व नेतृत्व विकसित करा.",

  // ── Sade Sati: Current – whatNotToDo ─────────────────────────────────────
  "sadeSati.current.whatNotToDo.0": "घाईच्या निर्णयांनी निकाल जबरदस्तीने आणू नका.",
  "sadeSati.current.whatNotToDo.1": "अंमलबजावणी क्षमतेशिवाय अतिरिक्त जबाबदाऱ्या स्वीकारू नका.",
  "sadeSati.current.whatNotToDo.2": "निद्रा, विश्रांती आणि मानसिक स्थिरतेकडे दुर्लक्ष करू नका.",

  // ── Sade Sati: Past cycle ────────────────────────────────────────────────
  "sadeSati.past.keyLessons": "मागील शनि चक्रे सामान्यतः संयम, जबाबदारी आणि वास्तववादी नियोजन शिकवतात. त्या कालावधीतील पुनरावृत्ती पद्धती आपल्या पुढील चक्रासाठी प्रमुख तयारी असतात.",
  "sadeSati.past.lifeEvents": "आपल्या मागील चक्राच्या वर्षांचे पुनरावलोकन करा — जबाबदारी, आर्थिक, कौटुंबिक कर्तव्ये आणि भावनिक सहनशीलतेच्या पद्धती ओळखा; त्या तुमच्या प्रायोगिक शनि मार्गदर्शक आहेत.",

  // ── Sade Sati: Next cycle ────────────────────────────────────────────────
  "sadeSati.next.approximateStartFallback": "निर्धारित करायचे आहे",
  "sadeSati.next.preparationAdvice": "पुढील चक्रापूर्वी 1-2 वर्षे आधी तयार राहा: आर्थिक बळकट करा, अनावश्यक ओझे कमी करा आणि स्थिर दिनचर्या तयार करा, मग शनिचा दबाव मोजता येण्यासारख्या प्रगतीत बदलेल.",

  // ── Sade Sati: Mantras ───────────────────────────────────────────────────
  "sadeSati.mantra.shani.purpose": "शनि संबंधित तणाव स्थिर करा आणि शिस्तबद्ध लक्ष सुधारा.",
  "sadeSati.mantra.shani.timing": "शनिवारी, सूर्योदय किंवा सूर्यास्ताच्या वेळी नियमितपणे जप करा.",
  "sadeSati.mantra.neelanjana.purpose": "संयम, सहनशीलता आणि कर्म संतुलनासाठी पारंपरिक शनि स्तोत्र.",
  "sadeSati.mantra.neelanjana.timing": "शनिवारी स्नानानंतर, शांत श्वासोच्छ्वासासह 11/21 वेळा जप करा.",

  // ── Dasha: Antardasha templates ──────────────────────────────────────────
  "dasha.antardasha.interpretation": "{mdName}/{adName} संयोजन {mdThemes} आणि {adThemes} यांना जोडते. या कुंडलीमध्ये {mdCtx} आणि {adCtx} एकत्र कार्य करतात, त्यामुळे निकाल सुनियोजित प्रयत्नांतून येतात. हा काळ जबाबदारी आणि वेळेचा समतोल राखणाऱ्या कार्यांसाठी अत्यंत योग्य आहे. {mdCaution} आणि {adCaution} टाळण्यासाठी निर्णय वास्तवांच्या आधारावर घ्या.",
  "dasha.antardasha.focusAreas.0": "{mdName} आणि {adName} संयोजन — {mdThemes} आणि {adThemes} वर केंद्रित.",
  "dasha.antardasha.focusAreas.1": "संधी — {mdOpportunity}; {adOpportunity} सहाय्यक.",
  "dasha.antardasha.focusAreas.2": "सावधगिरी — {mdCaution} आणि {adCaution} वर नियंत्रण ठेवा.",
  "dasha.antardasha.advice": "या अंतर्दशेमध्ये {mdOpportunity} वर लक्ष द्या आणि {adOpportunity} सावधपणे वापरा. {mdCaution} आणि {adCaution} अडथळा आणू नयेत यासाठी निर्णय तपासणीच्या आधारावर घ्या.",
  "dasha.planetContext": "{pName} {sName} राशीमध्ये (भाव {house}){retro}",
  "dasha.planetContextRetro": ", वक्री",
  "dasha.planetContextUnavailable": "{pName} (स्थान उपलब्ध नाही)",

  // ── Glossary: System prompts ─────────────────────────────────────────────
  "glossary.systemPrompt": "तुम्ही कुंडली अहवालासाठी सर्वसमावेशक पारिभाषिक शब्दकोश तयार करणारे तज्ञ वैदिक ज्योतिष विद्वान आहात.\n\nकृपया सर्व सामग्री देवनागरी लिपीत मराठीमध्ये लिहा. इंग्रजी वापरू नका.\n\nस्पष्ट, सोप्या व्याख्या तयार करा:\n1. मूलभूत संकल्पना (ग्रह, राशी, भाव)\n2. तांत्रिक शब्द (दृष्टी, बल, योग)\n3. भविष्यवाणी परिभाषा (दशा, गोचर)\n4. जैमिनी संकल्पना (कारक, आर्गळ)\n5. उपाय शब्द (उपाय, मंत्र, यंत्र)\n\nप्रत्येक शब्दासाठी प्रदान करा:\n- संस्कृत/मराठी नाव\n- उच्चारण मार्गदर्शन\n- नवशिक्यांसाठी स्पष्ट व्याख्या\n- सखोल समजासाठी विवरणात्मक स्पष्टीकरण\n- ज्योतिषातून व्यावहारिक उदाहरण\n- क्रॉस-रेफरन्ससाठी संबंधित शब्द\n\nवर्गानुसार शब्द संघटित करा.\nअचूकता राखत सोपी मराठी भाषा वापरा.",
  "glossary.langInstruction": "\n\nCRITICAL: Write ALL content (categories, descriptions, definitions, examples, pronunciation guides) in मराठी देवनागरी ONLY. Do NOT use English anywhere. Sanskrit terms MUST be in Devanagari script (e.g., use कुंडली not kundli, use ग्रह not graha). Pronunciation guides must also be in Devanagari script.",
};

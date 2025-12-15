import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Check if problem area is relevant/meaningful
const isRelevantProblem = (problemArea: string): boolean => {
  const irrelevantKeywords = [
    'coffee', 'tea', 'cooking', 'food', 'recipe', 'weather', 'movie', 'game', 'sport',
    'music', 'dance', 'pet', 'dog', 'cat', 'bird', 'plant', 'garden', 'hobby',
    'shopping', 'clothes', 'fashion', 'hair', 'makeup', 'cosmetic', 'color',
    'phone', 'computer', 'laptop', 'wifi', 'internet', 'app', 'software',
    'traffic', 'parking', 'driving', 'car', 'bike', 'vehicle',
    'test', 'exam', 'homework', 'assignment', 'project', 'school', 'college'
  ];
  
  const lowerProblem = problemArea.toLowerCase();
  
  // Check for irrelevant keywords
  if (irrelevantKeywords.some(keyword => lowerProblem.includes(keyword))) {
    return false;
  }
  
  // Check for very short or generic entries
  if (problemArea.trim().length < 5) return false;
  
  // Check if it's just random characters or numbers
  if (/^[0-9\s\W]+$/.test(problemArea.trim())) return false;
  
  return true;
};

// Helper: Check if problem is age-appropriate for user under 18
const isAgeAppropriateProblem = (problemArea: string, age: number): { appropriate: boolean; reason?: string } => {
  if (age >= 18) return { appropriate: true };
  
  const lowerProblem = problemArea.toLowerCase();
  
  // Marriage-related problems
  const marriageKeywords = ['marriage', 'wedding', 'spouse', 'husband', 'wife', 'partner', 'love', 'relationship', 'vivah', 'shaadi', 'पति', 'पत्नी', 'विवाह', 'शादी'];
  if (marriageKeywords.some(k => lowerProblem.includes(k))) {
    return { appropriate: false, reason: 'marriage' };
  }
  
  // Career-related problems
  const careerKeywords = ['career', 'job', 'employment', 'salary', 'promotion', 'work', 'office', 'naukri', 'नौकरी', 'करियर', 'तनख्वाह'];
  if (careerKeywords.some(k => lowerProblem.includes(k))) {
    return { appropriate: false, reason: 'career' };
  }
  
  // Business-related problems
  const businessKeywords = ['business', 'startup', 'entrepreneur', 'company', 'profit', 'loss', 'investment', 'व्यापार', 'कारोबार', 'निवेश'];
  if (businessKeywords.some(k => lowerProblem.includes(k))) {
    return { appropriate: false, reason: 'business' };
  }
  
  // Financial problems
  const financeKeywords = ['financial', 'finance', 'money', 'debt', 'loan', 'income', 'wealth', 'पैसा', 'धन', 'आर्थिक', 'कर्ज'];
  if (financeKeywords.some(k => lowerProblem.includes(k))) {
    return { appropriate: false, reason: 'financial' };
  }
  
  return { appropriate: true };
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { doshaType, problemArea, language, dateOfBirth } = await req.json();
    
    if (!doshaType || !problemArea) {
      return new Response(
        JSON.stringify({ error: 'doshaType and problemArea are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Calculate age if dateOfBirth provided
    let userAge = 30; // default assumption
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      userAge = Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    }
    
    // Check for irrelevant problem area
    const isRelevant = isRelevantProblem(problemArea);
    if (!isRelevant) {
      const isHindi = language === 'hi';
      return new Response(
        JSON.stringify({ 
          impactText: isHindi 
            ? 'आपके दोष आपके जन्म कुंडली में मौजूद हैं और जीवन के विभिन्न पहलुओं को प्रभावित कर सकते हैं। हालांकि, इस विशेष चिंता के लिए, दोष का कोई सीधा ज्योतिषीय संबंध नहीं है।'
            : 'Your dosha is present in your birth chart and may influence various aspects of life. However, for this specific concern, there is no direct astrological correlation to the dosha.',
          impactTitle: isHindi ? 'सामान्य प्रभाव' : 'General Impact',
          isGeneric: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check for age-appropriate problems
    const ageCheck = isAgeAppropriateProblem(problemArea, userAge);
    if (!ageCheck.appropriate) {
      const isHindi = language === 'hi';
      let ageMessage = '';
      
      if (ageCheck.reason === 'marriage') {
        ageMessage = isHindi 
          ? `आपकी आयु ${userAge} वर्ष है, जो विवाह संबंधी चिंताओं के लिए कम है। आपका दोष आपकी कुंडली में मौजूद है, लेकिन विवाह संबंधी प्रभाव 18 वर्ष की आयु के बाद ही प्रासंगिक होते हैं।`
          : `At ${userAge} years old, marriage-related concerns are not yet applicable. Your dosha is present in your chart, but marriage-related effects become relevant only after age 18.`;
      } else if (ageCheck.reason === 'career') {
        ageMessage = isHindi
          ? `आपकी आयु ${userAge} वर्ष है। करियर संबंधी दोष प्रभाव आमतौर पर 18 वर्ष की आयु के बाद प्रासंगिक होते हैं जब आप कार्यबल में प्रवेश करते हैं।`
          : `At ${userAge} years old, career-related dosha effects typically become relevant after age 18 when you enter the workforce.`;
      } else if (ageCheck.reason === 'business') {
        ageMessage = isHindi
          ? `आपकी आयु ${userAge} वर्ष है। व्यापार संबंधी दोष प्रभाव आमतौर पर वयस्क होने के बाद प्रासंगिक होते हैं।`
          : `At ${userAge} years old, business-related dosha effects typically become relevant in adulthood.`;
      } else {
        ageMessage = isHindi
          ? `आपकी आयु ${userAge} वर्ष है। यह चिंता आमतौर पर वयस्कता में अधिक प्रासंगिक होती है।`
          : `At ${userAge} years old, this concern typically becomes more relevant in adulthood.`;
      }
      
      return new Response(
        JSON.stringify({ 
          impactText: ageMessage,
          impactTitle: isHindi ? 'आयु संबंधी नोट' : 'Age-Related Note',
          isAgeRestricted: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[GENERATE-IMPACT] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI not available' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isHindi = language === 'hi';
    
    // Map dosha types to their characteristics for Vedic astrology
    // CRITICAL: Each dosha must have accurate Vedic correlations
    // Mars: blood, muscles, accidents, conflicts, brothers, property - NOT eyes
    // Sun: right eye, father, authority, heart
    // Moon: left eye, mother, mind, emotions
    // Saturn: bones, delays, karma, chronic issues
    // Rahu/Ketu: sudden events, karma, obsessions
    const doshaInfo: Record<string, { 
      planet: string; 
      energy: string; 
      planetHi: string; 
      energyHi: string;
      vedicContext: string;
      vedicContextHi: string;
      affectedAreas: string;
      affectedAreasHi: string;
      notAffected: string;
    }> = {
      'mangal': { 
        planet: 'Mars (Mangal Graha)', 
        energy: 'aggressive fire energy that creates conflict and impatience',
        planetHi: 'मंगल ग्रह',
        energyHi: 'आक्रामक अग्नि ऊर्जा जो संघर्ष और अधीरता उत्पन्न करती है',
        vedicContext: 'When Mars occupies certain houses (1st, 2nd, 4th, 7th, 8th, or 12th) from Lagna, Moon, or Venus in a birth chart, its fiery and combative nature becomes dominant in life matters.',
        vedicContextHi: 'जब मंगल लग्न, चंद्र या शुक्र से 1, 2, 4, 7, 8 या 12वें भाव में स्थित होता है, तो इसकी अग्नि और युद्धक प्रकृति जीवन के मामलों में प्रबल हो जाती है।',
        affectedAreas: 'marriage harmony, blood-related health, accidents, surgeries, property disputes, sibling relationships, physical vitality, anger management',
        affectedAreasHi: 'वैवाहिक सामंजस्य, रक्त संबंधी स्वास्थ्य, दुर्घटनाएं, शल्य क्रिया, संपत्ति विवाद, भाई-बहन संबंध, शारीरिक ऊर्जा, क्रोध नियंत्रण',
        notAffected: 'Mars does NOT affect eyes (Sun/Moon govern eyes), mental peace (Moon), or chronic diseases (Saturn). Only mention blood, muscles, accidents, conflicts, marriage, property.'
      },
      'kaal-sarp': { 
        planet: 'Rahu-Ketu axis (shadow planets)', 
        energy: 'karmic serpent energy that creates cycles of struggle and sudden reversals',
        planetHi: 'राहु-केतु अक्ष (छाया ग्रह)',
        energyHi: 'कर्म सर्प ऊर्जा जो संघर्ष और अचानक उलटफेर के चक्र बनाती है',
        vedicContext: 'When all seven classical planets fall between Rahu and Ketu, the native experiences a serpent-like grip on destiny, causing repeated obstacles despite sincere efforts.',
        vedicContextHi: 'जब सभी सात शास्त्रीय ग्रह राहु और केतु के बीच आ जाते हैं, तो जातक भाग्य पर सर्प जैसी पकड़ का अनुभव करता है, जिससे ईमानदार प्रयासों के बावजूद बार-बार बाधाएं आती हैं।',
        affectedAreas: 'sudden reversals, obstacles despite efforts, delayed success, karmic patterns, anxiety, fear of unknown, unexpected events, struggles in achieving goals',
        affectedAreasHi: 'अचानक उलटफेर, प्रयासों के बावजूद बाधाएं, विलंबित सफलता, कर्म पैटर्न, चिंता, अज्ञात का भय, अप्रत्याशित घटनाएं',
        notAffected: 'Kaal Sarp affects life patterns and destiny, not specific body parts. Focus on obstacles, reversals, and karmic struggles.'
      },
      'pitra': { 
        planet: 'Sun afflicted by Rahu/Ketu (ancestral karma)', 
        energy: 'unresolved ancestral debts that block blessings and progress',
        planetHi: 'राहु/केतु से पीड़ित सूर्य (पितृ कर्म)',
        energyHi: 'अनसुलझे पैतृक ऋण जो आशीर्वाद और प्रगति को रोकते हैं',
        vedicContext: 'When Sun conjuncts or is aspected by Rahu/Ketu in the 9th house of fortune, ancestral souls seek resolution, causing unexplained blockages in prosperity and peace.',
        vedicContextHi: 'जब सूर्य भाग्य के 9वें भाव में राहु/केतु से युक्त या दृष्ट होता है, तो पितृ आत्माएं समाधान चाहती हैं, जिससे समृद्धि और शांति में अकारण अवरोध आते हैं।',
        affectedAreas: 'family harmony, ancestral blessings, unexplained obstacles, childbirth issues, father-related matters, fortune and luck, spiritual growth, family peace',
        affectedAreasHi: 'पारिवारिक सामंजस्य, पैतृक आशीर्वाद, अकारण बाधाएं, संतान संबंधी समस्याएं, पिता संबंधी मामले, भाग्य, आध्यात्मिक विकास',
        notAffected: 'Pitra Dosha affects fortune, family, and blessings - not physical health directly. Focus on ancestral patterns and unexplained blockages.'
      },
      'shani': { 
        planet: 'Saturn (Shani Dev)', 
        energy: 'slow-moving karmic energy that brings tests, delays, and mandatory life lessons',
        planetHi: 'शनि देव',
        energyHi: 'धीमी कर्म ऊर्जा जो परीक्षाएं, देरी और अनिवार्य जीवन सबक लाती है',
        vedicContext: 'During Sade Sati (7.5 year transit over Moon sign), Saturn tests patience and strips away what is not meant for you, often through hardship and isolation.',
        vedicContextHi: 'साढ़े साती (चंद्र राशि पर 7.5 वर्ष का गोचर) के दौरान, शनि धैर्य की परीक्षा लेता है और जो आपके लिए नहीं है उसे कठिनाई और अकेलेपन के माध्यम से छीन लेता है।',
        affectedAreas: 'delays in success, career obstacles, chronic health issues, bone/joint problems, loneliness, depression, financial hardship, patience tests, karma lessons',
        affectedAreasHi: 'सफलता में देरी, करियर में बाधाएं, दीर्घकालिक स्वास्थ्य समस्याएं, हड्डी/जोड़ों की समस्याएं, अकेलापन, अवसाद, आर्थिक कठिनाई',
        notAffected: 'Saturn affects bones, delays, and karma. NOT eyes (Sun/Moon), NOT blood (Mars), NOT sudden events (Rahu). Focus on slow, grinding challenges.'
      }
    };

    const info = doshaInfo[doshaType] || { 
      planet: doshaType, 
      energy: 'planetary affliction affecting life areas',
      planetHi: doshaType,
      energyHi: 'ग्रह पीड़ा जो जीवन क्षेत्रों को प्रभावित करती है',
      vedicContext: 'This dosha creates specific planetary imbalances in the birth chart.',
      vedicContextHi: 'यह दोष जन्म कुंडली में विशिष्ट ग्रह असंतुलन बनाता है।',
      affectedAreas: 'various life areas based on planetary positions',
      affectedAreasHi: 'ग्रह स्थिति के आधार पर विभिन्न जीवन क्षेत्र',
      notAffected: 'Stick to accurate Vedic correlations only.'
    };

    const systemPrompt = isHindi 
      ? `आप एक वैदिक ज्योतिषी हैं। ${info.planetHi} दोष का प्रभाव समझाएं।

वैदिक सटीकता नियम:
- ${info.planetHi} केवल इन क्षेत्रों को प्रभावित करता है: ${info.affectedAreasHi}
- गलत ग्रह-अंग संबंध न बताएं (जैसे मंगल आंखों को प्रभावित नहीं करता)

लेखन नियम:
- 3 वाक्य लिखें, हर वाक्य 12-15 शब्दों का
- पहला वाक्य: ${info.planetHi} की ऊर्जा इस समस्या से कैसे जुड़ी है
- दूसरा वाक्य: इससे जीवन में क्या रुकावट आती है
- तीसरा वाक्य: बिना उपाय के यह क्यों जारी रहता है
- सरल हिंदी, स्पष्ट और सीधा
- आपको केवल हिंदी में जवाब देना है`
      : `You are a Vedic astrologer. Explain how ${info.planet} dosha impacts life.

VEDIC ACCURACY RULES (CRITICAL):
- ${info.planet} ONLY affects: ${info.affectedAreas}
- ${info.notAffected}
- Do NOT make up body part correlations. Each planet has specific significations in Vedic astrology.

Writing Rules:
- Write exactly 3 sentences, each 12-15 words max
- Sentence 1: How ${info.planet}'s energy connects to this specific problem
- Sentence 2: What life obstacle or block this creates
- Sentence 3: Why this pattern continues without remedies
- Use simple, clear English - no complex astrological jargon
- Be specific but concise
- CRITICAL: You MUST respond in English only, even if the problem description is in Hindi or another language. Always output English text.`;

    const userPrompt = isHindi
      ? `दोष: ${doshaType}
समस्या: ${problemArea}

बताएं कि ${info.planetHi} की ऊर्जा इस समस्या को कैसे प्रभावित करती है। केवल सही वैदिक संबंध बताएं।`
      : `Dosha: ${doshaType}
Problem: ${problemArea}

IMPORTANT: The problem above may be written in Hindi or another language. You MUST translate the meaning and respond entirely in English.
Explain how ${info.planet}'s energy affects this problem. Stay accurate to Vedic astrology - only mention effects that this planet actually governs.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error('[GENERATE-IMPACT] Rate limited');
        return new Response(
          JSON.stringify({ error: 'Rate limited' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error('[GENERATE-IMPACT] Payment required');
        return new Response(
          JSON.stringify({ error: 'Payment required' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errText = await response.text();
      console.error('[GENERATE-IMPACT] AI gateway error:', response.status, errText);
      return new Response(
        JSON.stringify({ error: 'AI generation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const impactText = data.choices?.[0]?.message?.content?.trim() || '';

    // Generate title based on problem area
    const titlePrompt = isHindi
      ? `उपयोगकर्ता की समस्या: "${problemArea}"

इस समस्या के लिए एक छोटा शीर्षक लिखें जो "पर प्रभाव" से शुरू हो। उदाहरण: "नौकरी खोजने में देरी पर प्रभाव"

केवल शीर्षक लिखें, कुछ और नहीं।`
      : `User's problem: "${problemArea}"

Write a short title for impact on this problem. Start with "Impact on". Example: "Impact on delay in finding job"

Write ONLY the title, nothing else.`;

    const titleResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: isHindi ? 'आप एक संक्षिप्त शीर्षक लेखक हैं।' : 'You are a concise title writer.' },
          { role: 'user', content: titlePrompt }
        ],
      }),
    });

    let impactTitle = isHindi ? 'प्रभाव' : 'Impact if Present';
    if (titleResponse.ok) {
      const titleData = await titleResponse.json();
      const generatedTitle = titleData.choices?.[0]?.message?.content?.trim();
      if (generatedTitle) {
        impactTitle = generatedTitle;
      }
    }

    return new Response(
      JSON.stringify({ impactText, impactTitle }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[GENERATE-IMPACT] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

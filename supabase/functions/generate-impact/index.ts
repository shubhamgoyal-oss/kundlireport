import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { doshaType, problemArea, language } = await req.json();
    
    if (!doshaType || !problemArea) {
      return new Response(
        JSON.stringify({ error: 'doshaType and problemArea are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
    const doshaInfo: Record<string, { 
      planet: string; 
      energy: string; 
      planetHi: string; 
      energyHi: string;
      vedicContext: string;
      vedicContextHi: string;
    }> = {
      'mangal': { 
        planet: 'Mars (Mangal Graha)', 
        energy: 'aggressive fire energy that creates conflict and impatience',
        planetHi: 'मंगल ग्रह',
        energyHi: 'आक्रामक अग्नि ऊर्जा जो संघर्ष और अधीरता उत्पन्न करती है',
        vedicContext: 'When Mars occupies certain houses (1st, 2nd, 4th, 7th, 8th, or 12th) from Lagna, Moon, or Venus in a birth chart, its fiery and combative nature becomes dominant in life matters.',
        vedicContextHi: 'जब मंगल लग्न, चंद्र या शुक्र से 1, 2, 4, 7, 8 या 12वें भाव में स्थित होता है, तो इसकी अग्नि और युद्धक प्रकृति जीवन के मामलों में प्रबल हो जाती है।'
      },
      'kaal-sarp': { 
        planet: 'Rahu-Ketu axis (shadow planets)', 
        energy: 'karmic serpent energy that creates cycles of struggle and sudden reversals',
        planetHi: 'राहु-केतु अक्ष (छाया ग्रह)',
        energyHi: 'कर्म सर्प ऊर्जा जो संघर्ष और अचानक उलटफेर के चक्र बनाती है',
        vedicContext: 'When all seven classical planets fall between Rahu and Ketu, the native experiences a serpent-like grip on destiny, causing repeated obstacles despite sincere efforts.',
        vedicContextHi: 'जब सभी सात शास्त्रीय ग्रह राहु और केतु के बीच आ जाते हैं, तो जातक भाग्य पर सर्प जैसी पकड़ का अनुभव करता है, जिससे ईमानदार प्रयासों के बावजूद बार-बार बाधाएं आती हैं।'
      },
      'pitra': { 
        planet: 'Sun afflicted by Rahu/Ketu (ancestral karma)', 
        energy: 'unresolved ancestral debts that block blessings and progress',
        planetHi: 'राहु/केतु से पीड़ित सूर्य (पितृ कर्म)',
        energyHi: 'अनसुलझे पैतृक ऋण जो आशीर्वाद और प्रगति को रोकते हैं',
        vedicContext: 'When Sun conjuncts or is aspected by Rahu/Ketu in the 9th house of fortune, ancestral souls seek resolution, causing unexplained blockages in prosperity and peace.',
        vedicContextHi: 'जब सूर्य भाग्य के 9वें भाव में राहु/केतु से युक्त या दृष्ट होता है, तो पितृ आत्माएं समाधान चाहती हैं, जिससे समृद्धि और शांति में अकारण अवरोध आते हैं।'
      },
      'shani': { 
        planet: 'Saturn (Shani Dev)', 
        energy: 'slow-moving karmic energy that brings tests, delays, and mandatory life lessons',
        planetHi: 'शनि देव',
        energyHi: 'धीमी कर्म ऊर्जा जो परीक्षाएं, देरी और अनिवार्य जीवन सबक लाती है',
        vedicContext: 'During Sade Sati (7.5 year transit over Moon sign), Saturn tests patience and strips away what is not meant for you, often through hardship and isolation.',
        vedicContextHi: 'साढ़े साती (चंद्र राशि पर 7.5 वर्ष का गोचर) के दौरान, शनि धैर्य की परीक्षा लेता है और जो आपके लिए नहीं है उसे कठिनाई और अकेलेपन के माध्यम से छीन लेता है।'
      }
    };

    const info = doshaInfo[doshaType] || { 
      planet: doshaType, 
      energy: 'planetary affliction affecting life areas',
      planetHi: doshaType,
      energyHi: 'ग्रह पीड़ा जो जीवन क्षेत्रों को प्रभावित करती है',
      vedicContext: 'This dosha creates specific planetary imbalances in the birth chart.',
      vedicContextHi: 'यह दोष जन्म कुंडली में विशिष्ट ग्रह असंतुलन बनाता है।'
    };

    const systemPrompt = isHindi 
      ? `आप एक वैदिक ज्योतिषी हैं। ${info.planetHi} दोष का प्रभाव समझाएं।

नियम:
- 3 वाक्य लिखें, हर वाक्य 12-15 शब्दों का
- पहला वाक्य: ${info.planetHi} की ऊर्जा इस समस्या से कैसे जुड़ी है
- दूसरा वाक्य: इससे जीवन में क्या रुकावट आती है
- तीसरा वाक्य: बिना उपाय के यह क्यों जारी रहता है
- सरल हिंदी, स्पष्ट और सीधा
- आपको केवल हिंदी में जवाब देना है`
      : `You are a Vedic astrologer. Explain how ${info.planet} dosha impacts life.

Rules:
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

बताएं कि ${info.planetHi} की ऊर्जा इस समस्या को कैसे प्रभावित करती है।`
      : `Dosha: ${doshaType}
Problem: ${problemArea}

IMPORTANT: The problem above may be written in Hindi or another language. You MUST translate the meaning and respond entirely in English.
Explain how ${info.planet}'s energy affects this problem. Be clear and specific but keep it concise.`;

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

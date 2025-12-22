import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[GENERATE-IMPACT] Request received');

  try {
    const { doshaType, problemArea, language } = await req.json();
    console.log('[GENERATE-IMPACT] Params:', { doshaType, problemArea: problemArea?.substring(0, 50), language });
    
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
      affectedAreas: string;
      affectedAreasHi: string;
      notAffected: string;
    }> = {
      'mangal': { 
        planet: 'Mars (Mangal Graha)', 
        energy: 'aggressive fire energy that creates conflict and impatience',
        planetHi: 'मंगल ग्रह',
        energyHi: 'आक्रामक अग्नि ऊर्जा जो संघर्ष और अधीरता उत्पन्न करती है',
        affectedAreas: 'marriage harmony, blood-related health, accidents, surgeries, property disputes, sibling relationships, physical vitality, anger management',
        affectedAreasHi: 'वैवाहिक सामंजस्य, रक्त संबंधी स्वास्थ्य, दुर्घटनाएं, शल्य क्रिया, संपत्ति विवाद, भाई-बहन संबंध, शारीरिक ऊर्जा, क्रोध नियंत्रण',
        notAffected: 'Mars does NOT affect eyes (Sun/Moon govern eyes), mental peace (Moon), or chronic diseases (Saturn). Only mention blood, muscles, accidents, conflicts, marriage, property.'
      },
      'kaal-sarp': { 
        planet: 'Rahu-Ketu axis (shadow planets)', 
        energy: 'karmic serpent energy that creates cycles of struggle and sudden reversals',
        planetHi: 'राहु-केतु अक्ष (छाया ग्रह)',
        energyHi: 'कर्म सर्प ऊर्जा जो संघर्ष और अचानक उलटफेर के चक्र बनाती है',
        affectedAreas: 'sudden reversals, obstacles despite efforts, delayed success, karmic patterns, anxiety, fear of unknown, unexpected events, struggles in achieving goals',
        affectedAreasHi: 'अचानक उलटफेर, प्रयासों के बावजूद बाधाएं, विलंबित सफलता, कर्म पैटर्न, चिंता, अज्ञात का भय, अप्रत्याशित घटनाएं',
        notAffected: 'Kaal Sarp affects life patterns and destiny, not specific body parts. Focus on obstacles, reversals, and karmic struggles.'
      },
      'pitra': { 
        planet: 'Sun afflicted by Rahu/Ketu (ancestral karma)', 
        energy: 'unresolved ancestral debts that block blessings and progress',
        planetHi: 'राहु/केतु से पीड़ित सूर्य (पितृ कर्म)',
        energyHi: 'अनसुलझे पैतृक ऋण जो आशीर्वाद और प्रगति को रोकते हैं',
        affectedAreas: 'family harmony, ancestral blessings, unexplained obstacles, childbirth issues, father-related matters, fortune and luck, spiritual growth, family peace',
        affectedAreasHi: 'पारिवारिक सामंजस्य, पैतृक आशीर्वाद, अकारण बाधाएं, संतान संबंधी समस्याएं, पिता संबंधी मामले, भाग्य, आध्यात्मिक विकास',
        notAffected: 'Pitra Dosha affects fortune, family, and blessings - not physical health directly. Focus on ancestral patterns and unexplained blockages.'
      },
      'shani': { 
        planet: 'Saturn (Shani Dev)', 
        energy: 'slow-moving karmic energy that brings tests, delays, and mandatory life lessons',
        planetHi: 'शनि देव',
        energyHi: 'धीमी कर्म ऊर्जा जो परीक्षाएं, देरी और अनिवार्य जीवन सबक लाती है',
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
      affectedAreas: 'various life areas based on planetary positions',
      affectedAreasHi: 'ग्रह स्थिति के आधार पर विभिन्न जीवन क्षेत्र',
      notAffected: 'Stick to accurate Vedic correlations only.'
    };

    // Combined prompt for both title and impact in ONE API call
    const systemPrompt = isHindi 
      ? `आप एक वैदिक ज्योतिषी हैं। ${info.planetHi} दोष का प्रभाव समझाएं।

वैदिक सटीकता नियम:
- ${info.planetHi} केवल इन क्षेत्रों को प्रभावित करता है: ${info.affectedAreasHi}
- गलत ग्रह-अंग संबंध न बताएं

आपको JSON format में जवाब देना है:
{"title": "समस्या पर प्रभाव (8-10 शब्द)", "text": "3 वाक्य, हर वाक्य 12-15 शब्द"}

नियम:
- title: "पर प्रभाव" से शुरू करें
- text: पहला वाक्य ऊर्जा का संबंध, दूसरा रुकावट, तीसरा बिना उपाय क्यों जारी
- सरल हिंदी, कोई markdown नहीं`
      : `You are a Vedic astrologer. Explain how ${info.planet} dosha impacts life.

VEDIC ACCURACY RULES:
- ${info.planet} ONLY affects: ${info.affectedAreas}
- ${info.notAffected}

Respond in JSON format:
{"title": "Impact on [problem] (8-10 words)", "text": "3 sentences, each 12-15 words max"}

Rules:
- title: Start with "Impact on"
- text: Sentence 1 = energy connection, Sentence 2 = life obstacle, Sentence 3 = why continues without remedy
- Simple English, no markdown, no asterisks`;

    const userPrompt = isHindi
      ? `दोष: ${doshaType}
समस्या: ${problemArea}

JSON में जवाब दें।`
      : `Dosha: ${doshaType}
Problem: ${problemArea}

Respond in JSON only.`;

    console.log('[GENERATE-IMPACT] Calling AI API...');
    const apiStartTime = Date.now();
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite', // Use faster model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    console.log('[GENERATE-IMPACT] AI API responded in', Date.now() - apiStartTime, 'ms');

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
    const rawContent = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Parse JSON response
    let impactTitle = isHindi ? 'प्रभाव' : 'Impact if Present';
    let impactText = '';
    
    try {
      // Try to extract JSON from response (handle markdown code blocks)
      let jsonStr = rawContent;
      if (rawContent.includes('```')) {
        const match = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) jsonStr = match[1].trim();
      }
      
      const parsed = JSON.parse(jsonStr);
      impactTitle = parsed.title || impactTitle;
      impactText = parsed.text || rawContent;
    } catch {
      // Fallback to raw content if JSON parsing fails
      console.log('[GENERATE-IMPACT] JSON parse failed, using raw content');
      impactText = rawContent;
    }

    console.log('[GENERATE-IMPACT] Total time:', Date.now() - startTime, 'ms');

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

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
    
    // Map dosha types to their characteristics
    const doshaInfo: Record<string, { planet: string; energy: string; planetHi: string; energyHi: string }> = {
      'mangal': { 
        planet: 'Mars', 
        energy: 'aggressive, impulsive energy',
        planetHi: 'मंगल',
        energyHi: 'आक्रामक, आवेगपूर्ण ऊर्जा'
      },
      'kaal-sarp': { 
        planet: 'Rahu-Ketu axis', 
        energy: 'karmic blockages and sudden obstacles',
        planetHi: 'राहु-केतु अक्ष',
        energyHi: 'कर्म संबंधी अवरोध और अचानक बाधाएं'
      },
      'pitra': { 
        planet: 'Sun and ancestral karma', 
        energy: 'unresolved ancestral patterns',
        planetHi: 'सूर्य और पितृ कर्म',
        energyHi: 'अनसुलझे पैतृक पैटर्न'
      },
      'shani': { 
        planet: 'Saturn', 
        energy: 'delays, restrictions and karmic lessons',
        planetHi: 'शनि',
        energyHi: 'देरी, प्रतिबंध और कर्म संबंधी सबक'
      }
    };

    const info = doshaInfo[doshaType] || { 
      planet: doshaType, 
      energy: 'planetary affliction',
      planetHi: doshaType,
      energyHi: 'ग्रह पीड़ा'
    };

    const systemPrompt = isHindi 
      ? `आप एक वैदिक ज्योतिष विशेषज्ञ हैं। आपको बताना है कि ${info.planetHi} की ${info.energyHi} उपयोगकर्ता की समस्या को कैसे प्रभावित करती है।

नियम:
- 2-3 वाक्य लिखें, संक्षिप्त रखें
- वैज्ञानिक और तथ्यात्मक शैली में लिखें
- "मैं" से शुरू न करें
- सहानुभूतिपूर्ण न हों, तथ्यात्मक रहें
- ग्रह ऊर्जा और समस्या के बीच संबंध स्पष्ट करें
- सरल हिंदी का प्रयोग करें`
      : `You are a Vedic astrology expert. Explain how ${info.planet}'s ${info.energy} affects the user's stated problem.

Rules:
- Write 2-3 sentences, keep it concise
- Use scientific and factual tone
- Do NOT start with "I" or use first person
- Do NOT be empathetic, be factual
- Explain the connection between planetary energy and the problem
- Use simple English`;

    const userPrompt = isHindi
      ? `दोष: ${doshaType}
उपयोगकर्ता की समस्या: ${problemArea}

समझाएं कि यह दोष इस विशिष्ट समस्या को कैसे प्रभावित करता है।`
      : `Dosha: ${doshaType}
User's problem: ${problemArea}

Explain how this dosha specifically impacts this problem.`;

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

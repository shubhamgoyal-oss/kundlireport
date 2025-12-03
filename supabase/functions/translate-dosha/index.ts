import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Static translations for common phrases - no API calls needed
const staticTranslations: Record<string, string> = {
  'No Ketu/Naga Dosha detected.': 'कोई केतु/नाग दोष नहीं पाया गया।',
  'No Grahan Dosha detected.': 'कोई ग्रहण दोष नहीं पाया गया।',
  'No Shrapit Dosha detected.': 'कोई श्रापित दोष नहीं पाया गया।',
  'No Guru Chandal Dosha detected.': 'कोई गुरु चांडाल दोष नहीं पाया गया।',
  'No Punarphoo Dosha detected.': 'कोई पुनर्फू दोष नहीं पाया गया।',
  'No Kemadruma Yoga detected.': 'कोई केमद्रुम योग नहीं पाया गया।',
  'No Gandmool Dosha detected.': 'कोई गण्डमूल दोष नहीं पाया गया।',
  'No Kalathra Dosha detected.': 'कोई कलात्र दोष नहीं पाया गया।',
  'No Vish Daridra Yoga detected.': 'कोई विष दरिद्र योग नहीं पाया गया।',
  'No Kaal Sarp Dosha detected in your chart.': 'आपकी कुंडली में कोई काल सर्प दोष नहीं पाया गया।',
};

// Inline translation helper - no API calls
const translateInline = (text: string): string => {
  if (!text) return text;
  
  // Check for exact static match first
  if (staticTranslations[text]) {
    return staticTranslations[text];
  }
  
  let translated = text;
  
  // Planet names
  translated = translated
    .replace(/\bMars\b/g, 'मंगल')
    .replace(/\bMoon\b/g, 'चंद्र')
    .replace(/\bSun\b/g, 'सूर्य')
    .replace(/\bSaturn\b/g, 'शनि')
    .replace(/\bJupiter\b/g, 'गुरु')
    .replace(/\bVenus\b/g, 'शुक्र')
    .replace(/\bMercury\b/g, 'बुध')
    .replace(/\bRahu\b/g, 'राहु')
    .replace(/\bKetu\b/g, 'केतु');
  
  // Signs
  translated = translated
    .replace(/\bAries\b/g, 'मेष')
    .replace(/\bTaurus\b/g, 'वृषभ')
    .replace(/\bGemini\b/g, 'मिथुन')
    .replace(/\bCancer\b/g, 'कर्क')
    .replace(/\bLeo\b/g, 'सिंह')
    .replace(/\bVirgo\b/g, 'कन्या')
    .replace(/\bLibra\b/g, 'तुला')
    .replace(/\bScorpio\b/g, 'वृश्चिक')
    .replace(/\bSagittarius\b/g, 'धनु')
    .replace(/\bCapricorn\b/g, 'मकर')
    .replace(/\bAquarius\b/g, 'कुंभ')
    .replace(/\bPisces\b/g, 'मीन');
  
  // Dosha-specific terms
  translated = translated
    .replace(/Vish\/Daridra Yoga detected:/g, 'विष/दरिद्र योग पाया गया:')
    .replace(/Kalathra Dosha detected:/g, 'कलात्र दोष पाया गया:')
    .replace(/Gandmool Dosha detected:/g, 'गण्डमूल दोष पाया गया:')
    .replace(/Guru Chandal Dosha detected:/g, 'गुरु चांडाल दोष पाया गया:')
    .replace(/Punarphoo Dosha detected:/g, 'पुनर्फू दोष पाया गया:')
    .replace(/Kemadruma Yoga detected:/g, 'केमद्रुम योग पाया गया:')
    .replace(/Mars-Saturn conjunction/g, 'मंगल-शनि युति')
    .replace(/Jupiter-Ketu conjunction/g, 'गुरु-केतु युति')
    .replace(/Jupiter-Rahu conjunction/g, 'गुरु-राहु युति')
    .replace(/Saturn-Moon conjunction/g, 'शनि-चंद्र युति')
    .replace(/7th lord/g, 'सप्तमेश')
    .replace(/conjunct/g, 'युति में')
    .replace(/nakshatra/g, 'नक्षत्र');
  
  return translated;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    
    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use inline translation - no external API calls
    const translatedText = translateInline(text);

    return new Response(
      JSON.stringify({ translatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[TRANSLATE] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

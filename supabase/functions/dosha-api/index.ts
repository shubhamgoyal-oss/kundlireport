import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Geocoding using Nominatim (OpenStreetMap) - no API key needed
async function geocodeLocation(placeName: string): Promise<{ lat: number; lon: number; displayName: string } | null> {
  try {
    // Add "India" bias for better results
    const query = placeName.toLowerCase().includes('india') ? placeName : `${placeName}, India`;
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=in`,
      {
        headers: {
          'User-Agent': 'DoshaCalculatorAPI/1.0'
        }
      }
    );
    
    if (!response.ok) {
      console.error('Nominatim API error:', response.status);
      return null;
    }
    
    const results = await response.json();
    
    if (results && results.length > 0) {
      return {
        lat: parseFloat(results[0].lat),
        lon: parseFloat(results[0].lon),
        displayName: results[0].display_name
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Get timezone offset for India (IST = +5:30)
function getTimezoneOffset(): number {
  return 5.5; // IST
}

// Puja data - simplified version for API
const DOSHA_PUJA_MAPPING: Record<string, { keywords: string[]; fallback: any }> = {
  mangal: {
    keywords: ['mangal', 'मंगल'],
    fallback: {
      title: 'Mangal Dosh Nivaran Puja',
      title_hi: 'मंगल दोष निवारण पूजा',
      price: '₹2,100',
      link: 'https://srimandir.com/puja/mangal-dosh-nivaran'
    }
  },
  pitra: {
    keywords: ['pitru', 'pitra', 'पितृ'],
    fallback: {
      title: 'Pitru Dosh Nivaran Puja',
      title_hi: 'पितृ दोष निवारण पूजा',
      price: '₹2,100',
      link: 'https://srimandir.com/puja/pitru-dosh-nivaran'
    }
  },
  kaalSarp: {
    keywords: ['kaal sarp', 'काल सर्प'],
    fallback: {
      title: 'Kaal Sarp Dosh Nivaran Puja',
      title_hi: 'काल सर्प दोष निवारण पूजा',
      price: '₹3,100',
      link: 'https://srimandir.com/puja/kaal-sarp-dosh-nivaran'
    }
  },
  shani: {
    keywords: ['shani', 'शनि'],
    fallback: {
      title: 'Shani Sade Sati Shanti Puja',
      title_hi: 'शनि साढ़े साती शांति पूजा',
      price: '₹2,100',
      link: 'https://srimandir.com/puja/shani-sade-sati'
    }
  },
  sadeSati: {
    keywords: ['shani', 'sade sati', 'शनि'],
    fallback: {
      title: 'Shani Sade Sati Shanti Puja',
      title_hi: 'शनि साढ़े साती शांति पूजा',
      price: '₹2,100',
      link: 'https://srimandir.com/puja/shani-sade-sati'
    }
  },
  grahan: {
    keywords: ['grahan', 'ग्रहण'],
    fallback: {
      title: 'Grahan Dosh Nivaran Puja',
      title_hi: 'ग्रहण दोष निवारण पूजा',
      price: '₹1,500',
      link: 'https://srimandir.com/puja/grahan-dosh-nivaran'
    }
  },
  navagraha: {
    keywords: ['navagraha', 'navagrah', 'नवग्रह'],
    fallback: {
      title: 'Navagraha Shanti Puja',
      title_hi: 'नवग्रह शांति पूजा',
      price: '₹2,500',
      link: 'https://srimandir.com/puja/navagraha-shanti'
    }
  }
};

// Dosha name mappings
const doshaNameMap: Record<string, { en: string; hi: string }> = {
  mangal: { en: 'Mangal Dosha', hi: 'मंगल दोष' },
  pitra: { en: 'Pitra Dosha', hi: 'पितृ दोष' },
  kaalSarp: { en: 'Kaal Sarp Dosha', hi: 'काल सर्प दोष' },
  shani: { en: 'Shani Dosha', hi: 'शनि दोष' },
  sadeSati: { en: 'Sade Sati', hi: 'साढ़े साती' },
  grahan: { en: 'Grahan Dosha', hi: 'ग्रहण दोष' },
  shrapit: { en: 'Shrapit Dosha', hi: 'श्रापित दोष' },
  guruChandal: { en: 'Guru Chandal Dosha', hi: 'गुरु चांडाल दोष' },
  punarphoo: { en: 'Punarphoo Dosha', hi: 'पुनर्फू दोष' },
  kemadruma: { en: 'Kemadruma Yoga', hi: 'केमद्रुम योग' },
  gandmool: { en: 'Gandmool Dosha', hi: 'गंडमूल दोष' },
  kalathra: { en: 'Kalathra Dosha', hi: 'कलत्र दोष' },
  vishDaridra: { en: 'Vish/Daridra Yoga', hi: 'विष/दरिद्र योग' },
  ketuNaga: { en: 'Ketu/Naga Dosha', hi: 'केतु/नाग दोष' },
  navagraha: { en: 'Navagraha Umbrella', hi: 'नवग्रह छत्र' }
};

// Generate AI impact for a dosha
async function generateImpact(
  doshaType: string, 
  problemArea: string, 
  language: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<{ impactTitle: string; impactText: string } | null> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-impact`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ doshaType, problemArea, language })
    });

    if (!response.ok) {
      console.error('Generate impact error:', response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Generate impact failed:', error);
    return null;
  }
}

// Get kundali chart image
async function getKundaliChart(
  day: number,
  month: number,
  year: number,
  hour: number,
  minute: number,
  lat: number,
  lon: number,
  language: string,
  supabaseUrl: string,
  supabaseKey: string
): Promise<string | null> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/get-kundali-chart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        day,
        month,
        year,
        hour,
        minute,
        lat,
        lon,
        tzone: getTimezoneOffset(),
        chartType: 'North',
        language: language === 'hi' ? 'hi' : 'en'
      })
    });

    if (!response.ok) {
      console.error('Get kundali chart error:', response.status);
      return null;
    }

    const data = await response.json();
    return data?.data?.svg || null;
  } catch (error) {
    console.error('Get kundali chart failed:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    const {
      name,
      date_of_birth,      // Format: YYYY-MM-DD or DD-MM-YYYY or DD/MM/YYYY
      time_of_birth,      // Format: HH:MM (24hr) or HH:MM AM/PM
      place_of_birth,     // Text location - will be geocoded
      gender = 'male',
      language = 'en',    // 'en' or 'hi'
      problem_area,       // Optional: for AI-generated impact
      include_chart = true, // Whether to include kundali SVG
      include_impacts = true, // Whether to generate AI impacts
      visitor_id = 'whatsapp-api',
      session_id = 'whatsapp-session'
    } = body;

    // Validate required fields
    if (!name || !date_of_birth || !time_of_birth || !place_of_birth) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields',
          required: ['name', 'date_of_birth', 'time_of_birth', 'place_of_birth'],
          optional: ['gender', 'language', 'problem_area', 'include_chart', 'include_impacts'],
          example: {
            name: 'Rahul Sharma',
            date_of_birth: '1990-05-15',
            time_of_birth: '10:30',
            place_of_birth: 'Mumbai',
            gender: 'male',
            language: 'en',
            problem_area: 'career and financial stability'
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing dosha calculation for:', { name, date_of_birth, time_of_birth, place_of_birth, problem_area });

    // Step 1: Geocode the location
    const geoResult = await geocodeLocation(place_of_birth);
    
    if (!geoResult) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not find location',
          message: `Unable to geocode "${place_of_birth}". Please provide a valid city/town name in India.`,
          suggestions: [
            'Try using just the city name (e.g., "Mumbai" instead of "Mumbai, Maharashtra")',
            'Check spelling of the location',
            'Try a nearby major city'
          ]
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Geocoded location:', geoResult);

    // Step 2: Parse and normalize date
    let normalizedDate = date_of_birth;
    // Handle DD-MM-YYYY or DD/MM/YYYY formats
    if (date_of_birth.includes('/') || (date_of_birth.includes('-') && date_of_birth.split('-')[0].length <= 2)) {
      const parts = date_of_birth.split(/[-\/]/);
      if (parts.length === 3) {
        normalizedDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    // Parse date components
    const [yearStr, monthStr, dayStr] = normalizedDate.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);

    // Step 3: Normalize time to 24hr format
    let normalizedTime = time_of_birth;
    let hour = 0;
    let minute = 0;
    const timeMatch = time_of_birth.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      minute = parseInt(timeMatch[2]);
      const period = timeMatch[3];
      
      if (period) {
        if (period.toUpperCase() === 'PM' && hour !== 12) hour += 12;
        if (period.toUpperCase() === 'AM' && hour === 12) hour = 0;
      }
      normalizedTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    }

    // Step 4: Call the existing calculate-dosha function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Normalize gender to M/F format
    const normalizedGender = gender?.toLowerCase().startsWith('f') ? 'F' : 'M';
    
    const doshaPayload = {
      name,
      date: normalizedDate,
      time: normalizedTime,
      tz: 'Asia/Kolkata',
      lat: geoResult.lat,
      lon: geoResult.lon,
      place: geoResult.displayName,
      gender: normalizedGender,
      unknownTime: false
    };

    console.log('Calling calculate-dosha with:', doshaPayload);

    const doshaResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-dosha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify(doshaPayload)
    });

    if (!doshaResponse.ok) {
      const errorText = await doshaResponse.text();
      console.error('Calculate-dosha error:', errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Calculation failed',
          message: 'Unable to calculate doshas. Please try again.',
          details: errorText
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const doshaResult = await doshaResponse.json();
    console.log('Dosha calculation result received, summary:', JSON.stringify(doshaResult.summary));

    // Step 5: Get Kundali chart (parallel with impact generation)
    const chartPromise = include_chart 
      ? getKundaliChart(day, month, year, hour, minute, geoResult.lat, geoResult.lon, language, supabaseUrl, supabaseKey)
      : Promise.resolve(null);

    // Step 6: Extract present doshas and build puja recommendations
    const presentDoshas: string[] = [];
    const doshaDetails: any[] = [];
    const pujaRecommendations: any[] = [];

    const summary = doshaResult.summary || {};
    const detailsData = doshaResult.details || {}; // Fixed: use 'details' not 'doshaResults'

    // Helper to check if dosha is active
    const isActive = (status: string | undefined): boolean => {
      if (!status) return false;
      const s = status.toLowerCase();
      return s === 'present' || s === 'active' || s === 'suggested' || s === 'partial' || s.includes('present');
    };

    // Check each dosha
    for (const [doshaKey, doshaValue] of Object.entries(summary)) {
      const status = (doshaValue as any)?.status;
      const severity = (doshaValue as any)?.severity;
      
      if (isActive(status)) {
        presentDoshas.push(doshaKey);
        
        const doshaName = doshaNameMap[doshaKey] || { en: doshaKey, hi: doshaKey };
        
        // Get explanation from details
        const doshaData = detailsData[doshaKey] || {};
        const explanation = doshaData.explanation || '';
        const remedies = doshaData.remedies || [];

        doshaDetails.push({
          key: doshaKey,
          name: language === 'hi' ? doshaName.hi : doshaName.en,
          severity: severity || 'moderate',
          status: status,
          explanation: explanation,
          remedies: remedies
        });

        // Get puja recommendation
        const pujaMapping = DOSHA_PUJA_MAPPING[doshaKey];
        if (pujaMapping) {
          const puja = pujaMapping.fallback;
          pujaRecommendations.push({
            dosha: language === 'hi' ? doshaName.hi : doshaName.en,
            puja: {
              title: language === 'hi' ? puja.title_hi : puja.title,
              price: puja.price,
              link: puja.link,
              cover_image: `https://srimandir.com/images/puja-${doshaKey}.jpg`
            }
          });
        }
      }
    }

    // If multiple doshas, also recommend Navagraha
    if (presentDoshas.length >= 3 && !presentDoshas.includes('navagraha')) {
      const navagraha = DOSHA_PUJA_MAPPING.navagraha.fallback;
      pujaRecommendations.push({
        dosha: language === 'hi' ? 'नवग्रह शांति (एकाधिक दोषों के लिए)' : 'Navagraha Shanti (for multiple doshas)',
        puja: {
          title: language === 'hi' ? navagraha.title_hi : navagraha.title,
          price: navagraha.price,
          link: navagraha.link,
          cover_image: 'https://srimandir.com/images/puja-navagraha.jpg'
        }
      });
    }

    // Step 7: Generate AI impacts for present doshas (if problem_area provided)
    const impacts: Record<string, any> = {};
    if (include_impacts && problem_area && presentDoshas.length > 0) {
      console.log('Generating AI impacts for doshas:', presentDoshas);
      
      // Generate impacts in parallel for top 3 doshas
      const topDoshas = presentDoshas.slice(0, 3);
      const impactPromises = topDoshas.map(doshaKey => 
        generateImpact(doshaKey, problem_area, language, supabaseUrl, supabaseKey)
          .then(result => ({ doshaKey, result }))
      );
      
      const impactResults = await Promise.all(impactPromises);
      
      for (const { doshaKey, result } of impactResults) {
        if (result) {
          impacts[doshaKey] = {
            title: result.impactTitle,
            text: result.impactText
          };
          
          // Add impact to dosha details
          const doshaDetail = doshaDetails.find(d => d.key === doshaKey);
          if (doshaDetail) {
            doshaDetail.ai_impact = result;
          }
        }
      }
    }

    // Wait for chart
    const kundaliSvg = await chartPromise;

    // Step 8: Build response
    const response: any = {
      success: true,
      input: {
        name,
        date_of_birth: normalizedDate,
        time_of_birth: normalizedTime,
        place_of_birth: geoResult.displayName,
        coordinates: {
          latitude: geoResult.lat,
          longitude: geoResult.lon
        },
        problem_area: problem_area || null
      },
      doshas: {
        count: presentDoshas.length,
        present: doshaDetails,
        summary: presentDoshas.length === 0 
          ? (language === 'hi' ? 'आपकी कुंडली में कोई प्रमुख दोष नहीं पाया गया।' : 'No major doshas found in your kundali.')
          : (language === 'hi' 
              ? `आपकी कुंडली में ${presentDoshas.length} दोष पाए गए हैं।` 
              : `${presentDoshas.length} dosha(s) found in your kundali.`)
      },
      pujas: pujaRecommendations,
      calculation_id: doshaResult.calculationId || null
    };

    // Add kundali chart if available
    if (kundaliSvg) {
      response.kundali_chart = {
        format: 'svg',
        data: kundaliSvg
      };
    }

    // Add AI impacts if generated
    if (Object.keys(impacts).length > 0) {
      response.ai_impacts = impacts;
    }

    console.log('API response prepared, doshas:', presentDoshas.length, 'chart:', !!kundaliSvg, 'impacts:', Object.keys(impacts).length);

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in dosha-api:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: errorMessage
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

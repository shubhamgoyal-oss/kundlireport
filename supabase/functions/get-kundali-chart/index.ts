import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KundaliRequest {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
  lat: number;
  lon: number;
  tzone: number;
  chartType: 'North' | 'South';
  language: 'en' | 'hi';
  divisionalChart?: string; // D1, D2, D3, D4, D7, D9, D10, D12, etc.
}

// Chart names for reference
const CHART_NAMES: Record<string, string> = {
  D1: 'Rashi (Birth Chart)',
  D2: 'Hora (Wealth)',
  D3: 'Drekkana (Siblings)',
  D4: 'Chaturthamsa (Fortune)',
  D7: 'Saptamsa (Children)',
  D9: 'Navamsa (Marriage)',
  D10: 'Dasamsa (Career)',
  D12: 'Dwadasamsa (Parents)',
  D16: 'Shodasamsa (Vehicles)',
  D20: 'Vimsamsa (Spiritual)',
  D24: 'Chaturvimsamsa (Education)',
  D27: 'Bhamsa (Strength)',
  D30: 'Trimsamsa (Misfortune)',
  D40: 'Khavedamsa (Auspiciousness)',
  D45: 'Akshavedamsa (Character)',
  D60: 'Shashtiamsa (Karma)',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: KundaliRequest = await req.json();
    const divisionalChart = body.divisionalChart || 'D1';
    
    console.log('[get-kundali-chart] Request for:', divisionalChart, JSON.stringify(body));

    const seerPayload = {
      day: body.day,
      month: body.month,
      year: body.year,
      hour: body.hour,
      minute: body.minute,
      lat: body.lat,
      lon: body.lon,
      tzone: body.tzone,
      chartType: body.chartType,
      image_type: 'svg'
    };

    const response = await fetch(`https://api-sbox.a4b.io/gw2/seer/external/v1/chart/horo-image/${divisionalChart}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Language': body.language || 'en',
        'x-afb-r-uid': '7160881',
        'x-fe-server': 'true'
      },
      body: JSON.stringify(seerPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[get-kundali-chart] Seer API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Seer API error: ${response.status}` }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const data = await response.json();
    console.log('[get-kundali-chart] Response received for', divisionalChart, ', svg length:', data?.data?.svg?.length || 0);

    return new Response(
      JSON.stringify({
        ...data,
        chartType: divisionalChart,
        chartName: CHART_NAMES[divisionalChart] || divisionalChart
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('[get-kundali-chart] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
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
    const body = await req.json();
    const { day, month, year, hour, min, lat, lon, tzone, name, gender } = body;

    console.log("📡 [DEBUG-SEER] Calling Seer API with:", { day, month, year, hour, min, lat, lon, tzone, name, gender });

    const seerPayload = {
      day,
      month,
      year,
      hour,
      min,
      lat,
      lon,
      tzone,
      user_id: 505,
      name: name || "Debug",
      gender: gender || "M",
    };

    const response = await fetch("https://api-sbox.a4b.io/gw2/seer/internal/v1/user/kundli-details", {
      method: "POST",
      headers: {
        "x-fe-server": "true",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(seerPayload)
    });

    const data = await response.json();

    return new Response(
      JSON.stringify({
        request: seerPayload,
        response: data,
        status: response.status
      }, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("❌ [DEBUG-SEER] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('[TEST] Request received');
  
  if (req.method === 'OPTIONS') {
    console.log('[TEST] OPTIONS request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[TEST] Processing request');
    const body = await req.json();
    console.log('[TEST] Body:', JSON.stringify(body));
    
    return new Response(
      JSON.stringify({ success: true, echo: body, message: 'Test function works!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[TEST] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

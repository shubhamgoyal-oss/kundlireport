import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify API key - accepts environment secret OR hardcoded fallback
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('ANALYTICS_API_KEY');
    const hardcodedKey = 'gsheetsconnector';
    
    if (!apiKey || (apiKey !== expectedKey && apiKey !== hardcodedKey)) {
      console.error('Invalid or missing API key');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('API key validated successfully');

    // Parse query params
    const url = new URL(req.url);
    const table = url.searchParams.get('table') || 'analytics_events';
    const limit = parseInt(url.searchParams.get('limit') || '1000');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const startDate = url.searchParams.get('start_date');
    const endDate = url.searchParams.get('end_date');

    console.log(`Fetching ${table} with limit=${limit}, offset=${offset}`);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Supported tables
    const allowedTables = [
      'analytics_events',
      'dosha_calculations',
      'dosha_calculator2',
      'callback_requests',
      'traffic_sources',
      'seer_api_logs',
      'expert_chat_logs'
    ];

    if (!allowedTables.includes(table)) {
      return new Response(JSON.stringify({ error: `Table not allowed: ${table}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build query - use count to get total rows
    let query = supabase.from(table).select('*', { count: 'exact' });
    
    // Apply date filters if provided
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    // Apply pagination with explicit limit (Supabase default is 1000)
    // Max allowed is 50000 to prevent timeouts
    const effectiveLimit = Math.min(limit, 50000);
    query = query.order('created_at', { ascending: false }).range(offset, offset + effectiveLimit - 1);

    const { data, error, count: totalCount } = await query;

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Fetched ${data?.length || 0} rows from ${table} (total: ${totalCount})`);

    // Return data in a format easy for Google Sheets
    return new Response(JSON.stringify({
      table,
      count: data?.length || 0,
      total_count: totalCount,
      offset,
      limit: effectiveLimit,
      data: data || [],
      // Include column headers for first row in sheets
      headers: data && data.length > 0 ? Object.keys(data[0]) : []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in export-analytics:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

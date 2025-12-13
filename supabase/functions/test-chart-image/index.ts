import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Test the chart image endpoint with D1 as chart_id
    const chartId = "D1";
    const url = `https://api-sbox.a4b.io/gw2/seer/internal/v1/user/horo_chart_image/${chartId}`;
    
    console.log("🌐 Testing Seer Chart Image API");
    console.log("📍 URL:", url);
    
    // Try with birth details as query params or body
    const birthDetails = {
      day: 15,
      month: 5,
      year: 1990,
      hour: 10,
      min: 30,
      lat: 19.076,
      lon: 72.8777,
      tzone: 5.5,
      user_id: 505,
      name: "Test User",
      gender: "M"
    };
    
    console.log("📤 Request payload:", JSON.stringify(birthDetails, null, 2));
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-fe-server": "true",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(birthDetails)
    });
    
    console.log("📊 Response Status:", response.status, response.statusText);
    console.log("📋 Response Headers:", JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    
    const contentType = response.headers.get("content-type");
    console.log("📄 Content-Type:", contentType);
    
    if (contentType?.includes("image")) {
      // It's an image! Return it as base64
      const imageBuffer = await response.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
      console.log("✅ Got image! Size:", imageBuffer.byteLength, "bytes");
      
      return new Response(JSON.stringify({
        success: true,
        type: "image",
        contentType,
        size: imageBuffer.byteLength,
        base64: `data:${contentType};base64,${base64}`
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    } else {
      // It's JSON or text
      const text = await response.text();
      console.log("📦 Response body:", text);
      
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
      
      return new Response(JSON.stringify({
        success: response.ok,
        type: "json",
        status: response.status,
        data: parsed
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  } catch (error: unknown) {
    console.error("❌ Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

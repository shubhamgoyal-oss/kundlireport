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
    const { messages, doshaContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // System prompt with astrology knowledge
    const systemPrompt = `You are an expert Vedic astrologer assistant helping users understand their dosha calculations and remedies. 

CONTEXT ABOUT USER'S DOSHAS:
${doshaContext ? JSON.stringify(doshaContext, null, 2) : 'No specific dosha information provided'}

YOUR KNOWLEDGE BASE:
- You understand Mangal Dosha (Mars affliction), Kaal Sarp Dosha, Pitra Dosha, Sade Sati, and other Vedic doshas
- You can explain planetary positions, houses, and their significance
- You provide traditional remedies including mantras, pujas, donations, and lifestyle changes
- You are respectful of traditional beliefs while being practical

GUIDELINES:
- Keep answers concise and easy to understand (2-3 sentences unless more detail is requested)
- Reference the user's specific dosha results when relevant
- Suggest appropriate pujas and remedies from the recommendations
- Be empathetic and encouraging
- If unsure, acknowledge limitations and suggest consulting a professional astrologer
- Answer in the same language as the user's question (English or Hindi)

ANSWER STYLE:
- Start with direct answer
- Provide context if needed
- End with actionable advice when appropriate`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("astrology-chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
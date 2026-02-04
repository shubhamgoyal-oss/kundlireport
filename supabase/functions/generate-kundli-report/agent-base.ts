// Shared AI calling logic for all prediction agents

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface AgentResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  tokensUsed?: number;
}

export async function callAgent<T>(
  systemPrompt: string,
  userPrompt: string,
  toolName: string,
  toolDescription: string,
  toolSchema: Record<string, any>
): Promise<AgentResponse<T>> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { success: false, error: "LOVABLE_API_KEY is not configured" };
  }

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: toolName,
              description: toolDescription,
              parameters: toolSchema
            }
          }
        ],
        tool_choice: { type: "function", function: { name: toolName } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AGENT] AI call failed: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded. Please try again later." };
      }
      if (response.status === 402) {
        return { success: false, error: "AI credits exhausted. Please add funds." };
      }
      return { success: false, error: `AI call failed: ${response.status}` };
    }

    const result = await response.json();
    const tokensUsed = result.usage?.total_tokens || 0;

    // Extract tool call arguments
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== toolName) {
      console.error("[AGENT] No valid tool call in response");
      return { success: false, error: "Invalid AI response structure" };
    }

    const data = JSON.parse(toolCall.function.arguments) as T;
    return { success: true, data, tokensUsed };

  } catch (error) {
    console.error("[AGENT] Error calling AI:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error calling AI" 
    };
  }
}

// Batch multiple agent calls in parallel
export async function callAgentsInParallel<T>(
  calls: Array<() => Promise<AgentResponse<T>>>
): Promise<AgentResponse<T>[]> {
  return Promise.all(calls.map(fn => fn()));
}

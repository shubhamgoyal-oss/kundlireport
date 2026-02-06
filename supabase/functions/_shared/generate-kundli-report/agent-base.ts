// Shared AI calling logic for all prediction agents

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

// Core honesty guidelines added to ALL agent prompts
export const HONESTY_GUIDELINES = `

CRITICAL HONESTY RULES:
1. BE COMPLETELY FRANK: Do not sugarcoat negative aspects. If something is challenging, say it clearly.
2. BE DIRECT ABOUT POSITIVES: When something is genuinely favorable, state it confidently.
3. NO SPIN: Do not try to "rotate" the user or make bad news sound good. State facts as they are.
4. BALANCED BUT HONEST: Present both challenges and strengths, but never downplay difficulties.
5. CLEAR LANGUAGE: Use direct, clear language. Avoid vague platitudes like "with effort things will improve."
6. SPECIFIC PREDICTIONS: Give concrete, specific interpretations, not generic feel-good statements.

Examples of WRONG approach:
- "While Saturn brings challenges, these are opportunities for growth" ← Too positive spin
- "Marriage may face some minor adjustments" ← Minimizing real issues

Examples of RIGHT approach:
- "Saturn in 7th house indicates delayed marriage and significant marital challenges. Divorce risk is elevated."
- "Jupiter debilitated in 10th shows career struggles and lack of recognition in early life."
- "Sun exalted in 10th indicates strong career success and recognition from authority figures."`;

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

  // Add honesty guidelines to system prompt
  const enhancedSystemPrompt = systemPrompt + HONESTY_GUIDELINES;

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: enhancedSystemPrompt },
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

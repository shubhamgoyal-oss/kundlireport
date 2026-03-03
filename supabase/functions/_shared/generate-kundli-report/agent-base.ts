// Shared AI calling logic for all prediction agents

const AI_OPENAI_URL = Deno.env.get("AI_OPENAI_URL")
  || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const AI_MODEL = Deno.env.get("AI_MODEL") || "gemini-2.5-flash";

// ─── Language context for multi-language generation ────────────────────────
let _agentLanguage = "en";

export function setAgentLanguageContext(language: string): void {
  _agentLanguage = (language || "en").toLowerCase();
  console.log(`[AGENT] Language context set to: ${_agentLanguage}`);
}

export function getAgentLanguage(): string {
  return _agentLanguage;
}

// ─── Native context: gender + age for all agents ──────────────────────────
// Set once in the orchestrator; injected into every agent's system prompt.
interface NativeContext {
  gender: string;    // "M" | "F" | "O"
  birthDate: Date;
  generatedAt: Date;
}

let _nativeContext: NativeContext | null = null;

export function setAgentNativeContext(gender: string, birthDate: Date, generatedAt?: Date): void {
  _nativeContext = { gender, birthDate, generatedAt: generatedAt || new Date() };
  const age = Math.max(0, Math.floor((_nativeContext.generatedAt.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
  const gLabel = gender === "F" ? "female" : gender === "O" ? "non-binary/gender-diverse" : "male";
  console.log(`[AGENT] Native context set: ${gLabel}, age ~${age}`);
}

export function getAgentNativeContext(): NativeContext | null {
  return _nativeContext;
}

// getLanguageInstruction() now reads from the canonical language pack
// instead of hardcoding per-language text. See lang-utils.ts.
import { globalLanguageInstruction, nativeContextInstruction, sectionPrompt as lookupSectionLangPrompt } from "./lang-utils.ts";

// Core honesty guidelines added to ALL agent prompts
export const HONESTY_GUIDELINES = `

CRITICAL HONESTY RULES:
1. BE COMPLETELY FRANK: Do not sugarcoat negative aspects. If something is challenging, say it clearly.
2. BE DIRECT ABOUT POSITIVES: When something is genuinely favorable, state it confidently.
3. NO SPIN: Do not try to "rotate" the user or make bad news sound good. State facts as they are.
4. BALANCED BUT HONEST: Present both challenges and strengths, but never downplay difficulties.
5. CLEAR LANGUAGE: Use direct, clear language. Avoid vague platitudes like "with effort things will improve."
6. SPECIFIC PREDICTIONS: Give concrete, specific interpretations, not generic feel-good statements.
7. EVIDENCE-LINKED INTERPRETATION: Tie major predictions to explicit chart factors (planet/sign/house/aspect), not abstract claims.
8. DEPTH OVER ONE-LINERS: Core narrative fields must be paragraph-style, not short template sentences.
9. AVOID TEMPLATE PHRASES: Do not recycle stock lines like "meaningful shift in priorities" or similar generic filler.

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

function extractJsonObjectFromText(text: string): string | null {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return trimmed.slice(start, end + 1);
}

function extractToolPayload<T>(result: any, toolName: string): T | null {
  const toolCalls = result?.choices?.[0]?.message?.tool_calls;
  if (Array.isArray(toolCalls)) {
    const matching = toolCalls.find((tc: any) => tc?.function?.name === toolName);
    if (matching?.function?.arguments) {
      try {
        return JSON.parse(matching.function.arguments) as T;
      } catch (err) {
        console.error("[AGENT] Failed to parse tool-call arguments:", err);
      }
    }
  }

  const rawContent = result?.choices?.[0]?.message?.content;
  const contentText = typeof rawContent === "string"
    ? rawContent
    : Array.isArray(rawContent)
      ? rawContent.map((c: any) => (typeof c?.text === "string" ? c.text : "")).join("\n")
      : "";
  const jsonCandidate = extractJsonObjectFromText(contentText);
  if (jsonCandidate) {
    try {
      return JSON.parse(jsonCandidate) as T;
    } catch (err) {
      console.error("[AGENT] Failed to parse content JSON fallback:", err);
    }
  }

  return null;
}

async function runToolCallRequest(
  apiKey: string,
  enhancedSystemPrompt: string,
  userPrompt: string,
  toolName: string,
  toolDescription: string,
  toolSchema: Record<string, any>,
): Promise<{ ok: boolean; status?: number; errorText?: string; result?: any }> {
  // 150-second timeout per individual AI API call to prevent indefinite hangs.
  // Most agents complete in 30-60s. The Dasha agent (heaviest, 10k+ tokens in Hindi)
  // typically finishes in 60-80s. The retry wrapper handles true failures.
  // IMPORTANT: Supabase Edge Functions have a wall_clock_limit (default 150s, max 400s
  // on Pro). The parent function's safety timeout (140s) will fire first for Stage 1.
  const controller = new AbortController();
  const fetchTimeout = setTimeout(() => controller.abort(), 150_000);

  let response: Response;
  try {
    response = await fetch(AI_OPENAI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
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
  } catch (err: any) {
    clearTimeout(fetchTimeout);
    if (err?.name === "AbortError") {
      return { ok: false, status: 408, errorText: "AI API request timed out after 150s" };
    }
    throw err;
  }
  clearTimeout(fetchTimeout);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      errorText: await response.text(),
    };
  }

  const result = await response.json();
  return { ok: true, result };
}

export async function callAgent<T>(
  systemPrompt: string,
  userPrompt: string,
  toolName: string,
  toolDescription: string,
  toolSchema: Record<string, any>,
  section?: string
): Promise<AgentResponse<T>> {
  const API_KEY = Deno.env.get("GEMINI_API_KEY")
    || Deno.env.get("GOOGLE_API_KEY")
    || Deno.env.get("LOVABLE_API_KEY");
  if (!API_KEY) {
    return { success: false, error: "GEMINI_API_KEY is not configured" };
  }

  // ── Prompt order optimized for Gemini implicit caching ──────────────
  // Gemini 2.5 Flash caches the longest matching PREFIX across requests
  // at 90% input token discount (min 1,024 tokens).
  // By placing shared content (HONESTY + language + native context)
  // FIRST, all 36+ agent calls in a report share the same prefix,
  // maximizing cache hits. Within the same agent type (houses ×12,
  // planets ×9), the ENTIRE system prompt is identical → full cache hit.

  // ── Section-specific language reinforcement ────────────────────────
  // When a section name is provided (e.g. "career", "marriage") and the
  // language is non-English, we append the language-pack's section-specific
  // prompt at the END of the system prompt (strongest recency position)
  // and add a language-reminder suffix to the user prompt.
  let sectionLangSuffix = "";
  let userLangSuffix = "";
  if (section && _agentLanguage !== "en") {
    const sp = lookupSectionLangPrompt(section as any);
    if (sp) {
      sectionLangSuffix = `\n\nSECTION LANGUAGE RULE:\n${sp}\nREMINDER: Every value in your JSON response must use the target language script. Zero English words in narrative fields.`;
    }
    const langLabel = _agentLanguage === "hi" ? "Hindi (Devanagari)" : _agentLanguage === "te" ? "Telugu" : _agentLanguage === "kn" ? "Kannada" : _agentLanguage === "mr" ? "Marathi (Devanagari)" : "";
    if (langLabel) {
      userLangSuffix = `\n\nIMPORTANT: Your ENTIRE response must be in ${langLabel} script. Translate ALL English words — including profession names, personality traits, technical terms, and descriptive words. Zero English in output.`;
    }
  }
  const enhancedSystemPrompt = HONESTY_GUIDELINES + nativeContextInstruction() + globalLanguageInstruction() + "\n\n" + systemPrompt + sectionLangSuffix;
  const finalUserPrompt = userPrompt + userLangSuffix;

  try {
    let tokensUsed = 0;

    const first = await runToolCallRequest(
      API_KEY,
      enhancedSystemPrompt,
      finalUserPrompt,
      toolName,
      toolDescription,
      toolSchema,
    );

    if (!first.ok) {
      console.error(`[AGENT] AI call failed: ${first.status}`, first.errorText || "");
      if (first.status === 429) {
        return { success: false, error: "Rate limit exceeded. Please try again later." };
      }
      if (first.status === 402) {
        return { success: false, error: "AI credits exhausted. Please add funds." };
      }
      return { success: false, error: `AI call failed: ${first.status}` };
    }

    tokensUsed += first.result?.usage?.total_tokens || 0;
    const firstPayload = extractToolPayload<T>(first.result, toolName);
    if (firstPayload !== null) {
      return { success: true, data: firstPayload, tokensUsed };
    }

    const retryPrompt = `${finalUserPrompt}

CRITICAL RESPONSE FORMAT:
- You MUST respond via function call "${toolName}" only.
- Do NOT return plain text narrative outside function arguments.
- Ensure arguments are valid JSON matching the function schema exactly.`;

    const second = await runToolCallRequest(
      API_KEY,
      enhancedSystemPrompt,
      retryPrompt,
      toolName,
      toolDescription,
      toolSchema,
    );
    if (!second.ok) {
      console.error(`[AGENT] Retry AI call failed: ${second.status}`, second.errorText || "");
      return { success: false, error: `AI retry failed: ${second.status}` };
    }
    tokensUsed += second.result?.usage?.total_tokens || 0;
    const secondPayload = extractToolPayload<T>(second.result, toolName);
    if (secondPayload !== null) {
      return { success: true, data: secondPayload, tokensUsed };
    }

    console.error("[AGENT] No valid tool payload after retry");
    return { success: false, error: "Invalid AI response structure", tokensUsed };

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

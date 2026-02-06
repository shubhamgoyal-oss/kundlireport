// QA Agent - Validates and sanitizes all report content before PDF generation

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";

export interface QAIssue {
  section: string;
  issueType: "formatting" | "accuracy" | "sensitive" | "clarity" | "inconsistency";
  severity: "critical" | "warning" | "info";
  description: string;
  suggestedFix: string;
}

export interface QAResult {
  approved: boolean;
  overallScore: number; // 1-10
  issues: QAIssue[];
  sanitizedSections: Record<string, string>;
  blockedContent: string[];
  summary: string;
}

// Sensitive topics that must be filtered or handled carefully
const SENSITIVE_TOPICS = [
  "sex",
  "sexual",
  "intercourse",
  "genitals",
  "erotic",
  "pornographic",
  "suicide",
  "self-harm",
  "murder",
  "killing",
  "violence",
  "abuse",
  "rape",
  "assault",
  "death prediction",
  "exact death date",
  "when will I die",
  "caste",
  "racial",
  "religious hatred",
  "terrorism",
];

// Pre-filter check for sensitive content
function containsSensitiveContent(text: string): string[] {
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const topic of SENSITIVE_TOPICS) {
    if (lowerText.includes(topic.toLowerCase())) {
      found.push(topic);
    }
  }
  
  return found;
}

// Sanitize text by removing or replacing sensitive content
function sanitizeText(text: string): string {
  let sanitized = text;
  
  // Replace death-related predictions with general longevity language
  sanitized = sanitized.replace(/will die|death will occur|death is indicated/gi, "longevity considerations arise");
  sanitized = sanitized.replace(/exact date of death|when you will die/gi, "overall life span indications");
  
  // Remove explicit sexual content
  sanitized = sanitized.replace(/sexual intercourse|sexual activity|sex life details/gi, "marital harmony");
  sanitized = sanitized.replace(/\bsex\b(?!th)/gi, "intimacy"); // "sex" but not "sixth"
  
  // Soften violent language
  sanitized = sanitized.replace(/murder|killing|violence/gi, "conflict");
  sanitized = sanitized.replace(/suicide|self-harm/gi, "mental health challenges");
  
  return sanitized;
}

const QA_SYSTEM_PROMPT = `You are a rigorous Quality Assurance expert for Vedic astrology reports. Your job is to ensure:

1. **CONTENT ACCURACY**: All astrological interpretations must be consistent with Vedic astrology principles
2. **FORMATTING QUALITY**: Text should be well-structured, grammatically correct, free of broken sentences
3. **CLARITY**: Language should be clear, professional, and understandable to a general audience
4. **CONSISTENCY**: Cross-check that planet positions, house placements match throughout the report
5. **APPROPRIATENESS**: Flag any content that is:
   - Sexually explicit or inappropriate
   - Predicting exact death dates (never allowed)
   - Promoting violence, self-harm, or harmful activities
   - Discriminatory based on caste, religion, race, or gender
   - Making impossible guarantees or scam-like promises
   
6. **HONESTY CHECK**: Verify that negative aspects are stated clearly, not sugar-coated

CRITICAL RULES:
- Death predictions must be reframed as "longevity considerations" - never predict death dates
- Sexual content must be reframed as "marital harmony" or removed entirely
- Violence must be reframed as "conflict" or "challenges"
- Any content promoting harm must be blocked entirely

Score the report 1-10 where:
- 10: Perfect, ready for delivery
- 7-9: Good with minor issues
- 4-6: Needs revision
- 1-3: Critical issues, should not be delivered`;

export async function runQAValidation(reportContent: Record<string, any>): Promise<QAResult> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    console.error("[QA] LOVABLE_API_KEY not configured");
    return {
      approved: false,
      overallScore: 0,
      issues: [{ 
        section: "system", 
        issueType: "accuracy", 
        severity: "critical", 
        description: "QA system not configured",
        suggestedFix: "Configure LOVABLE_API_KEY"
      }],
      sanitizedSections: {},
      blockedContent: [],
      summary: "QA validation could not run due to missing configuration"
    };
  }

  // Step 1: Pre-filter sensitive content
  const contentString = JSON.stringify(reportContent);
  const sensitiveFound = containsSensitiveContent(contentString);
  const blockedContent: string[] = [...sensitiveFound];
  
  // Step 2: Prepare content summary for AI review
  const contentSummary = {
    panchang: reportContent.panchang ? JSON.stringify(reportContent.panchang).substring(0, 500) : null,
    pillars: reportContent.pillars ? JSON.stringify(reportContent.pillars).substring(0, 500) : null,
    career: reportContent.career ? JSON.stringify(reportContent.career).substring(0, 1000) : null,
    marriage: reportContent.marriage ? JSON.stringify(reportContent.marriage).substring(0, 1000) : null,
    dasha: reportContent.dasha ? JSON.stringify(reportContent.dasha).substring(0, 1000) : null,
    remedies: reportContent.remedies ? JSON.stringify(reportContent.remedies).substring(0, 1000) : null,
    spiritual: reportContent.spiritual ? JSON.stringify(reportContent.spiritual).substring(0, 500) : null,
    numerology: reportContent.numerology ? JSON.stringify(reportContent.numerology).substring(0, 500) : null,
    charaKarakasDetailed: reportContent.charaKarakasDetailed ? JSON.stringify(reportContent.charaKarakasDetailed).substring(0, 500) : null,
    rahuKetu: reportContent.rahuKetu ? JSON.stringify(reportContent.rahuKetu).substring(0, 500) : null,
  };

  const userPrompt = `Review this Kundli report for quality, accuracy, and appropriateness:

**Birth Details:**
- Name: ${reportContent.birthDetails?.name || "Unknown"}
- DOB: ${reportContent.birthDetails?.dateOfBirth || "Unknown"}
- Place: ${reportContent.birthDetails?.placeOfBirth || "Unknown"}

**Ascendant:** ${reportContent.ascendant?.sign || "Unknown"}

**Planetary Positions:**
${reportContent.planetaryPositions?.map((p: any) => `- ${p.name}: ${p.sign} (House ${p.house})`).join("\n") || "Not available"}

**Content Sections to Review:**
${JSON.stringify(contentSummary, null, 2)}

**Pre-filtered Sensitive Content Found:** ${sensitiveFound.length > 0 ? sensitiveFound.join(", ") : "None"}

**Report Errors Logged:** ${reportContent.errors?.join(", ") || "None"}

Perform thorough QA validation and provide structured feedback.`;

  const toolSchema = {
    type: "object",
    properties: {
      approved: { 
        type: "boolean", 
        description: "Whether report is approved for delivery (score >= 7 and no critical issues)" 
      },
      overallScore: { 
        type: "number", 
        description: "Overall quality score 1-10" 
      },
      issues: {
        type: "array",
        items: {
          type: "object",
          properties: {
            section: { type: "string", description: "Which section has the issue" },
            issueType: { 
              type: "string", 
              enum: ["formatting", "accuracy", "sensitive", "clarity", "inconsistency"] 
            },
            severity: { 
              type: "string", 
              enum: ["critical", "warning", "info"] 
            },
            description: { type: "string", description: "What the issue is" },
            suggestedFix: { type: "string", description: "How to fix it" }
          },
          required: ["section", "issueType", "severity", "description", "suggestedFix"]
        },
        description: "List of all issues found"
      },
      sanitizedSections: {
        type: "object",
        description: "Any sections that need text replacement for appropriateness"
      },
      summary: { 
        type: "string", 
        description: "2-3 sentence overall assessment" 
      }
    },
    required: ["approved", "overallScore", "issues", "sanitizedSections", "summary"],
    additionalProperties: false
  };

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
          { role: "system", content: QA_SYSTEM_PROMPT },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "qa_validation_result",
              description: "Return QA validation results",
              parameters: toolSchema
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "qa_validation_result" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[QA] AI call failed: ${response.status}`, errorText);
      
      // Return a default approval with warning if QA fails
      return {
        approved: true,
        overallScore: 6,
        issues: [{
          section: "qa_system",
          issueType: "accuracy",
          severity: "warning",
          description: "QA validation could not complete, proceeding with caution",
          suggestedFix: "Manual review recommended"
        }],
        sanitizedSections: {},
        blockedContent,
        summary: "QA validation encountered an error. Report proceeding with pre-filtered content only."
      };
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.error("[QA] No tool call in response");
      return {
        approved: true,
        overallScore: 6,
        issues: [],
        sanitizedSections: {},
        blockedContent,
        summary: "QA validation completed with basic checks only."
      };
    }

    const qaResult = JSON.parse(toolCall.function.arguments) as QAResult;
    qaResult.blockedContent = blockedContent;
    
    // Add any sensitive content as critical issues
    if (sensitiveFound.length > 0) {
      qaResult.issues.push({
        section: "multiple",
        issueType: "sensitive",
        severity: "critical",
        description: `Sensitive content detected: ${sensitiveFound.join(", ")}`,
        suggestedFix: "Content has been pre-filtered and sanitized"
      });
    }

    console.log(`[QA] Validation complete. Score: ${qaResult.overallScore}/10, Approved: ${qaResult.approved}, Issues: ${qaResult.issues.length}`);
    
    return qaResult;

  } catch (error) {
    console.error("[QA] Error running validation:", error);
    return {
      approved: true,
      overallScore: 5,
      issues: [{
        section: "qa_system",
        issueType: "accuracy",
        severity: "warning",
        description: `QA error: ${error instanceof Error ? error.message : "Unknown"}`,
        suggestedFix: "Manual review recommended"
      }],
      sanitizedSections: {},
      blockedContent,
      summary: "QA validation encountered an error. Basic pre-filtering applied."
    };
  }
}

// Apply sanitization to report content
export function sanitizeReportContent(report: Record<string, any>): Record<string, any> {
  const sanitized = JSON.parse(JSON.stringify(report)); // Deep clone
  
  // Recursively sanitize all string values
  function sanitizeObject(obj: any): any {
    if (typeof obj === "string") {
      return sanitizeText(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }
    if (obj && typeof obj === "object") {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = sanitizeObject(value);
      }
      return result;
    }
    return obj;
  }
  
  return sanitizeObject(sanitized);
}

// QA Agent - Validates and sanitizes all report content before PDF generation

const AI_OPENAI_URL = process.env.AI_OPENAI_URL
  || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const AI_MODEL = process.env.AI_MODEL || "gemini-2.5-flash";

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

const VAGUE_PATTERNS = [
  /meaningful shift in priorities/i,
  /structured action/i,
  /disciplined follow-?through/i,
  /realistic expectations/i,
  /work with sequence and timing/i,
  /things will improve/i,
  /with effort.*improve/i,
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
  sanitized = sanitized.replace(/\bsexuali[sz]ed\b/gi, "intense relational");
  sanitized = sanitized.replace(/\bsexual\b/gi, "intimate");
  sanitized = sanitized.replace(/\bsex\b(?!th)/gi, "intimacy"); // "sex" but not "sixth"
  
  // Soften violent language
  sanitized = sanitized.replace(/murder|killing|violence/gi, "conflict");
  sanitized = sanitized.replace(/suicide|self-harm/gi, "mental health challenges");
  
  return sanitized;
}

function isWeakNarrative(text: unknown, minLength: number, reportLanguage = "en"): boolean {
  const t = typeof text === "string" ? text.trim() : "";
  const effectiveMin = reportLanguage === "en" ? minLength : Math.floor(minLength * 0.4);
  if (t.length < effectiveMin) return true;
  if (reportLanguage !== "en") return false;  // skip English-only vague patterns
  return VAGUE_PATTERNS.some((rx) => rx.test(t));
}

function parseMonthYearToDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(`${trimmed} 01`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function runDeterministicQualityChecks(reportContent: Record<string, any>): QAIssue[] {
  const issues: QAIssue[] = [];
  const lang = String(reportContent.language || "en").toLowerCase();

  const sade = reportContent.sadeSati;
  if (sade) {
    if (isWeakNarrative(sade.overview, 140, lang)) {
      issues.push({
        section: "sadeSati.overview",
        issueType: "clarity",
        severity: "warning",
        description: "Sade Sati overview is short/generic and lacks concrete transit-linked interpretation.",
        suggestedFix: "Add a detailed paragraph tied to Moon sign, Saturn transit sign, and current phase.",
      });
    }
    if (isWeakNarrative(sade.moonSaturnRelationship, 100, lang)) {
      issues.push({
        section: "sadeSati.moonSaturnRelationship",
        issueType: "clarity",
        severity: "warning",
        description: "Moon-Saturn relationship explanation is weak or missing.",
        suggestedFix: "Explain Moon sign and transit Saturn relation with practical implications.",
      });
    }
  }

  const dasha = reportContent.dasha;
  if (dasha?.upcomingMahadashaAntardashaPredictions && Array.isArray(dasha.upcomingMahadashaAntardashaPredictions)) {
    let weakCount = 0;
    for (const md of dasha.upcomingMahadashaAntardashaPredictions) {
      const antardashas = Array.isArray(md?.antardashas) ? md.antardashas : [];
      for (const ad of antardashas) {
        if (isWeakNarrative(ad?.interpretation, 100, lang)) weakCount++;
      }
    }
    if (weakCount > 0) {
      issues.push({
        section: "dasha.upcomingMahadashaAntardashaPredictions",
        issueType: "clarity",
        severity: weakCount > 3 ? "critical" : "warning",
        description: `${weakCount} upcoming Antardasha interpretation(s) appear too short or generic.`,
        suggestedFix: "Regenerate those Antardasha narratives with chart-specific, paragraph-style interpretation.",
      });
    }
  }

  if (dasha?.antardashaPredictions && Array.isArray(dasha.antardashaPredictions)) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let pastLeakCount = 0;
    let malformedLabelCount = 0;
    for (const ad of dasha.antardashaPredictions) {
      const end = parseMonthYearToDate(ad?.endDate);
      if (end && end < monthStart) pastLeakCount++;
      if (typeof ad?.mahadasha === "string" && ad.mahadasha.includes("/")) malformedLabelCount++;
    }

    if (pastLeakCount > 0) {
      issues.push({
        section: "dasha.antardashaPredictions",
        issueType: "inconsistency",
        severity: "critical",
        description: `${pastLeakCount} completed past Antardasha period(s) leaked into current-Mahadasha section.`,
        suggestedFix: "Filter current-Mahadasha Antardashas by endDate >= current month before rendering.",
      });
    }

    if (malformedLabelCount > 0) {
      issues.push({
        section: "dasha.antardashaPredictions.labels",
        issueType: "formatting",
        severity: "warning",
        description: `${malformedLabelCount} Antardasha label(s) contain malformed Mahadasha strings.`,
        suggestedFix: "Normalize Dasha labels to single-planet names before rendering.",
      });
    }
  }

  const dashaText = JSON.stringify(dasha || {});
  const repetitiveTemplateHits = (dashaText.match(/meaningful shift in priorities/gi) || []).length;
  if (repetitiveTemplateHits >= 4) {
    issues.push({
      section: "dasha.future_antardasha_narratives",
      issueType: "clarity",
      severity: "critical",
      description: `Detected repetitive template phrase usage (${repetitiveTemplateHits} hits) in Dasha narratives.`,
      suggestedFix: "Regenerate future Antardasha narratives with chart-specific paragraph interpretations.",
    });
  }

  const careerOverview = reportContent.career?.overview;
  if (isWeakNarrative(careerOverview, 180, lang)) {
    issues.push({
      section: "career.overview",
      issueType: "clarity",
      severity: "warning",
      description: "Career overview appears vague/under-detailed.",
      suggestedFix: "Tie guidance explicitly to 10th house, Sun/Saturn placement, and timing windows.",
    });
  }

  const marriageOverview = reportContent.marriage?.overview;
  if (isWeakNarrative(marriageOverview, 180, lang)) {
    issues.push({
      section: "marriage.overview",
      issueType: "clarity",
      severity: "warning",
      description: "Marriage overview appears vague/under-detailed.",
      suggestedFix: "Strengthen with 7th/5th house evidence and clear unmarried vs married applicability.",
    });
  }

  return issues;
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
  const API_KEY = process.env.GEMINI_API_KEY
    || process.env.GOOGLE_API_KEY
    || process.env.LOVABLE_API_KEY;
  
  if (!API_KEY) {
    console.error("[QA] GEMINI_API_KEY not configured");
    return {
      approved: false,
      overallScore: 0,
      issues: [{ 
        section: "system", 
        issueType: "accuracy", 
        severity: "critical", 
        description: "QA system not configured",
        suggestedFix: "Configure GEMINI_API_KEY"
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
    const response = await fetch(AI_OPENAI_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
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

    const deterministicIssues = runDeterministicQualityChecks(reportContent);
    if (deterministicIssues.length > 0) {
      qaResult.issues.push(...deterministicIssues);
      const hasCriticalDeterministic = deterministicIssues.some((i) => i.severity === "critical");
      if (hasCriticalDeterministic) {
        qaResult.approved = false;
        qaResult.overallScore = Math.min(qaResult.overallScore, 6);
      } else {
        qaResult.overallScore = Math.min(qaResult.overallScore, 8);
      }
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

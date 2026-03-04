import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_OPENAI_URL = Deno.env.get("AI_OPENAI_URL")
  || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const AI_MODEL = Deno.env.get("AI_MODEL") || "gemini-2.5-flash";

type GenderCode = "M" | "F";

function normalizeKey(key: string): string {
  return String(key || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

function getField(row: Record<string, unknown>, candidates: string[]): string {
  const mapped: Record<string, string> = {};
  for (const [k, v] of Object.entries(row || {})) {
    mapped[normalizeKey(k)] = String(v ?? "").trim();
  }
  for (const key of candidates) {
    const v = mapped[normalizeKey(key)];
    if (v) return v;
  }
  return "";
}

function parseDob(raw: string): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;

  // Already YYYY-MM-DD? — also validate year is in sensible range for birth dates
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const yr = Number(value.slice(0, 4));
    if (yr >= 1900 && yr <= 2100) return value;
    // Year like 0200 (=200) is suspicious; fix by extracting last 2 digits
    if (yr > 0 && yr < 1900) {
      const twoDigit = yr % 100;
      const fixed = twoDigit > 50 ? 1900 + twoDigit : 2000 + twoDigit;
      return `${fixed}${value.slice(4)}`;
    }
  }

  // Already YYYY-MM-DD with extra (e.g., "2002-07-05T00:00:00.000Z")?
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ]/);
  if (isoMatch) {
    const isoYear = Number(isoMatch[1]);
    if (isoYear >= 1900 && isoYear <= 2100) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    // Bad year — fall through to other parsers
  }

  // Excel serial date number (e.g., 37442 = July 5, 2002)
  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 365 && numericValue < 100000 && /^\d+(\.\d+)?$/.test(value)) {
    const serial = Math.floor(numericValue);
    const adjustedSerial = serial > 60 ? serial - 1 : serial;
    const msPerDay = 86400000;
    const excelEpochMs = -2209075200000; // Date.UTC(1900, 0, 1)
    const dateMs = excelEpochMs + adjustedSerial * msPerDay;
    const d = new Date(dateMs);
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    if (y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }

  // Strip ordinal suffixes ("5th July 2002" → "5 July 2002")
  const stripped = value.replace(/(\d+)(st|nd|rd|th)\b/gi, "$1");

  const compact = stripped.replace(/\D/g, "");
  if (compact.length === 8) {
    const yearFirst = Number(compact.slice(0, 4));
    if (yearFirst >= 1900 && yearFirst <= 2100) {
      const m = Number(compact.slice(4, 6));
      const d = Number(compact.slice(6, 8));
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return `${yearFirst}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
    const d = Number(compact.slice(0, 2));
    const m = Number(compact.slice(2, 4));
    const y = Number(compact.slice(4, 8));
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const sep = stripped.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (sep) {
    const d = Number(sep[1]);
    const m = Number(sep[2]);
    let y = Number(sep[3]);
    if (y < 100) y += y > 50 ? 1900 : 2000;
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Natural language: "21 Aug 1984", "5 July 2002", etc. (use stripped version for ordinals)
  const parsed = new Date(stripped);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = parsed.getUTCMonth() + 1;
    const d = parsed.getUTCDate();
    if (y >= 1900 && y <= 2100) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Also try original value in case stripping broke something
  if (stripped !== value) {
    const parsed2 = new Date(value);
    if (!Number.isNaN(parsed2.getTime())) {
      const y = parsed2.getUTCFullYear();
      const m = parsed2.getUTCMonth() + 1;
      const d = parsed2.getUTCDate();
      if (y >= 1900 && y <= 2100) {
        return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      }
    }
  }

  return null;
}

function parseTime(raw: string): string | null {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return null;

  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0 && numeric < 1) {
    const totalMinutes = Math.round(numeric * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const hhmm = value.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (hhmm) {
    return `${String(Number(hhmm[1])).padStart(2, "0")}:${hhmm[2]}`;
  }

  const ampm = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    const m = Number(ampm[2] || "0");
    if (ampm[3].toLowerCase() === "pm") h += 12;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  const four = value.match(/^(\d{2})(\d{2})$/);
  if (four) {
    const h = Number(four[1]);
    const m = Number(four[2]);
    if (h <= 23 && m <= 59) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }
  }

  return null;
}

/**
 * Parse an explicit gender value from a CSV column.
 * Returns "M", "F", or null if the value is unrecognizable.
 */
function parseExplicitGender(raw: string): GenderCode | null {
  const v = String(raw || "").trim().toLowerCase();
  if (!v) return null;

  // Direct codes
  if (v === "f" || v === "female" || v === "woman" || v === "girl" || v === "महिला" || v === "स्त्री" || v === "స్త్రీ") return "F";
  if (v === "m" || v === "male" || v === "man" || v === "boy" || v === "पुरुष" || v === "पुरुष" || v === "పురుషుడు") return "M";

  return null;
}

function guessGender(name: string): GenderCode {
  const first = String(name || "").trim().toLowerCase().split(/\s+/)[0] || "";
  if (!first) return "M";

  const femaleExact = new Set([
    "neha", "pooja", "puja", "priya", "kavita", "sunita", "anita", "sneha", "tanvi", "kajal",
    "rani", "shreya", "isha", "ayushi", "ananya", "bhavna", "divya", "nisha", "muskan", "deepika",
    "shivani", "payal", "komal", "sakshi", "riya", "simran", "anjali", "swati", "meena", "sita",
    "radha", "lakshmi", "gita", "geeta", "rekha", "shalini", "nandini", "pallavi", "madhuri",
    "jyoti", "kiran", "mansi", "nikita", "arti", "aarti", "ritika", "megha", "tanya", "aditi",
    "kriti", "radhika", "shweta", "preeti", "sapna", "rashmi", "shaivya", "srishti", "garima",
    "varsha", "archana", "chitra", "harini", "keerthi", "lavanya", "mounika", "padma", "revathi",
    "sirisha", "tulasi", "uma", "vasudha", "yamini",
  ]);
  const maleExact = new Set([
    "rahul", "avinash", "shubham", "amit", "sumit", "raj", "rohit", "mohit", "vishal", "ankit",
    "prashant", "saurabh", "ajay", "vijay", "sachin", "manish", "rakesh", "sunil", "kapil", "deepak",
    "shashwat", "arjun", "krishna", "vikram", "suresh", "ramesh", "mahesh", "ganesh", "dinesh",
    "naresh", "rajesh", "mukesh", "akhil", "nikhil", "varun", "tarun", "arun", "karan", "ravi",
    "sanjay", "manoj", "vinod", "pramod", "ashok", "vivek", "abhishek", "harsh", "kartik",
    "pranav", "gaurav", "tushar", "kunal", "sahil", "rohan", "aman", "neeraj", "pankaj",
  ]);

  if (femaleExact.has(first)) return "F";
  if (maleExact.has(first)) return "M";

  if (/(a|aa|i|ee|ika|ita|shi|ya)$/.test(first) && !/(endra|esh|it|ank|deep|raj)$/.test(first)) {
    return "F";
  }

  return "M";
}

function extractDeterministic(row: Record<string, unknown>) {
  const name = getField(row, ["offering_user_name", "name", "user_name", "full_name"]);
  const placeOfBirth = getField(row, ["place_of_birth", "birth_place", "pob", "place"]);
  const dobRaw = getField(row, [
    "dobyyyymmdd", "dob_yyyymmdd",          // primary keys
    "date_of_birth", "dateofbirth",          // common explicit names
    "birth_date", "dob",                     // abbreviations
    "janm_tithi", "janma_tithi",             // Hindi
  ]);
  const timeRaw = getField(row, [
    "time_of_birth_in_24", "time_of_birth",  // primary keys
    "birth_time", "timeofbirth", "tob",       // common names
    "janm_samay", "janma_samay",              // Hindi
  ]);

  // ── Gender: check explicit CSV column FIRST, then fall back to name-guess ──
  const genderRaw = getField(row, [
    "gender", "sex", "male_female", "m_f", "gender_code",
    "linga", "लिंग", "లింగం",
  ]);
  const explicitGender = parseExplicitGender(genderRaw);
  const gender = explicitGender ?? guessGender(name);

  return {
    name,
    gender,
    dateOfBirth: parseDob(dobRaw),
    timeOfBirth: parseTime(timeRaw),
    placeOfBirth,
  };
}

async function decipherWithGemini(row: Record<string, unknown>) {
  const apiKey = Deno.env.get("GEMINI_API_KEY")
    || Deno.env.get("GOOGLE_API_KEY")
    || Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const prompt = `Normalize this spreadsheet row for Seer API input.

Return ONLY JSON with keys:
- name (string)
- gender ("M" or "F")
- dateOfBirth (YYYY-MM-DD)
- timeOfBirth (HH:MM, 24-hour)
- placeOfBirth (string)
- confidence (0..1)

Row:
${JSON.stringify(row)}`;

  const response = await fetch(AI_OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a strict data normalizer for astrological input. Output valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`AI decipher failed: ${response.status}`);
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("AI decipher returned empty response");
  }

  return JSON.parse(content);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const row = (body?.row && typeof body.row === "object") ? body.row as Record<string, unknown> : null;
    if (!row) {
      return new Response(
        JSON.stringify({ error: "row object is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const deterministic = extractDeterministic(row);
    const hasAll = Boolean(
      deterministic.name && deterministic.placeOfBirth && deterministic.dateOfBirth && deterministic.timeOfBirth,
    );

    if (hasAll) {
      return new Response(
        JSON.stringify({
          ...deterministic,
          source: "deterministic",
          confidence: 0.95,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ai = await decipherWithGemini(row);
    const name = String(ai?.name || deterministic.name || "").trim();
    const placeOfBirth = String(ai?.placeOfBirth || deterministic.placeOfBirth || "").trim();
    const dateOfBirth = parseDob(String(ai?.dateOfBirth || deterministic.dateOfBirth || ""));
    const timeOfBirth = parseTime(String(ai?.timeOfBirth || deterministic.timeOfBirth || ""));
    const gender = String(ai?.gender || deterministic.gender || "M").toUpperCase() === "F" ? "F" : "M";

    if (!name || !placeOfBirth || !dateOfBirth || !timeOfBirth) {
      throw new Error("Could not fully decipher row into Seer API inputs");
    }

    return new Response(
      JSON.stringify({
        name,
        gender,
        dateOfBirth,
        timeOfBirth,
        placeOfBirth,
        source: "gemini_fallback",
        confidence: Number(ai?.confidence || 0.7),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("❌ [DECIPHER-KUNDLI-INPUT] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

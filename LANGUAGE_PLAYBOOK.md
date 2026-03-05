# Language Playbook — Adding a New Language to Kundli Report

> **Last updated**: March 2026. Reflects the current architecture: PDF code extracted into `src/lib/pdf/`, Cloud Run as primary backend.

---

## Quick Reference: All Files to Touch

### Frontend (15 files)

| # | File | What to Add |
|---|------|-------------|
| 1 | `public/fonts/` | `NotoSans{Script}-Regular.ttf` + `Bold.ttf` (GPOS-stripped) |
| 2 | `src/lib/pdf/fontSetup.ts` | `Font.register()` block for the new font family |
| 3 | `src/lib/pdf/localization.ts` | Language branch in `applyLanguageTypography()` |
| 4 | `src/lib/pdf/types.ts` | Add code to `PdfLanguage` type union |
| 5 | `src/lib/pdf/i18n/phrases.ts` | New language key in `PDF_UI_PHRASE_MAP` (~500 entries) |
| 6 | `src/lib/pdf/i18n/words.ts` | New language key in `PDF_UI_WORD_MAP` (~100 entries) |
| 7 | `src/lib/pdf/i18n/placeNames.ts` | Month names + place transliterations |
| 8 | `src/utils/preWrapText.ts` | Entry in `fontConfigByLanguage` |
| 9 | `src/utils/kundaliChart.ts` | `name{Lang}` + `purpose{Lang}` fields on all divisional charts |
| 10 | `src/components/KundliPDFDocument.tsx` | Inline if-else chains (gender, footer, etc.) |
| 11 | `src/components/KundliReportGenerator.tsx` | `reportLanguage` type union + `<option>` in dropdown |
| 12 | `src/components/BulkKundliRunner.tsx` | Type union + language whitelist + badge label |
| 13 | `src/components/LanguageWrapper.tsx` | Add to route whitelist |
| 14 | `src/components/KundliReportViewer.tsx` | Add to `SUPPORTED_LANGS` map |
| 15 | `src/i18n.ts` | Full UI translation object for main app (puja/dosha pages) |

### Backend — Cloud Run (primary) — 11 locations

| # | File | What to Add |
|---|------|-------------|
| 16 | `cloud-run/src/_shared/language-packs/types.ts` | Add code to `SupportedLanguage` type |
| 17 | `cloud-run/src/_shared/language-packs/{code}/` | **7 new files**: prompts, labels, terms, typography, qc, templates, significations |
| 18 | `cloud-run/src/_shared/language-packs/index.ts` | Import packs + add to REGISTRY + update `normalizeLanguage()` |
| 19 | `cloud-run/src/_shared/language-qc.ts` | Script Unicode regex + switch branch |
| 20 | `cloud-run/src/_shared/language-localize.ts` | Term replacement map (200+ entries) + switch branch |
| 21 | `cloud-run/src/_shared/safety-i18n.ts` | New key on all ~50 safety message objects |
| 22 | `cloud-run/src/_shared/generate-kundli-report/translation-agent.ts` | `{code}?:` field in PHRASE_CACHE + SHORT_TERM_TRANSLATIONS (540+ entries) |
| 23 | `cloud-run/src/routes/start-kundli-job.ts` | Add code to input `language` type |
| 24 | `cloud-run/src/routes/process-kundli-job.ts` | Add to `isLanguagePipelineV2Enabled()` |
| 25 | `cloud-run/src/routes/translate-kundli-report.ts` | Add to `isLanguagePipelineV2Enabled()` |
| 26 | `cloud-run/src/routes/finalize-kundli-report.ts` | Add to `localizeChartSvgText()` condition |

### Backend — Supabase (mirror — keep in sync with Cloud Run)

| # | File | What to Add |
|---|------|-------------|
| 27 | `supabase/functions/_shared/language-packs/types.ts` | Same type change as #16 |
| 28 | `supabase/functions/_shared/language-packs/{code}/` | Same 7 files as #17 (copy, adjust `.ts` imports) |
| 29 | `supabase/functions/_shared/language-packs/index.ts` | Same as #18 |
| 30 | `supabase/functions/_shared/language-localize.ts` | Same as #20 |
| 31 | `supabase/functions/_shared/safety-i18n.ts` | Same as #21 |
| 32 | `supabase/functions/process-kundli-job/index.ts` | Same pipeline flag as #24 |
| 33 | `supabase/functions/translate-kundli-report/index.ts` | Same pipeline flag as #25 |
| 34 | `supabase/functions/finalize-kundli-report/index.ts` | Same condition as #26 |

> **Note**: Supabase does NOT have a `translation-agent.ts` PHRASE_CACHE — that is Cloud Run only (#22).

---

## Background: Dual-Backend Architecture

The app has two backends that must be kept in sync:

- **Cloud Run** (`cloud-run/src/`) — primary backend, handles all new traffic. Deploy with `gcloud run deploy`.
- **Supabase Edge Functions** (`supabase/functions/`) — legacy, kept as failover. Deploy with `supabase functions deploy`.

Both share the same `_shared/language-packs/` directory structure with 7 files per language. When you add a new language, copy the Cloud Run pack to Supabase (the only difference: Supabase files use Deno-style `.ts` import extensions).

---

## Step-by-Step Guide

### STEP 1 — Font Files

Download the NotoSans font for the new script from [Google Fonts](https://fonts.google.com/noto). Place in `public/fonts/`:

```
public/fonts/NotoSans{Script}-Regular.ttf
public/fonts/NotoSans{Script}-Bold.ttf
```

**CRITICAL — strip GPOS+GDEF tables** to prevent a fontkit crash (`TypeError: Cannot read properties of null (reading 'xCoordinate')`):

```bash
python3 -c "
from fontTools.ttLib import TTFont
for f in ['NotoSans{Script}-Regular.ttf', 'NotoSans{Script}-Bold.ttf']:
    t = TTFont(f'public/fonts/{f}')
    for tbl in ['GPOS', 'GDEF']:
        if tbl in t: del t[tbl]
    t.save(f'public/fonts/{f}')
"
```

The `patches/fontkit+2.0.4.patch` also adds a null-guard in fontkit's `GPOSProcessor.getAnchor()` as a belt-and-suspenders defence. It is applied automatically via `postinstall: patch-package`.

---

### STEP 2 — Register Font (`src/lib/pdf/fontSetup.ts`)

Add a `Font.register()` block alongside the existing Devanagari/Telugu/Kannada/Tamil blocks:

```tsx
Font.register({
  family: 'NotoSans{Script}',
  fonts: [
    { src: '/fonts/NotoSans{Script}-Regular.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/NotoSans{Script}-Bold.ttf',    fontWeight: 'bold',   fontStyle: 'normal' },
    { src: '/fonts/NotoSans{Script}-Regular.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/NotoSans{Script}-Bold.ttf',    fontWeight: 'bold',   fontStyle: 'italic' },
  ],
});
```

> Italic styles deliberately reuse Regular/Bold files — no separate italic TTFs are needed.

---

### STEP 3 — Language Typography Mapping (`src/lib/pdf/localization.ts`)

Add a branch inside `applyLanguageTypography()` before the English default:

```ts
if (code.startsWith('xx')) {           // replace 'xx' with the language code
  ACTIVE_PDF_LANGUAGE = 'xx';
  ACTIVE_PDF_FONT_FAMILY = 'NotoSans{Script}';
  ACTIVE_PDF_BODY_FONT_SIZE = 11.2;   // Indic scripts need larger size than English (10.5)
  ACTIVE_PDF_BODY_LINE_HEIGHT = 1.62; // Indic scripts need more line height than English (1.45)
  return;
}
```

Also update the `normalizeLanguage()` helper in the same file if one exists.

---

### STEP 4 — PDF Language Type (`src/lib/pdf/types.ts`)

```ts
export type PdfLanguage = 'en' | 'hi' | 'te' | 'kn' | 'mr' | 'ta' | 'xx';
```

This type is re-exported and used across all `src/lib/pdf/` modules.

---

### STEP 5 — PDF UI Phrases (`src/lib/pdf/i18n/phrases.ts`)

Add a new language block to `PDF_UI_PHRASE_MAP`. This is ~500 key-value pairs covering every section header, label, and UI string in the PDF:

```ts
xx: {
  'Sri Mandir Kundli Report': '...',
  'Table of Contents': '...',
  'Your Birth Chart': '...',
  'Birth Details': '...',
  'Planetary Positions': '...',
  'House': '...',
  'Sign': '...',
  'Lord': '...',
  'Degree': '...',
  'House 1': '...', 'House 2': '...', /* ... */ 'House 12': '...',
  // ... all remaining entries — copy from 'hi' block as a template
},
```

Also update the `PdfLanguage` type at the top of this file (matches step 4).

---

### STEP 6 — PDF Word Map (`src/lib/pdf/i18n/words.ts`)

Add a new language block to `PDF_UI_WORD_MAP` (~100 single words and short phrases: planets, zodiac signs, weekdays, etc.):

```ts
xx: {
  Report: '...', Birth: '...', Details: '...',
  Aries: '...', Taurus: '...', /* ... all 12 signs */
  Sun: '...', Moon: '...', Mars: '...', /* ... all 9 planets */
  // ...
},
```

---

### STEP 7 — Month Names & Place Transliterations (`src/lib/pdf/i18n/placeNames.ts`)

Add to `MONTH_NAMES_BY_LANGUAGE` (also update the Record key type):

```ts
xx: ['Jan...', 'Feb...', 'Mar...', 'Apr...', 'May...', 'Jun...',
     'Jul...', 'Aug...', 'Sep...', 'Oct...', 'Nov...', 'Dec...'],
```

Add to `PLACE_TRANSLIT` (Indian states + major cities):

```ts
xx: {
  India: '...', Gujarat: '...', Maharashtra: '...',
  Mumbai: '...', Delhi: '...', Bangalore: '...', Chennai: '...', Kolkata: '...',
  Hyderabad: '...', Pune: '...', Ahmedabad: '...',
  // ... 50+ major cities and all states
},
```

---

### STEP 8 — Text Wrapping Config (`src/utils/preWrapText.ts`)

Add to `FONT_CONFIG` / `fontConfigByLanguage`:

```ts
xx: { fontFamily: 'NotoSans{Script}', src: '/fonts/NotoSans{Script}-Regular.ttf', fontSize: 11.2 },
```

This enables Canvas-based line measurement so Indic words wrap at spaces, never mid-glyph.

### STEP 8A — Word Separator Discipline (Critical for Indic Scripts)

This is **not** generic "word wrapping". For Indic scripts, the primary rule is:

- preserve user/backend word boundaries
- detect boundaries from explicit spaces only
- never infer boundaries from glyph shaping, matras, or ligatures

Implementation rules in `src/utils/preWrapText.ts`:

1. Normalize all Unicode space variants to a plain ASCII space before tokenization:
```ts
text
  .replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000\t\r\f\v]+/g, ' ')
  .replace(/ {2,}/g, ' ')
  .trim();
```

2. Split only on ASCII spaces (keep space runs as tokens):
```ts
const tokens = normalized.split(/([ ]+)/g).filter(Boolean);
```

3. If a token does not fit, move the full token to next line (do not split token).

4. Ensure every new Indic language is added to `FONT_CONFIG`; missing config silently disables pre-wrap and reintroduces broken word segmentation.

5. Load the same measurement font via `ensurePreWrapFontsLoaded(language)` before PDF rendering.

> Gujarati rollout lesson: missing `gu` in `FONT_CONFIG` caused fallback behavior and degraded space-boundary preservation.

---

### STEP 9 — Divisional Chart Names (`src/utils/kundaliChart.ts`)

The `DivisionalChart` interface has `name{Lang}` and `purpose{Lang}` fields for each language. The existing pattern uses `nameHindi`, `nameTelugu`, `nameKannada`, `nameMarathi`, `nameTamil` etc.

For a new language, add the field to the interface and populate it on all 12+ chart objects in `PDF_CHARTS`:

```ts
// In interface DivisionalChart:
name{LangPascal}: string;
purpose{LangPascal}: string;

// On each chart object (D1, D2, D3, D4, D7, D9, D10, D12, D20, D24, D27, D60):
D1: { ..., name{LangPascal}: '...', purpose{LangPascal}: '...' },
```

---

### STEP 10 — Inline Conditionals in PDF Document (`src/components/KundliPDFDocument.tsx`)

Several inline ternary chains need a new branch. Search for `getActivePdfLanguage() === 'ta'` to find all locations — add `=== 'xx'` immediately before the final `:` fallback:

- **Gender labels** (Female / Male)
- **Footer contact text** ("Call or WhatsApp: ...")
- **Any other hardcoded inline language checks**

Pattern:
```tsx
: getActivePdfLanguage() === 'ta' ? 'Tamil text'
: getActivePdfLanguage() === 'xx' ? 'New language text'  // ← add here
: 'English fallback'
```

---

### STEP 11 — Single Report Generator (`src/components/KundliReportGenerator.tsx`)

Two changes:

**a) `reportLanguage` type union** (search for `'en' | 'hi' | 'te' | 'kn' | 'mr' | 'ta'`):
```ts
const reportLanguage: 'en' | 'hi' | 'te' | 'kn' | 'mr' | 'ta' | 'xx' =
  langCode === 'hi' ? 'hi'
  : langCode === 'te' ? 'te'
  : langCode === 'kn' ? 'kn'
  : langCode === 'mr' ? 'mr'
  : langCode === 'ta' ? 'ta'
  : langCode === 'xx' ? 'xx'  // ← add
  : 'en';
```

**b) Language `<option>` in the report language dropdown**:
```tsx
<option value="xx">{NativeNameHere} (Language Name)</option>
```

---

### STEP 12 — Bulk Runner (`src/components/BulkKundliRunner.tsx`)

Three changes — search for `'en' | 'hi' | 'te' | 'kn' | 'mr' | 'ta'`:

1. **`BulkRowState` language field type** — add `| 'xx'`
2. **Language whitelist** (`includes(savedLang)` check) — add `'xx'`
3. **Badge label** (the short code shown in the row):
```tsx
: row.language === 'xx' ? 'XX'
```
4. **Language `<option>`** in the bulk language `<select>`:
```tsx
<option value="xx">{NativeNameHere}</option>
```

---

### STEP 13 — Route Whitelist (`src/components/LanguageWrapper.tsx`)

```ts
if (lang !== 'en' && lang !== 'hi' && lang !== 'xx') {
  return <Navigate to="/hi" replace />;
}
```

> **Note**: `LanguageToggle.tsx` currently only toggles between `en` and `hi`. Adding a full multi-language selector requires refactoring that component into a dropdown — that is a larger UI task tracked separately.

---

### STEP 14 — Report Viewer (`src/components/KundliReportViewer.tsx`)

```ts
const SUPPORTED_LANGS: Record<string, string> = { hi: 'hi', te: 'te', kn: 'kn', mr: 'mr', ta: 'ta', xx: 'xx' };
```

---

### STEP 15 — Main App i18n (`src/i18n.ts`)

Add a full translation object for the new language (for the puja/dosha pages, not the Kundli PDF). Copy the `en` block as a template:

```ts
const resources = {
  en: { translation: { ... } },
  hi: { translation: { ... } },
  xx: { translation: { ... } },  // ← add
};
```

---

## Backend Changes (Cloud Run — primary)

### STEP 16 — SupportedLanguage Type (`cloud-run/src/_shared/language-packs/types.ts`)

```ts
export type SupportedLanguage = "en" | "hi" | "te" | "kn" | "mr" | "ta" | "xx";
```

---

### STEP 17 — Language Pack Directory (7 files)

Create `cloud-run/src/_shared/language-packs/xx/` with these 7 files:

#### `prompts.ts` — Gemini agent system instructions (18 sections)

```ts
export const xxPrompts: Record<string, { systemPrefix?: string; userPrefix?: string }> = {
  global: {
    systemPrefix: "Output language is {Language} only. Write in pure {Script} script. Do not use English except proper nouns and technical Jyotish terms.",
    userPrefix: "Respond in {Language}.",
  },
  panchang:    { systemPrefix: "..." },
  pillars:     { systemPrefix: "..." },
  planets:     { systemPrefix: "..." },
  houses:      { systemPrefix: "..." },
  career:      { systemPrefix: "..." },
  marriage:    { systemPrefix: "..." },
  dasha:       { systemPrefix: "..." },
  rahuKetu:    { systemPrefix: "..." },
  remedies:    { systemPrefix: "..." },
  numerology:  { systemPrefix: "..." },
  spiritual:   { systemPrefix: "..." },
  charaKarakas:{ systemPrefix: "..." },
  glossary:    { systemPrefix: "..." },
  doshas:      { systemPrefix: "..." },
  rajYogs:     { systemPrefix: "..." },
  sadeSati:    { systemPrefix: "..." },
  qa:          { systemPrefix: "..." },
};
```

#### `labels.ts` — Static UI labels

```ts
export const xxLabels: Record<string, string> = {
  reportTitle: "...",
  tableOfContents: "...",
  birthDetails: "...",
  // ... all section headers
};
```

#### `terms.ts` — Astrological terminology

```ts
export const xxTerms = {
  planets:    { Sun: "...", Moon: "...", Mars: "...", Mercury: "...", Jupiter: "...", Venus: "...", Saturn: "...", Rahu: "...", Ketu: "..." },
  signs:      { Aries: "...", Taurus: "...", /* ... all 12 */ Pisces: "..." },
  houses:     { 1: "...", 2: "...", /* ... */ 12: "..." },
  nakshatras: { Ashwini: "...", /* ... all 27 */ Revati: "..." },
  weekdays:   { Sunday: "...", Monday: "...", /* ... */ Saturday: "..." },
  months:     { January: "...", /* ... */ December: "..." },
  misc:       { Retrograde: "...", Direct: "...", Exalted: "...", Debilitated: "...", /* ... */ },
};
```

#### `typography.ts` — Font settings

```ts
export const xxTypography = {
  bodyFontFamily: "NotoSans{Script}",
  bodyFontSize: 11.2,
  bodyLineHeight: 1.62,
  tableFontSize: 9.5,
  tableLineHeight: 1.3,
};
```

#### `qc.ts` — Quality control rules

```ts
export const xxQc = {
  minScriptChars: 20,
  minScriptRatio: 0.70,
  maxLatinRatio: 0.20,
  bannedTokens: [
    // English words that must NOT appear in native output:
    "house", "planet", "sign", "career", "marriage", "health",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "aries", "taurus", "gemini", "cancer", "leo", "virgo",
    "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces",
    "saturn", "jupiter", "venus", "mercury", "mars", "moon", "sun",
  ],
  allowedLatinTokens: ["api", "pdf", "utc", "am", "pm", "D1", "D9", "Rahu", "Ketu"],
};
```

#### `templates.ts` — Template strings with `{placeholder}` substitution

```ts
export const xxTemplates = {
  nativeMale:   "{name} ...",
  nativeFemale: "{name} ...",
  currentAge:   "... {age} ...",
  // ...
};
```

#### `significations.ts` — Planet signification data for Dasha interpretation

```ts
export const xxSignifications = {
  Sun:     { themes: ["..."], opportunity: ["..."], caution: ["..."] },
  Moon:    { themes: ["..."], opportunity: ["..."], caution: ["..."] },
  Mars:    { themes: ["..."], opportunity: ["..."], caution: ["..."] },
  Mercury: { themes: ["..."], opportunity: ["..."], caution: ["..."] },
  Jupiter: { themes: ["..."], opportunity: ["..."], caution: ["..."] },
  Venus:   { themes: ["..."], opportunity: ["..."], caution: ["..."] },
  Saturn:  { themes: ["..."], opportunity: ["..."], caution: ["..."] },
  Rahu:    { themes: ["..."], opportunity: ["..."], caution: ["..."] },
  Ketu:    { themes: ["..."], opportunity: ["..."], caution: ["..."] },
};
```

---

### STEP 18 — Language Pack Registry (`cloud-run/src/_shared/language-packs/index.ts`)

```ts
// 1. Add imports
import { xxPrompts }        from "./xx/prompts.ts";
import { xxLabels }         from "./xx/labels.ts";
import { xxTerms }          from "./xx/terms.ts";
import { xxTypography }     from "./xx/typography.ts";
import { xxQc }             from "./xx/qc.ts";
import { xxTemplates }      from "./xx/templates.ts";
import { xxSignifications } from "./xx/significations.ts";

// 2. Add to REGISTRY
const REGISTRY: Record<SupportedLanguage, LanguagePack> = {
  // ... existing entries ...
  xx: {
    code: "xx",
    version: "xx_v1",
    generationMode: "native",
    agentPrompts: xxPrompts,
    labels: xxLabels,
    terms: xxTerms,
    typography: xxTypography,
    qc: xxQc,
    templates: xxTemplates,
    significations: xxSignifications,
  },
};

// 3. Update normalizeLanguage()
export function normalizeLanguage(input: unknown): SupportedLanguage {
  const raw = String(input || "").trim().toLowerCase();
  if (raw.startsWith("hi")) return "hi";
  if (raw.startsWith("te")) return "te";
  if (raw.startsWith("kn") || raw.startsWith("kan")) return "kn";
  if (raw.startsWith("mr") || raw.startsWith("mar")) return "mr";
  if (raw.startsWith("ta") || raw.startsWith("tam")) return "ta";
  if (raw.startsWith("xx")) return "xx";  // ← add
  return "en";
}
```

---

### STEP 19 — Script QC Regex (`cloud-run/src/_shared/language-qc.ts`)

Add the Unicode block regex for the new script and wire it into the switch:

```ts
// Add regex constant (find the Unicode block at unicode.org/charts)
const XX_RE = /[\uXXXX-\uXXXX]/g;

// In getScriptCounts(), add the new branch:
const scriptRe = language === "hi" || language === "mr"
  ? DEVANAGARI_RE
  : language === "te" ? TELUGU_RE
  : language === "kn" ? KANNADA_RE
  : language === "ta" ? TAMIL_RE
  : language === "xx" ? XX_RE   // ← add
  : DEVANAGARI_RE;
```

Common Unicode blocks for Indian scripts:
| Script | Range |
|--------|-------|
| Devanagari (hi, mr) | `\u0900–\u097F` |
| Bengali (bn) | `\u0980–\u09FF` |
| Gurmukhi/Punjabi (pa) | `\u0A00–\u0A7F` |
| Gujarati (gu) | `\u0A80–\u0AFF` |
| Oriya (or) | `\u0B00–\u0B7F` |
| Tamil (ta) | `\u0B80–\u0BFF` |
| Telugu (te) | `\u0C00–\u0C7F` |
| Kannada (kn) | `\u0C80–\u0CFF` |
| Malayalam (ml) | `\u0D00–\u0D7F` |

---

### STEP 20 — Term Replacement Map (`cloud-run/src/_shared/language-localize.ts`)

Add a `xxMap` with 200+ term replacements for post-generation localization, then wire it into the switch:

```ts
const xxMap: Array<[RegExp, string]> = [
  [/\bHigh\b/gi,    "..."],
  [/\bMedium\b/gi,  "..."],
  [/\bLow\b/gi,     "..."],
  [/\bStrong\b/gi,  "..."],
  [/\bWeak\b/gi,    "..."],
  [/\bhouse\b/gi,   "..."],
  [/\bplanet\b/gi,  "..."],
  [/\bsign\b/gi,    "..."],
  // ... 200+ entries covering: strength levels, time periods, Jyotish terms,
  //     life areas, remedy terms, yoga names, sade sati terms
];

// In localizeStructuredReportTerms(), add to the switch:
const rules = language === "hi" || language === "mr" ? hiMap
  : language === "te" ? teMap
  : language === "kn" ? knMap
  : language === "ta" ? taMap
  : language === "xx" ? xxMap   // ← add
  : hiMap;
```

> **Tip**: Marathi (`mr`) reuses `hiMap` since both use Devanagari — follow this pattern if the new language shares a script.

---

### STEP 21 — Safety Messages (`cloud-run/src/_shared/safety-i18n.ts`)

Update the `L5` / language union type and add the new key to all ~50 safety message objects. These guard age-specific, gender-specific, and sensitive-topic content:

```ts
// Update the type:
export type SafetyLanguages = { en: string; hi: string; te: string; kn: string; mr: string; ta: string; xx: string };

// Add xx: "..." to every message object, e.g.:
{
  en: "Career guidance is general at this young age.",
  hi: "इस कम उम्र में करियर मार्गदर्शन सामान्य है।",
  ta: "இந்த இளம் வயதில் தொழில் வழிகாட்டுதல் பொதுவானது.",
  xx: "...",
},
```

---

### STEP 22 — Translation Cache (`cloud-run/src/_shared/generate-kundli-report/translation-agent.ts`)

Add `xx?: string` to every entry in `PHRASE_CACHE` and `SHORT_TERM_TRANSLATIONS` (~540+ total entries). These caches allow the system to substitute pre-translated terms without extra LLM calls:

```ts
const PHRASE_CACHE: Record<string, { hi: string; te: string; ta?: string; kn?: string; mr?: string; xx?: string }> = {
  "Sun": { hi: "सूर्य", te: "సూర్యుడు", ta: "சூரியன்", kn: "ಸೂರ್ಯ", mr: "सूर्य", xx: "..." },
  // ... all 540+ entries
};
```

> This file is Cloud Run only — there is no equivalent in Supabase.

---

### STEP 23 — Route Input Validation (`cloud-run/src/routes/start-kundli-job.ts`)

```ts
language?: "en" | "hi" | "te" | "kn" | "mr" | "ta" | "xx";
```

---

### STEP 24 — Pipeline V2 Flag (`cloud-run/src/routes/process-kundli-job.ts` and `translate-kundli-report.ts`)

```ts
function isLanguagePipelineV2Enabled(language: SupportedLanguage): boolean {
  if (language === "hi" || language === "te" || language === "kn" || language === "mr" || language === "ta" || language === "xx") return true;
  if (language === "en") return false;
}
```

---

### STEP 25 — Chart SVG Localization (`cloud-run/src/routes/finalize-kundli-report.ts`)

```ts
function localizeChartSvgText(svg: string, language: string): string {
  if (language === "hi" || language === "te" || language === "kn" || language === "mr" || language === "ta" || language === "xx") return svg;
  // ...
}
```

---

## Mirror to Supabase (Steps 27–34)

Repeat steps 16–25 for the Supabase paths:

- `supabase/functions/_shared/language-packs/types.ts`
- `supabase/functions/_shared/language-packs/xx/` (7 files — same content, adjust import extensions)
- `supabase/functions/_shared/language-packs/index.ts`
- `supabase/functions/_shared/language-localize.ts`
- `supabase/functions/_shared/safety-i18n.ts`
- `supabase/functions/process-kundli-job/index.ts`
- `supabase/functions/translate-kundli-report/index.ts`
- `supabase/functions/finalize-kundli-report/index.ts`

> **Supabase import style**: Use `import { x } from "./xx/prompts.ts"` (with `.ts` extension) — Deno requires explicit extensions.

---

## Shared Script Languages (Reuse Shortcut)

If the new language shares a script with an existing language, you can skip font work and reuse the existing font family:

| New Language | Shares Script With | Reuse |
|---|---|---|
| Marathi (mr) | Hindi (hi) | `NotoSansDevanagari`, similar localize map |
| Konkani (kok) | Hindi/Marathi | `NotoSansDevanagari` |
| Sanskrit (sa) | Hindi | `NotoSansDevanagari` |
| Bengali (bn) | — | New `NotoSansBengali` font needed |
| Gujarati (gu) | — | New `NotoSansGujarati` font needed |
| Malayalam (ml) | — | New `NotoSansMalayalam` font needed |
| Odia (or) | — | New `NotoSansOriya` font needed |
| Punjabi (pa) | — | New `NotoSansGurmukhi` font needed |

---

## Gujarati (gu) Rollout Learnings — March 2026

This section captures concrete production lessons from the Gujarati rollout to avoid regressions in future language additions.

1. **Word boundary quality is a tokenization problem first, not a styling problem.**
   - Fix in `preWrapText.ts`: normalize Unicode spaces + split on spaces only.
   - Do not "fix" broken words by changing margins/line-height alone.

2. **`FONT_CONFIG` parity is mandatory.**
   - If a language is missing in `FONT_CONFIG`, pre-wrap is bypassed and Indic word segmentation degrades.
   - Add language code + correct font file path at rollout time.

3. **Register all weight/style variants for every PDF font family.**
   - React PDF can request `fontWeight: 700` + `fontStyle: italic` from inherited styles.
   - If `normal/bold/italic/bold-italic` are not all registered, runtime error occurs:
     - `Could not resolve font for <Family>, fontWeight 700, fontStyle italic`
   - Map italic to regular/bold files when no true italic file exists.

4. **For Gujarati readability, separate body and heading families.**
   - Body: lighter face (`KohinoorGujaratiBody`) for long paragraphs.
   - Headings: stronger face (`KohinoorGujaratiHead`) for section hierarchy.
   - Keep body styles explicitly `fontWeight: normal`; keep section headers bold.

5. **Validate what actually shipped by inspecting generated PDF fonts.**
   - Run `pdffonts <file.pdf>` and confirm expected families are embedded.
   - If fonts show unexpected family (or fallback like Helvetica), debug font mapping/registration first.

6. **Confirm you are editing the repo that serves localhost.**
   - Check `lsof -iTCP:5173 -sTCP:LISTEN -n -P` and verify Vite process path.
   - Several false fixes came from patching a different repo than the running server.

7. **Do not silently fall back to legacy Gujarati path without logging.**
   - If fallback is needed, emit explicit log/warning so QA can detect regression early.

---

## Deploy

```bash
# Cloud Run (primary)
gcloud run deploy kundli-api \
  --source ./cloud-run \
  --region asia-south1 \
  --project kundli-report

# Supabase Edge Functions (mirror)
npx supabase functions deploy process-kundli-job --no-verify-jwt
npx supabase functions deploy translate-kundli-report --no-verify-jwt
npx supabase functions deploy finalize-kundli-report --no-verify-jwt

# Frontend (Vite build)
npx vite build
# then deploy dist/ to hosting (Railway / Vercel / etc.)
```

---

## Testing Checklist

- [ ] Font renders correctly (no boxes / tofu characters)
- [ ] PDF generates without fontkit crash
- [ ] Text wraps at spaces, never mid-word
- [ ] Unicode space normalization is active before tokenization (NBSP/zero-width variants collapse to ASCII space)
- [ ] `FONT_CONFIG` / pre-wrap config includes the new language code
- [ ] PDF measurement font and PDF render font family are aligned for the language
- [ ] All 4 font variants resolve at runtime (normal, bold, italic, bold-italic)
- [ ] `pdffonts` output confirms expected script font family is embedded (not unintended fallback)
- [ ] All section headers appear in the target language
- [ ] Planet, sign, and house names are in the target language
- [ ] Month names and birth date are localised
- [ ] City name on the cover page is transliterated
- [ ] Divisional chart captions show the localised chart name
- [ ] Footer contact text appears in the target language
- [ ] QC passes — check `report.errors` for `LANGUAGE_QC_FAILED` warnings
- [ ] Safety guardrails appear in the target language
- [ ] D1 chart image renders (the chart image API is language-agnostic)
- [ ] Bulk upload works with the new language option
- [ ] Single report works with the new language option
- [ ] Cloud Run health check passes after deploy
- [ ] Supabase fallback still works

---

## PDF Cover Pages, Table of Contents, Disclaimers, and Upload Forms

This section covers language-specific changes beyond the core backend/frontend infrastructure. These are the UI surfaces that end users interact with.

### Cover Page Localization

**File**: `src/components/KundliPDFDocument.tsx` (Lines 1691–1827)

The cover page displays a zodiac wheel background with birth details. No special localization work is needed for a new language—it automatically uses the active language. However, here's what happens per language:

#### Elements that Are Language-Aware:

1. **Title & Subtitle** (Lines 1782–1789):
   - Uses `localizePdfUiText('Sri Mandir Kundli Report')` and `localizePdfUiText('Your Personalized Astrological Profile')`
   - These values must be in `phrases.ts` (covered in Step 5 of the playbook)

2. **Birth Details** (Lines 1798–1814):
   - **Name**: Displayed raw (no transliteration)
   - **Date of Birth**: Formatted via `formatBirthDate()` (see Date Formatting below)
   - **Time of Birth**: Shows actual time or localized "Time not available"
   - **Place of Birth**: Transliterated via `translitPlace()` function (see Place Names below)

3. **Font & Spacing Adjustments** (Line 1802):
   - **Indic scripts**: `letterSpacing: 0` (removes spacing for proper glyph connection)
   - **English**: Default letter spacing

4. **Zero-Width Space Injection** (formatters.ts, Line 37):
   - Indic dates have `\u200B` appended to prevent @react-pdf text clipping

#### No Changes Needed:
- Logo, zodiac wheel, background colors all render identically
- Dimensions, padding, and layout are language-agnostic

---

### Table of Contents Localization

**File**: `src/components/KundliPDFDocument.tsx` (Lines 1675–2024)

#### TOC Entry Titles (Lines 1675–1684):
```javascript
const tocEntries = [
  { num: '01', title: 'Your Birth Chart', sub: 'Holistic personality overview' },
  { num: '02', title: 'Personal Planetary Profiles', sub: '9-planet deep-dive analysis' },
  // ... 8 sections total
];
```

Each `title` and `sub` field is wrapped in `localizePdfUiText()` during rendering (Lines 2019, 2021).

#### What Needs Translation:
- All 8 section titles (e.g., "Your Birth Chart" → Hindi "आपकी जन्म कुंडली")
- All 8 subtitles (e.g., "Holistic personality overview" → Hindi "व्यक्तित्व का संपूर्ण अवलोकन")

These translations must be in `src/lib/pdf/i18n/phrases.ts` under the language block (covered in Step 5 of playbook).

#### Layout Considerations:
- **2-column layout** (lines 641–648): Split evenly, compact spacing
- **Font sizes**: Intentionally small (9.8pt number, 9.6pt title, 7.6pt subtitle)
- **Letter spacing**: Removed for Indic (line 631: `paddingRight: 4` buffer instead)
- **Line height**: Tight (1.2) for compact fit

For new languages with wider glyphs (e.g., Thai, Khmer), may need to increase column width or reduce font size further. Test by rendering a sample PDF.

---

### Disclaimer Section Localization

**File**: `src/lib/pdf/i18n/legalContent.ts` (Lines 1–56)
**Rendered in**: `src/components/KundliPDFDocument.tsx` (Lines 1829–1921)

#### Structure:
- **Header**: "Disclaimer" (translated per language)
- **Shield icon**: Visual, no translation needed (Lines 1846–1866)
- **Body**: 3–5 paragraphs, full length disclaimer

#### Current Translations Available:
```ts
export const DISCLAIMER_CONTENT = {
  en: { title: 'Disclaimer', paragraphs: [...] },  // 5 paragraphs, ~500 words
  hi: { title: 'अस्वीकरण', paragraphs: [...] },   // 5 paragraphs, ~550 words
  te: { title: 'నిరాకరణ', paragraphs: [...] },    // 5 paragraphs
  kn: { title: 'ಹಕ್ಕುತ್ಯಾಗ', paragraphs: [...] }, // 3 paragraphs
  mr: { title: 'अस्वीकरण', paragraphs: [...] },   // 3 paragraphs
  ta: { title: 'மறுப்பு', paragraphs: [...] },      // 3 paragraphs
};
```

#### To Add a New Language:

1. **Translate the disclaimer** to 3–5 paragraphs covering:
   - No warranty of accuracy
   - For entertainment purposes only
   - Not a substitute for professional advice
   - Liability limitation
   - User responsibility

2. **Add to `legalContent.ts`**:
```ts
xx: {
  title: '...',
  paragraphs: [
    '...',  // Paragraph 1
    '...',  // Paragraph 2
    '...',  // Paragraph 3
    '...',  // (optional) Paragraph 4
    '...',  // (optional) Paragraph 5
  ],
},
```

#### Text Wrapping & Page Breaks:

The disclaimer uses `wrapIndicSync()` (Lines 1901, 1916) to handle Indic text wrapping at 459pt width. However, **length variation matters**:

- **English/Hindi**: 5 paragraphs, may exceed one page
- **Kannada/Tamil**: 3 paragraphs, fits on one page
- **Telugu**: 5 paragraphs, usually fits

**Test rendering** a full-length PDF to ensure disclaimers don't cause unexpected page breaks or push content off the edge.

#### Styling:
- Card background: Light beige (`P.cardBg`)
- Paragraph spacing: 12pt margin bottom
- Last paragraph: Italic + centered
- Font size: `getActivePdfBodyFontSize()` (10.5–11.2pt depending on language)
- Line height: `getActivePdfBodyLineHeight()`
- **Letter spacing removed for Indic** (Line 1899)

---

### Single Upload Form Localization

**File**: `src/components/KundliReportGenerator.tsx` (Lines 68–652)

#### Form Labels that Need Translation:
```javascript
// Current labels (lines 465–652):
'Name' → 'नाम' / 'పేరు' / 'ಹೆಸರು' / 'नाव' / 'பெயர்'
'Report Language' → 'रिपोर्ट भाषा' / 'ఆ రిపోర్ట్ భాష' / etc.
'Gender' → 'लिंग' / 'లింగ' / 'ಲಿಂಗ' / 'लिंग' / 'பாலினம்'
'Male' → 'पुरुष' / 'పుర్ష' / 'ಪುರುಷ' / 'पुरुष' / 'ஆண்'
'Female' → 'महिला' / 'స్త్రీ' / 'ಮಹಿಳೆ' / 'स्त्री' / 'பெண்'
'Date of Birth' → 'जन्म तारीख' / etc.
'Time of Birth' → 'जन्म का समय' / etc.
'I don't know the exact time' → 'मुझे सटीक समय नहीं पता' / etc.
'Place of Birth' → 'जन्म स्थान' / etc.
'Generate Kundli Report' → 'कुंडली रिपोर्ट बनाएं' / etc.
'Generating your report...' → 'आपकी रिपोर्ट बनाई जा रही है...' / etc.
```

#### How Language is Currently Handled:
```javascript
const isHindi = reportLanguage !== 'en';  // Line 83

// Labels are conditionally rendered (line 468):
<Label className="...">
  {isHindi ? 'नाम' : 'Name'} <span className="text-destructive">*</span>
</Label>
```

This pattern uses a binary check. **For a new language, you must update all these conditional renders.**

#### Updates Required:

1. **Change binary conditionals to full ternary chains**:
   ```javascript
   // OLD (2 languages):
   {isHindi ? 'नाम' : 'Name'}

   // NEW (6+ languages):
   reportLanguage === 'hi' ? 'नाम'
   : reportLanguage === 'te' ? 'పేరు'
   : reportLanguage === 'kn' ? 'ಹೆಸರು'
   : reportLanguage === 'mr' ? 'नाव'
   : reportLanguage === 'ta' ? 'பெயர்'
   : reportLanguage === 'xx' ? 'new language translation'
   : 'Name'
   ```

2. **Or refactor to use i18n.t()** for cleaner code:
   ```javascript
   // Better approach:
   const { t } = useTranslation();
   <Label>{t('form.name')}</Label>

   // Then add to i18n.ts:
   form: {
     name: { en: 'Name', hi: 'नाम', te: 'పేరు', ... xx: '...' },
     gender: { ... },
   }
   ```

3. **No code changes needed** if you refactor to use i18n properly — translations live in `src/i18n.ts` (Step 15 of playbook).

#### Language Selection (Lines 482–498):
- Dropdown is **prominent** and **controls global i18n language**
- When changed, entire form + report dynamically re-renders
- **No per-report language override** in single mode (unlike bulk)

#### No Changes to:
- Date picker functionality
- Gender radio buttons (just labels)
- Place autocomplete (Google API, language-agnostic)
- Form validation (same rules apply)

---

### Bulk Upload Form Localization

**File**: `src/components/BulkKundliRunner.tsx` (Lines 418–1652)

#### Bulk Language Selection (Lines 1478–1497):
```javascript
const [bulkLanguage, setBulkLanguage] = useState<'en' | 'hi' | 'te' | 'kn' | 'mr' | 'ta'>('en');

// Dropdown with 6 language options:
<select id="bulk-language" value={bulkLanguage} onChange={(e) => {
  const lang = e.target.value as ...;
  setBulkLanguage(lang);
  // Apply to all pending rows
  setBulkRows((prev) => prev.map((r) =>
    r.status === 'pending' ? { ...r, language: lang } : r
  ));
}}>
  <option value="en">English</option>
  <option value="hi">हिंदी (Hindi)</option>
  <option value="te">తెలుగు (Telugu)</option>
  <option value="kn">ಕನ್ನಡ (Kannada)</option>
  <option value="mr">मराठी (Marathi)</option>
  <option value="ta">தமிழ் (Tamil)</option>
</select>
```

#### To Add a New Language:
```javascript
// 1. Update type union (Line 427):
const [bulkLanguage, setBulkLanguage] = useState<'en' | 'hi' | 'te' | 'kn' | 'mr' | 'ta' | 'xx'>('en');

// 2. Add <option> to dropdown:
<option value="xx">{NativeNameHere} ({Language Name})</option>

// 3. Update language persistence check (Line 474–475):
if (savedLang && ['en', 'hi', 'te', 'kn', 'mr', 'ta', 'xx'].includes(savedLang)) {
  setBulkLanguage(savedLang as 'en' | 'hi' | 'te' | 'kn' | 'mr' | 'ta' | 'xx');
}
```

#### CSV Header Normalization (Lines 582–620):
The system calls `load-kundli-sheet` API which normalizes CSV headers to lowercase, snake_case keys:
- `Date Of Birth` → `date_of_birth`
- `Offering_User_Name` → `offering_user_name`
- `Gender` / `लिंग` / `లింగ` → detected as gender (raw headers preserved)

**No changes needed for new languages** — the header normalization is header-agnostic.

#### Indic Gender Detection (Lines 50–125):

**Critical feature for Indian users**: Detects gender from Indic script column names and values.

Currently supported:
```typescript
// Raw header detection (Lines 101–110):
if (raw.includes('लिंग') || raw.includes('লिंग')) { /* Hindi/Marathi */ }
if (raw.includes('లింగ')) { /* Telugu */ }
if (raw.includes('ಲಿಂಗ')) { /* Kannada */ }
if (raw.includes('பாலினம்')) { /* Tamil */ }

// Value detection (Lines 50–65):
Female markers: 'female', 'महिला', 'స్త్రీ', 'ಮಹಿಳೆ', 'पेण्', 'பெண்'
Male markers: 'male', 'पुरुष', 'పురుషుడు', 'ಪುರುಷ', 'पुरुष', 'ஆண்'
```

#### To Add a New Language:

**Add to raw header detection** (after Line 110):
```javascript
if (raw.includes('{Indic word for gender}')) {
  genderColumnIdx = i;
  break;
}
```

**Add to value detection** (after Line 65):
```javascript
const xx_female = ['female marker 1', 'female marker 2'];
const xx_male = ['male marker 1', 'male marker 2'];
const female = xx_female.some(m => raw.includes(m)) ? true
             : xx_male.some(m => raw.includes(m)) ? false
             : undefined;
```

Example for Gujarati:
```javascript
if (raw.includes('લિંગ')) {  // Gujarati for 'linga' (gender)
  genderColumnIdx = i;
  break;
}

const gu_female = ['female', 'મહિલા', 'નાર'];
const gu_male = ['male', 'પુરુષ', 'માણસ'];
```

#### Row Status Badges (Line 1646):
```javascript
<span className="text-xs">
  {row.language === 'hi' ? 'HI'
   : row.language === 'te' ? 'TE'
   : row.language === 'kn' ? 'KN'
   : row.language === 'mr' ? 'MR'
   : row.language === 'ta' ? 'TA'
   : row.language === 'xx' ? 'XX'  // ← add
   : 'EN'}
</span>
```

#### Per-Row Language Override:
Each row in the bulk upload has its own `language` field. This allows:
- Global default language from dropdown
- Per-row override (click row, change language)
- Example: rows 1–5 in English, rows 6–10 in Hindi

**No special handling needed** — language is stored in `BulkRowState.language` and passed to `KundliPDFDocument` at render time.

#### PDF Mutex for Concurrent Language Renders:
```javascript
const pdfMutexRef = useRef(new Mutex());

// Serialize PDF renders to prevent global language state corruption:
const blob = await (pdfMutexRef.current = pdfMutexRef.current.then(() =>
  pdf(<KundliPDFDocument report={wrappedReport} language={rowLang} />).toBlob()
));
```

This ensures each row's PDF is rendered in its correct language without interference from other rows.

---

### Place Name Transliteration

**Files**: `src/lib/pdf/placeUtils.ts`, `src/lib/pdf/i18n/placeNames.ts`

#### translitPlace() Function (placeUtils.ts, Lines 7–21):

```typescript
export const translitPlace = (name: string): string => {
  const lang = getActivePdfLanguage();
  if (!name || lang === 'en') return name;  // English: no transliteration

  const map = PLACE_TRANSLIT[lang];
  if (!map) return name;  // Fallback: return original

  // Exact match
  if (map[name]) return map[name];

  // Remove "District", "Division", etc. suffix and retry
  const cleaned = name.replace(/[-–—।.]+$/, '').trim();
  if (cleaned && map[cleaned]) return map[cleaned];

  const withoutSuffix = cleaned.replace(/\s+(District|Division|Region|Taluk|Tehsil)$/i, '').trim();
  if (withoutSuffix && map[withoutSuffix]) return map[withoutSuffix];

  return name;  // Fallback: return original if no match
};
```

#### PLACE_TRANSLIT Dictionary (placeNames.ts, Lines 13–150+):

Current coverage:
- **Hindi** (hi): 100+ entries (all states, UTs, major cities + suburbs)
- **Telugu** (te): 80+ entries
- **Kannada** (kn): 60+ entries
- **Marathi** (mr): 80+ entries
- **Tamil** (ta): 80+ entries

#### To Add a New Language:

1. **Research & translate** Indian states + major cities:
```typescript
xx: {
  // States/UTs (first)
  'Andhra Pradesh': 'native translation',
  'Arunachal Pradesh': 'native translation',
  // ... all 28 states + 8 UTs

  // Major cities (second)
  'Mumbai': 'native translation',
  'Delhi': 'native translation',
  'Bangalore': 'native translation',
  // ... 50+ metro + tier-1 cities

  // Suburbs (optional, for major metros)
  'Mumbai Suburban': 'native translation',
  'Bangalore Urban': 'native translation',
}
```

2. **Add to Type** (placeNames.ts, Line 12):
```typescript
export const PLACE_TRANSLIT: Record<'en' | 'hi' | 'te' | 'kn' | 'mr' | 'ta' | 'xx', Record<string, string>> = {
```

3. **Update `parsePlaceDetails()` function** if needed (placeUtils.ts, Lines 107–132):
   - Usually no changes needed — it uses `translitPlace()` internally
   - Only if script has special state/city name rules

#### Usage in PDF (KundliPDFDocument.tsx, Line 2106):
```typescript
// Already handled — no changes needed
return raw.split(',').map((s: string) => translitPlace(s.trim())).join(', ');
```

---

### Date & Time Formatting

**File**: `src/lib/pdf/formatters.ts` (already covered in placeNames.ts)

#### Month Names (placeNames.ts, Lines 3–10):

Already covered in Step 7 of the main playbook, but for completeness:

```typescript
export const MONTH_NAMES_BY_LANGUAGE: Record<'en' | 'hi' | 'te' | 'kn' | 'mr' | 'ta' | 'xx', string[]> = {
  xx: ['Month1', 'Month2', 'Month3', ..., 'Month12'],
};
```

#### formatBirthDate() Function (formatters.ts, Lines 9–62):

Already uses month names from `MONTH_NAMES_BY_LANGUAGE`, so adding month names (Step 7) automatically enables date localization.

**No additional changes needed.**

#### Weekday Format (formatters.ts, Lines 112–119):

```typescript
export const getWeekday = (dateStr: string): string => {
  const lang = getActivePdfLanguage();
  const localeMap = {
    hi: 'hi-IN',
    te: 'te-IN',
    kn: 'kn-IN',
    mr: 'mr-IN',
    ta: 'ta-IN',
    xx: 'xx-IN',  // ← add (if locale exists)
  };
  return date.toLocaleDateString(localeMap[lang] || 'en-IN', { weekday: 'long' });
};
```

**Note**: This uses native JavaScript `Intl.DateTimeFormat` with locale tags. If the new language doesn't have a BCP 47 locale in JavaScript (e.g., `xx-IN`), the fallback is `en-IN`.

For most Indian languages, you can use `language-IN` format (e.g., `gu-IN` for Gujarati, `bn-IN` for Bengali).

---

## Updated Effort Estimate (with Cover Pages, TOC, Disclaimers, Forms)

| Task | Effort |
|------|--------|
| Font download, GPOS strip, registration | 30 min |
| Frontend type unions + dropdowns + whitelist | 30 min |
| Divisional chart name fields (12 charts) | 30 min |
| Inline PDF conditionals (gender, footer, etc.) | 30 min |
| PDF cover page + TOC + disclaimer inline translations | **1 h** |
| PDF phrase map (~500 entries) | 3–4 h |
| PDF word map (~100 entries) | 1 h |
| Month names + place translit (~60+ entries) | 1–2 h |
| Single form UI label ternary chains | **30 min** |
| Bulk form language dropdown + gender detection | **1 h** |
| Disclaimer translation (3–5 paragraphs) | **1–2 h** |
| Bulk CSV header/gender marker support | **30 min** |
| Backend language pack — 7 files (mostly translation) | 3–4 h |
| Backend localize map (200+ term replacements) | 2–3 h |
| Safety i18n (~50 messages) | 1–2 h |
| Translation cache (540+ PHRASE_CACHE entries) | 2–3 h |
| Main app i18n.ts (puja/dosha UI strings) | 1–2 h |
| Supabase mirror + deploy | 1 h |
| Testing + fixes | 1–2 h |
| **Total** | **~20–28 h** |

Most of the time is translation work for:
- PDF phrase map (500 entries)
- Backend language pack (7 files)
- Backend localize map (200 entries)
- Translation cache (540 entries)
- Disclaimer text

The code changes are mostly mechanical (type unions, ternary chains, map entries).

---

## Effort Estimate

| Task | Effort |
|------|--------|
| Font download, GPOS strip, registration | 30 min |
| Frontend type unions + dropdowns + whitelist | 30 min |
| Divisional chart name fields (12 charts) | 30 min |
| Inline PDF conditionals (gender, footer, etc.) | 30 min |
| PDF phrase map (~500 entries) | 3–4 h |
| PDF word map (~100 entries) | 1 h |
| Month names + place translit (~60 entries) | 1 h |
| Backend language pack — 7 files (mostly translation) | 3–4 h |
| Backend localize map (200+ term replacements) | 2–3 h |
| Safety i18n (~50 messages) | 1–2 h |
| Translation cache (540+ PHRASE_CACHE entries) | 2–3 h |
| Main app i18n.ts (puja/dosha UI strings) | 1–2 h |
| Supabase mirror + deploy | 1 h |
| Testing + fixes | 1–2 h |
| **Total** | **~18–24 h** |

Most of the time is translation work. The code changes are mechanical once translations are ready.

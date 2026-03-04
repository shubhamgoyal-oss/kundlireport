# Language Playbook - Adding a New Language to Kundli Report

## Quick Reference: Files to Touch

| # | File | What to Add |
|---|------|-------------|
| 1 | `public/fonts/` | NotoSans{Script}-Regular.ttf + Bold.ttf |
| 2 | `src/components/KundliPDFDocument.tsx` | Font.register, language detection, month names, city translations, PDF UI phrase map |
| 3 | `src/utils/preWrapText.ts` | FONT_CONFIG entry |
| 4 | `src/components/KundliReportGenerator.tsx` | Language option in report language dropdown |
| 5 | `src/components/BulkKundliRunner.tsx` | Language option in bulk language dropdown |
| 6 | `src/utils/kundaliChart.ts` | Chart name + purpose translations for all 12 divisional charts |
| 7 | `supabase/functions/_shared/language-packs/types.ts` | Add to SupportedLanguage type |
| 8 | `supabase/functions/_shared/language-packs/{code}/` | 7 files: prompts, labels, terms, typography, qc, templates, significations |
| 9 | `supabase/functions/_shared/language-packs/index.ts` | Import packs, add to REGISTRY, update normalizeLanguage() |
| 10 | `supabase/functions/_shared/language-localize.ts` | Term replacement map (200+ entries) |
| 11 | `supabase/functions/_shared/safety-i18n.ts` | Add language key to all ~50 safety messages |
| 12 | `supabase/functions/process-kundli-job/index.ts` | Add to isLanguagePipelineV2Enabled() |

---

## Step-by-Step Guide (Example: Adding Tamil `ta`)

### STEP 1: Font Files

Download NotoSans font for the script from Google Fonts. Place in `public/fonts/`:

```
public/fonts/NotoSansTamil-Regular.ttf
public/fonts/NotoSansTamil-Bold.ttf
```

**CRITICAL**: Strip GPOS+GDEF tables to avoid fontkit crash (see Memory.md):
```bash
python3 -c "
from fontTools.ttLib import TTFont
for f in ['NotoSansTamil-Regular.ttf','NotoSansTamil-Bold.ttf']:
    t = TTFont(f'public/fonts/{f}')
    for tbl in ['GPOS','GDEF']:
        if tbl in t: del t[tbl]
    t.save(f'public/fonts/{f}')
"
```

---

### STEP 2: KundliPDFDocument.tsx (Frontend PDF)

This is the biggest file (~10k lines). Four changes needed:

#### 2a. Font Registration (top of file, ~line 8-77)

```tsx
Font.register({
  family: 'NotoSansTamil',
  fonts: [
    { src: '/fonts/NotoSansTamil-Regular.ttf', fontWeight: 'normal', fontStyle: 'normal' },
    { src: '/fonts/NotoSansTamil-Bold.ttf', fontWeight: 'bold', fontStyle: 'normal' },
    { src: '/fonts/NotoSansTamil-Regular.ttf', fontWeight: 'normal', fontStyle: 'italic' },
    { src: '/fonts/NotoSansTamil-Bold.ttf', fontWeight: 'bold', fontStyle: 'italic' },
  ],
});
```

#### 2b. Language Detection (~line 5269-5302, inside `applyLanguageTypography`)

Find the block that sets `ACTIVE_PDF_LANGUAGE` and add:

```tsx
if (code.startsWith('ta')) {
  ACTIVE_PDF_LANGUAGE = 'ta';
  ACTIVE_PDF_FONT_FAMILY = 'NotoSansTamil';
  ACTIVE_PDF_BODY_FONT_SIZE = 11.2;
  ACTIVE_PDF_BODY_LINE_HEIGHT = 1.55;
}
```

#### 2c. Month Names (~line 225)

Add to `MONTH_NAMES_BY_LANGUAGE`:

```tsx
ta: ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்',
     'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'],
```

#### 2d. City Name Translations (~line 6615)

Add to `PLACE_TRANSLIT`:

```tsx
ta: {
  'Mumbai': 'மும்பை', 'Delhi': 'டெல்லி', 'Bangalore': 'பெங்களூரு',
  'Chennai': 'சென்னை', 'Kolkata': 'கொல்கத்தா', 'Hyderabad': 'ஹைதராபாத்',
  // ... 50+ major Indian cities
},
```

#### 2e. PDF UI Phrase Map (~line 238+)

Add Tamil translations to `PDF_UI_PHRASE_MAP` for all UI strings used in the PDF:
- Section headers (Planetary Positions, House Analysis, Career, Marriage, etc.)
- Labels (House, Sign, Lord, Degree, Retrograde, Direct, etc.)
- Common phrases (Strength, Remedy, Gemstone, Mantra, etc.)

This is ~200 key-value pairs. Pattern:
```tsx
ta: {
  'Planetary Positions': 'கிரக நிலைகள்',
  'House': 'பாவம்',
  'Sign': 'ராசி',
  // ...
},
```

---

### STEP 3: preWrapText.ts (Indic Text Wrapping)

Add to `FONT_CONFIG` (~line 40-45):

```ts
ta: { family: 'NotoSansTamil', src: '/fonts/NotoSansTamil-Regular.ttf', fontSize: 11.2 },
```

This enables Canvas-based line measurement so Hindi/Tamil text wraps correctly in PDFs without word breakage.

---

### STEP 4: KundliReportGenerator.tsx (Single Report UI)

Find the language dropdown (~line 431-441) and add:

```tsx
<option value="ta">தமிழ் (Tamil)</option>
```

---

### STEP 5: BulkKundliRunner.tsx (Bulk Upload UI)

Find the `bulkLanguage` dropdown and add Tamil option. Also update the `BulkRowState` language type if it's explicitly typed.

Search for the language `<select>` element and add:
```tsx
<option value="ta">தமிழ் (Tamil)</option>
```

---

### STEP 6: kundaliChart.ts (Chart Name Translations)

Add `nameTamil` and `purposeTamil` fields to all 12 divisional charts in `PDF_CHARTS` (~line 146+):

```ts
D1: {
  // ... existing fields ...
  nameTamil: 'ராசி சக்கரம்',
  purposeTamil: 'முழு வாழ்க்கை மதிப்பீடு',
},
```

---

### STEP 7: Language Pack Types (Backend)

**File**: `supabase/functions/_shared/language-packs/types.ts`

```ts
export type SupportedLanguage = "en" | "hi" | "te" | "kn" | "mr" | "ta";
```

Also update `LanguageTypographyProfile`, `LanguageQcRules` interfaces if needed (usually unchanged).

---

### STEP 8: Language Pack Files (Backend - 7 files)

Create directory: `supabase/functions/_shared/language-packs/ta/`

#### 8a. `prompts.ts` — Agent system instructions (18 sections)

Each section tells the AI to respond in Tamil. Pattern:

```ts
export const taPrompts: Record<string, { systemPrefix?: string; userPrefix?: string }> = {
  global: {
    systemPrefix: "Output language is Tamil only. Write in pure Tamil script (தமிழ் எழுத்துகள்). Do not use Tanglish or English words except proper nouns and technical Jyotish terms.",
    userPrefix: "பதிலை முழுமையான தமிழில் தரவும்."
  },
  panchang: {
    systemPrefix: "பஞ்சாங்க விவரங்களில் வார், திதி, நட்சத்திரம், யோகம், கரணம் ஆகியவற்றை தமிழில் எழுதவும்."
  },
  // ... 16 more sections (planets, houses, career, marriage, dasha, rahuKetu,
  //     remedies, numerology, spiritual, charaKarakas, glossary, doshas,
  //     rajYogs, sadeSati, pillars, qa)
};
```

#### 8b. `labels.ts` — Static UI labels

```ts
export const taLabels: Record<string, string> = {
  reportTitle: "குண்டலி அறிக்கை",
  tableOfContents: "பொருளடக்கம்",
  birthDetails: "பிறப்பு விவரங்கள்",
  // ... all section headers and labels
};
```

#### 8c. `terms.ts` — Astrological terminology

```ts
export const taTerms = {
  planets: {
    Sun: "சூரியன்", Moon: "சந்திரன்", Mars: "செவ்வாய்",
    Mercury: "புதன்", Jupiter: "குரு", Venus: "சுக்கிரன்",
    Saturn: "சனி", Rahu: "ராகு", Ketu: "கேது",
  },
  signs: {
    Aries: "மேஷம்", Taurus: "ரிஷபம்", Gemini: "மிதுனம்",
    Cancer: "கடகம்", Leo: "சிம்மம்", Virgo: "கன்னி",
    Libra: "துலாம்", Scorpio: "விருச்சிகம்", Sagittarius: "தனுசு",
    Capricorn: "மகரம்", Aquarius: "கும்பம்", Pisces: "மீனம்",
  },
  houses: {
    1: "முதல் பாவம்", 2: "இரண்டாம் பாவம்", /* ... */ 12: "பன்னிரண்டாம் பாவம்",
  },
  nakshatras: {
    Ashwini: "அசுவினி", Bharani: "பரணி", Krittika: "கிருத்திகை",
    // ... all 27 nakshatras
  },
  weekdays: {
    Sunday: "ஞாயிறு", Monday: "திங்கள்", Tuesday: "செவ்வாய்",
    // ... all 7 days
  },
  months: {
    January: "ஜனவரி", /* ... */ December: "டிசம்பர்",
  },
  misc: {
    Retrograde: "வக்கிரம்", Direct: "நேர்கதி", Exalted: "உச்சம்",
    Debilitated: "நீசம்", /* ... */
  },
};
```

#### 8d. `typography.ts` — Font sizing

```ts
export const taTypography = {
  bodyFontFamily: "NotoSansTamil",
  bodyFontSize: 11.2,
  bodyLineHeight: 1.55,
  tableFontSize: 9.5,
  tableLineHeight: 1.3,
};
```

#### 8e. `qc.ts` — Quality control rules

```ts
export const taQc = {
  minScriptChars: 100,
  minScriptRatio: 0.75,
  maxLatinRatio: 0.20,
  bannedTokens: ["the", "is", "are", "was", "and", "but", "with", "for", "this", "that"],
  allowedLatinTokens: [
    "Mars", "Venus", "Jupiter", "Saturn", "Mercury", "Rahu", "Ketu",
    "Sun", "Moon", "Asc", "D1", "D9", "Mahadasha", "Antardasha",
  ],
};
```

#### 8f. `templates.ts` — Template strings with placeholders

```ts
export const taTemplates = {
  nativeMale: "{name} அவர்களின்",
  nativeFemale: "{name} அவர்களின்",
  currentAge: "தற்போதைய வயது {age}",
  // ... template strings used by agents
};
```

#### 8g. `significations.ts` — Planet significations for Dasha interpretation

```ts
export const taSignifications = {
  Sun: {
    themes: ["அதிகாரம்", "தந்தை", "அரசு"],
    opportunity: ["தலைமைப் பதவி", "அரசு நன்மை"],
    caution: ["ஆணவம்", "தந்தையுடன் மோதல்"],
  },
  // ... all 9 planets
};
```

---

### STEP 9: Language Pack Index (Backend)

**File**: `supabase/functions/_shared/language-packs/index.ts`

```ts
// Add imports
import { taPrompts } from "./ta/prompts.ts";
import { taLabels } from "./ta/labels.ts";
import { taTerms } from "./ta/terms.ts";
import { taTypography } from "./ta/typography.ts";
import { taQc } from "./ta/qc.ts";
import { taTemplates } from "./ta/templates.ts";
import { taSignifications } from "./ta/significations.ts";

// Add to REGISTRY
const REGISTRY = {
  // ... existing languages ...
  ta: {
    prompts: taPrompts,
    labels: taLabels,
    terms: taTerms,
    typography: taTypography,
    qc: taQc,
    templates: taTemplates,
    significations: taSignifications,
  },
};

// Update normalizeLanguage()
export function normalizeLanguage(input: unknown): SupportedLanguage {
  const raw = String(input || "").trim().toLowerCase();
  if (raw.startsWith("hi")) return "hi";
  if (raw.startsWith("te")) return "te";
  if (raw.startsWith("kn") || raw.startsWith("kan")) return "kn";
  if (raw.startsWith("mr") || raw.startsWith("mar")) return "mr";
  if (raw.startsWith("ta") || raw.startsWith("tam")) return "ta";  // ← ADD
  return "en";
}
```

---

### STEP 10: Language Localize (Backend)

**File**: `supabase/functions/_shared/language-localize.ts`

Add a `taMap` with 200+ term replacements for post-generation localization:

```ts
const taMap: Record<string, string> = {
  "High": "அதிகம்", "Medium": "நடுத்தரம்", "Low": "குறைவு",
  "Strong": "வலிமை", "Weak": "பலவீனம்",
  "house": "பாவம்", "planet": "கிரகம்", "sign": "ராசி",
  "gemstone": "ரத்தினம்", "mantra": "மந்திரம்",
  // ... 200+ entries covering strength, time periods, Jyotish terms,
  //     life areas, remedy terms, yoga terms, sade sati terms, etc.
};
```

Then add Tamil to the `localizeStructuredReportTerms()` switch/if block.

**Tip**: Marathi (`mr`) reuses Hindi's map since both use Devanagari. Tamil needs its own map.

---

### STEP 11: Safety i18n (Backend)

**File**: `supabase/functions/_shared/safety-i18n.ts`

The type `L5` defines all supported languages. Update it:

```ts
export type L5 = { en: string; hi: string; te: string; kn: string; mr: string; ta: string };
```

Then add `ta:` key to ALL ~50 safety message objects. These are age/gender-specific guardrails:

```ts
{
  en: "Career guidance is general at this young age.",
  hi: "इस कम उम्र में करियर मार्गदर्शन सामान्य है।",
  ta: "இந்த இளம் வயதில் தொழில் வழிகாட்டுதல் பொதுவானது.",
  // ... other languages
}
```

---

### STEP 12: Pipeline V2 Flag (Backend)

**File**: `supabase/functions/process-kundli-job/index.ts` (~line 44-50)

```ts
function isLanguagePipelineV2Enabled(language: SupportedLanguage): boolean {
  if (language === "hi" || language === "te" || language === "kn" || language === "mr" || language === "ta") return true;
  // ...
}
```

---

### STEP 13: Deploy Everything

```bash
# Backend edge functions
npx supabase functions deploy process-kundli-job --no-verify-jwt
npx supabase functions deploy translate-kundli-report --no-verify-jwt
npx supabase functions deploy finalize-kundli-report --no-verify-jwt

# Frontend
npx vite build && railway up
```

---

## Shared Script Languages (Copy Shortcut)

If the new language shares a script with an existing language, you can reuse:

| New Language | Shares Script With | Can Reuse |
|---|---|---|
| Marathi (mr) | Hindi (hi) | Font (NotoSansDevanagari), similar localize map |
| Konkani | Hindi/Marathi | Font (NotoSansDevanagari) |
| Sanskrit | Hindi | Font (NotoSansDevanagari) |
| Tamil (ta) | - | Needs own NotoSansTamil font |
| Malayalam (ml) | - | Needs own NotoSansMalayalam font |
| Gujarati (gu) | - | Needs own NotoSansGujarati font |
| Bengali (bn) | - | Needs own NotoSansBengali font |
| Odia (or) | - | Needs own NotoSansOriya font |
| Punjabi (pa) | - | Needs own NotoSansGurmukhi font |

---

## Testing Checklist

- [ ] Font renders correctly (no boxes/tofu characters)
- [ ] PDF generates without fontkit crash
- [ ] Text wraps correctly (no word breakage mid-word)
- [ ] All section headers translated
- [ ] Planet/sign/house names in target language
- [ ] City names transliterated
- [ ] QC passes (check `report.errors` for LANGUAGE_QC warnings)
- [ ] Safety guardrails appear in target language
- [ ] D1 chart image renders (chart API supports the language)
- [ ] Bulk upload works with the new language option
- [ ] Single report works with the new language option

---

## Effort Estimate

| Task | Time |
|------|------|
| Font setup + PDF registration | 30 min |
| Frontend dropdowns + chart names | 30 min |
| Language pack (7 files) | 3-4 hours (mostly translation) |
| Localize map (200+ terms) | 2-3 hours |
| Safety i18n (50 messages) | 1-2 hours |
| City translations (50+ cities) | 1 hour |
| PDF UI phrase map (200 terms) | 2-3 hours |
| Testing & fixes | 1-2 hours |
| **Total** | **~12-16 hours** |

Most of the time is translation work. The code changes are mechanical once you have the translations.

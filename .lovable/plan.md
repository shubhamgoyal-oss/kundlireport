
# Plan: Comprehensive Kundli Report Generation System

## Overview

This plan outlines the architecture for generating detailed Kundli reports similar to the attached PDF sample from "Astro Arun Pandit". The sample report contains 50+ pages with deep astrological analysis. We will create a multi-agent system where specialized AI agents generate specific sections using the Seer API output and planetary data.

## Sample Report Structure Analysis

The uploaded PDF contains the following major sections:

| Section | Content Type | Pages |
|---------|-------------|-------|
| **Fundamental Details** | Birth charts, Panchang, planetary positions, Shodashvarga charts, Dasha charts, Ashtakvarga | ~20 pages |
| **Panchang Decoded** | Vaar, Tithi, Karana, Nakshatra, Yoga interpretations | ~4 pages |
| **Three Pillars** | Moon Sign, Ascendant, Nakshatra deep analysis | ~6 pages |
| **Planetary Profiles** | Each planet's placement + aspects analysis | ~15 pages |
| **Bhavphal (12 Houses)** | Detailed analysis of each house | ~12 pages |
| **Conjunctions** | Planetary conjunctions and their effects | ~4 pages |
| **Love & Marriage** | 5th house, Darakaraka, timing | ~4 pages |
| **Career Calling** | Sun/Saturn analysis, Mahadasha career, Amatyakaraka | ~4 pages |
| **Chara Karakas** | 8 Chara Karakas significance and impact | ~4 pages |
| **Rahu-Ketu Analysis** | Karmic axis interpretation | ~4 pages |
| **Doshas** | Mangal, Sade Sati, Raj Yogas, other doshas | ~8 pages |
| **Mahadasha Predictions** | Current and upcoming dashas | ~6 pages |
| **Numerology** | Mulank, Bhagyank, Success Number | ~4 pages |
| **Spiritual Potential** | Spiritual growth guidance | ~2 pages |
| **Remedies** | Rudraksha, Gemstones, Mantras, Yantras, Donations | ~6 pages |

## Data Already Available from Seer API

The current `fetchSeerKundli` function returns:

```text
vedic_horoscope:
  +-- planets_position[] (all 9 planets + Asc with sign, degree, house, nakshatra)
  +-- pitri_dosha (Pitra dosha detection)
  +-- shadhe_sati_dosha (Sade Sati periods)
  +-- mangal_dosha
  +-- kaal_sarp_dosha
```

The `adaptSeerResponse` function converts this to:
- `asc`: Ascendant with sign, degree, house
- `planets[]`: 9 planets with name, sign, signIdx, degree, house, isRetro

## Proposed Architecture

```text
+---------------------------+
|    generate-kundli-report |
|    (Orchestrator)         |
+-------------+-------------+
              |
   +----------+----------+----------+----------+
   |          |          |          |          |
   v          v          v          v          v
+-------+ +-------+ +-------+ +-------+ +-------+
|Panchang| |Pillars| |Planets| |Houses | |Doshas |
|Agent   | |Agent  | |Agent  | |Agent  | |Agent  |
+-------+ +-------+ +-------+ +-------+ +-------+
   |          |          |          |          |
   v          v          v          v          v
+-------+ +-------+ +-------+ +-------+ +-------+
|Career | |Marriage| |Dasha  | |Remedies| |Rahu- |
|Agent  | |Agent   | |Agent  | |Agent   | |Ketu  |
+-------+ +-------+ +-------+ +-------+ +-------+
```

## Implementation Plan

### Phase 1: Core Infrastructure

**1.1 Create Report Generation Edge Function**

Create `supabase/functions/generate-kundli-report/index.ts`:
- Accepts birth details (same as calculate-dosha)
- Calls Seer API via existing adapter
- Orchestrates calls to specialized agent functions
- Aggregates results into structured report JSON
- Supports language parameter (en/hi)

**1.2 Create Agent Base Module**

Create `supabase/functions/generate-kundli-report/agent-base.ts`:
- Shared function to call Lovable AI with specialized prompts
- Handles streaming/non-streaming responses
- Enforces output structure (JSON schema with `tool_choice`)

### Phase 2: Prediction Agents (Priority Sections)

**2.1 Panchang Agent** (`panchang-agent.ts`)

Input: Birth panchang data (Vaar, Tithi, Nakshatra, Karana, Yoga)
Output:
```typescript
interface PanchangPrediction {
  vaar: { day: string; planet: string; interpretation: string; strengths: string[]; challenges: string[] };
  tithi: { name: string; paksha: string; interpretation: string; luckyDays: string[]; avoidDays: string[] };
  nakshatra: { name: string; pada: number; lord: string; interpretation: string; characteristics: string[] };
  karana: { name: string; interpretation: string };
  yoga: { name: string; interpretation: string; effects: string[] };
}
```

**2.2 Three Pillars Agent** (`pillars-agent.ts`)

Input: Moon sign, Ascendant, Nakshatra
Output:
```typescript
interface PillarsPrediction {
  moonSign: { sign: string; element: string; interpretation: string; emotionalNature: string; relationships: string };
  ascendant: { sign: string; rulingPlanet: string; interpretation: string; personality: string; appearance: string };
  nakshatra: { name: string; symbol: string; deity: string; interpretation: string; padaAnalysis: string };
}
```

**2.3 Planetary Profiles Agent** (`planets-agent.ts`)

For each planet, generate:
```typescript
interface PlanetProfile {
  planet: string;
  sign: string;
  house: number;
  degree: number;
  isRetro: boolean;
  dignity: 'exalted' | 'debilitated' | 'own' | 'friendly' | 'enemy' | 'neutral';
  placementAnalysis: string;  // 2-3 paragraphs
  aspects: Array<{
    aspectType: '4th' | '7th' | '8th' | '10th';
    targetHouse: number;
    interpretation: string;
  }>;
  dashaEffect: string;
}
```

**2.4 Bhavphal (Houses) Agent** (`houses-agent.ts`)

For each of 12 houses:
```typescript
interface HouseAnalysis {
  house: number;
  sign: string;
  lord: string;
  lordPlacement: { house: number; sign: string };
  occupants: string[];
  significance: string;
  interpretation: string;
  predictions: string[];
}
```

**2.5 Career Agent** (`career-agent.ts`)

Input: Sun, Saturn, 10th house, Amatyakaraka, birth Mahadasha
Output:
```typescript
interface CareerPrediction {
  sunAnalysis: { placement: string; interpretation: string };
  saturnAnalysis: { placement: string; interpretation: string };
  tenthHouse: { sign: string; lord: string; occupants: string[]; interpretation: string };
  amatyakaraka: { planet: string; interpretation: string };
  suitableFields: string[];
  careerTiming: string[];
  birthMahadasha: { planet: string; careerInfluence: string };
}
```

**2.6 Marriage Agent** (`marriage-agent.ts`)

Input: 7th house, Venus, Darakaraka, 5th house
Output:
```typescript
interface MarriagePrediction {
  fifthHouse: { analysis: string; loveNature: string };
  seventhHouse: { sign: string; lord: string; interpretation: string };
  darakaraka: { planet: string; interpretation: string; partnerQualities: string[] };
  timingAnalysis: string[];
  compatibility: string;
}
```

**2.7 Dasha Agent** (`dasha-agent.ts`)

Input: Vimshottari dasha periods, current dasha
Output:
```typescript
interface DashaPrediction {
  currentMahadasha: { planet: string; startDate: string; endDate: string; interpretation: string };
  currentAntardasha: { planet: string; startDate: string; endDate: string; interpretation: string };
  upcomingPeriods: Array<{
    mahadasha: string;
    period: string;
    predictions: string;
  }>;
}
```

**2.8 Remedies Agent** (`remedies-agent.ts`)

Input: All dosha results, weak planets
Output:
```typescript
interface RemediesPrediction {
  rudraksha: { recommended: string; reason: string };
  gemstone: { primary: string; secondary: string; reason: string };
  mantras: Array<{ mantra: string; planet: string; count: number; timing: string }>;
  ishtaDevata: { deity: string; reason: string };
  yantra: { name: string; reason: string };
  donations: Array<{ item: string; day: string; reason: string }>;
}
```

### Phase 3: Supporting Calculations

**3.1 Dignity Calculator**

Add to seer-adapter.ts:
```typescript
function calculateDignity(planet: string, signIdx: number): 'exalted' | 'debilitated' | 'own' | 'friendly' | 'enemy' | 'neutral';
```

**3.2 Aspect Calculator**

Add to seer-adapter.ts:
```typescript
function calculateAspects(planets: SeerPlanet[], asc: SeerPlanet): Aspect[];
```

**3.3 Chara Karaka Calculator**

Add new file:
```typescript
function calculateCharaKarakas(planets: SeerPlanet[]): CharaKaraka[];
// Returns: Atmakaraka, Amatyakaraka, Bhratrikaraka, Matrikaraka, etc.
```

### Phase 4: Report Assembly and PDF Generation

**4.1 Report Assembly**

The orchestrator combines all agent outputs into a structured JSON:
```typescript
interface KundliReport {
  birthDetails: BirthDetails;
  charts: {
    lagnaChart: string; // SVG
    moonChart: string;  // SVG (if available)
    navamshaChart: string; // SVG (if available)
  };
  panchang: PanchangPrediction;
  pillars: PillarsPrediction;
  planets: PlanetProfile[];
  houses: HouseAnalysis[];
  career: CareerPrediction;
  marriage: MarriagePrediction;
  doshas: DoshaResults; // Existing
  dasha: DashaPrediction;
  remedies: RemediesPrediction;
  generatedAt: string;
  language: 'en' | 'hi';
}
```

**4.2 Frontend Report Viewer (Optional Later)**

Create a React component to render the report in a beautiful PDF-like layout.

## Technical Details

### AI Model Selection

- Model: `google/gemini-3-flash-preview` (fast, balanced)
- Use tool calling for structured output
- Each agent has a specialized system prompt with Vedic astrology rules

### API Call Flow

```text
Client -> generate-kundli-report -> Seer API
                                 -> panchang-agent -> Lovable AI
                                 -> pillars-agent -> Lovable AI
                                 -> planets-agent -> Lovable AI (9 calls, parallelized)
                                 -> houses-agent -> Lovable AI (12 calls, parallelized)
                                 -> career-agent -> Lovable AI
                                 -> marriage-agent -> Lovable AI
                                 -> dasha-agent -> Lovable AI
                                 -> remedies-agent -> Lovable AI
                                 <- Aggregated Report
```

### Parallelization Strategy

To minimize latency:
- Run independent agents in parallel using `Promise.all`
- Batch planet/house analyses where possible
- Cache Seer API response for reuse across agents

### Cost Considerations

- Estimated tokens per report: ~50,000-100,000
- Use `google/gemini-3-flash-preview` for cost efficiency
- Consider caching reports by birth details hash

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/generate-kundli-report/index.ts` | Main orchestrator |
| `supabase/functions/generate-kundli-report/agent-base.ts` | Shared AI calling logic |
| `supabase/functions/generate-kundli-report/panchang-agent.ts` | Panchang predictions |
| `supabase/functions/generate-kundli-report/pillars-agent.ts` | Moon/Asc/Nakshatra |
| `supabase/functions/generate-kundli-report/planets-agent.ts` | Planet profiles |
| `supabase/functions/generate-kundli-report/houses-agent.ts` | 12 house analysis |
| `supabase/functions/generate-kundli-report/career-agent.ts` | Career predictions |
| `supabase/functions/generate-kundli-report/marriage-agent.ts` | Marriage predictions |
| `supabase/functions/generate-kundli-report/dasha-agent.ts` | Dasha predictions |
| `supabase/functions/generate-kundli-report/remedies-agent.ts` | Remedies |
| `supabase/functions/generate-kundli-report/utils/dignity.ts` | Dignity calculator |
| `supabase/functions/generate-kundli-report/utils/aspects.ts` | Aspect calculator |
| `supabase/functions/generate-kundli-report/utils/chara-karakas.ts` | Chara Karaka calculator |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/config.toml` | Add new function configuration |

## Phased Delivery

**Phase 1 (MVP - Predictions Focus):**
- Orchestrator + 3 core agents (Panchang, Pillars, Planets)
- Basic structured output

**Phase 2:**
- Houses, Career, Marriage agents
- Aspect calculations

**Phase 3:**
- Dasha predictions
- Remedies agent
- Chara Karakas

**Phase 4:**
- Report caching
- PDF generation
- Hindi translations

## Summary

This multi-agent architecture will generate comprehensive Kundli reports with depth comparable to the sample PDF. Each agent specializes in a specific area of Vedic astrology, using the Seer API planetary data as the foundation. The modular design allows for incremental development and easy testing of individual prediction sections.

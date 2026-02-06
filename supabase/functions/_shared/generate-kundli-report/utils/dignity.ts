// Planetary dignity calculator based on Vedic astrology rules

export type Dignity = 'exalted' | 'debilitated' | 'own' | 'mooltrikona' | 'friendly' | 'enemy' | 'neutral';

// Sign indices: 0=Aries, 1=Taurus, ..., 11=Pisces
const EXALTATION: Record<string, number> = {
  Sun: 0,      // Aries
  Moon: 1,     // Taurus
  Mars: 9,     // Capricorn
  Mercury: 5,  // Virgo
  Jupiter: 3,  // Cancer
  Venus: 11,   // Pisces
  Saturn: 6,   // Libra
  Rahu: 1,     // Taurus (some traditions say Gemini)
  Ketu: 7,     // Scorpio (some traditions say Sagittarius)
};

const DEBILITATION: Record<string, number> = {
  Sun: 6,      // Libra
  Moon: 7,     // Scorpio
  Mars: 3,     // Cancer
  Mercury: 11, // Pisces
  Jupiter: 9,  // Capricorn
  Venus: 5,    // Virgo
  Saturn: 0,   // Aries
  Rahu: 7,     // Scorpio
  Ketu: 1,     // Taurus
};

// Own signs (swakshetra)
const OWN_SIGNS: Record<string, number[]> = {
  Sun: [4],           // Leo
  Moon: [3],          // Cancer
  Mars: [0, 7],       // Aries, Scorpio
  Mercury: [2, 5],    // Gemini, Virgo
  Jupiter: [8, 11],   // Sagittarius, Pisces
  Venus: [1, 6],      // Taurus, Libra
  Saturn: [9, 10],    // Capricorn, Aquarius
  Rahu: [10],         // Aquarius (co-rules)
  Ketu: [7],          // Scorpio (co-rules)
};

// Mooltrikona signs and degree ranges
const MOOLTRIKONA: Record<string, { sign: number; degStart: number; degEnd: number }> = {
  Sun: { sign: 4, degStart: 0, degEnd: 20 },        // Leo 0-20°
  Moon: { sign: 1, degStart: 4, degEnd: 20 },       // Taurus 4-20°
  Mars: { sign: 0, degStart: 0, degEnd: 12 },       // Aries 0-12°
  Mercury: { sign: 5, degStart: 16, degEnd: 20 },   // Virgo 16-20°
  Jupiter: { sign: 8, degStart: 0, degEnd: 10 },    // Sagittarius 0-10°
  Venus: { sign: 6, degStart: 0, degEnd: 15 },      // Libra 0-15°
  Saturn: { sign: 10, degStart: 0, degEnd: 20 },    // Aquarius 0-20°
};

// Planetary friendships (natural)
const FRIENDS: Record<string, string[]> = {
  Sun: ["Moon", "Mars", "Jupiter"],
  Moon: ["Sun", "Mercury"],
  Mars: ["Sun", "Moon", "Jupiter"],
  Mercury: ["Sun", "Venus"],
  Jupiter: ["Sun", "Moon", "Mars"],
  Venus: ["Mercury", "Saturn"],
  Saturn: ["Mercury", "Venus"],
  Rahu: ["Mercury", "Venus", "Saturn"],
  Ketu: ["Mars", "Venus", "Saturn"],
};

const ENEMIES: Record<string, string[]> = {
  Sun: ["Saturn", "Venus"],
  Moon: [],
  Mars: ["Mercury"],
  Mercury: ["Moon"],
  Jupiter: ["Mercury", "Venus"],
  Venus: ["Sun", "Moon"],
  Saturn: ["Sun", "Moon", "Mars"],
  Rahu: ["Sun", "Moon", "Mars"],
  Ketu: ["Sun", "Moon"],
};

// Sign lords
const SIGN_LORDS: string[] = [
  "Mars",     // Aries
  "Venus",    // Taurus
  "Mercury",  // Gemini
  "Moon",     // Cancer
  "Sun",      // Leo
  "Mercury",  // Virgo
  "Venus",    // Libra
  "Mars",     // Scorpio (traditionally)
  "Jupiter", // Sagittarius
  "Saturn",   // Capricorn
  "Saturn",   // Aquarius
  "Jupiter", // Pisces
];

export function getSignLord(signIdx: number): string {
  return SIGN_LORDS[signIdx];
}

export function calculateDignity(planet: string, signIdx: number, degree?: number): Dignity {
  // Check exaltation
  if (EXALTATION[planet] === signIdx) {
    return 'exalted';
  }

  // Check debilitation
  if (DEBILITATION[planet] === signIdx) {
    return 'debilitated';
  }

  // Check mooltrikona (if degree provided)
  const mt = MOOLTRIKONA[planet];
  if (mt && mt.sign === signIdx && degree !== undefined) {
    const degInSign = degree % 30;
    if (degInSign >= mt.degStart && degInSign <= mt.degEnd) {
      return 'mooltrikona';
    }
  }

  // Check own sign
  if (OWN_SIGNS[planet]?.includes(signIdx)) {
    return 'own';
  }

  // Check friendship with sign lord
  const signLord = SIGN_LORDS[signIdx];
  if (signLord === planet) {
    return 'own'; // Planet in its own sign
  }

  if (FRIENDS[planet]?.includes(signLord)) {
    return 'friendly';
  }

  if (ENEMIES[planet]?.includes(signLord)) {
    return 'enemy';
  }

  return 'neutral';
}

export function getDignityScore(dignity: Dignity): number {
  switch (dignity) {
    case 'exalted': return 100;
    case 'mooltrikona': return 85;
    case 'own': return 75;
    case 'friendly': return 60;
    case 'neutral': return 50;
    case 'enemy': return 35;
    case 'debilitated': return 20;
    default: return 50;
  }
}

export function getDignityDescription(dignity: Dignity): string {
  switch (dignity) {
    case 'exalted': return "Exalted - Maximum strength and positive expression";
    case 'mooltrikona': return "Mooltrikona - Very strong, natural expression";
    case 'own': return "Own Sign - Comfortable and powerful";
    case 'friendly': return "Friendly Sign - Supportive environment";
    case 'neutral': return "Neutral Sign - Average expression";
    case 'enemy': return "Enemy Sign - Challenged expression";
    case 'debilitated': return "Debilitated - Weakened, requires remedies";
    default: return "Unknown dignity";
  }
}

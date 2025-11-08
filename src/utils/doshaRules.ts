/**
 * Dosha calculation rules based on classical Jyotish principles
 * Sources cited inline for transparency
 */

import type { ChartData } from './ephemeris';

export interface DoshaResult {
  summary: {
    mangal: 'present' | 'absent' | 'canceled';
    mangalSeverity?: 'mild' | 'moderate' | 'strong';
    kaalSarp: 'present' | 'absent';
    kaalSarpType?: string;
    pitra: 'present' | 'absent';
    shaniSadeSati: 'active' | 'inactive';
    shaniPhase?: 1 | 2 | 3;
  };
  details: Record<string, {
    triggeredBy: string[];
    placements: string[];
    notes: string[];
    explanation: string;
    remedies: string[];
  }>;
}

// Mangal Dosha houses (from Lagna or Moon)
const MANGAL_DOSHA_HOUSES = [1, 2, 4, 7, 8, 12];

// Kaal Sarp Dosha types by Rahu's house
const KAAL_SARP_TYPES = [
  'Anant', 'Kulik', 'Vasuki', 'Shankhapal', 'Padam', 'Mahapadma',
  'Takshak', 'Karkotak', 'Shankhachur', 'Ghatak', 'Vishdhar', 'Sheshnag'
];

/**
 * Calculate Mangal (Manglik/Kuja) Dosha
 * Reference: https://www.sanatanjyoti.com/manglik-dosha/
 */
export function calculateMangalDosha(chart: ChartData): {
  present: boolean;
  severity: 'mild' | 'moderate' | 'strong' | null;
  canceled: boolean;
  triggeredBy: string[];
  placements: string[];
  notes: string[];
} {
  const mars = chart.grahas.Mars;
  const jupiter = chart.grahas.Jupiter;
  
  if (!mars || !chart.ascendant) {
    return {
      present: false,
      severity: null,
      canceled: false,
      triggeredBy: [],
      placements: [],
      notes: ['Birth time unknown - cannot calculate from Lagna']
    };
  }

  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];
  let canceled = false;

  // Check from Lagna
  const marsHouseFromLagna = mars.house!;
  if (MANGAL_DOSHA_HOUSES.includes(marsHouseFromLagna)) {
    triggeredBy.push('Mars from Lagna');
    placements.push(`Mars in ${marsHouseFromLagna}th house from Lagna (${mars.sign} ${mars.deg.toFixed(1)}°)`);
  }

  // Check from Moon
  const moon = chart.grahas.Moon;
  const marsHouseFromMoon = calculateHouseFrom(mars.lon, moon.lon);
  if (MANGAL_DOSHA_HOUSES.includes(marsHouseFromMoon)) {
    triggeredBy.push('Mars from Moon');
    placements.push(`Mars in ${marsHouseFromMoon}th house from Moon`);
  }

  // Check cancellations
  // 1. Mars in own sign (Aries/Scorpio) or exalted (Capricorn)
  if (mars.sign === 'Aries' || mars.sign === 'Scorpio' || mars.sign === 'Capricorn') {
    canceled = true;
    notes.push(`Mars is ${mars.sign === 'Capricorn' ? 'exalted' : 'in own sign'} (${mars.sign}) - Dosha canceled`);
  }

  // 2. Jupiter conjunct or aspecting Mars
  const jupiterMarsDistance = Math.abs(jupiter.lon - mars.lon);
  if (jupiterMarsDistance < 8 || Math.abs(jupiterMarsDistance - 180) < 8) {
    canceled = true;
    notes.push('Jupiter aspects/conjuncts Mars - beneficial mitigation');
  }

  // Determine severity
  let severity: 'mild' | 'moderate' | 'strong' | null = null;
  if (triggeredBy.length > 0 && !canceled) {
    if (triggeredBy.length === 1) {
      severity = 'mild';
    } else if (triggeredBy.length === 2) {
      severity = 'moderate';
    }
    
    // Check for strong aspects to 7th or Lagna
    const aspectsLagna = Math.abs(mars.lon - chart.ascendant.lon);
    if (aspectsLagna < 8 || Math.abs(aspectsLagna - 90) < 8 || Math.abs(aspectsLagna - 180) < 8) {
      severity = 'strong';
      notes.push('Mars strongly aspects Lagna');
    }
  }

  return {
    present: triggeredBy.length > 0 && !canceled,
    severity,
    canceled,
    triggeredBy,
    placements,
    notes
  };
}

/**
 * Calculate Kaal Sarp Dosha
 * Reference: https://timesofindia.indiatimes.com/astrology/planets-transits/kaal-sarp-dosh-know-everything-about-it/
 */
export function calculateKaalSarpDosha(chart: ChartData): {
  present: boolean;
  type: string | null;
  triggeredBy: string[];
  placements: string[];
  notes: string[];
} {
  const rahu = chart.grahas.Rahu;
  const ketu = chart.grahas.Ketu;
  
  // Check if all planets are between Rahu and Ketu
  const rahuLon = rahu.lon;
  const ketuLon = ketu.lon;
  
  const planets = [
    chart.grahas.Sun,
    chart.grahas.Moon,
    chart.grahas.Mars,
    chart.grahas.Mercury,
    chart.grahas.Jupiter,
    chart.grahas.Venus,
    chart.grahas.Saturn,
  ];

  let allPlanetsInArc = true;
  const placements: string[] = [];
  
  for (const planet of planets) {
    const isInArc = isInRahuKetuArc(planet.lon, rahuLon, ketuLon);
    if (!isInArc) {
      allPlanetsInArc = false;
      break;
    }
  }

  const triggeredBy: string[] = [];
  const notes: string[] = [];
  let type: string | null = null;

  if (allPlanetsInArc) {
    triggeredBy.push('All planets between Rahu and Ketu');
    
    // Determine type by Rahu's house
    if (rahu.house) {
      type = KAAL_SARP_TYPES[rahu.house - 1];
      placements.push(`Rahu in ${rahu.house}th house (${rahu.sign})`);
      placements.push(`Type: ${type} Kaal Sarp`);
    }
    
    planets.forEach(p => {
      placements.push(`${getPlanetName(p, chart)} in ${p.sign} ${p.deg.toFixed(1)}°`);
    });
  }

  return {
    present: allPlanetsInArc,
    type,
    triggeredBy,
    placements,
    notes
  };
}

/**
 * Calculate Pitra (Pitru) Dosha
 * Reference: https://www.astrobhava.com/pitra-dosha/
 */
export function calculatePitraDosha(chart: ChartData): {
  present: boolean;
  triggeredBy: string[];
  placements: string[];
  notes: string[];
} {
  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  const sun = chart.grahas.Sun;
  const rahu = chart.grahas.Rahu;
  const ketu = chart.grahas.Ketu;
  const saturn = chart.grahas.Saturn;

  // 1. Rahu or Ketu in 9th house
  if (rahu.house === 9) {
    triggeredBy.push('Rahu in 9th house');
    placements.push(`Rahu in 9th house (${rahu.sign})`);
  }
  if (ketu.house === 9) {
    triggeredBy.push('Ketu in 9th house');
    placements.push(`Ketu in 9th house (${ketu.sign})`);
  }

  // 2. Sun conjunct Rahu/Ketu (within 8° orb)
  const sunRahuDist = Math.abs(sun.lon - rahu.lon);
  if (sunRahuDist < 8 || sunRahuDist > 352) {
    triggeredBy.push('Sun conjunct Rahu');
    placements.push(`Sun (${sun.sign} ${sun.deg.toFixed(1)}°) conjunct Rahu (${rahu.sign} ${rahu.deg.toFixed(1)}°)`);
  }

  const sunKetuDist = Math.abs(sun.lon - ketu.lon);
  if (sunKetuDist < 8 || sunKetuDist > 352) {
    triggeredBy.push('Sun conjunct Ketu');
    placements.push(`Sun (${sun.sign} ${sun.deg.toFixed(1)}°) conjunct Ketu (${ketu.sign} ${ketu.deg.toFixed(1)}°)`);
  }

  // 3. Sun aspected by Saturn (hard aspect)
  const sunSaturnDist = Math.abs(sun.lon - saturn.lon);
  if (Math.abs(sunSaturnDist - 180) < 6 || sunSaturnDist < 6) {
    triggeredBy.push('Sun aspected by Saturn');
    placements.push(`Sun-Saturn aspect (${sunSaturnDist.toFixed(1)}° apart)`);
  }

  if (triggeredBy.length > 0) {
    notes.push('Traditional indicators of ancestral karma patterns');
  }

  return {
    present: triggeredBy.length > 0,
    triggeredBy,
    placements,
    notes
  };
}

/**
 * Calculate Shani Sade Sati (transit-based)
 * Reference: https://timesofindia.indiatimes.com/astrology/planets-transits/sade-sati/
 */
export function calculateSadeSati(chart: ChartData, currentDate: Date = new Date()): {
  active: boolean;
  phase: 1 | 2 | 3 | null;
  triggeredBy: string[];
  placements: string[];
  notes: string[];
} {
  // Current Saturn position (simplified - in production, calculate actual transit)
  // For now, we'll use natal Saturn as placeholder
  const moonSign = Math.floor(chart.grahas.Moon.lon / 30);
  const saturnSign = Math.floor(chart.grahas.Saturn.lon / 30);
  
  // Calculate which phase
  let phase: 1 | 2 | 3 | null = null;
  let active = false;
  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  // Check if Saturn is in 12th, 1st, or 2nd from Moon sign
  const diff = (saturnSign - moonSign + 12) % 12;
  
  if (diff === 11) { // 12th from Moon
    active = true;
    phase = 1;
    triggeredBy.push('Saturn transiting 12th from Moon');
    placements.push(`Moon in ${ZODIAC_SIGNS[moonSign]}, Saturn in ${ZODIAC_SIGNS[saturnSign]}`);
    notes.push('Phase 1: Rising phase - challenges begin');
  } else if (diff === 0) { // Same as Moon
    active = true;
    phase = 2;
    triggeredBy.push('Saturn transiting over Moon sign');
    placements.push(`Moon in ${ZODIAC_SIGNS[moonSign]}, Saturn in ${ZODIAC_SIGNS[saturnSign]}`);
    notes.push('Phase 2: Peak phase - maximum intensity');
  } else if (diff === 1) { // 2nd from Moon
    active = true;
    phase = 3;
    triggeredBy.push('Saturn transiting 2nd from Moon');
    placements.push(`Moon in ${ZODIAC_SIGNS[moonSign]}, Saturn in ${ZODIAC_SIGNS[saturnSign]}`);
    notes.push('Phase 3: Setting phase - challenges ease');
  }

  if (!active) {
    notes.push('Not currently in Sade Sati period');
  }

  return {
    active,
    phase,
    triggeredBy,
    placements,
    notes
  };
}

// Helper functions

const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 
  'Leo', 'Virgo', 'Libra', 'Scorpio', 
  'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

function calculateHouseFrom(planetLon: number, refLon: number): number {
  const refSign = Math.floor(refLon / 30);
  const planetSign = Math.floor(planetLon / 30);
  
  let house = planetSign - refSign + 1;
  while (house <= 0) house += 12;
  while (house > 12) house -= 12;
  
  return house;
}

function isInRahuKetuArc(planetLon: number, rahuLon: number, ketuLon: number): boolean {
  // Check if planet is in the arc from Rahu to Ketu (going forward)
  const normalizedPlanet = ((planetLon % 360) + 360) % 360;
  const normalizedRahu = ((rahuLon % 360) + 360) % 360;
  const normalizedKetu = ((ketuLon % 360) + 360) % 360;
  
  if (normalizedRahu < normalizedKetu) {
    return normalizedPlanet >= normalizedRahu && normalizedPlanet <= normalizedKetu;
  } else {
    return normalizedPlanet >= normalizedRahu || normalizedPlanet <= normalizedKetu;
  }
}

function getPlanetName(planet: any, chart: ChartData): string {
  for (const [name, pos] of Object.entries(chart.grahas)) {
    if (pos === planet) return name;
  }
  return 'Unknown';
}

/**
 * Main dosha calculation function
 */
export function calculateAllDoshas(chart: ChartData): DoshaResult {
  const mangal = calculateMangalDosha(chart);
  const kaalSarp = calculateKaalSarpDosha(chart);
  const pitra = calculatePitraDosha(chart);
  const sadeSati = calculateSadeSati(chart);

  return {
    summary: {
      mangal: mangal.canceled ? 'canceled' : (mangal.present ? 'present' : 'absent'),
      mangalSeverity: mangal.severity || undefined,
      kaalSarp: kaalSarp.present ? 'present' : 'absent',
      kaalSarpType: kaalSarp.type || undefined,
      pitra: pitra.present ? 'present' : 'absent',
      shaniSadeSati: sadeSati.active ? 'active' : 'inactive',
      shaniPhase: sadeSati.phase || undefined,
    },
    details: {
      mangal: {
        triggeredBy: mangal.triggeredBy,
        placements: mangal.placements,
        notes: mangal.notes,
        explanation: getMangalExplanation(mangal),
        remedies: getMangalRemedies(mangal),
      },
      kaalSarp: {
        triggeredBy: kaalSarp.triggeredBy,
        placements: kaalSarp.placements,
        notes: kaalSarp.notes,
        explanation: getKaalSarpExplanation(kaalSarp),
        remedies: getKaalSarpRemedies(),
      },
      pitra: {
        triggeredBy: pitra.triggeredBy,
        placements: pitra.placements,
        notes: pitra.notes,
        explanation: getPitraExplanation(pitra),
        remedies: getPitraRemedies(),
      },
      sadeSati: {
        triggeredBy: sadeSati.triggeredBy,
        placements: sadeSati.placements,
        notes: sadeSati.notes,
        explanation: getSadeSatiExplanation(sadeSati),
        remedies: getSadeSatiRemedies(),
      },
    },
  };
}

// Explanation generators

function getMangalExplanation(mangal: any): string {
  if (!mangal.present) {
    return 'No Mangal Dosha detected in your chart. Mars is well-placed and does not occupy the traditional dosha-causing houses from Lagna or Moon.';
  }
  if (mangal.canceled) {
    return `Mangal Dosha is present but canceled due to ${mangal.notes.join(', ')}. This significantly reduces negative effects.`;
  }
  return `Mangal Dosha is ${mangal.severity} in your chart. Mars occupies ${mangal.triggeredBy.join(' and ')}. This may indicate strong will and determination, which requires conscious channeling.`;
}

function getKaalSarpExplanation(kaalSarp: any): string {
  if (!kaalSarp.present) {
    return 'No Kaal Sarp Dosha detected. Your planets are distributed on both sides of the Rahu-Ketu axis.';
  }
  return `Kaal Sarp Dosha (${kaalSarp.type} type) is present. All seven planets are positioned between Rahu and Ketu, creating a specific karmic pattern that may manifest as intense life experiences and transformation.`;
}

function getPitraExplanation(pitra: any): string {
  if (!pitra.present) {
    return 'No Pitra Dosha indicators detected in your chart.';
  }
  return `Pitra Dosha indicators are present: ${pitra.triggeredBy.join(', ')}. This suggests the importance of honoring ancestral connections and performing remedial rituals.`;
}

function getSadeSatiExplanation(sadeSati: any): string {
  if (!sadeSati.active) {
    return 'You are not currently in Sade Sati period. Saturn is not transiting the 12th, 1st, or 2nd house from your natal Moon.';
  }
  return `Sade Sati is active (Phase ${sadeSati.phase}). ${sadeSati.notes[0]}. This 7.5-year period brings lessons in discipline, responsibility, and spiritual growth.`;
}

// Remedy generators

function getMangalRemedies(mangal: any): string[] {
  if (!mangal.present) return [];
  
  return [
    'Recite Hanuman Chalisa daily, especially on Tuesdays',
    'Fast on Tuesdays and consume only toor dal (split pigeon peas)',
    'Donate red lentils, red clothes, or copper items on Tuesdays',
    'Practice patience and anger management techniques',
    'Strengthen Mars through physical exercise and sports',
  ];
}

function getKaalSarpRemedies(): string[] {
  return [
    'Visit Trimbakeshwar or other Kaal Sarp temples for specific puja',
    'Recite Maha Mrityunjaya Mantra 108 times daily',
    'Perform Rahu-Ketu remedies as advised by a qualified astrologer',
    'Practice meditation to calm the mind and reduce anxiety',
    'Serve and feed stray animals, especially dogs',
  ];
}

function getPitraRemedies(): string[] {
  return [
    'Perform Shraddha ceremony on appropriate tithis',
    'Feed brahmins and the needy on amavasya (new moon)',
    'Offer water to banyan tree with prayers for ancestors',
    'Recite Pitra Gayatri mantra',
    'Help elderly people and show respect to elders',
  ];
}

function getSadeSatiRemedies(): string[] {
  return [
    'Recite Shani mantra: "Om Sham Shanaishcharaya Namah" 108 times',
    'Light a mustard oil lamp under a Peepal tree on Saturdays',
    'Feed black sesame seeds and black urad dal to birds on Saturdays',
    'Practice discipline, hard work, and service to others',
    'Donate black items (blankets, shoes, iron) to the needy',
  ];
}

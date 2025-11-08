/**
 * Additional Dosha calculations ("Other Doshas")
 * Backward-compatible extension to main dosha calculator
 */

// Orb configuration
const DOSHA_CONFIG = {
  orb: {
    tight: 6,  // For Moon pairs
    standard: 8, // For most conjunctions
  }
};

// Helper: calculate conjunction distance
function getConjunctionDistance(lon1: number, lon2: number): number {
  const diff = Math.abs(lon1 - lon2);
  return Math.min(diff, 360 - diff);
}

// Helper: get nakshatra from longitude
const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Moola', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

const GANDMOOL_NAKSHATRAS = ['Ashwini', 'Ashlesha', 'Magha', 'Jyeshtha', 'Moola', 'Revati'];

function getNakshatra(lon: number): string {
  const normalizedLon = ((lon % 360) + 360) % 360;
  const nakshatraIndex = Math.floor(normalizedLon / (360 / 27));
  return NAKSHATRAS[nakshatraIndex];
}

/**
 * A) Rahu–Ketu / Grahan Dosha
 * Rule: Sun or Moon within ≤8° of Rahu or Ketu
 */
export function calculateGrahanDosha(chart: any) {
  const sun = chart.grahas.Sun;
  const moon = chart.grahas.Moon;
  const rahu = chart.grahas.Rahu;
  const ketu = chart.grahas.Ketu;

  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  // Check Sun-Rahu
  const sunRahuDist = getConjunctionDistance(sun.lon, rahu.lon);
  if (sunRahuDist <= DOSHA_CONFIG.orb.standard) {
    triggeredBy.push('Sun-Rahu conjunction');
    placements.push(`Sun ${sun.sign} ${sun.deg.toFixed(1)}°; Rahu ${rahu.sign} ${rahu.deg.toFixed(1)}°; Δ=${sunRahuDist.toFixed(1)}°`);
  }

  // Check Sun-Ketu
  const sunKetuDist = getConjunctionDistance(sun.lon, ketu.lon);
  if (sunKetuDist <= DOSHA_CONFIG.orb.standard) {
    triggeredBy.push('Sun-Ketu conjunction');
    placements.push(`Sun ${sun.sign} ${sun.deg.toFixed(1)}°; Ketu ${ketu.sign} ${ketu.deg.toFixed(1)}°; Δ=${sunKetuDist.toFixed(1)}°`);
  }

  // Check Moon-Rahu
  const moonRahuDist = getConjunctionDistance(moon.lon, rahu.lon);
  if (moonRahuDist <= DOSHA_CONFIG.orb.standard) {
    triggeredBy.push('Moon-Rahu conjunction');
    placements.push(`Moon ${moon.sign} ${moon.deg.toFixed(1)}°; Rahu ${rahu.sign} ${rahu.deg.toFixed(1)}°; Δ=${moonRahuDist.toFixed(1)}°`);
  }

  // Check Moon-Ketu
  const moonKetuDist = getConjunctionDistance(moon.lon, ketu.lon);
  if (moonKetuDist <= DOSHA_CONFIG.orb.standard) {
    triggeredBy.push('Moon-Ketu conjunction');
    placements.push(`Moon ${moon.sign} ${moon.deg.toFixed(1)}°; Ketu ${ketu.sign} ${ketu.deg.toFixed(1)}°; Δ=${moonKetuDist.toFixed(1)}°`);
  }

  // Determine severity
  let severity: string | null = null;
  let subtype: string | undefined;
  const hasSun = triggeredBy.some(t => t.includes('Sun'));
  const hasMoon = triggeredBy.some(t => t.includes('Moon'));
  
  if (hasSun && hasMoon) {
    severity = 'strong';
    subtype = 'both';
  } else if (hasMoon) {
    severity = 'moderate';
    subtype = 'rahu-chandra';
  } else if (hasSun) {
    severity = 'mild';
    subtype = 'rahu-surya';
  }

  return {
    present: triggeredBy.length > 0 ? 'present' : 'absent',
    severity,
    subtype,
    triggeredBy,
    placements,
    notes,
    explanation: triggeredBy.length > 0 
      ? `Grahan Dosha (${severity}) detected: ${triggeredBy.join(', ')}`
      : 'No Grahan Dosha detected.',
    remedies: triggeredBy.length > 0 
      ? ['Mindfulness, stable routines, breath practices.', 'Charity on eclipse-related days; light devotional worship.']
      : []
  };
}

/**
 * B) Shrapit Dosha (Saturn–Rahu)
 */
export function calculateShrapitDosha(chart: any) {
  const saturn = chart.grahas.Saturn;
  const rahu = chart.grahas.Rahu;

  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  const saturnRahuDist = getConjunctionDistance(saturn.lon, rahu.lon);
  
  if (saturnRahuDist <= DOSHA_CONFIG.orb.standard) {
    triggeredBy.push('Saturn-Rahu conjunction');
    placements.push(`Saturn ${saturn.sign} ${saturn.deg.toFixed(1)}°; Rahu ${rahu.sign} ${rahu.deg.toFixed(1)}°; Δ=${saturnRahuDist.toFixed(1)}°`);
  }

  return {
    present: triggeredBy.length > 0 ? 'present' : 'absent',
    triggeredBy,
    placements,
    notes,
    explanation: triggeredBy.length > 0
      ? 'Shrapit Dosha detected: Saturn and Rahu conjunction.'
      : 'No Shrapit Dosha detected.',
    remedies: triggeredBy.length > 0
      ? ['Saturday discipline; service and humility.', 'Rudrabhishek / Shani-focused prayers.']
      : []
  };
}

/**
 * C) Guru Chandal Dosha (Jupiter–Rahu/Ketu)
 */
export function calculateGuruChandalDosha(chart: any) {
  const jupiter = chart.grahas.Jupiter;
  const rahu = chart.grahas.Rahu;
  const ketu = chart.grahas.Ketu;

  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  const jupiterRahuDist = getConjunctionDistance(jupiter.lon, rahu.lon);
  if (jupiterRahuDist <= DOSHA_CONFIG.orb.standard) {
    triggeredBy.push('Jupiter-Rahu conjunction');
    placements.push(`Jupiter ${jupiter.sign} ${jupiter.deg.toFixed(1)}°; Rahu ${rahu.sign} ${rahu.deg.toFixed(1)}°; Δ=${jupiterRahuDist.toFixed(1)}°`);
  }

  const jupiterKetuDist = getConjunctionDistance(jupiter.lon, ketu.lon);
  if (jupiterKetuDist <= DOSHA_CONFIG.orb.standard) {
    triggeredBy.push('Jupiter-Ketu conjunction');
    placements.push(`Jupiter ${jupiter.sign} ${jupiter.deg.toFixed(1)}°; Ketu ${ketu.sign} ${ketu.deg.toFixed(1)}°; Δ=${jupiterKetuDist.toFixed(1)}°`);
  }

  return {
    present: triggeredBy.length > 0 ? 'present' : 'absent',
    triggeredBy,
    placements,
    notes,
    explanation: triggeredBy.length > 0
      ? `Guru Chandal Dosha detected: ${triggeredBy.join(', ')}`
      : 'No Guru Chandal Dosha detected.',
    remedies: triggeredBy.length > 0
      ? ['Study with grounded mentors; donation of knowledge/education items.', 'Guru-focused prayers.']
      : []
  };
}

/**
 * D) Punarphoo Dosha (Saturn–Moon)
 */
export function calculatePunarphooDosha(chart: any) {
  const moon = chart.grahas.Moon;
  const saturn = chart.grahas.Saturn;

  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  const moonSaturnDist = getConjunctionDistance(moon.lon, saturn.lon);
  
  if (moonSaturnDist <= DOSHA_CONFIG.orb.tight) {
    triggeredBy.push('Moon-Saturn conjunction');
    placements.push(`Moon ${moon.sign} ${moon.deg.toFixed(1)}°; Saturn ${saturn.sign} ${saturn.deg.toFixed(1)}°; Δ=${moonSaturnDist.toFixed(1)}°`);
  }

  return {
    present: triggeredBy.length > 0 ? 'present' : 'absent',
    triggeredBy,
    placements,
    notes,
    explanation: triggeredBy.length > 0
      ? 'Punarphoo Dosha detected: Moon-Saturn conjunction.'
      : 'No Punarphoo Dosha detected.',
    remedies: triggeredBy.length > 0
      ? ['Monday calm practices; moon-soothing disciplines.', 'Chandra–Shani pacification prayers.']
      : []
  };
}

/**
 * E) Kemadruma Yoga (Moon isolated)
 */
export function calculateKemadrumaYoga(chart: any) {
  const moon = chart.grahas.Moon;
  const moonSign = Math.floor(moon.lon / 30);
  
  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  // Get adjacent signs (2nd and 12th from Moon)
  const prevSign = (moonSign - 1 + 12) % 12;
  const nextSign = (moonSign + 1) % 12;

  // Check for planets (exclude Rahu/Ketu) in adjacent signs
  const planets = ['Sun', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'];
  let hasNeighbor = false;

  for (const planetName of planets) {
    const planet = chart.grahas[planetName];
    const planetSign = Math.floor(planet.lon / 30);
    
    if (planetSign === prevSign || planetSign === nextSign) {
      hasNeighbor = true;
      notes.push(`${planetName} in adjacent sign (${planet.sign})`);
      break;
    }
  }

  if (!hasNeighbor) {
    triggeredBy.push('Moon isolated (no planets in adjacent signs)');
    placements.push(`Moon in ${moon.sign} with empty neighboring signs`);
  }

  // Check cancellations
  const moonSignPlanets = planets.filter(p => Math.floor(chart.grahas[p].lon / 30) === moonSign);
  if (moonSignPlanets.length > 0 && !hasNeighbor) {
    notes.push(`Partial cancellation: ${moonSignPlanets.join(', ')} with Moon`);
  }

  return {
    present: !hasNeighbor ? 'present' : 'absent',
    triggeredBy,
    placements,
    notes,
    explanation: !hasNeighbor
      ? 'Kemadruma Yoga present: Moon isolated without planetary neighbors.'
      : 'No Kemadruma Yoga detected.',
    remedies: !hasNeighbor
      ? ['Community seva; gratitude and consistency rituals.', 'Chandra pacification; Navagraha Shanti.']
      : []
  };
}

/**
 * F) Gandmool Dosha (Moon in specific nakshatras)
 */
export function calculateGandmoolDosha(chart: any) {
  const moon = chart.grahas.Moon;
  const nakshatra = getNakshatra(moon.lon);

  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  if (GANDMOOL_NAKSHATRAS.includes(nakshatra)) {
    triggeredBy.push(`Moon in ${nakshatra} nakshatra`);
    placements.push(`Moon ${moon.sign} ${moon.deg.toFixed(1)}° (${nakshatra})`);
    notes.push(`Gandmool nakshatra: ${nakshatra}`);
  }

  return {
    present: triggeredBy.length > 0 ? 'present' : 'absent',
    nakshatra,
    triggeredBy,
    placements,
    notes,
    explanation: triggeredBy.length > 0
      ? `Gandmool Dosha detected: Moon in ${nakshatra} nakshatra.`
      : 'No Gandmool Dosha detected.',
    remedies: triggeredBy.length > 0
      ? ['Gandmool Shanti with family blessings.']
      : []
  };
}

/**
 * G) Kalathra Dosha (7th house/partner)
 * Needs Lagna (birth time)
 */
export function calculateKalathraDosh(chart: any) {
  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  // Check if birth time is known
  if (!chart.ascendant || !chart.houses || chart.houses.length === 0) {
    return {
      present: 'partial',
      triggeredBy: [],
      placements: [],
      notes: ['Birth time required for house-based checks'],
      explanation: 'Birth time unknown - cannot fully calculate Kalathra Dosha.',
      remedies: []
    };
  }

  const malefics = ['Mars', 'Saturn', 'Rahu', 'Ketu'];
  const venus = chart.grahas.Venus;

  // Check 7th house for malefics
  for (const maleficName of malefics) {
    const malefic = chart.grahas[maleficName];
    if (malefic.house === 7) {
      triggeredBy.push(`${maleficName} in 7th house`);
      placements.push(`${maleficName} in 7th house (${malefic.sign})`);
    }
  }

  // Check Venus conjunctions with malefics
  for (const maleficName of malefics) {
    const malefic = chart.grahas[maleficName];
    const dist = getConjunctionDistance(venus.lon, malefic.lon);
    if (dist <= DOSHA_CONFIG.orb.standard) {
      triggeredBy.push(`Venus-${maleficName} conjunction`);
      placements.push(`Venus ${venus.sign} ${venus.deg.toFixed(1)}°; ${maleficName} ${malefic.sign} ${malefic.deg.toFixed(1)}°; Δ=${dist.toFixed(1)}°`);
    }
  }

  return {
    present: triggeredBy.length > 0 ? 'present' : 'absent',
    triggeredBy,
    placements,
    notes,
    explanation: triggeredBy.length > 0
      ? `Kalathra Dosha detected: ${triggeredBy.join(', ')}`
      : 'No Kalathra Dosha detected.',
    remedies: triggeredBy.length > 0
      ? ['Friday harmony practices; counseling/mediation mindset.', 'Venus pacification where appropriate.']
      : []
  };
}

/**
 * H) Vish/Daridra Yoga (Mars–Saturn)
 */
export function calculateVishDaridraYoga(chart: any) {
  const mars = chart.grahas.Mars;
  const saturn = chart.grahas.Saturn;

  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  const marsSaturnDist = getConjunctionDistance(mars.lon, saturn.lon);
  
  if (marsSaturnDist <= DOSHA_CONFIG.orb.standard) {
    triggeredBy.push('Mars-Saturn conjunction');
    placements.push(`Mars ${mars.sign} ${mars.deg.toFixed(1)}°; Saturn ${saturn.sign} ${saturn.deg.toFixed(1)}°; Δ=${marsSaturnDist.toFixed(1)}°`);
  }

  return {
    present: triggeredBy.length > 0 ? 'present' : 'absent',
    triggeredBy,
    placements,
    notes,
    explanation: triggeredBy.length > 0
      ? 'Vish/Daridra Yoga detected: Mars-Saturn conjunction.'
      : 'No Vish/Daridra Yoga detected.',
    remedies: triggeredBy.length > 0
      ? ['Structured effort; conflict-avoidance sadhana.', 'Hanuman devotion; Navagraha Shanti.']
      : []
  };
}

/**
 * I) Ketu/Naga (Sarpa) Dosha
 */
export function calculateKetuNagaDosha(chart: any) {
  const ketu = chart.grahas.Ketu;
  const moon = chart.grahas.Moon;
  const venus = chart.grahas.Venus;

  const triggeredBy: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  // Rule A: Ketu-Moon or Ketu-Venus conjunction
  const ketuMoonDist = getConjunctionDistance(ketu.lon, moon.lon);
  if (ketuMoonDist <= DOSHA_CONFIG.orb.standard) {
    triggeredBy.push('Ketu-Moon conjunction');
    placements.push(`Ketu ${ketu.sign} ${ketu.deg.toFixed(1)}°; Moon ${moon.sign} ${moon.deg.toFixed(1)}°; Δ=${ketuMoonDist.toFixed(1)}°`);
  }

  const ketuVenusDist = getConjunctionDistance(ketu.lon, venus.lon);
  if (ketuVenusDist <= DOSHA_CONFIG.orb.standard) {
    triggeredBy.push('Ketu-Venus conjunction');
    placements.push(`Ketu ${ketu.sign} ${ketu.deg.toFixed(1)}°; Venus ${venus.sign} ${venus.deg.toFixed(1)}°; Δ=${ketuVenusDist.toFixed(1)}°`);
  }

  // Rule B: Ketu in house 1 or 8 (needs birth time)
  if (chart.ascendant && chart.houses && chart.houses.length > 0) {
    if (ketu.house === 1 || ketu.house === 8) {
      triggeredBy.push(`Ketu in ${ketu.house}${ketu.house === 1 ? 'st' : 'th'} house`);
      placements.push(`Ketu in ${ketu.house}${ketu.house === 1 ? 'st' : 'th'} house (${ketu.sign})`);
    }
  } else if (triggeredBy.length === 0) {
    // If no conjunction and no birth time, mark as partial
    return {
      present: 'partial',
      triggeredBy: [],
      placements: [],
      notes: ['Birth time required for complete house-based checks'],
      explanation: 'Birth time unknown - partial Ketu/Naga Dosha check only.',
      remedies: []
    };
  }

  return {
    present: triggeredBy.length > 0 ? 'present' : 'absent',
    triggeredBy,
    placements,
    notes,
    explanation: triggeredBy.length > 0
      ? `Ketu/Naga Dosha detected: ${triggeredBy.join(', ')}`
      : 'No Ketu/Naga Dosha detected.',
    remedies: triggeredBy.length > 0
      ? ['Naga devotion where traditional; steady devotional routines.']
      : []
  };
}

// Rahu-Surya Dosha (subset of Grahan, Sun-Rahu alignment)
export function checkRahuSuryaDosha(chart: any): any {
  const sun = chart.grahas.Sun;
  const rahu = chart.grahas.Rahu;

  if (!sun || !rahu) {
    return { summary: 'absent', details: null };
  }

  const diff = getConjunctionDistance(sun.lon, rahu.lon);
  const present = diff <= DOSHA_CONFIG.orb.standard;
  const strong = diff <= 3;

  return {
    summary: present ? 'present' : 'absent',
    details: present ? {
      triggeredBy: ['Sun–Rahu conjunction'],
      placements: [
        `Sun at ${sun.lon.toFixed(2)}° in ${sun.sign}`,
        `Rahu at ${rahu.lon.toFixed(2)}° in ${rahu.sign}`,
        `Δ = ${diff.toFixed(2)}°`
      ],
      notes: strong ? ['Very tight conjunction (≤3°); strong influence.'] : [],
      explanation: 'Sun closely aligned with Rahu creates an eclipse pattern affecting pride, ego, and recognition.',
      remedies: [
        'Humility practices; steady routine over hype.',
        'Sunday charity or Surya-focused devotion.',
        'Mindfulness around visibility and ego triggers.'
      ]
    } : null
  };
}

// Naag (Naga/Sarpa) Dosha - General serpent dosha patterns
export function checkNaagDosha(chart: any): any {
  const ketu = chart.grahas.Ketu;
  const rahu = chart.grahas.Rahu;
  const moon = chart.grahas.Moon;

  if (!ketu || !rahu || !moon) {
    return { summary: 'absent', details: null };
  }

  const triggers: string[] = [];
  const placements: string[] = [];
  const notes: string[] = [];

  // Rule A: Ketu closely conjunct Moon (no time needed)
  const ketuMoonDiff = getConjunctionDistance(ketu.lon, moon.lon);
  if (ketuMoonDiff <= DOSHA_CONFIG.orb.standard) {
    triggers.push('Ketu–Moon conjunction');
    placements.push(
      `Ketu at ${ketu.lon.toFixed(2)}° in ${ketu.sign}`,
      `Moon at ${moon.lon.toFixed(2)}° in ${moon.sign}`,
      `Δ = ${ketuMoonDiff.toFixed(2)}°`
    );
  }

  // Rule B: Rahu-Ketu axis afflicting 1st or 8th house (needs Lagna)
  if (chart.ascendant && ketu.house && rahu.house) {
    if (rahu.house === 1 || rahu.house === 8 || ketu.house === 1 || ketu.house === 8) {
      triggers.push('Rahu/Ketu in house 1 or 8');
      if (rahu.house) placements.push(`Rahu in house ${rahu.house}`);
      if (ketu.house) placements.push(`Ketu in house ${ketu.house}`);
    }
  } else if (triggers.length === 0) {
    notes.push('Birth time required for complete house-based checks.');
  }

  const present = triggers.length > 0;

  return {
    summary: present ? 'present' : (notes.length > 0 ? 'partial' : 'absent'),
    details: present || notes.length > 0 ? {
      triggeredBy: triggers,
      placements,
      notes,
      explanation: 'Serpent (Naga) dosha patterns involving Rahu/Ketu create karmic themes around detachment, spirituality, and ancestral influences.',
      remedies: [
        'Naga devotion where traditional; serpent deity worship.',
        'Steady devotional routines; detachment practices.',
        'Ancestral healing rituals where appropriate.'
      ]
    } : null
  };
}

/**
 * J) Navagraha Shanti (umbrella suggestion)
 * Rule: If ≥2 minor doshas are present, suggest umbrella pacification
 */
export function calculateNavagrahaUmbrella(doshas: any) {
  const presentDoshas = Object.values(doshas).filter((d: any) => 
    d && (d.present === 'present' || d.present === true)
  );

  const present = presentDoshas.length >= 2 ? 'suggested' : 'not_suggested';

  return {
    present,
    triggeredBy: present === 'suggested' ? ['Multiple minor doshas detected'] : [],
    placements: [],
    notes: present === 'suggested' 
      ? [`${presentDoshas.length} doshas detected; balanced pacification recommended.`]
      : [],
    explanation: present === 'suggested'
      ? 'Multiple minor planetary stresses suggest balanced Navagraha Shanti for comprehensive relief.'
      : 'No need for umbrella pacification.',
    remedies: present === 'suggested'
      ? ['Balanced discipline; regular simple worship.', 'Navagraha Shanti puja for comprehensive pacification.']
      : []
  };
}

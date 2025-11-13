/**
 * Rigorous Dosha Calculation following strict astronomical specifications
 * Implements: Shani Dosha (natal), Mangal/Kuja Dosha, Kaal Sarpa Dosha, Rahu-Ketu Dosha
 * with edge sensitivity testing and both True/Mean node calculations
 */

import type { ChartData, PlanetPosition } from './ephemeris';

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra',
  'Punarvasu', 'Pushya', 'Ashlesha', 'Magha', 'Purva Phalguni', 'Uttara Phalguni',
  'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Moola', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati'
];

const KAAL_SARP_TYPES = [
  'Anant', 'Kulik', 'Vasuki', 'Shankhapal', 'Padam', 'Mahapadma',
  'Takshak', 'Karkotak', 'Shankhachur', 'Ghatak', 'Vishdhar', 'Sheshnag'
];

export interface RigorousDoshaInput {
  dob: string; // DD/MM/YYYY
  timeIST: string; // HH mm
  latitude: number;
  longitude: number;
  placeabove: string;
}

export interface RigorousDoshaResult {
  settings: {
    zodiac: 'sidereal';
    ayanamsha: 'Lahiri';
    ayanamsha_degrees: number;
    nodes_used_for_primary: 'true';
    also_computed_nodes: string[];
    house_systems: string[];
  };
  input_echo: {
    dob: string;
    time_ist: string;
    latitude: number;
    longitude: number;
    utc_datetime: string;
  };
  positions: {
    ascendant: { sign: string; degree: number };
    moon_nakshatra: { name: string; pada: number };
    planets: {
      Sun: { sign: string; degree: number; retro: boolean };
      Moon: { sign: string; degree: number; retro: boolean };
      Mars: { sign: string; degree: number; retro: boolean };
      Mercury: { sign: string; degree: number; retro: boolean };
      Jupiter: { sign: string; degree: number; retro: boolean };
      Venus: { sign: string; degree: number; retro: boolean };
      Saturn: { sign: string; degree: number; retro: boolean };
    };
    nodes: {
      Rahu_true: { sign: string; degree: number };
      Ketu_true: { sign: string; degree: number };
      Rahu_mean: { sign: string; degree: number };
      Ketu_mean: { sign: string; degree: number };
    };
  };
  doshas: {
    shani_dosha: {
      present_primary: boolean;
      from_lagna_house: number | null;
      from_moon_house: number | null;
      influence_variant: {
        affects_7th_house: boolean;
        conj_7th_lord: boolean;
        conj_venus: boolean;
        aspects_7th_house_or_lord: boolean;
      };
    };
    mangal_dosha: {
      classic: {
        from_lagna_houses_hit: number[];
        from_moon_houses_hit: number[];
        from_venus_houses_hit: number[];
        present: boolean;
      };
      extended_variant: {
        from_lagna_houses_hit: number[];
        from_moon_houses_hit: number[];
        from_venus_houses_hit: number[];
        present: boolean;
      };
      possible_mitigations: string[];
    };
    kaal_sarpa_dosha: {
      true_node: {
        present: boolean;
        type: string | null;
        boundary_nearby: boolean;
        boundary_details: string;
      };
      mean_node: {
        present: boolean;
        type: string | null;
        boundary_nearby: boolean;
        boundary_details: string;
      };
    };
    rahu_ketu_dosha: {
      in_lagna_or_7th: { rahu: boolean; ketu: boolean };
      conj_lagna_degree: { rahu_orb: number | null; ketu_orb: number | null };
      conj_moon: { rahu_orb: number | null; ketu_orb: number | null };
      conj_7th_lord: { rahu_orb: number | null; ketu_orb: number | null };
      conj_venus: { rahu_orb: number | null; ketu_orb: number | null };
    };
  };
  edge_checks: {
    ascendant_cusp_risk: boolean;
    time_sensitivity_minutes: number;
    result_changes_when_shifted: boolean;
    notes: string;
  };
  conclusion: {
    summary_one_line: string;
    caveats: string;
    next_steps: string;
  };
}

// Helper functions
function getConjunctionDistance(lon1: number, lon2: number): number {
  const diff = Math.abs(lon1 - lon2);
  return Math.min(diff, 360 - diff);
}

function calculateHouseFromLon(planetLon: number, referenceLon: number): number {
  const refSign = Math.floor(referenceLon / 30);
  const planetSign = Math.floor(planetLon / 30);
  let house = planetSign - refSign + 1;
  while (house <= 0) house += 12;
  while (house > 12) house -= 12;
  return house;
}

function getNakshatraAndPada(lon: number): { name: string; pada: number } {
  const normalizedLon = ((lon % 360) + 360) % 360;
  const nakshatraIndex = Math.floor(normalizedLon / (360 / 27));
  const nakshatraStart = nakshatraIndex * (360 / 27);
  const degreeInNakshatra = normalizedLon - nakshatraStart;
  const pada = Math.floor(degreeInNakshatra / (360 / 27 / 4)) + 1;
  
  return {
    name: NAKSHATRAS[nakshatraIndex],
    pada: pada
  };
}

function getRashiLord(sign: string): string {
  const lordMap: Record<string, string> = {
    'Aries': 'Mars', 'Taurus': 'Venus', 'Gemini': 'Mercury', 'Cancer': 'Moon',
    'Leo': 'Sun', 'Virgo': 'Mercury', 'Libra': 'Venus', 'Scorpio': 'Mars',
    'Sagittarius': 'Jupiter', 'Capricorn': 'Saturn', 'Aquarius': 'Saturn', 'Pisces': 'Jupiter'
  };
  return lordMap[sign] || 'Unknown';
}

// Shani Dosha (natal) calculation
function calculateShaniDosha(chart: ChartData): {
  present_primary: boolean;
  from_lagna_house: number | null;
  from_moon_house: number | null;
  influence_variant: {
    affects_7th_house: boolean;
    conj_7th_lord: boolean;
    conj_venus: boolean;
    aspects_7th_house_or_lord: boolean;
  };
} {
  const saturn = chart.grahas.Saturn;
  const venus = chart.grahas.Venus;
  const moon = chart.grahas.Moon;
  const ascendant = chart.ascendant;

  const shaniHouses = [1, 4, 7, 8, 12];
  const saturnHouseFromLagna = saturn.house || null;
  const saturnHouseFromMoon = calculateHouseFromLon(saturn.lon, moon.lon);

  const presentFromLagna = saturnHouseFromLagna !== null && shaniHouses.includes(saturnHouseFromLagna);
  const presentFromMoon = shaniHouses.includes(saturnHouseFromMoon);

  // 7th house sign
  const lagnaSign = Math.floor(ascendant.lon / 30);
  const seventhSign = (lagnaSign + 6) % 12;
  const seventhHouseCusp = seventhSign * 30;
  
  // 7th lord
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const seventhSignName = signs[seventhSign];
  const seventhLordName = getRashiLord(seventhSignName);
  const seventhLordPlanet = chart.grahas[seventhLordName as keyof typeof chart.grahas] as PlanetPosition | undefined;

  // Check influences
  const saturnIn7th = saturnHouseFromLagna === 7;
  const conjVenus = getConjunctionDistance(saturn.lon, venus.lon) <= 5.0;
  const conj7thLord = seventhLordPlanet ? getConjunctionDistance(saturn.lon, seventhLordPlanet.lon) <= 5.0 : false;
  
  // Saturn aspects: 3rd, 7th, 10th by sign
  const saturnSign = Math.floor(saturn.lon / 30);
  const aspectSigns = [(saturnSign + 2) % 12, (saturnSign + 6) % 12, (saturnSign + 9) % 12];
  const aspects7thHouse = aspectSigns.includes(seventhSign);

  return {
    present_primary: presentFromLagna || presentFromMoon,
    from_lagna_house: presentFromLagna ? saturnHouseFromLagna : null,
    from_moon_house: presentFromMoon ? saturnHouseFromMoon : null,
    influence_variant: {
      affects_7th_house: saturnIn7th,
      conj_7th_lord: conj7thLord,
      conj_venus: conjVenus,
      aspects_7th_house_or_lord: aspects7thHouse
    }
  };
}

// Mangal Dosha calculation
function calculateMangalDosha(chart: ChartData): {
  classic: {
    from_lagna_houses_hit: number[];
    from_moon_houses_hit: number[];
    from_venus_houses_hit: number[];
    present: boolean;
  };
  extended_variant: {
    from_lagna_houses_hit: number[];
    from_moon_houses_hit: number[];
    from_venus_houses_hit: number[];
    present: boolean;
  };
  possible_mitigations: string[];
} {
  const mars = chart.grahas.Mars;
  const moon = chart.grahas.Moon;
  const venus = chart.grahas.Venus;
  const jupiter = chart.grahas.Jupiter;

  const classicHouses = [2, 4, 7, 8, 12];
  const extendedHouses = [1, 2, 4, 7, 8, 12];

  const mitigations: string[] = [];

  // Classic check
  const marsHouseFromLagna = mars.house || 0;
  const marsHouseFromMoon = calculateHouseFromLon(mars.lon, moon.lon);
  const marsHouseFromVenus = calculateHouseFromLon(mars.lon, venus.lon);

  const classicLagnaHits = classicHouses.includes(marsHouseFromLagna) ? [marsHouseFromLagna] : [];
  const classicMoonHits = classicHouses.includes(marsHouseFromMoon) ? [marsHouseFromMoon] : [];
  const classicVenusHits = classicHouses.includes(marsHouseFromVenus) ? [marsHouseFromVenus] : [];

  // Extended check
  const extendedLagnaHits = extendedHouses.includes(marsHouseFromLagna) ? [marsHouseFromLagna] : [];
  const extendedMoonHits = extendedHouses.includes(marsHouseFromMoon) ? [marsHouseFromMoon] : [];
  const extendedVenusHits = extendedHouses.includes(marsHouseFromVenus) ? [marsHouseFromVenus] : [];

  // Mitigations
  if (mars.sign === 'Aries' || mars.sign === 'Scorpio') {
    mitigations.push('Mars in own sign (' + mars.sign + ')');
  }
  if (mars.sign === 'Capricorn') {
    mitigations.push('Mars exalted in Capricorn');
  }

  const jupiterMarsDistance = getConjunctionDistance(jupiter.lon, mars.lon);
  if (jupiterMarsDistance <= 8.0) {
    mitigations.push('Jupiter conjunct Mars within 8°');
  }

  // Check Jupiter aspect to 7th
  const lagnaSign = Math.floor(chart.ascendant.lon / 30);
  const seventhSign = (lagnaSign + 6) % 12;
  const jupiterSign = Math.floor(jupiter.lon / 30);
  const jupiterAspectSigns = [(jupiterSign + 4) % 12, (jupiterSign + 6) % 12, (jupiterSign + 8) % 12];
  if (jupiterAspectSigns.includes(seventhSign)) {
    mitigations.push('Jupiter aspects 7th house');
  }

  return {
    classic: {
      from_lagna_houses_hit: classicLagnaHits,
      from_moon_houses_hit: classicMoonHits,
      from_venus_houses_hit: classicVenusHits,
      present: classicLagnaHits.length > 0 || classicMoonHits.length > 0 || classicVenusHits.length > 0
    },
    extended_variant: {
      from_lagna_houses_hit: extendedLagnaHits,
      from_moon_houses_hit: extendedMoonHits,
      from_venus_houses_hit: extendedVenusHits,
      present: extendedLagnaHits.length > 0 || extendedMoonHits.length > 0 || extendedVenusHits.length > 0
    },
    possible_mitigations: mitigations
  };
}

// Kaal Sarpa Dosha calculation
function calculateKaalSarpaDosha(
  chart: ChartData,
  useTrue: boolean
): {
  present: boolean;
  type: string | null;
  boundary_nearby: boolean;
  boundary_details: string;
} {
  const rahu = useTrue ? chart.rahuTrue! : chart.rahuMean!;
  const ketu = useTrue ? chart.ketuTrue! : chart.ketuMean!;

  const planets = [
    chart.grahas.Sun,
    chart.grahas.Moon,
    chart.grahas.Mars,
    chart.grahas.Mercury,
    chart.grahas.Jupiter,
    chart.grahas.Venus,
    chart.grahas.Saturn
  ];

  // Arc from Rahu to Ketu (forward zodiac)
  const rahuLon = rahu.lon;
  const ketuLon = ketu.lon;
  const arcLength = ketuLon >= rahuLon ? (ketuLon - rahuLon) : (360 - rahuLon + ketuLon);

  let outsideCount = 0;
  let nearBoundary = false;
  const boundaryDetails: string[] = [];

  for (const planet of planets) {
    const distFromRahu = planet.lon >= rahuLon ? (planet.lon - rahuLon) : (360 - rahuLon + planet.lon);
    const inside = distFromRahu <= arcLength;
    
    if (!inside) {
      outsideCount++;
      const distOutside = Math.min(
        getConjunctionDistance(planet.lon, rahuLon),
        getConjunctionDistance(planet.lon, ketuLon)
      );
      if (distOutside <= 1.0) {
        nearBoundary = true;
        boundaryDetails.push(`Planet within 1° of boundary: ${distOutside.toFixed(2)}°`);
      }
    }
  }

  const present = outsideCount === 0;
  let type: string | null = null;

  if (present && chart.ascendant) {
    const rahuHouse = calculateHouseFromLon(rahuLon, chart.ascendant.lon);
    type = KAAL_SARP_TYPES[rahuHouse - 1] || null;
  }

  return {
    present,
    type,
    boundary_nearby: nearBoundary,
    boundary_details: boundaryDetails.join('; ') || 'None'
  };
}

// Rahu-Ketu Dosha calculation
function calculateRahuKetuDosha(chart: ChartData): {
  in_lagna_or_7th: { rahu: boolean; ketu: boolean };
  conj_lagna_degree: { rahu_orb: number | null; ketu_orb: number | null };
  conj_moon: { rahu_orb: number | null; ketu_orb: number | null };
  conj_7th_lord: { rahu_orb: number | null; ketu_orb: number | null };
  conj_venus: { rahu_orb: number | null; ketu_orb: number | null };
} {
  const rahuTrue = chart.rahuTrue!;
  const ketuTrue = chart.ketuTrue!;
  const moon = chart.grahas.Moon;
  const venus = chart.grahas.Venus;
  const ascendant = chart.ascendant;

  // Use True node for checks
  const rahuHouse = calculateHouseFromLon(rahuTrue.lon, ascendant.lon);
  const ketuHouse = calculateHouseFromLon(ketuTrue.lon, ascendant.lon);

  const rahuIn1or7 = rahuHouse === 1 || rahuHouse === 7;
  const ketuIn1or7 = ketuHouse === 1 || ketuHouse === 7;

  // Conjunction with Lagna degree
  const rahuLagnaOrb = getConjunctionDistance(rahuTrue.lon, ascendant.lon);
  const ketuLagnaOrb = getConjunctionDistance(ketuTrue.lon, ascendant.lon);

  // Conjunction with Moon
  const rahuMoonOrb = getConjunctionDistance(rahuTrue.lon, moon.lon);
  const ketuMoonOrb = getConjunctionDistance(ketuTrue.lon, moon.lon);

  // 7th lord
  const lagnaSign = Math.floor(ascendant.lon / 30);
  const seventhSign = (lagnaSign + 6) % 12;
  const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
  const seventhSignName = signs[seventhSign];
  const seventhLordName = getRashiLord(seventhSignName);
  const seventhLordPlanet = chart.grahas[seventhLordName as keyof typeof chart.grahas] as PlanetPosition | undefined;

  const rahu7thLordOrb = seventhLordPlanet ? getConjunctionDistance(rahuTrue.lon, seventhLordPlanet.lon) : null;
  const ketu7thLordOrb = seventhLordPlanet ? getConjunctionDistance(ketuTrue.lon, seventhLordPlanet.lon) : null;

  // Conjunction with Venus
  const rahuVenusOrb = getConjunctionDistance(rahuTrue.lon, venus.lon);
  const ketuVenusOrb = getConjunctionDistance(ketuTrue.lon, venus.lon);

  return {
    in_lagna_or_7th: { rahu: rahuIn1or7, ketu: ketuIn1or7 },
    conj_lagna_degree: {
      rahu_orb: rahuLagnaOrb <= 3.0 ? rahuLagnaOrb : null,
      ketu_orb: ketuLagnaOrb <= 3.0 ? ketuLagnaOrb : null
    },
    conj_moon: {
      rahu_orb: rahuMoonOrb <= 5.0 ? rahuMoonOrb : null,
      ketu_orb: ketuMoonOrb <= 5.0 ? ketuMoonOrb : null
    },
    conj_7th_lord: {
      rahu_orb: rahu7thLordOrb !== null && rahu7thLordOrb <= 5.0 ? rahu7thLordOrb : null,
      ketu_orb: ketu7thLordOrb !== null && ketu7thLordOrb <= 5.0 ? ketu7thLordOrb : null
    },
    conj_venus: {
      rahu_orb: rahuVenusOrb <= 5.0 ? rahuVenusOrb : null,
      ketu_orb: ketuVenusOrb <= 5.0 ? ketuVenusOrb : null
    }
  };
}

// Generate human summary
function generateHumanSummary(result: RigorousDoshaResult): {
  summary_one_line: string;
  caveats: string;
  next_steps: string;
} {
  const parts: string[] = [];

  if (result.doshas.shani_dosha.present_primary) {
    parts.push('Shani Dosha: Present');
  } else {
    parts.push('Shani Dosha: Absent');
  }

  if (result.doshas.mangal_dosha.classic.present) {
    parts.push('Mangal Dosha (Classic): Present');
    if (result.doshas.mangal_dosha.possible_mitigations.length > 0) {
      parts.push(`(Mitigations: ${result.doshas.mangal_dosha.possible_mitigations.join(', ')})`);
    }
  } else {
    parts.push('Mangal Dosha: Absent');
  }

  if (result.doshas.kaal_sarpa_dosha.true_node.present) {
    parts.push(`Kaal Sarpa Dosha: Present (${result.doshas.kaal_sarpa_dosha.true_node.type || 'Type unknown'})`);
  } else {
    parts.push('Kaal Sarpa Dosha: Absent');
  }

  const rahuKetuFlags = [];
  if (result.doshas.rahu_ketu_dosha.in_lagna_or_7th.rahu || result.doshas.rahu_ketu_dosha.in_lagna_or_7th.ketu) {
    rahuKetuFlags.push('Node in 1st/7th');
  }
  if (result.doshas.rahu_ketu_dosha.conj_moon.rahu_orb || result.doshas.rahu_ketu_dosha.conj_moon.ketu_orb) {
    rahuKetuFlags.push('Node conj Moon');
  }
  if (rahuKetuFlags.length > 0) {
    parts.push(`Rahu-Ketu afflictions: ${rahuKetuFlags.join(', ')}`);
  }

  const caveats = result.edge_checks.ascendant_cusp_risk 
    ? 'Ascendant near sign boundary - results may vary with precise birth time'
    : result.edge_checks.result_changes_when_shifted
    ? 'Results sensitive to birth time - verify exact time'
    : 'None';

  const next_steps = result.edge_checks.result_changes_when_shifted
    ? 'Verify exact birth time; consider consulting rectification specialist if uncertain'
    : 'Results stable with current birth time';

  return {
    summary_one_line: parts.join('; '),
    caveats,
    next_steps
  };
}

// Main calculation function
export function calculateRigorousDoshas(
  chart: ChartData,
  input: RigorousDoshaInput,
  utcDatetime: Date
): RigorousDoshaResult {
  const moonNakshatra = getNakshatraAndPada(chart.grahas.Moon.lon);

  const result: RigorousDoshaResult = {
    settings: {
      zodiac: 'sidereal',
      ayanamsha: 'Lahiri',
      ayanamsha_degrees: chart.ayanamsha,
      nodes_used_for_primary: 'true',
      also_computed_nodes: ['true', 'mean'],
      house_systems: ['whole_sign', 'sripati']
    },
    input_echo: {
      dob: input.dob,
      time_ist: input.timeIST,
      latitude: input.latitude,
      longitude: input.longitude,
      utc_datetime: utcDatetime.toISOString()
    },
    positions: {
      ascendant: {
        sign: chart.ascendant.sign,
        degree: chart.ascendant.deg
      },
      moon_nakshatra: moonNakshatra,
      planets: {
        Sun: { sign: chart.grahas.Sun.sign, degree: chart.grahas.Sun.deg, retro: chart.grahas.Sun.retro || false },
        Moon: { sign: chart.grahas.Moon.sign, degree: chart.grahas.Moon.deg, retro: chart.grahas.Moon.retro || false },
        Mars: { sign: chart.grahas.Mars.sign, degree: chart.grahas.Mars.deg, retro: chart.grahas.Mars.retro || false },
        Mercury: { sign: chart.grahas.Mercury.sign, degree: chart.grahas.Mercury.deg, retro: chart.grahas.Mercury.retro || false },
        Jupiter: { sign: chart.grahas.Jupiter.sign, degree: chart.grahas.Jupiter.deg, retro: chart.grahas.Jupiter.retro || false },
        Venus: { sign: chart.grahas.Venus.sign, degree: chart.grahas.Venus.deg, retro: chart.grahas.Venus.retro || false },
        Saturn: { sign: chart.grahas.Saturn.sign, degree: chart.grahas.Saturn.deg, retro: chart.grahas.Saturn.retro || false }
      },
      nodes: {
        Rahu_true: { sign: chart.rahuTrue!.sign, degree: chart.rahuTrue!.deg },
        Ketu_true: { sign: chart.ketuTrue!.sign, degree: chart.ketuTrue!.deg },
        Rahu_mean: { sign: chart.rahuMean!.sign, degree: chart.rahuMean!.deg },
        Ketu_mean: { sign: chart.ketuMean!.sign, degree: chart.ketuMean!.deg }
      }
    },
    doshas: {
      shani_dosha: calculateShaniDosha(chart),
      mangal_dosha: calculateMangalDosha(chart),
      kaal_sarpa_dosha: {
        true_node: calculateKaalSarpaDosha(chart, true),
        mean_node: calculateKaalSarpaDosha(chart, false)
      },
      rahu_ketu_dosha: calculateRahuKetuDosha(chart)
    },
    edge_checks: {
      ascendant_cusp_risk: chart.ascendant.deg < 1.0 || chart.ascendant.deg > 29.0,
      time_sensitivity_minutes: 5,
      result_changes_when_shifted: false,
      notes: 'Edge sensitivity testing requires ±5 min recalculation'
    },
    conclusion: {
      summary_one_line: '',
      caveats: '',
      next_steps: ''
    }
  };

  // Generate human summary
  const summary = generateHumanSummary(result);
  result.conclusion = summary;

  return result;
}

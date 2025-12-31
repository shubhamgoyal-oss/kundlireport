/**
 * Other Doshas - Calculated from Seer API Planet Positions
 * Following exact specifications for deterministic, reproducible results
 */

// ==================== CONSTANTS ====================

// Orb configuration
const ORB_CONJ = 8;  // Conjunction orb in degrees
const ORB_OPP = 8;   // Opposition orb in degrees

// Hindi to English planet name mapping
const PLANET_MAP: Record<string, string> = {
  "सूर्य": "Sun",
  "चन्द्र": "Moon",
  "मंगल": "Mars",
  "बुध": "Mercury",
  "गुरु": "Jupiter",
  "शुक्र": "Venus",
  "शनि": "Saturn",
  "राहु": "Rahu",
  "केतु": "Ketu",
  "लग्न": "Asc"
};

// Hindi to English sign mapping with indices
const SIGN_MAP: Record<string, { name: string; idx: number }> = {
  "मेष": { name: "Aries", idx: 0 },
  "वृष": { name: "Taurus", idx: 1 },
  "मिथुन": { name: "Gemini", idx: 2 },
  "कर्क": { name: "Cancer", idx: 3 },
  "सिंह": { name: "Leo", idx: 4 },
  "कन्या": { name: "Virgo", idx: 5 },
  "तुला": { name: "Libra", idx: 6 },
  "वृश्चिक": { name: "Scorpio", idx: 7 },
  "धनु": { name: "Sagittarius", idx: 8 },
  "मकर": { name: "Capricorn", idx: 9 },
  "कुम्भ": { name: "Aquarius", idx: 10 },
  "मीन": { name: "Pisces", idx: 11 }
};

// Gandmool nakshatras (Hindi names)
const GANDMOOL_NAKSHATRAS = ["अश्विनी", "अश्लेषा", "मघा", "ज्येष्ठा", "मूला", "रेवती"];

// Sign lord mapping (for Kalathra dosha)
const SIGN_LORDS: Record<number, string> = {
  0: "Mars",      // Aries
  1: "Venus",     // Taurus
  2: "Mercury",   // Gemini
  3: "Moon",      // Cancer
  4: "Sun",       // Leo
  5: "Mercury",   // Virgo
  6: "Venus",     // Libra
  7: "Mars",      // Scorpio
  8: "Jupiter",   // Sagittarius
  9: "Saturn",    // Capricorn
  10: "Saturn",   // Aquarius
  11: "Jupiter"   // Pisces
};

// ==================== TYPES ====================

interface Planet {
  name: string;
  deg: number;      // 0-360 degrees
  sign: string;     // English sign name
  signIdx: number;  // 0-11
  house: number;    // 1-12
}

interface Snapshot {
  planets: Record<string, Planet>;
  asc: Planet;
  moonNakshatra?: string;
  moonNakshatraPada?: string;
}

// ==================== HELPERS ====================

/**
 * Normalize angle to 0-360 range
 */
function norm(x: number): number {
  return ((x % 360) + 360) % 360;
}

/**
 * Calculate minimal angular separation (0-180 degrees)
 */
function delta(a: number, b: number): number {
  const diff = Math.abs(norm(a) - norm(b));
  return Math.min(diff, 360 - diff);
}

/**
 * Calculate house number from reference sign to target sign
 */
function houseFrom(refSignIdx: number, targetSignIdx: number): number {
  return ((targetSignIdx - refSignIdx + 12) % 12) + 1;
}

/**
 * Check if angle is within opposition orb (180° ± orb)
 */
function isOpposition(a: number, b: number, orb: number): boolean {
  const separation = delta(a, b);
  return Math.abs(separation - 180) <= orb;
}

/**
 * Parse Seer API planetary positions into canonical snapshot
 */
export function parseSeerPlanets(seerData: any): Snapshot {
  const planets: Record<string, Planet> = {};
  let asc: Planet | null = null;
  let moonNakshatra: string | undefined;
  let moonNakshatraPada: string | undefined;

  // Normalize Seer response structure
  const root = seerData?.vedic_horoscope ? seerData : (seerData?.data?.vedic_horoscope ? seerData.data : seerData?.data || seerData);
  const vedic = root?.vedic_horoscope;

  if (!vedic?.planets_position) {
    throw new Error("Invalid Seer response: missing planets_position");
  }

  // Get Moon nakshatra from astro_details or Moon's nakshatra field
  if (vedic.astro_details?.naksahtra) {
    const nakshatraText = vedic.astro_details.naksahtra.trim();
    const parts = nakshatraText.split(/[-\s]/);
    moonNakshatra = parts[0]?.trim();
    moonNakshatraPada = parts[1]?.trim();
  }

  // Process each planet
  for (const p of vedic.planets_position) {
    // Trim all strings
    const nameHindi = (p.name || "").trim();
    const signHindi = (p.sign || "").trim();

    // Map to English
    const nameEn = PLANET_MAP[nameHindi];
    const signData = SIGN_MAP[signHindi];

    if (!nameEn || !signData) {
      console.warn(`[PARSE] Skipping unknown: "${nameHindi}" in "${signHindi}"`);
      continue;
    }

    // Coerce to numbers
    const deg = Number(p.full_degree || 0);
    const house = Number(p.house || 1);

    const planet: Planet = {
      name: nameEn,
      deg: norm(deg),
      sign: signData.name,
      signIdx: signData.idx,
      house
    };

    // Extract Moon nakshatra if present
    if (nameEn === "Moon" && p.nakshatra) {
      const nakshatraText = p.nakshatra.trim();
      const parts = nakshatraText.split(/[-\s]/);
      moonNakshatra = parts[0]?.trim();
      moonNakshatraPada = parts[1]?.trim();
    }

    if (nameEn === "Asc") {
      asc = planet;
    } else {
      planets[nameEn] = planet;
    }
  }

  if (!asc) {
    throw new Error("Ascendant missing from Seer response");
  }

  return {
    planets,
    asc,
    moonNakshatra,
    moonNakshatraPada
  };
}

// ==================== DOSHA CALCULATIONS ====================

/**
 * 1. Grahan Dosha (Rahu-Ketu / Eclipse)
 * Present if Sun or Moon within ≤8° of Rahu or Ketu
 */
export function calculateGrahanDosha(snapshot: Snapshot) {
  const { planets } = snapshot;
  const { Sun, Moon, Rahu, Ketu } = planets;

  const reason: string[] = [];
  let rahuSurya = "absent";

  // Check Sun-Rahu
  const sunRahuDelta = delta(Sun.deg, Rahu.deg);
  if (sunRahuDelta <= ORB_CONJ) {
    rahuSurya = "present";
    reason.push(`Sun-Rahu conjunction: Δ=${sunRahuDelta.toFixed(2)}°`);
  }

  // Check Sun-Ketu
  const sunKetuDelta = delta(Sun.deg, Ketu.deg);
  if (sunKetuDelta <= ORB_CONJ) {
    rahuSurya = "present";
    reason.push(`Sun-Ketu conjunction: Δ=${sunKetuDelta.toFixed(2)}°`);
  }

  // Check Moon-Rahu
  const moonRahuDelta = delta(Moon.deg, Rahu.deg);
  if (moonRahuDelta <= ORB_CONJ) {
    reason.push(`Moon-Rahu conjunction: Δ=${moonRahuDelta.toFixed(2)}°`);
  }

  // Check Moon-Ketu
  const moonKetuDelta = delta(Moon.deg, Ketu.deg);
  if (moonKetuDelta <= ORB_CONJ) {
    reason.push(`Moon-Ketu conjunction: Δ=${moonKetuDelta.toFixed(2)}°`);
  }

  const status = reason.length > 0 ? "present" : "absent";

  return {
    status,
    rahuSurya,
    reason
  };
}

/**
 * 2. Shrapit Dosha (Saturn-Rahu)
 * Present if conjunction or opposition
 */
export function calculateShrapitDosha(snapshot: Snapshot) {
  const { Saturn, Rahu } = snapshot.planets;
  const reason: string[] = [];

  // Check conjunction
  const conjDelta = delta(Saturn.deg, Rahu.deg);
  if (conjDelta <= ORB_CONJ) {
    reason.push(`Saturn-Rahu conjunction: Δ=${conjDelta.toFixed(2)}°`);
    return { status: "present", reason };
  }

  // Check opposition
  if (isOpposition(Saturn.deg, Rahu.deg, ORB_OPP)) {
    reason.push(`Saturn-Rahu opposition: Δ=${conjDelta.toFixed(2)}° (~180°)`);
    return { status: "partial", reason };
  }

  return { status: "absent", reason };
}

/**
 * 3. Guru Chandal Dosha (Jupiter-Rahu/Ketu)
 * Present if Jupiter conjunct Rahu or Ketu
 */
export function calculateGuruChandalDosha(snapshot: Snapshot) {
  const { Jupiter, Rahu, Ketu } = snapshot.planets;
  const reason: string[] = [];

  // Check Jupiter-Rahu
  const jupRahuDelta = delta(Jupiter.deg, Rahu.deg);
  if (jupRahuDelta <= ORB_CONJ) {
    reason.push(`Jupiter-Rahu conjunction: Δ=${jupRahuDelta.toFixed(2)}°`);
  }

  // Check Jupiter-Ketu
  const jupKetuDelta = delta(Jupiter.deg, Ketu.deg);
  if (jupKetuDelta <= ORB_CONJ) {
    reason.push(`Jupiter-Ketu conjunction: Δ=${jupKetuDelta.toFixed(2)}°`);
  }

  const status = reason.length > 0 ? "present" : "absent";
  return { status, reason };
}

/**
 * 4. Punarphoo Dosha (Saturn-Moon)
 * Present if Saturn and Moon are conjunct AND in the same house/sign
 * Partial if opposition (opposite houses)
 * NOT present if they are in different houses even if degree separation is small
 */
export function calculatePunarphooDosha(snapshot: Snapshot) {
  const { Saturn, Moon } = snapshot.planets;
  const reason: string[] = [];

  // Check conjunction - MUST be in same sign/house for Punarphoo Dosha
  const conjDelta = delta(Saturn.deg, Moon.deg);
  const sameSign = Saturn.signIdx === Moon.signIdx;
  
  if (conjDelta <= ORB_CONJ && sameSign) {
    reason.push(`Saturn-Moon conjunction in ${Moon.sign}: Δ=${conjDelta.toFixed(2)}°`);
    return { status: "present", reason };
  }

  // If degree separation is small but different signs, NOT Punarphoo Dosha
  if (conjDelta <= ORB_CONJ && !sameSign) {
    reason.push(`Saturn (${Saturn.sign}) and Moon (${Moon.sign}) close in degrees (Δ=${conjDelta.toFixed(2)}°) but in different signs - not Punarphoo Dosha`);
    return { status: "absent", reason };
  }

  // Check opposition (planets in 7th from each other)
  if (isOpposition(Saturn.deg, Moon.deg, ORB_OPP)) {
    reason.push(`Saturn-Moon opposition: Saturn in ${Saturn.sign}, Moon in ${Moon.sign} (~180° apart)`);
    return { status: "partial", reason };
  }

  return { status: "absent", reason };
}

/**
 * 5. Kemadruma Yoga (Moon isolated) - STRICT PARĀŚARI RULES
 * 
 * Present ONLY IF ALL of the following are TRUE:
 * - No planets (except Sun) in 2nd house from Moon
 * - No planets (except Sun) in 12th house from Moon  
 * - No planets in any kendra from Moon (1st, 4th, 7th, 10th from Moon)
 * 
 * CANCELLED if ANY ONE of these is true:
 * - Moon is conjunct with any planet
 * - Any planet exists in kendras from Moon
 * - Moon is aspected by Jupiter
 * - Moon is in its own sign (Cancer) or exaltation (Taurus)
 * - Moon is associated with a yoga-producing planet
 */
export function calculateKemadrumaYoga(snapshot: Snapshot) {
  const { planets } = snapshot;
  const { Moon, Jupiter, Sun, Mercury, Venus, Mars, Saturn, Rahu, Ketu } = planets;
  const moonIdx = Moon.signIdx;

  const reason: string[] = [];
  const debug: string[] = [];
  
  // Planets to check for H2/H12 isolation (EXCLUDE Sun per classical rules)
  const planetsForAdjacent = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
  
  // All planets for kendra and conjunction checks (including Rahu/Ketu)
  const allPlanets = ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Rahu", "Ketu"];

  // ==================== CANCELLATION CHECKS (Apply FIRST) ====================
  
  // Cancellation 1: Moon in own sign (Cancer, idx=3) or exaltation (Taurus, idx=1)
  if (moonIdx === 3) {
    return {
      status: "absent",
      severity: null,
      reason: ["Kemadruma cancelled: Moon in own sign (Cancer)"],
      cancelled: true,
      cancellationReason: "Moon in own sign (Cancer)"
    };
  }
  
  if (moonIdx === 1) {
    return {
      status: "absent", 
      severity: null,
      reason: ["Kemadruma cancelled: Moon exalted in Taurus"],
      cancelled: true,
      cancellationReason: "Moon exalted (Taurus)"
    };
  }
  
  // Cancellation 2: Moon conjunct any planet (within 8°)
  for (const name of allPlanets) {
    const planet = planets[name];
    if (!planet) continue;
    const conjDelta = delta(Moon.deg, planet.deg);
    if (conjDelta <= ORB_CONJ) {
      return {
        status: "absent",
        severity: null,
        reason: [`Kemadruma cancelled: Moon conjunct ${name} (Δ=${conjDelta.toFixed(2)}°)`],
        cancelled: true,
        cancellationReason: `Moon conjunct ${name}`
      };
    }
  }
  
  // Cancellation 3: Any planet in kendras from Moon (H1, H4, H7, H10)
  const kendraIdxs = [
    moonIdx,                  // H1 (Moon's own sign)
    (moonIdx + 3) % 12,      // H4
    (moonIdx + 6) % 12,      // H7
    (moonIdx + 9) % 12       // H10
  ];
  
  for (const name of allPlanets) {
    const planet = planets[name];
    if (!planet) continue;
    if (kendraIdxs.includes(planet.signIdx)) {
      const houseNum = houseFrom(moonIdx, planet.signIdx);
      return {
        status: "absent",
        severity: null,
        reason: [`Kemadruma cancelled: ${name} in kendra from Moon (H${houseNum}, ${planet.sign})`],
        cancelled: true,
        cancellationReason: `${name} in kendra from Moon`
      };
    }
  }
  
  // Cancellation 4: Moon aspected by Jupiter (Jupiter aspects 5th, 7th, 9th from its position)
  // Jupiter's position determines which signs it aspects
  const jupiterAspects = [
    Jupiter.signIdx,                      // Jupiter's own position
    (Jupiter.signIdx + 4) % 12,          // 5th aspect
    (Jupiter.signIdx + 6) % 12,          // 7th aspect  
    (Jupiter.signIdx + 8) % 12           // 9th aspect
  ];
  
  if (jupiterAspects.includes(moonIdx)) {
    const aspectType = Jupiter.signIdx === moonIdx ? "conjunction" : "aspect";
    return {
      status: "absent",
      severity: null,
      reason: [`Kemadruma cancelled: Moon receives Jupiter ${aspectType}`],
      cancelled: true,
      cancellationReason: "Moon aspected by Jupiter"
    };
  }
  
  // Cancellation 5: Moon associated with yoga-producing planets (Jupiter, Venus, well-placed Mercury)
  // Check if Jupiter or Venus are in trines (H5, H9) from Moon
  const trineIdxs = [
    (moonIdx + 4) % 12,   // H5
    (moonIdx + 8) % 12    // H9
  ];
  
  if (trineIdxs.includes(Jupiter.signIdx)) {
    return {
      status: "absent",
      severity: null,
      reason: [`Kemadruma cancelled: Jupiter in trine from Moon (H${houseFrom(moonIdx, Jupiter.signIdx)}, ${Jupiter.sign})`],
      cancelled: true,
      cancellationReason: "Jupiter in trine from Moon"
    };
  }
  
  if (trineIdxs.includes(Venus.signIdx)) {
    return {
      status: "absent",
      severity: null,
      reason: [`Kemadruma cancelled: Venus in trine from Moon (H${houseFrom(moonIdx, Venus.signIdx)}, ${Venus.sign})`],
      cancelled: true,
      cancellationReason: "Venus in trine from Moon"
    };
  }

  // ==================== ISOLATION CHECKS ====================
  
  // Check H12 and H2 from Moon (adjacent signs) - EXCLUDE Sun
  const h12Idx = (moonIdx + 11) % 12; // Sign behind (12th from Moon)
  const h2Idx = (moonIdx + 1) % 12;   // Sign ahead (2nd from Moon)

  let hasH12 = false;
  let hasH2 = false;

  for (const name of planetsForAdjacent) {
    const planet = planets[name];
    if (!planet) continue;
    
    if (planet.signIdx === h12Idx) {
      hasH12 = true;
      debug.push(`${name} in H12 from Moon (${planet.sign})`);
    }
    if (planet.signIdx === h2Idx) {
      hasH2 = true;
      debug.push(`${name} in H2 from Moon (${planet.sign})`);
    }
  }

  // ==================== DETERMINE STATUS ====================
  
  // Kemadruma ONLY present if ALL conditions met:
  // - No planets (except Sun) in H2 from Moon
  // - No planets (except Sun) in H12 from Moon
  // - No planets in kendras (already checked above - would have cancelled)
  
  if (!hasH12 && !hasH2) {
    // Calculate severity based on overall planetary support
    // Strong = complete isolation, Moderate = some distant support, Mild = weak indication
    
    // Check for any benefic aspects as severity mitigator
    let severity: "mild" | "moderate" | "strong" = "strong";
    
    // If Venus or Mercury are in H3, H5, H9, H11 - reduce severity
    const supportHouses = [
      (moonIdx + 2) % 12,   // H3
      (moonIdx + 4) % 12,   // H5
      (moonIdx + 8) % 12,   // H9  
      (moonIdx + 10) % 12   // H11
    ];
    
    const hasBeneficSupport = 
      supportHouses.includes(Venus.signIdx) || 
      supportHouses.includes(Mercury.signIdx) ||
      supportHouses.includes(Jupiter.signIdx);
    
    if (hasBeneficSupport) {
      severity = "moderate";
      debug.push("Severity reduced: benefic planet in supportive house");
    }
    
    return {
      status: "present",
      severity,
      reason: ["Moon completely isolated: no planets in H2/H12 from Moon, no kendra support"],
      cancelled: false,
      debug
    };
  }
  
  // If we have planets in H2 or H12, Moon is NOT isolated
  return {
    status: "absent",
    severity: null,
    reason: debug.length > 0 ? debug : ["Moon has planetary support in adjacent houses"],
    cancelled: false,
    debug
  };
}

/**
 * 6. Gandmool Dosha (Moon in specific nakshatras)
 * Present if Moon nakshatra is in Gandmool list
 */
export function calculateGandmoolDosha(snapshot: Snapshot) {
  const { moonNakshatra, moonNakshatraPada } = snapshot;
  
  if (!moonNakshatra) {
    return {
      status: "absent",
      nakshatra: "Unknown",
      reason: ["Moon nakshatra not available"]
    };
  }

  const isGandmool = GANDMOOL_NAKSHATRAS.includes(moonNakshatra);
  const nakshatraText = moonNakshatraPada 
    ? `${moonNakshatra}-${moonNakshatraPada}` 
    : moonNakshatra;

  if (isGandmool) {
    return {
      status: "present",
      nakshatra: nakshatraText,
      reason: [`Moon in Gandmool nakshatra: ${nakshatraText}`]
    };
  }

  return {
    status: "absent",
    nakshatra: nakshatraText,
    reason: [`Moon in ${nakshatraText} (not Gandmool)`]
  };
}

/**
 * 7. Kalathra Dosha (7th house/partner affliction)
 * Present if malefic in H7, 7th lord afflicted, or Venus afflicted
 */
export function calculateKalathraDosh(snapshot: Snapshot) {
  const { planets, asc } = snapshot;
  const reason: string[] = [];

  // 7th house index from Lagna
  const h7Idx = (asc.signIdx + 6) % 12;
  
  // 7th lord
  const seventhLord = SIGN_LORDS[h7Idx];
  const seventhLordPlanet = planets[seventhLord];

  // Malefics
  const malefics = ["Mars", "Saturn", "Rahu", "Ketu", "Sun"];

  // Check 1: Any malefic in H7 by house number
  for (const maleficName of malefics) {
    const malefic = planets[maleficName];
    if (malefic.house === 7) {
      reason.push(`${maleficName} in 7th house (${malefic.sign})`);
    }
  }

  // Check 2: 7th lord conjunct malefic or in dusthana (H6/H8/H12)
  if (seventhLordPlanet) {
    for (const maleficName of malefics) {
      // Skip self-conjunction (e.g., if Saturn is 7th lord, don't report "Saturn conjunct Saturn")
      if (maleficName === seventhLord) continue;
      
      const malefic = planets[maleficName];
      const dist = delta(seventhLordPlanet.deg, malefic.deg);
      if (dist <= ORB_CONJ) {
        reason.push(`7th lord (${seventhLord}) conjunct ${maleficName}: Δ=${dist.toFixed(2)}°`);
      }
    }

    // Check if 7th lord in dusthana
    if ([6, 8, 12].includes(seventhLordPlanet.house)) {
      reason.push(`7th lord (${seventhLord}) in H${seventhLordPlanet.house} (dusthana)`);
    }
  }

  // Check 3: Venus conjunct malefic
  const venus = planets.Venus;
  for (const maleficName of malefics) {
    const malefic = planets[maleficName];
    const dist = delta(venus.deg, malefic.deg);
    if (dist <= ORB_CONJ) {
      reason.push(`Venus conjunct ${maleficName}: Δ=${dist.toFixed(2)}°`);
    }
  }

  // Special case: Only Sun in H7 alone → partial
  const sunInH7 = planets.Sun.house === 7;
  const otherMaleficsInH7 = malefics.filter(m => m !== "Sun" && planets[m].house === 7).length > 0;
  
  if (sunInH7 && !otherMaleficsInH7 && reason.length === 1) {
    return { status: "partial", reason: ["Sun alone in 7th house"] };
  }

  const status = reason.length > 0 ? "present" : "absent";
  return { status, reason };
}

/**
 * 8. Vish/Daridra Yoga (Mars-Saturn harsh)
 * Present if conjunction or opposition
 */
export function calculateVishDaridraYoga(snapshot: Snapshot) {
  const { Mars, Saturn } = snapshot.planets;
  const reason: string[] = [];

  // Check conjunction
  const conjDelta = delta(Mars.deg, Saturn.deg);
  if (conjDelta <= ORB_CONJ) {
    reason.push(`Mars-Saturn conjunction: Δ=${conjDelta.toFixed(2)}°`);
    return { status: "present", reason };
  }

  // Check opposition
  if (isOpposition(Mars.deg, Saturn.deg, ORB_OPP)) {
    reason.push(`Mars-Saturn opposition: Δ=${conjDelta.toFixed(2)}° (~180°)`);
    return { status: "present", reason };
  }

  return { status: "absent", reason };
}

/**
 * 9. Ketu/Naga Dosha
 * Present if Ketu conjunct Moon/Venus or in H1/H8
 */
export function calculateKetuNagaDosha(snapshot: Snapshot) {
  const { planets } = snapshot;
  const { Ketu, Moon, Venus } = planets;
  const reason: string[] = [];

  // Check Ketu-Moon conjunction
  const ketuMoonDelta = delta(Ketu.deg, Moon.deg);
  if (ketuMoonDelta <= ORB_CONJ) {
    reason.push(`Ketu-Moon conjunction: Δ=${ketuMoonDelta.toFixed(2)}°`);
  }

  // Check Ketu-Venus conjunction
  const ketuVenusDelta = delta(Ketu.deg, Venus.deg);
  if (ketuVenusDelta <= ORB_CONJ) {
    reason.push(`Ketu-Venus conjunction: Δ=${ketuVenusDelta.toFixed(2)}°`);
  }

  // Check Ketu in H1 or H8
  if (Ketu.house === 1 || Ketu.house === 8) {
    reason.push(`Ketu in ${Ketu.house}${Ketu.house === 1 ? 'st' : 'th'} house (${Ketu.sign})`);
  }

  // If no conjunction found but house check was done
  if (reason.length === 0) {
    return { status: "absent", reason: ["No Ketu conjunctions or problematic placements"] };
  }

  // If only house placement (no conjunction), mark as partial
  const hasConjunction = ketuMoonDelta <= ORB_CONJ || ketuVenusDelta <= ORB_CONJ;
  const status = hasConjunction ? "present" : "partial";

  return { status, reason };
}

/**
 * 10. Navagraha Umbrella
 * Suggested if 2 or more doshas are present
 */
export function calculateNavagrahaUmbrella(otherDoshas: any): any {
  const presentCount = Object.values(otherDoshas)
    .filter((d: any) => d.status === "present")
    .length;

  const suggested = presentCount >= 2;

  return {
    status: suggested ? "suggested" : "not_suggested",
    reason: suggested ? [`${presentCount} doshas present`] : []
  };
}

// ==================== MAIN ORCHESTRATOR ====================

/**
 * Calculate all Other Doshas from Seer API data
 */
export function calculateAllOtherDoshas(seerData: any) {
  // Parse Seer planets into canonical snapshot
  const snapshot = parseSeerPlanets(seerData);

  // Calculate each dosha
  const grahan = calculateGrahanDosha(snapshot);
  const shrapit = calculateShrapitDosha(snapshot);
  const guruChandal = calculateGuruChandalDosha(snapshot);
  const punarphoo = calculatePunarphooDosha(snapshot);
  const kemadruma = calculateKemadrumaYoga(snapshot);
  const gandmool = calculateGandmoolDosha(snapshot);
  const kalathra = calculateKalathraDosh(snapshot);
  const vishDaridra = calculateVishDaridraYoga(snapshot);
  const ketuNaga = calculateKetuNagaDosha(snapshot);

  const otherDoshas = {
    grahan,
    shrapit,
    guruChandal,
    punarphoo,
    kemadruma,
    gandmool,
    kalathra,
    vishDaridra,
    ketuNaga
  };

  const navagrahaUmbrella = calculateNavagrahaUmbrella(otherDoshas);

  return {
    otherDoshas: {
      grahan,
      shrapit,
      guruChandal,
      punarphoo,
      kemadruma,
      gandmool,
      kalathra,
      vishDaridra,
      ketuNaga
    },
    navagrahaUmbrella,
    debug: {
      placements: Object.entries(snapshot.planets).map(([name, p]) => ({
        name,
        deg: p.deg.toFixed(2),
        sign: p.sign,
        house: p.house
      })),
      asc: {
        sign: snapshot.asc.sign,
        deg: snapshot.asc.deg.toFixed(2)
      },
      moonNakshatra: snapshot.moonNakshatra,
      orbs: { conj: ORB_CONJ, opp: ORB_OPP }
    }
  };
}

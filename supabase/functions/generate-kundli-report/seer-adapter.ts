// Seer API adapter with safe Hindi JSON parsing

export interface SeerKundliRequest {
  day: number;
  month: number;
  year: number;
  hour: number;
  min: number;
  lat: number;
  lon: number;
  tzone: number;
  user_id: number;
  name: string;
  gender: string;
}

export interface SeerPlanet {
  name: string;
  sign: string;
  signIdx: number;
  deg: number;
  house: number;
  isRetro?: boolean;
}

export interface SeerKundli {
  asc: SeerPlanet;
  planets: SeerPlanet[];
  notes: string[];
}

// Hindi to English mappings (exact spellings after trim)
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

export async function fetchSeerKundli(req: SeerKundliRequest): Promise<{ data: any; responseTimeMs: number; status: number }> {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║               SEER API CALL - REQUEST TRACKING                 ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("📡 [SEER-REQUEST] Full request payload:");
  console.log(JSON.stringify(req, null, 2));
  console.log("🌐 [SEER-REQUEST] Endpoint: https://api-sbox.a4b.io/gw2/seer/internal/v1/user/kundli-details");
  console.log("📅 [SEER-REQUEST] Birth Details:", {
    date: `${req.day}/${req.month}/${req.year}`,
    time: `${req.hour}:${String(req.min).padStart(2, '0')}`,
    location: `Lat: ${req.lat}, Lon: ${req.lon}`,
    timezone: `UTC+${req.tzone}`
  });
  
  const startTime = Date.now();
  const response = await fetch("https://api-sbox.a4b.io/gw2/seer/internal/v1/user/kundli-details", {
    method: "POST",
    headers: {
      "x-fe-server": "true",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(req)
  });
  
  const elapsed = Date.now() - startTime;
  console.log(`⏱️ [SEER-RESPONSE] API call completed in ${elapsed}ms`);
  console.log(`📊 [SEER-RESPONSE] HTTP Status: ${response.status} ${response.statusText}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error("╔════════════════════════════════════════════════════════════════╗");
    console.error("║                    SEER API ERROR                              ║");
    console.error("╚════════════════════════════════════════════════════════════════╝");
    console.error("❌ [SEER-ERROR] HTTP Status:", response.status, response.statusText);
    console.error("❌ [SEER-ERROR] Error Response:", errorText);
    console.error("❌ [SEER-ERROR] Request that failed:", JSON.stringify(req, null, 2));
    throw new Error(`Seer API failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║               SEER API CALL - RESPONSE TRACKING                ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("✅ [SEER-RESPONSE] Status: SUCCESS");
  console.log("📦 [SEER-RESPONSE] Full response structure:");
  console.log(JSON.stringify(data, null, 2));
  const body = data?.vedic_horoscope ? data : (data?.data?.vedic_horoscope ? data.data : data);
  console.log("📊 [SEER-RESPONSE] Parsed structure summary:", {
    hasVedicHoroscope: !!body?.vedic_horoscope,
    hasPlanetsPosition: !!body?.vedic_horoscope?.planets_position,
    planetsCount: body?.vedic_horoscope?.planets_position?.length || 0,
    rawPlanets: body?.vedic_horoscope?.planets_position || []
  });
  
  return { data, responseTimeMs: elapsed, status: response.status };
}

export function adaptSeerResponse(seerData: any): SeerKundli {
  console.log("🔄 [SEER] Starting adaptation of Hindi JSON to English");
  const warnings: string[] = [];
  const planets: SeerPlanet[] = [];
  let asc: SeerPlanet | null = null;

  // Normalize shape: Seer sometimes wraps payload under a `data` key
  const root = seerData?.vedic_horoscope
    ? seerData
    : (seerData?.data?.vedic_horoscope ? seerData.data : (seerData?.data || seerData));
  const vedic = root?.vedic_horoscope;

  if (!vedic?.planets_position) {
    console.error("❌ [SEER] Invalid response structure");
    throw new Error("Invalid Seer response: missing planets_position");
  }

  const positions = vedic.planets_position;
  console.log(`📝 [SEER] Processing ${positions.length} planetary positions`);
  
  for (const p of positions) {
    // Trim whitespace from name and sign
    const nameHindi = (p.name || "").trim();
    const signHindi = (p.sign || "").trim();
    
    console.log(`  → [SEER] Processing: "${nameHindi}" in "${signHindi}"`);
    
    const nameEn = PLANET_MAP[nameHindi];
    const signData = SIGN_MAP[signHindi];
    
    if (!nameEn) {
      const warning = `Unknown planet name: "${nameHindi}"`;
      console.warn(`  ⚠️ [SEER] ${warning}`);
      warnings.push(warning);
      continue;
    }
    
    if (!signData) {
      const warning = `Unknown sign: "${signHindi}"`;
      console.warn(`  ⚠️ [SEER] ${warning}`);
      warnings.push(warning);
      continue;
    }

    // Coerce is_retro to boolean
    let isRetro = false;
    if (p.is_retro === "true" || p.is_retro === true) {
      isRetro = true;
    }

    // Parse full_degree (0-360 sidereal)
    const deg = parseFloat(p.full_degree || "0");
    
    // Parse house (coerce to integer)
    const house = parseInt(p.house || "1", 10);

    const planet: SeerPlanet = {
      name: nameEn,
      sign: signData.name,
      signIdx: signData.idx,
      deg,
      house,
      isRetro
    };

    console.log(`  ✓ [SEER] Mapped to: ${nameEn} ${signData.name} ${deg.toFixed(1)}° (H${house})${isRetro ? ' R' : ''}`);

    if (nameEn === "Asc") {
      asc = planet;
    } else {
      planets.push(planet);
    }
  }

  if (!asc) {
    console.error("❌ [SEER] Ascendant missing from response");
    throw new Error("Ascendant (लग्न) missing from Seer response");
  }

  console.log(`✓ [SEER] Ascendant: ${asc.sign} ${asc.deg.toFixed(1)}°`);

  // Verify we have all 9 planets
  const expectedPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
  const foundPlanets = planets.map(p => p.name);
  const missing = expectedPlanets.filter(n => !foundPlanets.includes(n));
  
  if (missing.length > 0) {
    const warning = `Missing planets: ${missing.join(", ")}`;
    console.warn(`⚠️ [SEER] ${warning}`);
    warnings.push(warning);
  }

  console.log(`✅ [SEER] Adaptation complete: ${planets.length} planets + Asc`);
  if (warnings.length > 0) {
    console.log(`⚠️ [SEER] ${warnings.length} warning(s):`, warnings);
  }

  return {
    asc,
    planets,
    notes: [
      "Seer sidereal (Lahiri) snapshot consumed",
      "Houses taken from Seer (whole-sign-equivalent)",
      ...warnings
    ]
  };
}

// Helper: Calculate house from reference sign index
export function houseFrom(refSignIdx: number, targetSignIdx: number): number {
  return ((targetSignIdx - refSignIdx + 12) % 12) + 1;
}

// Helper: Minimal angular separation
export function degDelta(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 360 - d);
}

// Helper: Check if planet is inside Rahu-Ketu arc (forward, inclusive)
export function insideRahuKetuArc(planetDeg: number, rahuDeg: number, ketuDeg: number): boolean {
  const dist = (planetDeg - rahuDeg + 360) % 360;
  const arcLength = (ketuDeg - rahuDeg + 360) % 360;
  return dist <= arcLength;
}

// Helper: Get next hour parameters, handling day rollover
export function nextHourParams(day: number, month: number, year: number, hour: number): { day: number; month: number; year: number; hour: number } {
  if (hour < 23) {
    return { day, month, year, hour: hour + 1 };
  }
  // Rollover to next day
  const d = new Date(year, month - 1, day + 1);
  return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear(), hour: 0 };
}

// Linear interpolation between two kundli snapshots at H:00 and (H+1):00
export function interpolateKundli(k0: SeerKundli, k1: SeerKundli, minute: number): SeerKundli {
  const t = minute / 60; // fraction of hour

  function lerpDeg(a: number, b: number): number {
    let delta = b - a;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return ((a + delta * t) + 360) % 360;
  }

  function signFromDeg(deg: number): { signIdx: number; sign: string } {
    const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
    const idx = Math.floor(((deg % 360) + 360) % 360 / 30);
    return { signIdx: idx, sign: SIGNS[idx] };
  }

  const ascDeg = lerpDeg(k0.asc.deg, k1.asc.deg);
  const ascSign = signFromDeg(ascDeg);

  const planets: SeerPlanet[] = k0.planets.map((p0) => {
    const p1 = k1.planets.find((q) => q.name === p0.name);
    if (!p1) return { ...p0 };

    const deg = lerpDeg(p0.deg, p1.deg);
    const s = signFromDeg(deg);
    const ascIdx = ascSign.signIdx;
    const house = ((s.signIdx - ascIdx + 12) % 12) + 1;

    return {
      name: p0.name,
      sign: s.sign,
      signIdx: s.signIdx,
      deg,
      house,
      isRetro: p0.isRetro,
    };
  });

  return {
    asc: { ...k0.asc, deg: ascDeg, sign: ascSign.sign, signIdx: ascSign.signIdx, house: 1 },
    planets,
    notes: [...k0.notes, `Interpolated at minute ${minute} (t=${t.toFixed(4)})`],
  };
}

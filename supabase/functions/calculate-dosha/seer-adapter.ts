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

export async function fetchSeerKundli(req: SeerKundliRequest): Promise<any> {
  console.log("📡 Calling Seer API:", req);
  
  const response = await fetch("https://api-sbox.a4b.io/gw2/seer/internal/v1/user/kundli-details", {
    method: "POST",
    headers: {
      "x-fe-server": "true",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(req)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("❌ Seer API error:", response.status, errorText);
    throw new Error(`Seer API failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  console.log("✅ Seer API response received");
  return data;
}

export function adaptSeerResponse(seerData: any): SeerKundli {
  const warnings: string[] = [];
  const planets: SeerPlanet[] = [];
  let asc: SeerPlanet | null = null;

  if (!seerData?.vedic_horoscope?.planets_position) {
    throw new Error("Invalid Seer response: missing planets_position");
  }

  const positions = seerData.vedic_horoscope.planets_position;
  
  for (const p of positions) {
    // Trim whitespace from name and sign
    const nameHindi = (p.name || "").trim();
    const signHindi = (p.sign || "").trim();
    
    const nameEn = PLANET_MAP[nameHindi];
    const signData = SIGN_MAP[signHindi];
    
    if (!nameEn) {
      warnings.push(`Unknown planet name: "${nameHindi}"`);
      continue;
    }
    
    if (!signData) {
      warnings.push(`Unknown sign: "${signHindi}"`);
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

    if (nameEn === "Asc") {
      asc = planet;
    } else {
      planets.push(planet);
    }
  }

  if (!asc) {
    throw new Error("Ascendant (लग्न) missing from Seer response");
  }

  // Verify we have all 9 planets
  const expectedPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
  const foundPlanets = planets.map(p => p.name);
  const missing = expectedPlanets.filter(n => !foundPlanets.includes(n));
  
  if (missing.length > 0) {
    warnings.push(`Missing planets: ${missing.join(", ")}`);
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

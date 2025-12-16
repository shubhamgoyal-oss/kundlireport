// Local dosha calculations based on Seer kundli data

import { SeerKundli, SeerPlanet, houseFrom, degDelta, insideRahuKetuArc } from "./seer-adapter.ts";

export interface DoshaResult {
  status: "present" | "partial" | "absent" | "present (nullified)";
  severity?: "mild" | "moderate" | "strong";
  triggeredBy: string[];
  cancellations: string[];
  mitigations: string[];
  placements: string[];
  notes: string[];
  nullified?: boolean;
}

function getPlanet(kundli: SeerKundli, name: string): SeerPlanet | undefined {
  return kundli.planets.find(p => p.name === name);
}

// Mangal Dosha (Manglik/Kuja) with Nullification Logic
export function calculateMangalDosha(kundli: SeerKundli): DoshaResult {
  const mars = getPlanet(kundli, "Mars");
  const moon = getPlanet(kundli, "Moon");
  const venus = getPlanet(kundli, "Venus");
  const jupiter = getPlanet(kundli, "Jupiter");
  
  if (!mars) {
    return {
      status: "absent",
      triggeredBy: [],
      cancellations: [],
      mitigations: [],
      placements: [],
      notes: ["Mars position not available"],
      nullified: false
    };
  }

  const triggeredBy: string[] = [];
  const cancellations: string[] = [];
  const nullificationReasons: string[] = [];
  const mitigations: string[] = [];
  const placements: string[] = [];
  
  // Primary trigger: Mars in H1/2/4/7/8/12 from Lagna
  const marsHouseFromLagna = mars.house;
  const primaryHouses = [1, 2, 4, 7, 8, 12];
  let primaryTriggered = false;
  
  if (primaryHouses.includes(marsHouseFromLagna)) {
    primaryTriggered = true;
    triggeredBy.push(`Mars from Lagna (H${marsHouseFromLagna})`);
    placements.push(`Mars in H${marsHouseFromLagna} from Lagna (${mars.sign} ${mars.deg.toFixed(1)}°)`);
  }

  // Helper triggers: same houses from Moon and Venus
  if (moon) {
    const marsHouseFromMoon = houseFrom(moon.signIdx, mars.signIdx);
    if (primaryHouses.includes(marsHouseFromMoon)) {
      triggeredBy.push("Mars from Moon (helper)");
      placements.push(`Mars in H${marsHouseFromMoon} from Moon`);
    }
  }

  if (venus) {
    const marsHouseFromVenus = houseFrom(venus.signIdx, mars.signIdx);
    if (primaryHouses.includes(marsHouseFromVenus)) {
      triggeredBy.push("Mars from Venus (helper)");
      placements.push(`Mars in H${marsHouseFromVenus} from Venus`);
    }
  }

  // If no triggers at all, return absent
  if (triggeredBy.length === 0) {
    return {
      status: "absent",
      triggeredBy,
      cancellations,
      mitigations,
      placements,
      notes: [],
      nullified: false
    };
  }

  // Only apply nullification if API says present
  // Rule 1: Own/Exaltation Sign (Hard Nullification)
  if (mars.sign === "Aries" || mars.sign === "Scorpio") {
    nullificationReasons.push("Mars in own sign (" + mars.sign + ")");
  }
  if (mars.sign === "Capricorn") {
    nullificationReasons.push("Mars exalted in Capricorn");
  }

  // Rule 2: House-Sign Exception Set
  if (marsHouseFromLagna === 2 && (mars.sign === "Gemini" || mars.sign === "Virgo")) {
    nullificationReasons.push("H2 exception: Mars in " + mars.sign);
  }
  if (marsHouseFromLagna === 4 && (mars.sign === "Aries" || mars.sign === "Scorpio")) {
    nullificationReasons.push("H4 exception: Mars in " + mars.sign);
  }
  if (marsHouseFromLagna === 7 && (mars.sign === "Cancer" || mars.sign === "Capricorn")) {
    nullificationReasons.push("H7 exception: Mars in " + mars.sign);
  }
  if (marsHouseFromLagna === 8 && (mars.sign === "Sagittarius" || mars.sign === "Pisces")) {
    nullificationReasons.push("H8 exception: Mars in " + mars.sign);
  }
  if (marsHouseFromLagna === 12 && (mars.sign === "Taurus" || mars.sign === "Libra")) {
    nullificationReasons.push("H12 exception: Mars in " + mars.sign);
  }

  // Rule 3: Strong Jupiter Protection
  if (jupiter) {
    const jupMarsDistance = degDelta(jupiter.deg, mars.deg);
    if (jupMarsDistance <= 8) {
      nullificationReasons.push(`Jupiter conjunct Mars (Δ=${jupMarsDistance.toFixed(1)}°)`);
    } else {
      // Whole-sign aspects: 5th, 7th, 9th from Mars
      const jupiterHouseFromMars = houseFrom(mars.signIdx, jupiter.signIdx);
      if ([5, 7, 9].includes(jupiterHouseFromMars)) {
        nullificationReasons.push(`Jupiter ${jupiterHouseFromMars}th aspect to Mars (whole-sign)`);
      }
    }
  }

  // Rule 4: Venus softening
  if (venus) {
    const venMarsDistance = degDelta(venus.deg, mars.deg);
    if (venMarsDistance <= 8) {
      nullificationReasons.push(`Venus conjunct Mars (Δ=${venMarsDistance.toFixed(1)}°)`);
    }
  }

  // Decision: if any nullification rule applies AND primary trigger is present
  if (primaryTriggered && nullificationReasons.length > 0) {
    return {
      status: "present (nullified)",
      triggeredBy,
      cancellations: nullificationReasons,
      mitigations: [],
      placements,
      notes: ["API indicates presence; nullification rules apply"],
      nullified: true
    };
  }

  // If no primary trigger but has helper triggers
  if (!primaryTriggered && triggeredBy.length > 0) {
    return {
      status: "partial",
      severity: "mild",
      triggeredBy,
      cancellations,
      mitigations,
      placements,
      notes: ["Helper triggers only, no primary Lagna trigger"],
      nullified: false
    };
  }

  // Present without nullification
  let severity: "mild" | "moderate" | "strong" = "moderate";
  
  // Check for additional mitigations (not nullifications)
  if (jupiter) {
    const jupAscDistance = degDelta(jupiter.deg, kundli.asc.deg);
    if (jupAscDistance <= 8) {
      mitigations.push("Jupiter aspect to Ascendant");
      severity = "mild";
    }
  }
  
  // Strong if tight aspect to Ascendant
  const marsAscDistance = degDelta(mars.deg, kundli.asc.deg);
  if (marsAscDistance <= 8) {
    severity = mitigations.length > 0 ? "moderate" : "strong";
  }

  return {
    status: "present",
    severity,
    triggeredBy,
    cancellations: [],
    mitigations,
    placements,
    notes: [],
    nullified: false
  };
}

// Pitra Dosha
export function calculatePitraDosha(kundli: SeerKundli): DoshaResult {
  const sun = getPlanet(kundli, "Sun");
  const rahu = getPlanet(kundli, "Rahu");
  const ketu = getPlanet(kundli, "Ketu");
  const saturn = getPlanet(kundli, "Saturn");
  
  if (!sun || !rahu || !ketu) {
    return {
      status: "absent",
      triggeredBy: [],
      cancellations: [],
      mitigations: [],
      placements: [],
      notes: ["Missing required planets"]
    };
  }

  const triggeredBy: string[] = [];
  const supporting: string[] = [];
  const placements: string[] = [];
  
  // Primary triggers
  if (rahu.house === 9) {
    triggeredBy.push("Rahu in H9");
    placements.push(`Rahu in 9th house (${rahu.sign})`);
  }
  
  if (ketu.house === 9) {
    triggeredBy.push("Ketu in H9");
    placements.push(`Ketu in 9th house (${ketu.sign})`);
  }
  
  const sunRahuDist = degDelta(sun.deg, rahu.deg);
  if (sunRahuDist <= 8) {
    triggeredBy.push("Sun–Rahu conjunction");
    placements.push(`Sun-Rahu Δ=${sunRahuDist.toFixed(1)}°`);
  }
  
  const sunKetuDist = degDelta(sun.deg, ketu.deg);
  if (sunKetuDist <= 8) {
    triggeredBy.push("Sun–Ketu conjunction");
    placements.push(`Sun-Ketu Δ=${sunKetuDist.toFixed(1)}°`);
  }

  // Supporting triggers
  if (saturn) {
    const sunSatDist = degDelta(sun.deg, saturn.deg);
    if (sunSatDist <= 6) {
      supporting.push("Sun–Saturn conjunction");
    }
    
    const sunSatOpp = Math.abs(sunSatDist - 180);
    if (sunSatOpp <= 6) {
      supporting.push("Sun–Saturn opposition");
    }
  }
  
  if (sun.house === 9) {
    supporting.push("Sun in H9");
  }

  // Decision logic
  if (triggeredBy.length >= 1) {
    return {
      status: "present",
      triggeredBy,
      cancellations: [],
      mitigations: [],
      placements,
      notes: supporting.length > 0 ? [`Supporting factors: ${supporting.join(", ")}`] : []
    };
  }

  if (supporting.length >= 2) {
    return {
      status: "present",
      triggeredBy: supporting,
      cancellations: [],
      mitigations: [],
      placements,
      notes: ["Two supporting factors present"]
    };
  }

  if (supporting.length === 1) {
    return {
      status: "partial",
      triggeredBy: supporting,
      cancellations: [],
      mitigations: [],
      placements,
      notes: ["One supporting factor only"]
    };
  }

  return {
    status: "absent",
    triggeredBy: [],
    cancellations: [],
    mitigations: [],
    placements: [],
    notes: []
  };
}

// Shani Dosha (natal Saturn affliction)
export function calculateShaniDosha(kundli: SeerKundli): DoshaResult {
  const saturn = getPlanet(kundli, "Saturn");
  const moon = getPlanet(kundli, "Moon");
  const jupiter = getPlanet(kundli, "Jupiter");
  
  if (!saturn) {
    return {
      status: "absent",
      triggeredBy: [],
      cancellations: [],
      mitigations: [],
      placements: [],
      notes: ["Saturn position not available"]
    };
  }

  const triggeredBy: string[] = [];
  const mitigations: string[] = [];
  const placements: string[] = [];
  
  placements.push(`Saturn in H${saturn.house} (${saturn.sign} ${saturn.deg.toFixed(1)}°)`);

  // House trigger
  const afflictedHouses = [1, 4, 7, 8, 12];
  let houseTriggered = false;
  
  if (afflictedHouses.includes(saturn.house)) {
    houseTriggered = true;
    triggeredBy.push(`Saturn in H${saturn.house} (house trigger)`);
  }

  // Affliction: Saturn conj/opp Moon
  if (moon) {
    const satMoonDist = degDelta(saturn.deg, moon.deg);
    if (satMoonDist <= 8) {
      triggeredBy.push(`Saturn conjunct Moon (Δ=${satMoonDist.toFixed(1)}°)`);
    } else {
      const opp = Math.abs(satMoonDist - 180);
      if (opp <= 8) {
        triggeredBy.push("Saturn opposes Moon (7th aspect)");
      }
    }
  }

  // Saturn conj Ascendant
  const satAscDist = degDelta(saturn.deg, kundli.asc.deg);
  if (satAscDist <= 8) {
    triggeredBy.push(`Saturn conjunct Ascendant (Δ=${satAscDist.toFixed(1)}°)`);
  }

  // Mitigations
  if (saturn.sign === "Capricorn" || saturn.sign === "Aquarius") {
    mitigations.push("Saturn in own sign (" + saturn.sign + ")");
  }
  
  if (saturn.sign === "Libra") {
    mitigations.push("Saturn exalted in Libra");
  }

  if (jupiter) {
    const jupSatDist = degDelta(jupiter.deg, saturn.deg);
    if (jupSatDist <= 60) {
      mitigations.push("Jupiter aspect to Saturn");
    }
    
    if (moon) {
      const jupMoonDist = degDelta(jupiter.deg, moon.deg);
      if (jupMoonDist <= 60) {
        mitigations.push("Jupiter aspect to Moon");
      }
    }
  }

  // Determine status
  if (triggeredBy.length === 0) {
    return {
      status: "absent",
      triggeredBy: [],
      cancellations: [],
      mitigations: [],
      placements,
      notes: []
    };
  }

  let severity: "mild" | "moderate" | "strong" = "moderate";
  
  if (houseTriggered) {
    severity = "moderate";
    
    // Strong if tight conjunction to Moon or Ascendant
    if (moon) {
      const satMoonDist = degDelta(saturn.deg, moon.deg);
      if (satMoonDist <= 3) {
        severity = "strong";
      }
    }
    
    if (satAscDist <= 3) {
      severity = "strong";
    }
    
    // Downgrade if mitigations
    if (mitigations.length > 0) {
      severity = severity === "strong" ? "moderate" : "mild";
    }
  } else {
    // Affliction only
    severity = "mild";
  }

  return {
    status: "present",
    severity,
    triggeredBy,
    cancellations: [],
    mitigations,
    placements,
    notes: []
  };
}

// Kaal Sarpa Dosha
export function calculateKaalSarpaDosha(kundli: SeerKundli): DoshaResult {
  const rahu = getPlanet(kundli, "Rahu");
  const ketu = getPlanet(kundli, "Ketu");
  
  if (!rahu || !ketu) {
    return {
      status: "absent",
      triggeredBy: [],
      cancellations: [],
      mitigations: [],
      placements: [],
      notes: ["Rahu/Ketu position not available"]
    };
  }

  // Classical planets only (7)
  const classicalPlanets = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];
  const planets = classicalPlanets.map(name => getPlanet(kundli, name)).filter(p => p !== undefined) as SeerPlanet[];
  
  if (planets.length < 7) {
    return {
      status: "absent",
      triggeredBy: [],
      cancellations: [],
      mitigations: [],
      placements: [],
      notes: [`Only ${planets.length} of 7 classical planets found`]
    };
  }

  let insideCount = 0;
  let outsideCount = 0;
  const outsidePlanets: string[] = [];
  
  for (const p of planets) {
    if (insideRahuKetuArc(p.deg, rahu.deg, ketu.deg)) {
      insideCount++;
    } else {
      outsideCount++;
      outsidePlanets.push(p.name);
    }
  }

  const placements: string[] = [
    `Rahu at ${rahu.deg.toFixed(1)}° (${rahu.sign})`,
    `Ketu at ${ketu.deg.toFixed(1)}° (${ketu.sign})`,
    `${insideCount} planets inside arc, ${outsideCount} outside`
  ];

  const type = getKaalSarpType(rahu.house);

  // Decision based on how many planets are inside the arc
  // 7 inside = Full (High severity)
  // 6 inside = Partial (Medium severity)
  // 5 inside = Partial (Low severity)
  // 4 or fewer = Absent
  
  if (insideCount === 7) {
    return {
      status: "present",
      severity: "strong",
      triggeredBy: ["All 7 classical planets between Rahu and Ketu"],
      cancellations: [],
      mitigations: [],
      placements: [...placements, `Type: ${type} Kaal Sarp`],
      notes: []
    };
  }

  if (insideCount === 6) {
    return {
      status: "present",
      severity: "moderate",
      triggeredBy: [`6 of 7 classical planets between Rahu and Ketu (${outsidePlanets.join(", ")} outside)`],
      cancellations: [],
      mitigations: [],
      placements: [...placements, `Type: ${type} Kaal Sarp (partial)`],
      notes: [`${outsidePlanets.join(", ")} outside the Rahu-Ketu arc`]
    };
  }

  if (insideCount === 5) {
    return {
      status: "present",
      severity: "mild",
      triggeredBy: [`5 of 7 classical planets between Rahu and Ketu (${outsidePlanets.join(", ")} outside)`],
      cancellations: [],
      mitigations: [],
      placements: [...placements, `Type: ${type} Kaal Sarp (partial)`],
      notes: [`${outsidePlanets.join(", ")} outside the Rahu-Ketu arc`]
    };
  }

  return {
    status: "absent",
    triggeredBy: [],
    cancellations: [],
    mitigations: [],
    placements,
    notes: [`${outsideCount} planet(s) outside arc: ${outsidePlanets.join(", ")}`]
  };
}

function getKaalSarpType(rahuHouse: number): string {
  const types = [
    "Anant", "Kulik", "Vasuki", "Shankhapal", "Padam", "Mahapadma",
    "Takshak", "Karkotak", "Shankhachur", "Ghatak", "Vishdhar", "Sheshnag"
  ];
  return types[rahuHouse - 1] || "Unknown";
}

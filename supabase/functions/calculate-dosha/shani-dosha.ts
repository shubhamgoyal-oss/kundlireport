// Shani Dosha (natal Saturn affliction) calculation

function getConjunctionDistance(lon1: number, lon2: number): number {
  let diff = Math.abs(lon1 - lon2);
  if (diff > 180) diff = 360 - diff;
  return diff;
}

export function calculateShaniDosha(chart: any, unknownTime: boolean = false, debugMode: boolean = false) {
  const saturn = chart.planets.find((p: any) => p.name === "Saturn");
  const moon = chart.planets.find((p: any) => p.name === "Moon");
  const jupiter = chart.planets.find((p: any) => p.name === "Jupiter");
  const venus = chart.planets.find((p: any) => p.name === "Venus");
  
  let triggeredBy: string[] = [];
  let placements: string[] = [];
  let mitigations: string[] = [];
  let notes: string[] = [];
  
  if (!saturn) {
    return {
      status: "absent",
      severity: undefined,
      triggeredBy: [],
      placements: [],
      mitigations: [],
      notes: ["Saturn position not available"],
      debug: undefined,
    };
  }
  
  placements.push(`Saturn ${saturn.sign} ${saturn.longitude.toFixed(1)}° (H${saturn.house})`);
  
  let houseTrigger = false;
  let afflictionTrigger = false;
  let saturnConjMoonDeg: number | null = null;
  
  // House trigger: Saturn in 1, 4, 7, 8, 12 from Lagna
  if (!unknownTime && saturn.house && [1, 4, 7, 8, 12].includes(saturn.house)) {
    houseTrigger = true;
    triggeredBy.push(`Saturn in H${saturn.house} from Lagna (house trigger)`);
  }
  
  // Affliction trigger: Saturn conjunct or oppose Moon
  if (moon) {
    const delta = getConjunctionDistance(saturn.longitude, moon.longitude);
    saturnConjMoonDeg = delta;
    if (delta <= 8) {
      afflictionTrigger = true;
      triggeredBy.push(`Saturn conjunct Moon (Δ=${delta.toFixed(1)}°)`);
      placements.push(`Saturn–Moon Δ=${delta.toFixed(1)}°`);
    } else {
      const opp = Math.abs(Math.abs(saturn.longitude - moon.longitude) - 180);
      if (opp <= 8) {
        afflictionTrigger = true;
        triggeredBy.push(`Saturn opposes Moon (7th aspect)`);
      }
    }
  }
  
  // Affliction to Venus/7th lord (optional, adds relationship flavor)
  if (venus) {
    const delta = getConjunctionDistance(saturn.longitude, venus.longitude);
    if (delta <= 8) {
      afflictionTrigger = true;
      triggeredBy.push(`Saturn conjunct Venus (Δ=${delta.toFixed(1)}°)`);
    }
  }
  
  // Mitigations
  if (["Capricorn", "Aquarius"].includes(saturn.sign)) {
    mitigations.push("Saturn in own sign (Capricorn/Aquarius)");
  }
  if (saturn.sign === "Libra") {
    mitigations.push("Saturn exalted in Libra");
  }
  if (jupiter) {
    const jupAspect = getConjunctionDistance(jupiter.longitude, saturn.longitude);
    if (jupAspect <= 60) {
      mitigations.push("Jupiter aspect to Saturn");
    }
    if (moon && getConjunctionDistance(jupiter.longitude, moon.longitude) <= 60) {
      mitigations.push("Jupiter aspect to Moon");
    }
  }
  
  // Severity
  let status = "absent";
  let severity: string | undefined = undefined;
  
  if (houseTrigger) {
    status = "present";
    severity = "moderate";
    
    // Strong if tight conjunction to Lagna or Moon
    if (saturnConjMoonDeg && saturnConjMoonDeg <= 3) {
      severity = "strong";
    }
    const ascLon = chart.ascendant?.longitude;
    if (ascLon && getConjunctionDistance(saturn.longitude, ascLon) <= 3) {
      severity = "strong";
    }
    
    // Downgrade if mitigations
    if (mitigations.length > 0 && severity === "moderate") {
      severity = "mild";
    }
    if (mitigations.length > 0 && severity === "strong") {
      severity = "moderate";
    }
  } else if (afflictionTrigger) {
    status = "present";
    severity = "mild";
  }
  
  if (unknownTime && !afflictionTrigger) {
    status = "partial";
    notes.push("Birth time unknown - house checks skipped");
  }
  
  const debug = debugMode ? {
    saturn_house_from_lagna: saturn.house ? `H${saturn.house}` : "unknown",
    saturn_conj_moon_deg: saturnConjMoonDeg,
    mitigations: mitigations.length > 0 ? mitigations : ["none"],
    final: status,
    severity: severity || "none",
  } : undefined;
  
  return {
    status,
    severity,
    triggeredBy,
    placements,
    mitigations,
    notes,
    debug,
  };
}

export function getShaniDoshaExplanation(shaniDosha: any): string {
  if (shaniDosha.status === "absent") {
    return "Shani Dosha is not present in your chart. Saturn's placement is favorable.";
  }
  
  if (shaniDosha.status === "partial") {
    return "Shani Dosha shows partial indicators. " + (shaniDosha.notes?.join(". ") || "");
  }
  
  let exp = "Shani Dosha is present in your chart. ";
  
  if (shaniDosha.severity === "strong") {
    exp += "This is a strong affliction that may bring challenges related to discipline, delays, and karmic lessons. ";
  } else if (shaniDosha.severity === "moderate") {
    exp += "This is a moderate affliction that may bring some obstacles and delays in life. ";
  } else {
    exp += "This is a mild affliction with limited impact. ";
  }
  
  if (shaniDosha.mitigations && shaniDosha.mitigations.length > 0) {
    exp += "However, there are positive factors that reduce the intensity: " + shaniDosha.mitigations.join(", ") + ". ";
  }
  
  return exp;
}

export function getShaniDoshaRemedies(shaniDosha: any): string[] {
  if (shaniDosha.status === "absent") {
    return [];
  }
  
  return [
    "Worship Lord Shani on Saturdays",
    "Donate black sesame seeds, black clothes, or iron on Saturdays",
    "Recite Shani mantras: 'Om Sham Shanaishcharaya Namah'",
    "Light a mustard oil lamp under a Peepal tree on Saturdays",
    "Feed crows and help the poor and needy",
    "Wear a blue sapphire (Neelam) after consulting an astrologer",
    "Practice patience, discipline, and service to reduce Saturn's malefic effects"
  ];
}

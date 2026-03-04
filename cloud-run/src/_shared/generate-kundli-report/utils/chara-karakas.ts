// Chara Karaka (Temporal Significator) Calculator
// Based on Jaimini astrology - sorted by degree within sign

import type { SeerPlanet } from "../seer-adapter";

export interface CharaKaraka {
  karaka: string;
  planet: string;
  degree: number;
  signification: string;
  houseRuled: number;
}

// Karaka order from highest to lowest degree
const KARAKA_ORDER = [
  { name: "Atmakaraka", signification: "Self, soul, life purpose, ego", houseRuled: 1 },
  { name: "Amatyakaraka", signification: "Career, profession, mind, advisors", houseRuled: 10 },
  { name: "Bhratrikaraka", signification: "Siblings, courage, efforts", houseRuled: 3 },
  { name: "Matrikaraka", signification: "Mother, property, emotions, vehicles", houseRuled: 4 },
  { name: "Putrakaraka", signification: "Children, creativity, intelligence", houseRuled: 5 },
  { name: "Gnatikaraka", signification: "Enemies, diseases, debts, obstacles", houseRuled: 6 },
  { name: "Darakaraka", signification: "Spouse, partnerships, marriage", houseRuled: 7 },
];

// Only 7 planets used in Chara Karaka calculation (exclude Rahu/Ketu)
const CHARA_PLANETS = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn"];

export function calculateCharaKarakas(planets: SeerPlanet[]): CharaKaraka[] {
  // Filter to only the 7 planets used
  const eligiblePlanets = planets.filter(p => CHARA_PLANETS.includes(p.name));
  
  // Calculate degree within sign (0-30)
  const planetDegrees = eligiblePlanets.map(p => ({
    name: p.name,
    degreeInSign: p.deg % 30,
    fullDegree: p.deg,
  }));
  
  // Sort by degree within sign (highest first = Atmakaraka)
  planetDegrees.sort((a, b) => b.degreeInSign - a.degreeInSign);
  
  // Assign karakas
  const karakas: CharaKaraka[] = [];
  for (let i = 0; i < Math.min(planetDegrees.length, KARAKA_ORDER.length); i++) {
    karakas.push({
      karaka: KARAKA_ORDER[i].name,
      planet: planetDegrees[i].name,
      degree: planetDegrees[i].degreeInSign,
      signification: KARAKA_ORDER[i].signification,
      houseRuled: KARAKA_ORDER[i].houseRuled,
    });
  }
  
  return karakas;
}

// Get a specific karaka
export function getKaraka(karakas: CharaKaraka[], karakaName: string): CharaKaraka | undefined {
  return karakas.find(k => k.karaka === karakaName);
}

// Get Atmakaraka (most important - the soul significator)
export function getAtmakaraka(planets: SeerPlanet[]): { planet: string; degree: number } | null {
  const eligiblePlanets = planets.filter(p => CHARA_PLANETS.includes(p.name));
  
  if (eligiblePlanets.length === 0) return null;
  
  const sorted = eligiblePlanets
    .map(p => ({ name: p.name, degreeInSign: p.deg % 30 }))
    .sort((a, b) => b.degreeInSign - a.degreeInSign);
  
  return { planet: sorted[0].name, degree: sorted[0].degreeInSign };
}

// Get Darakaraka (spouse significator - important for marriage)
export function getDarakaraka(planets: SeerPlanet[]): { planet: string; degree: number } | null {
  const eligiblePlanets = planets.filter(p => CHARA_PLANETS.includes(p.name));
  
  if (eligiblePlanets.length < 7) return null;
  
  const sorted = eligiblePlanets
    .map(p => ({ name: p.name, degreeInSign: p.deg % 30 }))
    .sort((a, b) => b.degreeInSign - a.degreeInSign);
  
  // Darakaraka is the planet with the lowest degree (7th in order)
  return { planet: sorted[6].name, degree: sorted[6].degreeInSign };
}

// Get Amatyakaraka (career significator)
export function getAmatyakaraka(planets: SeerPlanet[]): { planet: string; degree: number } | null {
  const eligiblePlanets = planets.filter(p => CHARA_PLANETS.includes(p.name));
  
  if (eligiblePlanets.length < 2) return null;
  
  const sorted = eligiblePlanets
    .map(p => ({ name: p.name, degreeInSign: p.deg % 30 }))
    .sort((a, b) => b.degreeInSign - a.degreeInSign);
  
  // Amatyakaraka is the second highest degree planet
  return { planet: sorted[1].name, degree: sorted[1].degreeInSign };
}

// Get karaka summary for display
export function getKarakaSummary(karakas: CharaKaraka[]): string {
  return karakas.map(k => `${k.karaka}: ${k.planet} (${k.degree.toFixed(1)}°)`).join("\n");
}

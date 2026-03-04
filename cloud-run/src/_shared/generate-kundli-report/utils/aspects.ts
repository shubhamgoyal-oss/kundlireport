// Vedic astrology aspect calculator
// In Vedic astrology, planets aspect other houses with specific strengths

import type { SeerPlanet } from "../seer-adapter";

export interface Aspect {
  fromPlanet: string;
  fromHouse: number;
  aspectType: '1st' | '4th' | '5th' | '7th' | '8th' | '9th' | '10th';
  targetHouse: number;
  strength: 'full' | 'three-quarter' | 'half' | 'quarter';
}

// All planets have 7th aspect (full strength)
// Mars: 4th and 8th aspects (full strength)
// Jupiter: 5th and 9th aspects (full strength)
// Saturn: 3rd and 10th aspects (full strength)
// Rahu/Ketu: 5th and 9th aspects (like Jupiter)

const SPECIAL_ASPECTS: Record<string, number[]> = {
  Mars: [4, 8],
  Jupiter: [5, 9],
  Saturn: [3, 10],
  Rahu: [5, 9],
  Ketu: [5, 9],
};

function getHouseFromAspect(fromHouse: number, aspectOffset: number): number {
  return ((fromHouse - 1 + aspectOffset) % 12) + 1;
}

export function calculateAspects(planets: SeerPlanet[], asc: SeerPlanet): Aspect[] {
  const aspects: Aspect[] = [];

  for (const planet of planets) {
    // All planets aspect 7th house from their position
    aspects.push({
      fromPlanet: planet.name,
      fromHouse: planet.house,
      aspectType: '7th',
      targetHouse: getHouseFromAspect(planet.house, 6), // 7th from current = 6 houses away
      strength: 'full',
    });

    // Special aspects
    const specialAspects = SPECIAL_ASPECTS[planet.name];
    if (specialAspects) {
      for (const offset of specialAspects) {
        const aspectType = offset === 4 ? '4th' : 
                          offset === 5 ? '5th' : 
                          offset === 8 ? '8th' : 
                          offset === 9 ? '9th' : 
                          offset === 10 ? '10th' : '7th';
        
        aspects.push({
          fromPlanet: planet.name,
          fromHouse: planet.house,
          aspectType: aspectType as Aspect['aspectType'],
          targetHouse: getHouseFromAspect(planet.house, offset - 1),
          strength: 'full',
        });
      }
    }
  }

  return aspects;
}

// Get all aspects on a specific house
export function getAspectsOnHouse(aspects: Aspect[], houseNumber: number): Aspect[] {
  return aspects.filter(a => a.targetHouse === houseNumber);
}

// Get all aspects from a specific planet
export function getAspectsFromPlanet(aspects: Aspect[], planetName: string): Aspect[] {
  return aspects.filter(a => a.fromPlanet === planetName);
}

// Check if a planet aspects another planet
export function doesPlanetAspectPlanet(
  aspectingPlanet: SeerPlanet, 
  targetPlanet: SeerPlanet,
  aspects: Aspect[]
): boolean {
  const planetAspects = getAspectsFromPlanet(aspects, aspectingPlanet.name);
  return planetAspects.some(a => a.targetHouse === targetPlanet.house);
}

// Get mutual aspects (when two planets aspect each other)
export function getMutualAspects(aspects: Aspect[], planets: SeerPlanet[]): Array<{planet1: string; planet2: string}> {
  const mutual: Array<{planet1: string; planet2: string}> = [];
  
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];
      
      const p1AspectsP2 = aspects.some(a => a.fromPlanet === p1.name && a.targetHouse === p2.house);
      const p2AspectsP1 = aspects.some(a => a.fromPlanet === p2.name && a.targetHouse === p1.house);
      
      if (p1AspectsP2 && p2AspectsP1) {
        mutual.push({ planet1: p1.name, planet2: p2.name });
      }
    }
  }
  
  return mutual;
}

// Get conjunction (planets in same house)
export function getConjunctions(planets: SeerPlanet[]): Map<number, string[]> {
  const conjunctions = new Map<number, string[]>();
  
  for (const planet of planets) {
    if (!conjunctions.has(planet.house)) {
      conjunctions.set(planet.house, []);
    }
    conjunctions.get(planet.house)!.push(planet.name);
  }
  
  // Filter to only houses with 2+ planets
  const result = new Map<number, string[]>();
  for (const [house, occupants] of conjunctions) {
    if (occupants.length >= 2) {
      result.set(house, occupants);
    }
  }
  
  return result;
}

// Explanation and remedy generators for Seer-based doshas

import type { DoshaResult } from "./seer-doshas.ts";

export function getMangalExplanationSeer(mangal: DoshaResult): string {
  if (mangal.status === "absent") {
    if (mangal.cancellations.length > 0) {
      return `Mangal Dosha was triggered but canceled due to: ${mangal.cancellations.join(", ")}. This significantly reduces negative effects.`;
    }
    return "No Mangal Dosha detected in your chart. Mars is well-placed and does not occupy the traditional dosha-causing houses.";
  }
  
  if (mangal.status === "partial") {
    return `Mangal Dosha is partial in your chart. Only helper triggers (${mangal.triggeredBy.join(", ")}) are present, without the primary Lagna trigger. This has limited impact.`;
  }
  
  let exp = `Mangal Dosha (${mangal.severity}) is present in your chart. ${mangal.triggeredBy.join(" and ")}. `;
  
  if (mangal.severity === "strong") {
    exp += "This indicates strong will and determination, which requires conscious channeling, especially in relationships. ";
  } else if (mangal.severity === "moderate") {
    exp += "This may bring some challenges related to Mars energy, particularly in partnerships. ";
  } else {
    exp += "This is a mild presence with limited effects. ";
  }
  
  if (mangal.mitigations.length > 0) {
    exp += `Mitigating factors: ${mangal.mitigations.join(", ")}. `;
  }
  
  return exp;
}

export function getMangalRemediesSeer(mangal: DoshaResult): string[] {
  if (mangal.status === "absent") return [];
  
  return [
    "Recite Hanuman Chalisa daily, especially on Tuesdays"
  ];
}

export function getPitraExplanationSeer(pitra: DoshaResult): string {
  if (pitra.status === "absent") {
    return "No Pitra Dosha indicators detected in your chart.";
  }
  
  if (pitra.status === "partial") {
    return `Pitra Dosha shows partial indicators: ${pitra.triggeredBy.join(", ")}. This suggests some ancestral karma patterns that may benefit from remedial actions.`;
  }
  
  return `Pitra Dosha is present: ${pitra.triggeredBy.join(", ")}. This emphasizes the importance of honoring ancestral connections and performing remedial rituals.`;
}

export function getPitraRemediesSeer(pitra: DoshaResult): string[] {
  if (pitra.status === "absent") return [];
  
  return [
    "Perform Shraddha ceremony on appropriate tithis"
  ];
}

export function getShaniExplanationSeer(shani: DoshaResult): string {
  if (shani.status === "absent") {
    return "Shani Dosha is not present in your chart. Saturn's placement is favorable.";
  }
  
  if (shani.status === "partial") {
    return "Shani Dosha shows partial indicators. " + shani.notes.join(". ");
  }
  
  let exp = "Shani Dosha is present in your chart. ";
  
  if (shani.severity === "strong") {
    exp += "This is a strong affliction that may bring challenges related to discipline, delays, and karmic lessons. ";
  } else if (shani.severity === "moderate") {
    exp += "This is a moderate affliction that may bring some obstacles and delays in life. ";
  } else {
    exp += "This is a mild affliction with limited impact. ";
  }
  
  if (shani.mitigations.length > 0) {
    exp += "However, there are positive factors that reduce the intensity: " + shani.mitigations.join(", ") + ". ";
  }
  
  return exp;
}

export function getShaniRemediesSeer(shani: DoshaResult): string[] {
  if (shani.status === "absent") return [];
  
  return [
    "Worship Lord Shani on Saturdays"
  ];
}

export function getKaalSarpExplanationSeer(kaalSarp: DoshaResult): string {
  if (kaalSarp.status === "absent") {
    return "No Kaal Sarp Dosha detected. Your planets are distributed on both sides of the Rahu-Ketu axis.";
  }
  
  let exp = "Kaal Sarp Dosha is present. All seven classical planets are positioned between Rahu and Ketu, creating a specific karmic pattern. ";
  
  // Extract type from placements
  const typeLine = kaalSarp.placements.find(p => p.includes("Type:"));
  if (typeLine) {
    exp += `This is ${typeLine}. `;
  }
  
  if (kaalSarp.notes.some(n => n.includes("edge") || n.includes("partial"))) {
    exp += "Note: One planet is very close to the Rahu/Ketu axis (partial yoga). ";
  }
  
  exp += "This may manifest as intense life experiences and transformation opportunities.";
  
  return exp;
}

export function getKaalSarpRemediesSeer(): string[] {
  return [
    "Visit Trimbakeshwar or other Kaal Sarp temples for specific puja"
  ];
}

// Explanation and remedy generators for Seer-based doshas

import type { DoshaResult } from "./seer-doshas.ts";

export function getMangalExplanationSeer(mangal: DoshaResult): string {
  if (mangal.status === "absent") {
    if (mangal.cancellations.length > 0) {
      const placement = mangal.placements[0] || "Mars placement";
      return `In your chart, ${placement}. However, this is canceled by ${mangal.cancellations.join(" and ")}, protecting you from Mangal Dosha effects.`;
    }
    return `Mars in your chart is not positioned in any of the sensitive houses (1st, 2nd, 4th, 7th, 8th, or 12th) from your Lagna, Moon, or Venus. Your chart is free from Mangal Dosha.`;
  }
  
  if (mangal.status === "partial") {
    const placement = mangal.placements[0] || "Mars is in a secondary position";
    return `In your chart, ${placement}. This triggers Mangal Dosha from Moon/Venus but not from Lagna, resulting in mild effects.`;
  }
  
  // Build a proper sentence from placements
  const severity = mangal.severity || "moderate";
  const placementsList = mangal.placements.filter(p => p.length > 0);
  
  if (placementsList.length === 0) {
    return `In your chart, Mars occupies a sensitive house, creating ${severity} Mangal Dosha.`;
  }
  
  if (placementsList.length === 1) {
    return `In your chart, ${placementsList[0]}. This creates ${severity} Mangal Dosha.`;
  }
  
  // Multiple placements - format nicely
  const formattedPlacements = placementsList.map(p => {
    // Clean up placement text for readability
    return p.replace(/from Lagna \(([^)]+)\)/, '(Lagna reference)')
            .replace(/from Moon/, '(Moon reference)')
            .replace(/from Venus/, '(Venus reference)');
  });
  
  return `In your chart, Mars is positioned in sensitive houses: ${formattedPlacements.join("; ")}. This creates ${severity} Mangal Dosha.`;
}

export function getMangalRemediesSeer(mangal: DoshaResult): string[] {
  if (mangal.status === "absent") return [];
  
  return [
    "Recite Hanuman Chalisa daily, especially on Tuesdays"
  ];
}

export function getPitraExplanationSeer(pitra: DoshaResult): string {
  if (pitra.status === "absent") {
    return `In your chart, the 9th house and Sun are free from Rahu-Ketu affliction. This indicates positive ancestral karma with no Pitra Dosha present.`;
  }
  
  if (pitra.status === "partial") {
    const placement = pitra.placements[0] || "the 9th house";
    return `In your chart, there is a minor Rahu-Ketu influence on ${placement}. This creates a mild Pitra Dosha that may occasionally manifest.`;
  }
  
  const placement = pitra.placements[0] || "the 9th house";
  return `In your chart, Rahu-Ketu afflicts ${placement}, activating Pitra Dosha. This indicates unresolved ancestral karma that may affect family harmony and spiritual progress.`;
}

export function getPitraRemediesSeer(pitra: DoshaResult): string[] {
  if (pitra.status === "absent") return [];
  
  return [
    "Perform Shraddha ceremony on appropriate tithis"
  ];
}

export function getShaniExplanationSeer(shani: DoshaResult): string {
  if (shani.status === "absent") {
    const moonPlacement = shani.placements.find(p => p.toLowerCase().includes("moon")) || "";
    const saturnPlacement = shani.placements.find(p => p.toLowerCase().includes("saturn")) || "";
    if (moonPlacement && saturnPlacement) {
      return `In your chart, ${moonPlacement} and ${saturnPlacement}. Saturn is not transiting near your Moon sign, so Sade Sati is not active.`;
    }
    return `Saturn is currently not transiting through the sign before, on, or after your natal Moon sign. Sade Sati is not active for you at this time.`;
  }
  
  if (shani.status === "partial") {
    return `Saturn is approaching your Moon sign area. Sade Sati effects are beginning to manifest gradually in your life.`;
  }
  
  const moonPlacement = shani.placements.find(p => p.toLowerCase().includes("moon")) || "";
  const saturnPlacement = shani.placements.find(p => p.toLowerCase().includes("saturn")) || "";
  const phase = shani.triggeredBy.find(t => t.toLowerCase().includes("phase")) || "";
  
  let phaseMeaning = "";
  if (phase.includes("1") || phase.toLowerCase().includes("rising")) {
    phaseMeaning = "This is the Rising Phase (Udaya Charan), marking the beginning of your Sade Sati period.";
  } else if (phase.includes("2") || phase.toLowerCase().includes("peak")) {
    phaseMeaning = "This is the Peak Phase (Shikhar Charan), the most intense period of Sade Sati.";
  } else if (phase.includes("3") || phase.toLowerCase().includes("setting")) {
    phaseMeaning = "This is the Setting Phase (Ast Charan), indicating Sade Sati is nearing its end.";
  }
  
  if (moonPlacement && saturnPlacement) {
    return `In your chart, ${moonPlacement} and ${saturnPlacement}. ${phaseMeaning}`;
  }
  return `Saturn is transiting near your natal Moon sign, activating Sade Sati. ${phaseMeaning}`;
}

export function getShaniRemediesSeer(shani: DoshaResult): string[] {
  if (shani.status === "absent") return [];
  
  return [
    "Worship Lord Shani on Saturdays"
  ];
}

export function getKaalSarpExplanationSeer(kaalSarp: DoshaResult): string {
  if (kaalSarp.status === "absent") {
    return `In your chart, planets are distributed on both sides of the Rahu-Ketu axis. This means you do not have Kaal Sarp Dosha.`;
  }
  
  const typeLine = kaalSarp.placements.find(p => p.includes("Type:"));
  const type = typeLine ? typeLine.replace("Type:", "").trim() : "Kaal Sarp Dosha";
  
  const rahuPlacement = kaalSarp.placements.find(p => p.toLowerCase().includes("rahu")) || "";
  const ketuPlacement = kaalSarp.placements.find(p => p.toLowerCase().includes("ketu")) || "";
  
  if (kaalSarp.notes.some(n => n.includes("edge") || n.includes("partial"))) {
    return `In your chart, all planets are positioned between ${rahuPlacement || "Rahu"} and ${ketuPlacement || "Ketu"}, forming ${type}. One planet is near the axis boundary, making this a partial dosha with reduced intensity.`;
  }
  
  if (rahuPlacement && ketuPlacement) {
    return `In your chart, ${rahuPlacement} and ${ketuPlacement}, with all other planets hemmed between them. This forms ${type}.`;
  }
  
  return `All seven classical planets in your chart are positioned between Rahu and Ketu. This creates ${type}, indicating karmic patterns requiring attention.`;
}

export function getKaalSarpRemediesSeer(): string[] {
  return [
    "Visit Trimbakeshwar or other Kaal Sarp temples for specific puja"
  ];
}

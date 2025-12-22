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
  
  // Handle nullified status - Mars is present but effects are canceled
  if (mangal.status === "present (nullified)" || mangal.nullified === true) {
    const placement = mangal.placements[0] || "Mars is in a sensitive house";
    const nullificationReason = mangal.cancellations.length > 0 
      ? mangal.cancellations.join(" and ")
      : "beneficial planetary influences";
    return `In your chart, ${placement}. However, this Mangal Dosha is nullified by ${nullificationReason}. The negative effects are significantly reduced or eliminated.`;
  }
  
  if (mangal.status === "partial") {
    const placement = mangal.placements[0] || "Mars is in a secondary position";
    return `In your chart, ${placement}. This triggers Mangal Dosha from Moon/Venus but not from Lagna, resulting in mild effects.`;
  }
  
  const placement = mangal.placements[0] || "Mars is in a trigger house";
  const triggers = mangal.triggeredBy.join(", ") || "Lagna";
  const severity = mangal.severity || "moderate";
  return `In your chart, ${placement}. This creates ${severity} Mangal Dosha as Mars occupies a sensitive house from ${triggers}.`;
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
  
  // Extract planet count from placements (e.g., "6 planets inside arc, 1 outside" or "6 planets inside")
  const parseInsideCount = (): number | null => {
    const sources = [...(kaalSarp.placements ?? []), ...(kaalSarp.triggeredBy ?? []), ...(kaalSarp.notes ?? [])];
    for (const s of sources) {
      const m1 = s.match(/(\d+)\s+planets?\s+inside\s+arc/i);
      if (m1) return parseInt(m1[1], 10);
      const m2 = s.match(/only\s+(\d+)\s+planet\(s\)\s+inside\s+arc/i);
      if (m2) return parseInt(m2[1], 10);
      const m3 = s.match(/(\d+)\s+planets?\s+inside\b/i);
      if (m3) return parseInt(m3[1], 10);
    }
    return null;
  };

  const insideCount = parseInsideCount() ?? 7;

  // Generate planet count text based on actual count
  const getPlanetCountText = (count: number): string => {
    if (count === 7) return "All seven classical planets";
    if (count === 6) return "Six of the seven classical planets";
    if (count === 5) return "Five of the seven classical planets";
    return `${count} classical planets`;
  };

  const planetCountText = getPlanetCountText(insideCount);
  
  if (kaalSarp.notes.some(n => n.includes("edge") || n.includes("partial"))) {
    return `In your chart, ${planetCountText.toLowerCase()} are positioned between ${rahuPlacement || "Rahu"} and ${ketuPlacement || "Ketu"}, forming ${type}. One planet is near the axis boundary, making this a partial dosha with reduced intensity.`;
  }
  
  if (rahuPlacement && ketuPlacement) {
    return `In your chart, ${rahuPlacement} and ${ketuPlacement}, with ${planetCountText.toLowerCase()} hemmed between them. This forms ${type}.`;
  }
  
  return `${planetCountText} in your chart are positioned between Rahu and Ketu. This creates ${type}, indicating karmic patterns requiring attention.`;
}

export function getKaalSarpRemediesSeer(): string[] {
  return [
    "Visit Trimbakeshwar or other Kaal Sarp temples for specific puja"
  ];
}

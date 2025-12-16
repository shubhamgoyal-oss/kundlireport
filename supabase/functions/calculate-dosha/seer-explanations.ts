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
  
  // Extract specific house placements from reasons
  const housePlacements: string[] = [];
  for (const placement of mangal.placements) {
    const ascMatch = placement.match(/Mars in H(\d+) from Ascendant/);
    if (ascMatch) {
      housePlacements.push(`${ascMatch[1]}th house from Lagna`);
    }
    const moonMatch = placement.match(/Mars in H(\d+) from Moon/);
    if (moonMatch) {
      housePlacements.push(`${moonMatch[1]}th house from Moon`);
    }
    const venusMatch = placement.match(/Mars in H(\d+) from Venus/);
    if (venusMatch) {
      housePlacements.push(`${venusMatch[1]}th house from Venus`);
    }
  }
  
  // Get Mars sign from debug info if available
  const marsSignMatch = mangal.placements.find(p => p.includes("(") && p.includes(")"));
  const signInfo = marsSignMatch ? marsSignMatch.match(/\(([^)]+)\)/)?.[1] : null;
  
  if (mangal.status === "partial") {
    if (housePlacements.length > 0) {
      return `In your chart, Mars is placed in the ${housePlacements.join(" and ")}${signInfo ? ` in ${signInfo}` : ''}. This triggers Mangal Dosha from Moon/Venus but not from Lagna, resulting in mild effects.`;
    }
    const placement = mangal.placements[0] || "Mars is in a secondary position";
    return `In your chart, ${placement}. This triggers Mangal Dosha from Moon/Venus but not from Lagna, resulting in mild effects.`;
  }
  
  // Full presence - build clear sentence with all house references
  const severity = mangal.severity || "moderate";
  
  if (housePlacements.length > 0) {
    return `In your chart, Mars is placed in the ${housePlacements.join(" and ")}${signInfo ? ` in ${signInfo}` : ''}. These are sensitive positions for Mars, creating ${severity} Mangal Dosha.`;
  }
  
  // Fallback with basic placement info
  const placementsList = mangal.placements.filter(p => p.length > 0);
  if (placementsList.length === 0) {
    return `In your chart, Mars occupies a sensitive house, creating ${severity} Mangal Dosha.`;
  }
  
  return `In your chart, ${placementsList[0]}. This creates ${severity} Mangal Dosha.`;
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
  
  // Extract specific positions from placements
  const saturnPlacement = shani.placements.find(p => p.toLowerCase().includes("saturn")) || "";
  const phase = shani.triggeredBy.find(t => t.toLowerCase().includes("phase")) || "";
  
  // Parse Saturn's house and sign from placement
  const saturnMatch = saturnPlacement.match(/Saturn in H(\d+) \(([^)]+)\)/);
  const saturnHouse = saturnMatch ? saturnMatch[1] : null;
  const saturnSignInfo = saturnMatch ? saturnMatch[2] : null;
  
  let phaseMeaning = "";
  if (phase.includes("1") || phase.toLowerCase().includes("rising")) {
    phaseMeaning = "This is the Rising Phase (Udaya Charan), marking the beginning of your Sade Sati period.";
  } else if (phase.includes("2") || phase.toLowerCase().includes("peak")) {
    phaseMeaning = "This is the Peak Phase (Shikhar Charan), the most intense period of Sade Sati.";
  } else if (phase.includes("3") || phase.toLowerCase().includes("setting")) {
    phaseMeaning = "This is the Setting Phase (Ast Charan), indicating Sade Sati is nearing its end.";
  }
  
  if (saturnHouse && saturnSignInfo) {
    return `In your chart, Saturn is placed in the ${saturnHouse}th house (${saturnSignInfo}), transiting near your natal Moon. ${phaseMeaning}`;
  }
  
  if (saturnPlacement) {
    return `In your chart, ${saturnPlacement}. Saturn is transiting near your natal Moon, activating Sade Sati. ${phaseMeaning}`;
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
  
  // Extract Rahu and Ketu positions with house and sign info
  const rahuPlacement = kaalSarp.placements.find(p => p.toLowerCase().includes("rahu at")) || "";
  const ketuPlacement = kaalSarp.placements.find(p => p.toLowerCase().includes("ketu at")) || "";
  
  // Parse positions for clearer explanation
  const rahuMatch = rahuPlacement.match(/Rahu at ([\d.]+)° \((\w+)\)/);
  const ketuMatch = ketuPlacement.match(/Ketu at ([\d.]+)° \((\w+)\)/);
  
  const rahuSign = rahuMatch ? rahuMatch[2] : null;
  const ketuSign = ketuMatch ? ketuMatch[2] : null;
  
  // Extract planet count from placements/reasons.
  // Different code paths may format this differently (e.g. "6 planets inside arc" vs "6 planets inside").
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

  const insideCount = parseInsideCount();

  // Generate planet count text based on actual count
  const getPlanetCountText = (count: number | null): string => {
    if (count === 7) return "All seven classical planets";
    if (count === 6) return "Six of the seven classical planets";
    if (count === 5) return "Five of the seven classical planets";
    if (typeof count === "number") return `${count} classical planets`;
    // If we can't reliably parse the count, avoid over-claiming "all seven".
    return "Classical planets";
  };

  const planetCountText = getPlanetCountText(insideCount);

  if (kaalSarp.notes.some(n => n.includes("edge") || n.includes("partial"))) {
    const edgePlanet = kaalSarp.notes.find(n => n.includes("at edge"));
    if (rahuSign && ketuSign) {
      return `In your chart, Rahu is in ${rahuSign} and Ketu is in ${ketuSign}. ${planetCountText} are positioned between them${edgePlanet ? ", with one planet near the boundary" : ""}. This forms ${type} with reduced intensity.`;
    }
    return `In your chart, ${planetCountText.toLowerCase()} are positioned between Rahu and Ketu, forming ${type}. One planet is near the axis boundary, making this a partial dosha with reduced intensity.`;
  }

  if (rahuSign && ketuSign) {
    const planetListSuffix = insideCount === 7 ? " (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn)" : "";
    return `In your chart, Rahu is positioned in ${rahuSign} and Ketu in ${ketuSign}. ${planetCountText}${planetListSuffix} are hemmed between this axis, forming ${type}.`;
  }

  return `${planetCountText} in your chart are positioned between Rahu and Ketu. This creates ${type}, indicating karmic patterns requiring attention.`;
}

export function getKaalSarpRemediesSeer(): string[] {
  return [
    "Visit Trimbakeshwar or other Kaal Sarp temples for specific puja"
  ];
}

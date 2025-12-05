// Explanation and remedy generators for Seer-based doshas

import type { DoshaResult } from "./seer-doshas.ts";

export function getMangalExplanationSeer(mangal: DoshaResult): string {
  if (mangal.status === "absent") {
    if (mangal.cancellations.length > 0) {
      return `Mars triggers are canceled by ${mangal.cancellations.join(", ")}.`;
    }
    return `Mars is not in trigger houses (1,2,4,7,8,12) from Lagna, Moon, or Venus.`;
  }
  
  if (mangal.status === "partial") {
    return `Mars triggers from Moon/Venus only, not from Lagna - limited impact.`;
  }
  
  const triggers = mangal.triggeredBy.join(", ");
  const severity = mangal.severity || "moderate";
  return `Mars in trigger house from ${triggers} - ${severity} intensity.`;
}

export function getMangalRemediesSeer(mangal: DoshaResult): string[] {
  if (mangal.status === "absent") return [];
  
  return [
    "Recite Hanuman Chalisa daily, especially on Tuesdays"
  ];
}

export function getPitraExplanationSeer(pitra: DoshaResult): string {
  if (pitra.status === "absent") {
    return `Sun and 9th house are free from Rahu/Ketu affliction.`;
  }
  
  if (pitra.status === "partial") {
    return `Minor affliction to 9th house or Sun from Rahu/Ketu.`;
  }
  
  const triggers = pitra.triggeredBy.join(", ");
  return `${triggers} - indicates ancestral karmic patterns.`;
}

export function getPitraRemediesSeer(pitra: DoshaResult): string[] {
  if (pitra.status === "absent") return [];
  
  return [
    "Perform Shraddha ceremony on appropriate tithis"
  ];
}

export function getShaniExplanationSeer(shani: DoshaResult): string {
  if (shani.status === "absent") {
    return `Saturn is not transiting your Moon sign or adjacent signs.`;
  }
  
  if (shani.status === "partial") {
    return `Saturn approaching your Moon sign - Sade Sati beginning soon.`;
  }
  
  const phase = shani.triggeredBy.find(t => t.includes("phase")) || "";
  const moonSign = shani.placements.find(p => p.includes("Moon"))?.match(/Moon in (\w+)/)?.[1] || "";
  const saturnSign = shani.placements.find(p => p.includes("Saturn"))?.match(/Saturn in (\w+)/)?.[1] || "";
  
  if (phase.includes("Rising") || phase.includes("1")) {
    return `Saturn in ${saturnSign}, Moon in ${moonSign} (Rising Phase - beginning of Sade Sati).`;
  }
  if (phase.includes("Peak") || phase.includes("2")) {
    return `Saturn in ${saturnSign}, Moon in ${moonSign} (Peak Phase - most intense period).`;
  }
  if (phase.includes("Setting") || phase.includes("3")) {
    return `Saturn in ${saturnSign}, Moon in ${moonSign} (Setting Phase - Sade Sati ending).`;
  }
  
  return `Saturn transiting near Moon sign - Sade Sati active.`;
}

export function getShaniRemediesSeer(shani: DoshaResult): string[] {
  if (shani.status === "absent") return [];
  
  return [
    "Worship Lord Shani on Saturdays"
  ];
}

export function getKaalSarpExplanationSeer(kaalSarp: DoshaResult): string {
  if (kaalSarp.status === "absent") {
    return `Planets distributed on both sides of Rahu-Ketu axis.`;
  }
  
  const typeLine = kaalSarp.placements.find(p => p.includes("Type:"));
  const type = typeLine ? typeLine.replace("Type:", "").trim() : "Kaal Sarp";
  
  if (kaalSarp.notes.some(n => n.includes("edge") || n.includes("partial"))) {
    return `All planets between Rahu-Ketu (${type}) - partial, reduced intensity.`;
  }
  
  return `All planets between Rahu-Ketu axis (${type}).`;
}

export function getKaalSarpRemediesSeer(): string[] {
  return [
    "Visit Trimbakeshwar or other Kaal Sarp temples for specific puja"
  ];
}

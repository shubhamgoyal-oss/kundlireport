// Explanation and remedy generators for Seer-based doshas

import type { DoshaResult } from "./seer-doshas.ts";

export function getMangalExplanationSeer(mangal: DoshaResult): string {
  if (mangal.status === "absent") {
    if (mangal.cancellations.length > 0) {
      return "Mangal Dosha was initially detected but has been canceled by protective planetary configurations. These protective factors significantly reduce or eliminate negative effects.";
    }
    return "No Mangal Dosha detected in your chart. Mars is well-placed and does not occupy houses 1, 4, 7, or 8 from your Ascendant (Lagna), which are the traditional dosha-causing positions.";
  }
  
  if (mangal.status === "partial") {
    return "Mangal Dosha is partial in your chart. Only secondary indicators are present without the primary Lagna trigger. This has limited impact and may only manifest as minor impatience or assertiveness.";
  }
  
  let exp = `Mangal Dosha is present in your chart with ${mangal.severity} intensity. Mars occupies one of the sensitive houses from the Ascendant, which can create challenges in marital harmony and partnerships. `;
  
  if (mangal.severity === "strong") {
    exp += "The strong placement of Mars in this position indicates intense will, determination, and assertiveness. While these are positive qualities, they require conscious awareness and balance, especially in close relationships where compromise is essential. ";
  } else if (mangal.severity === "moderate") {
    exp += "The moderate strength suggests periodic challenges related to Mars energy, particularly around patience, anger management, and partnership dynamics. ";
  } else {
    exp += "The mild intensity means this dosha has limited effects and may only create minor friction occasionally. ";
  }
  
  if (mangal.mitigations.length > 0) {
    exp += "Fortunately, mitigating factors are present in your chart. These positive planetary influences help soften and balance Mars's energy. ";
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
    return "No Pitra Dosha indicators detected in your chart. The 9th house and Sun are well-placed without affliction from Rahu or Ketu.";
  }
  
  if (pitra.status === "partial") {
    return "Pitra Dosha shows partial indicators. The 9th house or Sun has some affliction from Rahu or Ketu, though not at full strength.";
  }
  
  return "Pitra Dosha is present in your chart. The affliction involves the 9th house (ancestors) or Sun (paternal lineage) being influenced by Rahu or Ketu.";
}

export function getPitraRemediesSeer(pitra: DoshaResult): string[] {
  if (pitra.status === "absent") return [];
  
  return [
    "Perform Shraddha ceremony on appropriate tithis"
  ];
}

export function getShaniExplanationSeer(shani: DoshaResult): string {
  if (shani.status === "absent") {
    return "Sade Sati (Shani Dosha) is not currently active in your chart. Saturn is not transiting the signs immediately before, on, or after your natal Moon sign. Your Moon is free from Saturn's testing influence at this time.";
  }
  
  if (shani.status === "partial") {
    return "Sade Sati shows partial indicators in your chart. While not in full force, this period still calls for patience and discipline in your endeavors.";
  }
  
  let exp = "Sade Sati is currently active in your chart. Saturn is transiting through or near your natal Moon sign, creating a 7.5-year period of testing and transformation. ";
  
  if (shani.severity === "strong") {
    exp += "This is the peak phase (Saturn directly on your Moon), which brings maximum intensity. You may experience significant challenges related to discipline, responsibilities, delays, and karmic lessons. This is a time for deep introspection, patience, and building strong foundations through persistent effort. ";
  } else if (shani.severity === "moderate") {
    exp += "You are in the rising or setting phase of Sade Sati, which brings moderate challenges. Expect some obstacles, delays, and increased responsibilities. This period teaches important life lessons and builds character through perseverance. ";
  } else {
    exp += "You are experiencing a mild phase of Sade Sati with limited impact. Challenges are present but manageable with consistent effort and discipline. ";
  }
  
  if (shani.mitigations.length > 0) {
    exp += "Fortunately, positive planetary factors are present that help reduce the intensity. These beneficial influences provide support during this challenging period. ";
  }
  
  exp += "Remember that Sade Sati ultimately brings maturity, wisdom, and lasting rewards for those who face its challenges with patience and integrity.";
  
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
    return "No Kaal Sarp Dosha detected in your chart. Your planets are well-distributed on both sides of the Rahu-Ketu axis, allowing their energies to flow freely without being trapped between the lunar nodes.";
  }
  
  let exp = "Kaal Sarp Dosha is present in your birth chart. All seven classical planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn) are hemmed between Rahu (North Node) and Ketu (South Node), creating a specific karmic pattern. ";
  
  // Extract type from placements
  const typeLine = kaalSarp.placements.find(p => p.includes("Type:"));
  if (typeLine) {
    exp += `${typeLine.replace("Type:", "This is")}. `;
  }
  
  if (kaalSarp.notes.some(n => n.includes("edge") || n.includes("partial"))) {
    exp += "Note: One planet is positioned very close to the Rahu/Ketu axis (within 2 degrees), making this a partial Kaal Sarp Yoga with slightly reduced intensity. ";
  }
  
  exp += "This configuration creates a sense of being trapped or hemmed in by karmic forces, leading to inner restlessness, recurring obstacles, and the feeling that plans get blocked despite sincere effort. However, this dosha also brings intense transformation opportunities and the potential for profound spiritual growth. Those who navigate this pattern with patience and perseverance often achieve remarkable success after facing and overcoming significant challenges.";
  
  return exp;
}

export function getKaalSarpRemediesSeer(): string[] {
  return [
    "Visit Trimbakeshwar or other Kaal Sarp temples for specific puja"
  ];
}

// Panchang (Hindu Calendar) utilities

// Vaar (Weekday) - ruled by planets
export const VAAR_INFO: Record<number, { name: string; nameHindi: string; planet: string; nature: string }> = {
  0: { name: "Sunday", nameHindi: "रविवार", planet: "Sun", nature: "Leadership, father, government, authority" },
  1: { name: "Monday", nameHindi: "सोमवार", planet: "Moon", nature: "Mind, mother, emotions, intuition" },
  2: { name: "Tuesday", nameHindi: "मंगलवार", planet: "Mars", nature: "Energy, courage, action, competition" },
  3: { name: "Wednesday", nameHindi: "बुधवार", planet: "Mercury", nature: "Communication, intellect, business, learning" },
  4: { name: "Thursday", nameHindi: "गुरुवार", planet: "Jupiter", nature: "Wisdom, spirituality, luck, expansion" },
  5: { name: "Friday", nameHindi: "शुक्रवार", planet: "Venus", nature: "Love, beauty, arts, luxury, relationships" },
  6: { name: "Saturday", nameHindi: "शनिवार", planet: "Saturn", nature: "Discipline, karma, hard work, obstacles" },
};

// Tithi (Lunar Day) - 30 tithis in a lunar month
export const TITHI_INFO: Record<number, { name: string; paksha: string; nature: string; ruling_deity: string }> = {
  1: { name: "Pratipada", paksha: "Shukla", nature: "New beginnings, auspicious", ruling_deity: "Agni" },
  2: { name: "Dwitiya", paksha: "Shukla", nature: "Growth, continuation", ruling_deity: "Brahma" },
  3: { name: "Tritiya", paksha: "Shukla", nature: "Auspicious, good for marriage", ruling_deity: "Gauri" },
  4: { name: "Chaturthi", paksha: "Shukla", nature: "Vinayaka, remove obstacles", ruling_deity: "Ganesh" },
  5: { name: "Panchami", paksha: "Shukla", nature: "Knowledge, learning", ruling_deity: "Serpent" },
  6: { name: "Shashthi", paksha: "Shukla", nature: "Victory, fame", ruling_deity: "Kartikeya" },
  7: { name: "Saptami", paksha: "Shukla", nature: "Travel, movement", ruling_deity: "Sun" },
  8: { name: "Ashtami", paksha: "Shukla", nature: "Durga worship, power", ruling_deity: "Durga" },
  9: { name: "Navami", paksha: "Shukla", nature: "Aggression, avoid new work", ruling_deity: "Durga" },
  10: { name: "Dashami", paksha: "Shukla", nature: "Righteousness, dharma", ruling_deity: "Yama" },
  11: { name: "Ekadashi", paksha: "Shukla", nature: "Fasting, spiritual", ruling_deity: "Vishnu" },
  12: { name: "Dwadashi", paksha: "Shukla", nature: "Religious ceremonies", ruling_deity: "Vishnu" },
  13: { name: "Trayodashi", paksha: "Shukla", nature: "Friendship, good results", ruling_deity: "Kamadeva" },
  14: { name: "Chaturdashi", paksha: "Shukla", nature: "Shiva worship", ruling_deity: "Shiva" },
  15: { name: "Purnima", paksha: "Shukla", nature: "Full Moon, completion", ruling_deity: "Moon" },
  16: { name: "Pratipada", paksha: "Krishna", nature: "Decline begins", ruling_deity: "Agni" },
  17: { name: "Dwitiya", paksha: "Krishna", nature: "Continuation", ruling_deity: "Brahma" },
  18: { name: "Tritiya", paksha: "Krishna", nature: "Moderate", ruling_deity: "Gauri" },
  19: { name: "Chaturthi", paksha: "Krishna", nature: "Sankashti, Ganesh worship", ruling_deity: "Ganesh" },
  20: { name: "Panchami", paksha: "Krishna", nature: "Learning", ruling_deity: "Serpent" },
  21: { name: "Shashthi", paksha: "Krishna", nature: "Victory", ruling_deity: "Kartikeya" },
  22: { name: "Saptami", paksha: "Krishna", nature: "Movement", ruling_deity: "Sun" },
  23: { name: "Ashtami", paksha: "Krishna", nature: "Power, Kalashtami", ruling_deity: "Durga" },
  24: { name: "Navami", paksha: "Krishna", nature: "Avoid new work", ruling_deity: "Durga" },
  25: { name: "Dashami", paksha: "Krishna", nature: "Dharma", ruling_deity: "Yama" },
  26: { name: "Ekadashi", paksha: "Krishna", nature: "Spiritual, fasting", ruling_deity: "Vishnu" },
  27: { name: "Dwadashi", paksha: "Krishna", nature: "Ceremonies", ruling_deity: "Vishnu" },
  28: { name: "Trayodashi", paksha: "Krishna", nature: "Pradosh, Shiva", ruling_deity: "Kamadeva" },
  29: { name: "Chaturdashi", paksha: "Krishna", nature: "Shivaratri type", ruling_deity: "Shiva" },
  30: { name: "Amavasya", paksha: "Krishna", nature: "New Moon, ancestors", ruling_deity: "Pitris" },
};

// Karana (Half Tithi) - 11 types
export const KARANA_INFO: Record<string, { nature: string; mobility: string }> = {
  "Bava": { nature: "Fixed, stable", mobility: "Movable" },
  "Balava": { nature: "Growth", mobility: "Movable" },
  "Kaulava": { nature: "Good for relationships", mobility: "Movable" },
  "Taitila": { nature: "Wealth gains", mobility: "Movable" },
  "Gara": { nature: "Agriculture, farming", mobility: "Movable" },
  "Vanija": { nature: "Business, trade", mobility: "Movable" },
  "Vishti": { nature: "Inauspicious, Bhadra", mobility: "Movable" },
  "Shakuni": { nature: "Negative", mobility: "Fixed" },
  "Chatushpada": { nature: "Animals, cattle", mobility: "Fixed" },
  "Naga": { nature: "Serpent related", mobility: "Fixed" },
  "Kimstughna": { nature: "Auspicious", mobility: "Fixed" },
};

// Yoga (Luni-Solar combination) - 27 types
export const YOGA_INFO: Record<string, { nature: string; category: string }> = {
  "Vishkumbha": { nature: "Obstacles, troubles", category: "Inauspicious" },
  "Priti": { nature: "Love, affection", category: "Auspicious" },
  "Ayushman": { nature: "Long life, health", category: "Auspicious" },
  "Saubhagya": { nature: "Good fortune", category: "Auspicious" },
  "Shobhana": { nature: "Beauty, grace", category: "Auspicious" },
  "Atiganda": { nature: "Danger, obstacles", category: "Inauspicious" },
  "Sukarma": { nature: "Good deeds rewarded", category: "Auspicious" },
  "Dhriti": { nature: "Patience, firmness", category: "Auspicious" },
  "Shula": { nature: "Pain, difficulties", category: "Inauspicious" },
  "Ganda": { nature: "Obstacles", category: "Inauspicious" },
  "Vriddhi": { nature: "Growth, increase", category: "Auspicious" },
  "Dhruva": { nature: "Stability, permanence", category: "Auspicious" },
  "Vyaghata": { nature: "Destruction", category: "Inauspicious" },
  "Harshana": { nature: "Joy, happiness", category: "Auspicious" },
  "Vajra": { nature: "Strong like diamond", category: "Mixed" },
  "Siddhi": { nature: "Success, accomplishment", category: "Auspicious" },
  "Vyatipata": { nature: "Calamity", category: "Inauspicious" },
  "Variyana": { nature: "Comfort", category: "Auspicious" },
  "Parigha": { nature: "Obstruction", category: "Inauspicious" },
  "Shiva": { nature: "Auspicious, Shiva", category: "Auspicious" },
  "Siddha": { nature: "Accomplishment", category: "Auspicious" },
  "Sadhya": { nature: "Achievement", category: "Auspicious" },
  "Shubha": { nature: "Auspicious", category: "Auspicious" },
  "Shukla": { nature: "Bright, pure", category: "Auspicious" },
  "Brahma": { nature: "Creation, knowledge", category: "Auspicious" },
  "Indra": { nature: "Power, authority", category: "Auspicious" },
  "Vaidhriti": { nature: "Calamity", category: "Inauspicious" },
};

// Calculate approximate Tithi from Moon and Sun positions
export function calculateTithi(moonDegree: number, sunDegree: number): number {
  const diff = ((moonDegree - sunDegree + 360) % 360);
  return Math.floor(diff / 12) + 1;
}

// Get Vaar from date
export function getVaar(date: Date): { name: string; nameHindi: string; planet: string; nature: string } {
  return VAAR_INFO[date.getDay()];
}

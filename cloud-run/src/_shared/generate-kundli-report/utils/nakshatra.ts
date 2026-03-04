// Nakshatra (Lunar Mansion) utilities

export interface NakshatraInfo {
  index: number;
  name: string;
  nameHindi: string;
  lord: string;
  deity: string;
  symbol: string;
  element: string;
  guna: string;
  animal: string;
  startDegree: number;
  endDegree: number;
}

// 27 Nakshatras with their properties
export const NAKSHATRAS: NakshatraInfo[] = [
  { index: 1, name: "Ashwini", nameHindi: "अश्विनी", lord: "Ketu", deity: "Ashwini Kumaras", symbol: "Horse head", element: "Earth", guna: "Rajas", animal: "Horse", startDegree: 0, endDegree: 13.33 },
  { index: 2, name: "Bharani", nameHindi: "भरणी", lord: "Venus", deity: "Yama", symbol: "Yoni", element: "Earth", guna: "Rajas", animal: "Elephant", startDegree: 13.33, endDegree: 26.67 },
  { index: 3, name: "Krittika", nameHindi: "कृत्तिका", lord: "Sun", deity: "Agni", symbol: "Razor/Flame", element: "Fire", guna: "Rajas", animal: "Goat", startDegree: 26.67, endDegree: 40 },
  { index: 4, name: "Rohini", nameHindi: "रोहिणी", lord: "Moon", deity: "Brahma", symbol: "Chariot/Ox cart", element: "Earth", guna: "Rajas", animal: "Serpent", startDegree: 40, endDegree: 53.33 },
  { index: 5, name: "Mrigashira", nameHindi: "मृगशिरा", lord: "Mars", deity: "Soma", symbol: "Deer head", element: "Earth", guna: "Tamas", animal: "Serpent", startDegree: 53.33, endDegree: 66.67 },
  { index: 6, name: "Ardra", nameHindi: "आर्द्रा", lord: "Rahu", deity: "Rudra", symbol: "Teardrop", element: "Water", guna: "Tamas", animal: "Dog", startDegree: 66.67, endDegree: 80 },
  { index: 7, name: "Punarvasu", nameHindi: "पुनर्वसु", lord: "Jupiter", deity: "Aditi", symbol: "Bow and quiver", element: "Water", guna: "Sattva", animal: "Cat", startDegree: 80, endDegree: 93.33 },
  { index: 8, name: "Pushya", nameHindi: "पुष्य", lord: "Saturn", deity: "Brihaspati", symbol: "Flower/Circle", element: "Water", guna: "Sattva", animal: "Goat", startDegree: 93.33, endDegree: 106.67 },
  { index: 9, name: "Ashlesha", nameHindi: "आश्लेषा", lord: "Mercury", deity: "Naga", symbol: "Serpent", element: "Water", guna: "Sattva", animal: "Cat", startDegree: 106.67, endDegree: 120 },
  { index: 10, name: "Magha", nameHindi: "मघा", lord: "Ketu", deity: "Pitris", symbol: "Throne/Palanquin", element: "Fire", guna: "Tamas", animal: "Rat", startDegree: 120, endDegree: 133.33 },
  { index: 11, name: "Purva Phalguni", nameHindi: "पूर्व फाल्गुनी", lord: "Venus", deity: "Bhaga", symbol: "Hammock/Bed", element: "Fire", guna: "Tamas", animal: "Rat", startDegree: 133.33, endDegree: 146.67 },
  { index: 12, name: "Uttara Phalguni", nameHindi: "उत्तर फाल्गुनी", lord: "Sun", deity: "Aryaman", symbol: "Bed/Cot", element: "Fire", guna: "Tamas", animal: "Cow", startDegree: 146.67, endDegree: 160 },
  { index: 13, name: "Hasta", nameHindi: "हस्त", lord: "Moon", deity: "Savitar", symbol: "Hand/Fist", element: "Fire", guna: "Rajas", animal: "Buffalo", startDegree: 160, endDegree: 173.33 },
  { index: 14, name: "Chitra", nameHindi: "चित्रा", lord: "Mars", deity: "Vishwakarma", symbol: "Pearl/Jewel", element: "Fire", guna: "Rajas", animal: "Tiger", startDegree: 173.33, endDegree: 186.67 },
  { index: 15, name: "Swati", nameHindi: "स्वाति", lord: "Rahu", deity: "Vayu", symbol: "Coral/Sword", element: "Fire", guna: "Rajas", animal: "Buffalo", startDegree: 186.67, endDegree: 200 },
  { index: 16, name: "Vishakha", nameHindi: "विशाखा", lord: "Jupiter", deity: "Indra-Agni", symbol: "Archway/Triumphal gate", element: "Fire", guna: "Sattva", animal: "Tiger", startDegree: 200, endDegree: 213.33 },
  { index: 17, name: "Anuradha", nameHindi: "अनुराधा", lord: "Saturn", deity: "Mitra", symbol: "Lotus/Staff", element: "Fire", guna: "Sattva", animal: "Deer", startDegree: 213.33, endDegree: 226.67 },
  { index: 18, name: "Jyeshtha", nameHindi: "ज्येष्ठा", lord: "Mercury", deity: "Indra", symbol: "Earring/Umbrella", element: "Air", guna: "Sattva", animal: "Deer", startDegree: 226.67, endDegree: 240 },
  { index: 19, name: "Mula", nameHindi: "मूल", lord: "Ketu", deity: "Nirriti", symbol: "Roots/Tail", element: "Air", guna: "Tamas", animal: "Dog", startDegree: 240, endDegree: 253.33 },
  { index: 20, name: "Purva Ashadha", nameHindi: "पूर्व आषाढ़ा", lord: "Venus", deity: "Apas", symbol: "Fan/Tusk", element: "Air", guna: "Tamas", animal: "Monkey", startDegree: 253.33, endDegree: 266.67 },
  { index: 21, name: "Uttara Ashadha", nameHindi: "उत्तर आषाढ़ा", lord: "Sun", deity: "Vishvadevas", symbol: "Elephant tusk/Planks", element: "Air", guna: "Tamas", animal: "Mongoose", startDegree: 266.67, endDegree: 280 },
  { index: 22, name: "Shravana", nameHindi: "श्रवण", lord: "Moon", deity: "Vishnu", symbol: "Ear/Three footprints", element: "Air", guna: "Rajas", animal: "Monkey", startDegree: 280, endDegree: 293.33 },
  { index: 23, name: "Dhanishta", nameHindi: "धनिष्ठा", lord: "Mars", deity: "Vasus", symbol: "Drum/Flute", element: "Air", guna: "Rajas", animal: "Lion", startDegree: 293.33, endDegree: 306.67 },
  { index: 24, name: "Shatabhisha", nameHindi: "शतभिषा", lord: "Rahu", deity: "Varuna", symbol: "Empty circle", element: "Air", guna: "Rajas", animal: "Horse", startDegree: 306.67, endDegree: 320 },
  { index: 25, name: "Purva Bhadrapada", nameHindi: "पूर्व भाद्रपद", lord: "Jupiter", deity: "Aja Ekapada", symbol: "Sword/Two-faced man", element: "Ether", guna: "Sattva", animal: "Lion", startDegree: 320, endDegree: 333.33 },
  { index: 26, name: "Uttara Bhadrapada", nameHindi: "उत्तर भाद्रपद", lord: "Saturn", deity: "Ahirbudhnya", symbol: "Twin/Serpent", element: "Ether", guna: "Sattva", animal: "Cow", startDegree: 333.33, endDegree: 346.67 },
  { index: 27, name: "Revati", nameHindi: "रेवती", lord: "Mercury", deity: "Pushan", symbol: "Fish/Drum", element: "Ether", guna: "Sattva", animal: "Elephant", startDegree: 346.67, endDegree: 360 },
];

// Get nakshatra from degree (0-360)
export function getNakshatraFromDegree(degree: number): NakshatraInfo {
  const normalizedDegree = ((degree % 360) + 360) % 360;
  const nakshatraIndex = Math.floor(normalizedDegree / 13.333333);
  return NAKSHATRAS[nakshatraIndex];
}

// Get pada (quarter) of nakshatra (1-4)
export function getPada(degree: number): number {
  const normalizedDegree = ((degree % 360) + 360) % 360;
  const degreeInNakshatra = normalizedDegree % 13.333333;
  return Math.floor(degreeInNakshatra / 3.333333) + 1;
}

// Get nakshatra and pada together
export function getNakshatraWithPada(degree: number): { nakshatra: NakshatraInfo; pada: number } {
  return {
    nakshatra: getNakshatraFromDegree(degree),
    pada: getPada(degree),
  };
}

// Get Moon nakshatra (birth star)
export function getMoonNakshatra(moonDegree: number): NakshatraInfo {
  return getNakshatraFromDegree(moonDegree);
}

// Vimshottari dasha starting planet based on nakshatra
export function getDashaStartingPlanet(nakshatra: NakshatraInfo): string {
  return nakshatra.lord;
}

// Dasha periods in years
export const DASHA_PERIODS: Record<string, number> = {
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
  Ketu: 7,
  Venus: 20,
};

// Dasha sequence
export const DASHA_SEQUENCE = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];

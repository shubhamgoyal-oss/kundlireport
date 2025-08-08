// Western Astrology Rashi (Zodiac Sign) calculation based on date ranges
const rashiDates = [
  { name: "मेष (Aries)", start: { month: 3, day: 21 }, end: { month: 4, day: 19 } },
  { name: "वृषभ (Taurus)", start: { month: 4, day: 20 }, end: { month: 5, day: 20 } },
  { name: "मिथुन (Gemini)", start: { month: 5, day: 21 }, end: { month: 6, day: 20 } },
  { name: "कर्क (Cancer)", start: { month: 6, day: 21 }, end: { month: 7, day: 22 } },
  { name: "सिंह (Leo)", start: { month: 7, day: 23 }, end: { month: 8, day: 22 } },
  { name: "कन्या (Virgo)", start: { month: 8, day: 23 }, end: { month: 9, day: 22 } },
  { name: "तुला (Libra)", start: { month: 9, day: 23 }, end: { month: 10, day: 22 } },
  { name: "वृश्चिक (Scorpio)", start: { month: 10, day: 23 }, end: { month: 11, day: 21 } },
  { name: "धनु (Sagittarius)", start: { month: 11, day: 22 }, end: { month: 12, day: 21 } },
  { name: "मकर (Capricorn)", start: { month: 12, day: 22 }, end: { month: 1, day: 19 } },
  { name: "कुम्भ (Aquarius)", start: { month: 1, day: 20 }, end: { month: 2, day: 18 } },
  { name: "मीन (Pisces)", start: { month: 2, day: 19 }, end: { month: 3, day: 20 } }
];

export function calculateRashi(day: number, month: number, year: number): string {
  for (const rashi of rashiDates) {
    const startMonth = rashi.start.month;
    const startDay = rashi.start.day;
    const endMonth = rashi.end.month;
    const endDay = rashi.end.day;
    
    if (startMonth <= endMonth) {
      // Same year range
      if ((month === startMonth && day >= startDay) || 
          (month > startMonth && month < endMonth) ||
          (month === endMonth && day <= endDay)) {
        return rashi.name;
      }
    } else {
      // Cross year boundary (like Capricorn to Aquarius)
      if ((month === startMonth && day >= startDay) || 
          (month > startMonth) ||
          (month < endMonth) ||
          (month === endMonth && day <= endDay)) {
        return rashi.name;
      }
    }
  }
  
  return "मेष (Aries)"; // Default fallback
}

export function calculateMoolank(day: number, month: number, year: number): number {
  // Only use day digits for Moolank calculation
  let sum = 0;
  const dayString = day.toString();
  
  // Sum all digits of the day
  for (const char of dayString) {
    sum += parseInt(char);
  }
  
  // Reduce to single digit (1-9)
  while (sum > 9) {
    const digits = sum.toString();
    sum = 0;
    for (const digit of digits) {
      sum += parseInt(digit);
    }
  }
  
  return sum;
}

// Example calculations for testing:
// Birthday day: 24
// Digits: 2+4 = 6
// Moolank: 6
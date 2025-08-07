// Accurate Vedic Astrology and Numerology Calculations

// Vedic Rashi (Moon Sign) calculation based on date ranges
// This is a simplified approach - for full accuracy, you'd need time and location
const rashiDates = [
  { name: "मेष (Aries)", start: { month: 4, day: 14 }, end: { month: 5, day: 14 } },
  { name: "वृषभ (Taurus)", start: { month: 5, day: 15 }, end: { month: 6, day: 14 } },
  { name: "मिथुन (Gemini)", start: { month: 6, day: 15 }, end: { month: 7, day: 16 } },
  { name: "कर्क (Cancer)", start: { month: 7, day: 17 }, end: { month: 8, day: 16 } },
  { name: "सिंह (Leo)", start: { month: 8, day: 17 }, end: { month: 9, day: 16 } },
  { name: "कन्या (Virgo)", start: { month: 9, day: 17 }, end: { month: 10, day: 16 } },
  { name: "तुला (Libra)", start: { month: 10, day: 17 }, end: { month: 11, day: 15 } },
  { name: "वृश्चिक (Scorpio)", start: { month: 11, day: 16 }, end: { month: 12, day: 15 } },
  { name: "धनु (Sagittarius)", start: { month: 12, day: 16 }, end: { month: 1, day: 14 } },
  { name: "मकर (Capricorn)", start: { month: 1, day: 15 }, end: { month: 2, day: 12 } },
  { name: "कुम्भ (Aquarius)", start: { month: 2, day: 13 }, end: { month: 3, day: 14 } },
  { name: "मीन (Pisces)", start: { month: 3, day: 15 }, end: { month: 4, day: 13 } }
];

export function calculateRashi(day: number, month: number, year: number): string {
  // Simple approach based on approximate Vedic dates
  // For more accuracy, would need time, location and proper ephemeris calculations
  
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
      // Cross year boundary (like Sagittarius to Capricorn)
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
  // Convert to string to work with individual digits
  const dateString = `${day.toString().padStart(2, '0')}${month.toString().padStart(2, '0')}${year}`;
  
  // Sum all digits
  let sum = 0;
  for (const char of dateString) {
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
// Birthday: 15/03/1995
// Digits: 1+5+0+3+1+9+9+5 = 33
// Reduce: 3+3 = 6
// Moolank: 6
/**
 * Sri Mandir Puja data fetching and filtering utilities
 */

export interface SriMandirPuja {
  store_id: string;
  pooja_title: string;
  temple_name: string;
  pooja_title_english?: string;
  temple_name_english?: string;
  cover_media_url: string;
  puja_link: string;
  puja_link_hindi: string;
  individual_pack_price_inr: number;
  schedule_date_ist: string;
}

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1erweJnzoGMXOiA8HfZ7w9ZOA1nv2Mbt3ejiaUthfTNY/export?format=csv&gid=0';

// Hindi to English translations for puja titles (CSV has Hindi by default)
const HINDI_TO_ENGLISH_TITLES: Record<string, string> = {
  'पितृ दोष निवारण महायज्ञ एवं काशी गंगा महाआरती': 'Pitru Dosha Nivaran Mahayagya & Kashi Ganga Maha Aarti',
  'पितृ दोष शांति महापूजा एवं काशी गंगा आरती': 'Pitra Dosha Shanti Mahapuja & Kashi Ganga Aarti',
  'पितृ दोष निवारण पूजा एवं काशी गंगा आरती': 'Pitra Dosha Nivaran Puja & Kashi Ganga Aarti',
  'त्र्यंबकेश्वर ज्योतिर्लिंग रुद्राभिषेक और काल सर्प दोष निवारण पूजा': 'Trimbakeshwar Jyotirlinga Rudrabhishek & Kaal Sarp Dosha Nivaran Puja',
  'काल सर्प दोष निवारण पूजा एवं त्र्यंबकेश्वर ज्योतिर्लिंग रुद्राभिषेक': 'Kaal Sarp Dosha Nivaran Puja & Trimbakeshwar Jyotirlinga Rudrabhishek',
  'राहु-सूर्य दोष निवारण पूजा': 'Rahu-Surya Dosha Nivaran Puja',
  'मंगल दोष निवारण पूजा': 'Mangal Dosha Nivaran Puja',
  'शनि शांति पूजा': 'Shani Shanti Puja',
  'शनि साढ़े साती शांति पूजा': 'Shani Sade Sati Shanti Puja',
  'नवग्रह शांति पूजा': 'Navagraha Shanti Puja',
  'गुरु चांडाल दोष निवारण पूजा': 'Guru Chandal Dosha Nivaran Puja',
  'श्रापित दोष निवारण पूजा': 'Shrapit Dosha Nivaran Puja',
  'काल सर्प दोष पूजा': 'Kaal Sarp Dosha Puja',
  'मंगल पूजा': 'Mangal Puja',
  'शनि पूजा': 'Shani Puja',
  'राहु पूजा': 'Rahu Puja',
  'केतु पूजा': 'Ketu Puja',
  'नवग्रह शांति पूजा, शनि तिल तेल अभिषेक और पाप ग्रह शांति यज्ञ': 'Navagraha Shanti Puja, Shani Til Tel Abhishek and Paap Graha Shanti Yagya',
};

// Word-level translations for fallback (comprehensive list)
const HINDI_WORD_TRANSLATIONS: Record<string, string> = {
  // Puja related
  'पूजा': 'Puja',
  'महापूजा': 'Mahapuja',
  'दोष': 'Dosha',
  'निवारण': 'Nivaran',
  'शांति': 'Shanti',
  'महायज्ञ': 'Mahayagya',
  'यज्ञ': 'Yagya',
  'अभिषेक': 'Abhishek',
  'रुद्राभिषेक': 'Rudrabhishek',
  'आरती': 'Aarti',
  'महाआरती': 'Maha Aarti',
  'महादशा': 'Mahadasha',
  
  // Temple related
  'मंदिर': 'Temple',
  'ज्योतिर्लिंग': 'Jyotirlinga',
  'देव': 'Dev',
  
  // Conjunctions and connectors
  'एवं': '&',
  'और': 'and',
  
  // Materials and offerings
  'तिल': 'Til',
  'तेल': 'Tel',
  'गंगा': 'Ganga',
  
  // Astrological terms
  'पाप': 'Paap',
  'ग्रह': 'Graha',
  'नवग्रह': 'Navagraha',
  
  // Planets
  'मंगल': 'Mangal',
  'शनि': 'Shani',
  'साढ़े साती': 'Sade Sati',
  'साढ़ेसाती': 'Sade Sati',
  'राहु': 'Rahu',
  'केतु': 'Ketu',
  'गुरु': 'Guru',
  'सूर्य': 'Surya',
  'चंद्र': 'Chandra',
  'चन्द्र': 'Chandra',
  'बुध': 'Budh',
  'शुक्र': 'Shukra',
  
  // Doshas
  'काल सर्प': 'Kaal Sarp',
  'कालसर्प': 'Kaal Sarp',
  'पितृ': 'Pitru',
  'पितर': 'Pitra',
  'श्रापित': 'Shrapit',
  'चांडाल': 'Chandal',
  
  // Places
  'काशी': 'Kashi',
  'त्र्यंबकेश्वर': 'Trimbakeshwar',
  'हथला': 'Hathla',
};

// English to Hindi translations (reverse mapping for backward compatibility)
const ENGLISH_TO_HINDI_TITLES: Record<string, string> = Object.fromEntries(
  Object.entries(HINDI_TO_ENGLISH_TITLES).map(([hi, en]) => [en, hi])
);

// Hindi to English translations for temple names (CSV has Hindi by default)
const HINDI_TO_ENGLISH_TEMPLES: Record<string, string> = {
  'काशी विश्वनाथ मंदिर': 'Kashi Vishwanath Temple',
  'त्र्यंबकेश्वर मंदिर': 'Trimbakeshwar Temple',
  'त्र्यंबकेश्वर ज्योतिर्लिंग': 'Trimbakeshwar Jyotirlinga',
  'महाकालेश्वर मंदिर': 'Mahakaleshwar Temple',
  'सोमनाथ मंदिर': 'Somnath Temple',
  'केदारनाथ मंदिर': 'Kedarnath Temple',
  'बद्रीनाथ मंदिर': 'Badrinath Temple',
  'रामेश्वरम मंदिर': 'Rameshwaram Temple',
  'द्वारकाधीश मंदिर': 'Dwarkadhish Temple',
  'जगन्नाथ पुरी मंदिर': 'Jagannath Puri Temple',
  'हथला शनि देव मंदिर': 'Hathla Shani Dev Temple',
};

// English to Hindi translations (reverse mapping for backward compatibility)
const ENGLISH_TO_HINDI_TEMPLES: Record<string, string> = Object.fromEntries(
  Object.entries(HINDI_TO_ENGLISH_TEMPLES).map(([hi, en]) => [en, hi])
);

/**
 * Parse CSV and return puja objects
 */
// Helper to fetch a field with case-insensitive and variant key support
function getFieldInsensitive(row: Record<string, string>, candidates: string[]): string {
  const normalize = (k: string) => k.trim().toLowerCase().replace(/[_\s]+/g, ' ').replace(/\s+/g, ' ').trim();
  const map = new Map<string, string>();
  Object.entries(row).forEach(([k, v]) => {
    map.set(normalize(k), v);
  });
  for (const c of candidates) {
    const key = normalize(c);
    if (map.has(key)) {
      return (map.get(key) || '').trim();
    }
  }
  return '';
}
function parseCSV(csvText: string): SriMandirPuja[] {
  // Remove potential BOM and normalise newlines
  const text = csvText.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  // Robust CSV line splitter (handles quotes and commas within quotes)
  const splitCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        // Handle escaped quotes
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result.map(v => v.trim().replace(/^"|"$/g, ''));
  };

  const headers = splitCSVLine(lines[0]);
  const pujas: SriMandirPuja[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    if (values.length < headers.length) continue;

    const puja: Record<string, string> = {};
    headers.forEach((header, idx) => {
      puja[header] = values[idx] ?? '';
    });

    if (puja.store_id && puja.pooja_title) {
      const poojaTitleEn = puja.pooja_title_english || getFieldInsensitive(puja, [
        'puja title english', 'pooja title english', 'puja_title_english', 'pooja_title_english', 'title english', 'english title'
      ]);
      const templeNameEn = puja.temple_name_english || getFieldInsensitive(puja, [
        'temple name english', 'temple_name_english', 'temple english', 'english temple name'
      ]);

      pujas.push({
        store_id: puja.store_id,
        pooja_title: puja.pooja_title,
        temple_name: puja.temple_name || '',
        pooja_title_english: poojaTitleEn,
        temple_name_english: templeNameEn,
        cover_media_url: puja.cover_media_url || '',
        puja_link: puja.puja_link || puja.pooja_link || '',
        puja_link_hindi:
          puja.puja_link_hindi ||
          puja.puja_link_hi ||
          puja.pooja_link_hindi ||
          puja.pooja_link_hi ||
          puja.hindi_puja_link ||
          puja.hindi_pooja_link ||
          puja.hindi_link ||
          puja.puja_link ||
          puja.pooja_link ||
          '',
        individual_pack_price_inr: parseFloat(puja.individual_pack_price_inr) || 0,
        schedule_date_ist: puja.schedule_date_ist || '',
      });
    }
  }

  return pujas;
}

/**
 * Fetch pujas from Google Sheet with caching
 */
let cachedPujas: SriMandirPuja[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export async function fetchSriMandirPujas(): Promise<SriMandirPuja[]> {
  const now = Date.now();
  
  // Return cached data if still fresh
  if (cachedPujas.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return cachedPujas;
  }

  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) {
      console.warn('Failed to fetch Sri Mandir pujas');
      return cachedPujas; // Return old cache if fetch fails
    }
    const csvText = await response.text();
    const pujas = parseCSV(csvText);
    
    // Update cache
    cachedPujas = pujas;
    lastFetchTime = now;
    
    return pujas;
  } catch (error) {
    console.warn('Error fetching Sri Mandir pujas:', error);
    return cachedPujas; // Return old cache on error
  }
}

/**
 * Filter pujas by dosha type
 */
export function filterPujasByDosha(
  pujas: SriMandirPuja[], 
  doshaType: 'mangal' | 'kaalSarp' | 'kaal-sarp' | 'pitra' | 'sadeSati' | 'shani' | 'rahu' | 'shrapit' | 'guru-chandal'
): SriMandirPuja[] {
  const keywords: Record<string, string[]> = {
    pitra: ['pitru', 'pitra', 'पितृ', 'पितर'],
    kaalSarp: ['kaal sarp', 'काल सर्प'],
    'kaal-sarp': ['kaal sarp', 'काल सर्प'],
    mangal: ['mangal', 'kuja', 'मंगल'],
    sadeSati: ['shani', 'saturn', 'शनि'],
    shani: ['shani', 'saturn', 'शनि'],
    rahu: ['rahu', 'राहु'],
    shrapit: ['shrapit', 'श्रापित'],
    'guru-chandal': ['guru chandal', 'गुरु चांडाल'],
  };

  const searchTerms = keywords[doshaType];
  if (!searchTerms) return [];
  
  return pujas.filter(puja => {
    const title = puja.pooja_title.toLowerCase();
    return searchTerms.some(term => title.includes(term.toLowerCase()));
  });
}

/**
 * Parse DD/MM/YYYY to Date object
 */
function parseIndianDate(dateStr: string): Date | null {
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

/**
 * Sort pujas by date ascending and return next 1-3 upcoming entries
 */
export function getUpcomingPujas(pujas: SriMandirPuja[], maxCount = 3): SriMandirPuja[] {
  const now = new Date();
  
  const sorted = pujas
    .map(puja => ({
      puja,
      date: parseIndianDate(puja.schedule_date_ist),
    }))
    .filter(item => item.date !== null && item.date >= now)
    .sort((a, b) => a.date!.getTime() - b.date!.getTime())
    .slice(0, maxCount);

  return sorted.map(item => item.puja);
}

/**
 * Fallback translation using word-by-word replacement
 */
function fallbackTranslation(hindiText: string): string {
  let result = hindiText;
  
  // Sort by length descending to replace longer phrases first
  const sortedEntries = Object.entries(HINDI_WORD_TRANSLATIONS)
    .sort((a, b) => b[0].length - a[0].length);
  
  // Replace each Hindi word/phrase with English
  sortedEntries.forEach(([hindi, english]) => {
    // Use global flag and case-insensitive matching
    const regex = new RegExp(hindi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, english);
  });
  
  // Clean up multiple spaces
  result = result.replace(/\s+/g, ' ').trim();
  
  return result;
}

/**
 * Get the puja title in the specified language
 * CSV has Hindi titles, so return as-is for Hindi, translate to English for English
 */
export function getPujaTitle(puja: SriMandirPuja | string, language: string): string {
  const isHindi = language?.toLowerCase().startsWith('hi');
  
  // Handle both old string API and new object API
  const originalTitle = typeof puja === 'string' ? puja : puja.pooja_title;
  const englishTitle = typeof puja === 'string' ? undefined : puja.pooja_title_english;
  
  if (isHindi) {
    return originalTitle; // already Hindi in CSV
  }
  
  // If English column is available, use it
  if (englishTitle && englishTitle.trim()) {
    return englishTitle;
  }
  
  // Try exact match first
  if (HINDI_TO_ENGLISH_TITLES[originalTitle]) {
    return HINDI_TO_ENGLISH_TITLES[originalTitle];
  }
  
  // Try fallback word-by-word translation
  const fallback = fallbackTranslation(originalTitle);
  return fallback !== originalTitle ? fallback : originalTitle;
}

/**
 * Get the temple name in the specified language
 * CSV has Hindi names, so return as-is for Hindi, translate to English for English
 */
export function getTempleName(puja: SriMandirPuja | string, language: string): string {
  const isHindi = language?.toLowerCase().startsWith('hi');
  
  // Handle both old string API and new object API
  const originalName = typeof puja === 'string' ? puja : puja.temple_name;
  const englishName = typeof puja === 'string' ? undefined : puja.temple_name_english;
  
  if (isHindi) {
    return originalName; // already Hindi in CSV
  }
  
  // If English column is available, use it
  if (englishName && englishName.trim()) {
    return englishName;
  }
  
  // Try exact match first
  if (HINDI_TO_ENGLISH_TEMPLES[originalName]) {
    return HINDI_TO_ENGLISH_TEMPLES[originalName];
  }
  
  // Try fallback word-by-word translation
  const fallback = fallbackTranslation(originalName);
  return fallback !== originalName ? fallback : originalName;
}

/**
 * Translate Hindi title to English (kept for backwards compatibility)
 */
export function translateTitle(hindiTitle: string): string {
  return HINDI_TO_ENGLISH_TITLES[hindiTitle] || hindiTitle;
}

/**
 * Translate Hindi temple name to English (kept for backwards compatibility)
 */
export function translateTempleName(hindiName: string): string {
  return HINDI_TO_ENGLISH_TEMPLES[hindiName] || hindiName;
}

/**
 * Format DD/MM/YYYY based on language
 * @param dateStr - Date string in DD/MM/YYYY format
 * @param language - The current language ('en' or 'hi')
 */
export function formatScheduleDate(dateStr: string, language: string = 'en'): string {
  const date = parseIndianDate(dateStr);
  if (!date) return dateStr;
  
  const isHindi = language?.toLowerCase().startsWith('hi');
  const locale = isHindi ? 'hi-IN' : 'en-GB';
  
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * Get the appropriate puja link based on language
 */
export function getPujaLink(puja: SriMandirPuja, language: string): string {
  const isHindi = language?.toLowerCase().startsWith('hi');
  if (isHindi) {
    return puja.puja_link_hindi || puja.puja_link;
  }
  return puja.puja_link || puja.puja_link_hindi;
}

/**
 * Sri Mandir Puja data fetching and filtering utilities
 */

export interface SriMandirPuja {
  store_id: string;
  pooja_title: string;
  temple_name: string;
  cover_media_url: string;
  puja_link: string;
  individual_pack_price_inr: number;
  schedule_date_ist: string;
}

const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/1aI5s6TbBYCLVLVlPVLuORrRDqhS8rp_eSkuH2YXdXvQ/export?format=csv&gid=863050072';

// Hindi to English translations for puja titles
const TITLE_TRANSLATIONS: Record<string, string> = {
  'पितृ दोष निवारण महायज्ञ एवं काशी गंगा महाआरती': 'Pitru Dosha Nivaran Mahayagya & Kashi Ganga Maha Aarti',
  'पितृ दोष शांति महापूजा एवं काशी गंगा आरती': 'Pitra Dosha Shanti Mahapuja & Kashi Ganga Aarti',
  'पितृ दोष निवारण पूजा और काशी गंगा आरती': 'Pitra Dosha Nivaran Puja & Kashi Ganga Aarti',
  'त्र्यंबकेश्वर ज्योतिर्लिंग रुद्राभिषेक और काल सर्प दोष निवारण पूजा': 'Trimbakeshwar Jyotirlinga Rudrabhishek & Kaal Sarp Dosha Nivaran Puja',
  'काल सर्प दोष निवारण पूजा एवं त्र्यंबकेश्वर ज्योतिर्लिंग रुद्राभिषेक': 'Kaal Sarp Dosha Nivaran Puja & Trimbakeshwar Jyotirlinga Rudrabhishek',
  'राहु-सूर्य दोष निवारण पूजा': 'Rahu–Surya Dosha Nivaran Puja',
};

/**
 * Parse CSV and return puja objects
 */
function parseCSV(csvText: string): SriMandirPuja[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const pujas: SriMandirPuja[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    if (values.length < headers.length) continue;

    const puja: any = {};
    headers.forEach((header, idx) => {
      puja[header] = values[idx];
    });

    if (puja.store_id && puja.pooja_title) {
      pujas.push({
        store_id: puja.store_id,
        pooja_title: puja.pooja_title,
        temple_name: puja.temple_name || '',
        cover_media_url: puja.cover_media_url || '',
        puja_link: puja.puja_link || '',
        individual_pack_price_inr: parseFloat(puja.individual_pack_price_inr) || 0,
        schedule_date_ist: puja.schedule_date_ist || '',
      });
    }
  }

  return pujas;
}

/**
 * Fetch pujas from Google Sheet
 */
export async function fetchSriMandirPujas(): Promise<SriMandirPuja[]> {
  try {
    const response = await fetch(SHEET_CSV_URL);
    if (!response.ok) {
      console.warn('Failed to fetch Sri Mandir pujas');
      return [];
    }
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.warn('Error fetching Sri Mandir pujas:', error);
    return [];
  }
}

/**
 * Filter pujas by dosha type
 */
export function filterPujasByDosha(pujas: SriMandirPuja[], doshaType: 'mangal' | 'kaalSarp' | 'pitra' | 'sadeSati'): SriMandirPuja[] {
  const keywords: Record<typeof doshaType, string[]> = {
    pitra: ['pitru', 'pitra', 'पितृ', 'पितर'],
    kaalSarp: ['kaal sarp', 'काल सर्प'],
    mangal: ['mangal', 'kuja', 'मंगल'],
    sadeSati: ['shani', 'saturn', 'शनि'],
  };

  const searchTerms = keywords[doshaType];
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
 * Translate Hindi title to English
 */
export function translateTitle(hindiTitle: string): string {
  return TITLE_TRANSLATIONS[hindiTitle] || hindiTitle;
}

/**
 * Format DD/MM/YYYY to "13 Nov 2025"
 */
export function formatScheduleDate(dateStr: string): string {
  const date = parseIndianDate(dateStr);
  if (!date) return dateStr;
  
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

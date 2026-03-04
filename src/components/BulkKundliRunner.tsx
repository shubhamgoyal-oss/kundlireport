import { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { preloadCityDatabase, searchPlaces } from '@/utils/geocoding';
import { ensurePreWrapFontsLoaded, preWrapReportTexts } from '@/utils/preWrapText';
import { Loader2, Play, Square, Table2, RefreshCw, RotateCcw, FastForward } from 'lucide-react';
import { toast } from 'sonner';
import { pdf } from '@react-pdf/renderer';
import { KundliPDFDocument } from './KundliPDFDocument';
import { fetchMultipleCharts, PDF_CHARTS, BirthDetails } from '@/utils/kundaliChart';
import { detectTimezone, extractCountryFromPlace } from '@/utils/timezone';

type BulkStatus = 'pending' | 'normalizing' | 'geocoding' | 'queued' | 'processing' | 'completed' | 'failed';

interface LoadedSheetRow {
  rowNumber: number;
  normalized: Record<string, string>;
  raw: Record<string, string>;
}

interface BulkRowState {
  rowNumber: number;
  name: string;
  place: string;
  status: BulkStatus;
  gender: 'M' | 'F';
  language: 'en' | 'hi' | 'te' | 'kn' | 'mr' | 'ta';
  dateOfBirth?: string; // YYYY-MM-DD or raw from sheet
  timeOfBirth?: string; // HH:MM or raw from sheet
  jobId?: string;
  error?: string;
  source?: string;
  isPreparingPdf?: boolean;
  downloadUrl?: string;
  downloadFileName?: string;
  bucketSignedUrl?: string;
  pdfStorageBucket?: string;
  pdfStoragePath?: string;
}

/** Read gender directly from CSV normalized columns — no API call, no guessing */
/** Classify a cell value as Male / Female / unknown */
function classifyGenderValue(val: string): 'M' | 'F' | null {
  const v = val.trim().toLowerCase();
  if (!v) return null;
  if (['f', 'female', 'woman', 'girl'].includes(v)) return 'F';
  if (['m', 'male', 'man', 'boy'].includes(v)) return 'M';
  // Indic scripts
  if (v === '\u092E\u0939\u093F\u0932\u093E' || v === '\u0938\u094D\u0924\u094D\u0930\u0940') return 'F'; // Hindi
  if (v === '\u0C38\u0C4D\u0C24\u0C4D\u0C30\u0C40') return 'F'; // Telugu
  if (v === '\u0CB9\u0CC6\u0CA3\u0CCD\u0CA3\u0CC1') return 'F'; // Kannada
  if (v.startsWith('\u0BAA\u0BC6\u0BA3')) return 'F'; // Tamil
  if (v === '\u092A\u0941\u0930\u0941\u0937' || v === '\u092A\u0941\u0930\u0941\u0938') return 'M'; // Hindi
  if (v.startsWith('\u0C2A\u0C41\u0C30\u0C41\u0C37')) return 'M'; // Telugu
  if (v === '\u0CAA\u0CC1\u0CB0\u0CC1\u0CB7') return 'M'; // Kannada
  if (v.startsWith('\u0B86\u0BA3')) return 'M'; // Tamil
  return null;
}

/** Is this column header a gender-related name? Works with original (un-normalized) headers. */
function isGenderHeader(header: string): boolean {
  const h = header.trim().toLowerCase();
  if (/gender|sex|\bmale.?female\b|\bm.?f\b/i.test(h)) return true;
  // Hindi/Marathi: \u0932\u093F\u0902\u0917
  if (h.includes('\u0932\u093F\u0902\u0917')) return true;
  // Telugu: \u0C32\u0C3F\u0C02\u0C17
  if (h.includes('\u0C32\u0C3F\u0C02\u0C17')) return true;
  // Kannada: \u0CB2\u0CBF\u0C82\u0C97
  if (h.includes('\u0CB2\u0CBF\u0C82\u0C97')) return true;
  // Tamil: \u0BAA\u0BBE\u0BB2\u0BBF\u0BA9
  if (h.includes('\u0BAA\u0BBE\u0BB2\u0BBF\u0BA9')) return true;
  return false;
}

function parseGenderFromNormalized(normalized: Record<string, string>, raw?: Record<string, string>): 'M' | 'F' {
  const candidates = ['gender', 'sex', 'male_female', 'm_f', 'gender_code', 'linga'];
  // Pass 1: Normalized keys - exact match
  for (const key of candidates) {
    const val = (normalized[key] || '').trim();
    if (!val) continue;
    const g1 = classifyGenderValue(val);
    if (g1) { console.log(`[Gender] normalized key "${key}" = "${val}" -> ${g1}`); return g1; }
  }

  // Pass 2: Normalized keys - fuzzy (key contains "gender" or "sex")
  for (const [key, rawVal] of Object.entries(normalized)) {
    const k = key.toLowerCase();
    if ((k.includes('gender') || k.includes('sex') || k === 'linga') && rawVal) {
      const g = classifyGenderValue(rawVal);
      if (g) { console.log(`[Gender] normalized fuzzy key "${key}" = "${rawVal}" -> ${g}`); return g; }
    }
  }

  // Pass 3: Raw (original) headers - critical for Indic column names
  // normalizeKey strips all non-Latin chars, so Hindi "\u0932\u093F\u0902\u0917" becomes empty in normalized
  if (raw) {
    for (const [header, val] of Object.entries(raw)) {
      if (isGenderHeader(header) && val) {
        const g = classifyGenderValue(val);
        if (g) { console.log(`[Gender] raw header "${header}" = "${val}" -> ${g}`); return g; }
      }
    }
  }

  // Pass 4: Check ALL values for unambiguous female markers
  const allEntries = raw ? Object.entries(raw) : Object.entries(normalized);
  for (const [key, val] of allEntries) {
    const v = val.trim().toLowerCase();
    const g = classifyGenderValue(v);
    if (g === 'F' && v.length > 1) {
      console.log(`[Gender] value scan: key="${key}" val="${v}" -> F`);
      return 'F';
    }
  }

  console.log('[Gender] No gender column found, defaulting to M');
  return 'M';
}

/** Convert an Excel serial date number to YYYY-MM-DD.
 *  Excel epoch: 1 = Jan 1, 1900. Handles the Lotus 123 leap-year bug (serial 60 = Feb 29, 1900). */
function excelSerialToYMD(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 100000) return null;
  // Excel incorrectly treats 1900 as a leap year; serials > 60 are off by 1 day
  const adjustedSerial = serial > 60 ? serial - 1 : serial;
  // Excel epoch is Jan 1, 1900 = serial 1, but JS Date epoch is Jan 1, 1970.
  // Jan 1, 1900 = -2208988800000 ms from Unix epoch (UTC).
  const msPerDay = 86400000;
  const excelEpochMs = -2209075200000; // Date.UTC(1900, 0, 1)
  const dateMs = excelEpochMs + adjustedSerial * msPerDay;
  const d = new Date(dateMs);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  if (y >= 1900 && y <= 2100) {
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return null;
}

/** Parse any date string into YYYY-MM-DD. Mirrors backend decipher-kundli-input parseDob(). */
function normalizeDateToYMD(raw: string): string {
  // Strip leading/trailing quotes that may come from CSV fields or Excel
  const value = (raw || '').trim().replace(/^["']+|["']+$/g, '').trim();
  if (!value) return '';

  // Already YYYY-MM-DD? — also validate year is in sensible range
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const yr = Number(value.slice(0, 4));
    if (yr >= 1900 && yr <= 2100) return value;
    // Year like 0200 (=200) is suspicious — fix it
    if (yr > 0 && yr < 100) {
      const fixed = yr > 50 ? 1900 + yr : 2000 + yr;
      return `${fixed}${value.slice(4)}`;
    }
    if (yr >= 100 && yr < 1900) {
      const twoDigit = yr % 100;
      const fixed = twoDigit > 50 ? 1900 + twoDigit : 2000 + twoDigit;
      return `${fixed}${value.slice(4)}`;
    }
    return value; // year > 2100 — return as-is
  }

  // YYYY-M-D (no zero-padding) — common variant
  const ymdLoose = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdLoose) {
    const y = Number(ymdLoose[1]);
    const m = Number(ymdLoose[2]);
    const d = Number(ymdLoose[3]);
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Already YYYY-MM-DD with extra (e.g., "2002-07-05T00:00:00.000Z")?
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ]/);
  if (isoMatch) {
    const isoYear = Number(isoMatch[1]);
    if (isoYear >= 1900 && isoYear <= 2100) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    // Bad year — don't return, let other parsers try
  }

  // Excel serial date number (e.g., 37442 = July 5, 2002)
  const numericValue = Number(value);
  if (Number.isFinite(numericValue) && numericValue > 365 && numericValue < 100000 && /^\d+(\.\d+)?$/.test(value)) {
    const converted = excelSerialToYMD(Math.floor(numericValue));
    if (converted) return converted;
  }

  // Compact 8-digit: YYYYMMDD or DDMMYYYY
  const compact = value.replace(/\D/g, '');
  if (compact.length === 8) {
    const yearFirst = Number(compact.slice(0, 4));
    if (yearFirst >= 1900 && yearFirst <= 2100) {
      const m = Number(compact.slice(4, 6));
      const d = Number(compact.slice(6, 8));
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31)
        return `${yearFirst}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    const d = Number(compact.slice(0, 2));
    const m = Number(compact.slice(2, 4));
    const y = Number(compact.slice(4, 8));
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY (or with 2-digit year)
  const sep = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (sep) {
    const d = Number(sep[1]);
    const m = Number(sep[2]);
    let y = Number(sep[3]);
    if (y < 100) y += y > 50 ? 1900 : 2000;
    if (y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // DD-Mon-YY or DD-Mon-YYYY (e.g., "05-Jul-00", "5-Jul-2000")
  const monthNames: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  };
  const monMatch = value.match(/^(\d{1,2})[\-/.\s]([A-Za-z]{3,9})[\-/.\s](\d{2,4})$/);
  if (monMatch) {
    const d = Number(monMatch[1]);
    const mName = monMatch[2].slice(0, 3).toLowerCase();
    let y = Number(monMatch[3]);
    const m = monthNames[mName];
    if (m) {
      if (y < 100) y += y > 50 ? 1900 : 2000;
      if (y >= 1900 && y <= 2100 && d >= 1 && d <= 31)
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Strip ordinal suffixes ("5th July 2002" → "5 July 2002", "21st Aug 1984" → "21 Aug 1984")
  const stripped = value.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1');

  // Natural language: "21 Aug 1984", "August 21, 1984", "5 July 2002", etc.
  // Use the stripped version (without ordinals) for better Date parsing
  const parsed = new Date(stripped);
  if (!isNaN(parsed.getTime())) {
    // Use UTC methods to avoid timezone-related off-by-one day errors
    const y = parsed.getUTCFullYear();
    const m = parsed.getUTCMonth() + 1;
    const d = parsed.getUTCDate();
    if (y >= 1900 && y <= 2100)
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // Also try the original value (in case ordinal stripping broke something)
  if (stripped !== value) {
    const parsed2 = new Date(value);
    if (!isNaN(parsed2.getTime())) {
      const y = parsed2.getUTCFullYear();
      const m = parsed2.getUTCMonth() + 1;
      const d = parsed2.getUTCDate();
      if (y >= 1900 && y <= 2100)
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // CRITICAL: Return '' (not the raw value) so the decipher fallback can be used.
  // Returning the raw unparseable value would bypass the backend's smarter parsing.
  console.warn('[normalizeDateToYMD] Could not parse date:', JSON.stringify(value));
  return '';
}

/** Parse any time string into HH:MM (24h). Mirrors backend decipher-kundli-input parseTime(). */
function normalizeTimeToHHMM(raw: string): string {
  const value = (raw || '').trim().toLowerCase();
  if (!value) return '';

  // Already HH:MM or HH:MM:SS
  const hhmm = value.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/);
  if (hhmm) return `${String(Number(hhmm[1])).padStart(2, '0')}:${hhmm[2]}`;

  // 12h with AM/PM
  const ampm = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    const m = Number(ampm[2] || '0');
    if (ampm[3].toLowerCase() === 'pm') h += 12;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Excel decimal (0.0 - 0.999)
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric >= 0 && numeric < 1) {
    const totalMinutes = Math.round(numeric * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // 4-digit compact: 0830 → 08:30
  const four = value.match(/^(\d{2})(\d{2})$/);
  if (four) {
    const h = Number(four[1]);
    const m = Number(four[2]);
    if (h <= 23 && m <= 59) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // Not parseable — return empty so callers fall back to default (12:00)
  return '';
}

/** Read date-of-birth from CSV normalized columns.
 *  Mirrors backend decipher-kundli-input → extractDeterministic().
 *  Generic 'date' is EXCLUDED — it matches puja/order date columns. */
function parseDateOfBirthFromNormalized(normalized: Record<string, string>): string {
  const candidates = [
    'dobyyyymmdd', 'dob_yyyymmdd',          // backend primary keys
    'date_of_birth', 'dateofbirth',          // common explicit names
    'birth_date', 'dob',                     // abbreviations
    'janm_tithi', 'janma_tithi',             // Hindi
  ];
  for (const key of candidates) {
    const val = (normalized[key] || '').trim();
    if (val) return val;
  }
  // Fuzzy fallback: any normalized key containing 'dob' or ('birth' + 'date')
  for (const [key, val] of Object.entries(normalized)) {
    const k = key.toLowerCase();
    if ((k.includes('dob') || (k.includes('birth') && k.includes('date'))) && (val || '').trim()) {
      return val.trim();
    }
  }
  return '';
}

/** Read time-of-birth from CSV normalized columns.
 *  Mirrors backend decipher-kundli-input → extractDeterministic().
 *  Generic 'time' is EXCLUDED — it can match unrelated columns. */
function parseTimeOfBirthFromNormalized(normalized: Record<string, string>): string {
  const candidates = [
    'time_of_birth_in_24', 'time_of_birth',  // backend primary keys
    'birth_time', 'timeofbirth', 'tob',       // common names
    'janm_samay', 'janma_samay',              // Hindi
  ];
  for (const key of candidates) {
    const val = (normalized[key] || '').trim();
    if (val) return val;
  }
  // Fuzzy fallback: any normalized key containing 'tob' or ('birth' + 'time')
  for (const [key, val] of Object.entries(normalized)) {
    const k = key.toLowerCase();
    if ((k.includes('tob') || (k.includes('birth') && k.includes('time'))) && (val || '').trim()) {
      return val.trim();
    }
  }
  return '';
}

const DEFAULT_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/19kP4JakQCH08mOk9Ky2ihYjaUs1rJtDd8_e7OoL3zDE/edit?gid=169692027#gid=169692027';

// ── localStorage persistence keys ──────────────────────────────────────
const LS_SHEET_URL = 'bulk_sheetUrl';
const LS_START_ROW = 'bulk_startRow';
const LS_END_ROW = 'bulk_endRow';
const LS_SPECIFIC_ROWS = 'bulk_specificRows';
const LS_LANGUAGE = 'bulk_language';
const LS_ALL_ROWS = 'bulk_allRows';
const LS_BULK_ROWS = 'bulk_rows';

/** Strip non-serializable / transient fields before saving to localStorage */
function serializableBulkRows(rows: BulkRowState[]): BulkRowState[] {
  return rows.map((r) => {
    const { downloadUrl, isPreparingPdf, ...rest } = r;
    return rest as BulkRowState;
  });
}

/** Reset in-flight statuses to 'pending' so they can be re-run after restore */
function sanitizeRestoredRows(rows: BulkRowState[]): BulkRowState[] {
  const IN_FLIGHT: BulkStatus[] = ['normalizing', 'geocoding', 'queued', 'processing'];
  return rows.map((r) => ({
    ...r,
    downloadUrl: undefined,
    isPreparingPdf: false,
    status: IN_FLIGHT.includes(r.status) ? 'pending' : r.status,
  }));
}

const STATUS_COLORS: Record<BulkStatus, string> = {
  pending: 'bg-muted text-muted-foreground',
  normalizing: 'bg-amber-100 text-amber-800',
  geocoding: 'bg-orange-100 text-orange-800',
  queued: 'bg-sky-100 text-sky-800',
  processing: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

function getVisitorAndSessionIds(): { visitorId: string; sessionId: string } {
  const visitorId = localStorage.getItem('visitor_id') || crypto.randomUUID();
  const sessionId = localStorage.getItem('session_id') || crypto.randomUUID();

  if (!localStorage.getItem('visitor_id')) localStorage.setItem('visitor_id', visitorId);
  if (!localStorage.getItem('session_id')) localStorage.setItem('session_id', sessionId);

  return { visitorId, sessionId };
}

export default function BulkKundliRunner() {
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [startRow, setStartRow] = useState('2');
  const [endRow, setEndRow] = useState('20');
  const [specificRows, setSpecificRows] = useState('');
  const [allRows, setAllRows] = useState<LoadedSheetRow[]>([]);
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRowState[]>([]);
  const [bulkLanguage, setBulkLanguage] = useState<'en' | 'hi' | 'te' | 'kn' | 'mr'>('en');

  const stopRequestedRef = useRef(false);
  const placeCacheRef = useRef<Map<string, { lat: number; lon: number; displayName: string; country: string }>>(new Map());
  const blobUrlsRef = useRef<string[]>([]);
  const restoredRef = useRef(false);  // prevent double-restore


  // ── Restore persisted state on mount ──────────────────────────────────
  useEffect(() => {
    preloadCityDatabase();

    try {
      const savedRows = localStorage.getItem(LS_BULK_ROWS);
      const savedAllRows = localStorage.getItem(LS_ALL_ROWS);
      const savedUrl = localStorage.getItem(LS_SHEET_URL);
      const savedStart = localStorage.getItem(LS_START_ROW);
      const savedEnd = localStorage.getItem(LS_END_ROW);
      const savedLang = localStorage.getItem(LS_LANGUAGE);

      if (savedRows) {
        const parsed: BulkRowState[] = JSON.parse(savedRows);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const sanitized = sanitizeRestoredRows(parsed);
          setBulkRows(sanitized);
          restoredRef.current = true;

          const completedCount = sanitized.filter((r) => r.status === 'completed').length;
          const totalCount = sanitized.length;
          toast.success(`Restored ${totalCount} rows (${completedCount} completed) from previous session`);
        }
      }

      if (savedAllRows) {
        const parsed: LoadedSheetRow[] = JSON.parse(savedAllRows);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setAllRows(parsed);
        }
      }

      const savedSpecific = localStorage.getItem(LS_SPECIFIC_ROWS);

      if (savedUrl) setSheetUrl(savedUrl);
      if (savedStart) setStartRow(savedStart);
      if (savedEnd) setEndRow(savedEnd);
      if (savedSpecific) setSpecificRows(savedSpecific);
      if (savedLang && ['en', 'hi', 'te', 'kn', 'mr'].includes(savedLang)) {
        setBulkLanguage(savedLang as 'en' | 'hi' | 'te' | 'kn' | 'mr');
      }
    } catch (err) {
      console.warn('[BulkKundliRunner] Failed to restore from localStorage:', err);
    }
  }, []);

  // ── Save bulkRows to localStorage on every change ─────────────────────
  useEffect(() => {
    // Skip the initial empty state (before restore)
    if (!restoredRef.current && bulkRows.length === 0) return;
    try {
      localStorage.setItem(LS_BULK_ROWS, JSON.stringify(serializableBulkRows(bulkRows)));
    } catch (err) {
      console.warn('[BulkKundliRunner] Failed to save bulkRows:', err);
    }
  }, [bulkRows]);

  // ── Save allRows to localStorage on change ────────────────────────────
  useEffect(() => {
    if (!restoredRef.current && allRows.length === 0) return;
    try {
      localStorage.setItem(LS_ALL_ROWS, JSON.stringify(allRows));
    } catch (err) {
      console.warn('[BulkKundliRunner] Failed to save allRows:', err);
    }
  }, [allRows]);

  // ── Save settings to localStorage on change ───────────────────────────
  useEffect(() => { localStorage.setItem(LS_SHEET_URL, sheetUrl); }, [sheetUrl]);
  useEffect(() => { localStorage.setItem(LS_START_ROW, startRow); }, [startRow]);
  useEffect(() => { localStorage.setItem(LS_END_ROW, endRow); }, [endRow]);
  useEffect(() => { localStorage.setItem(LS_SPECIFIC_ROWS, specificRows); }, [specificRows]);
  useEffect(() => { localStorage.setItem(LS_LANGUAGE, bulkLanguage); }, [bulkLanguage]);

  const startRowNum = Math.max(2, Number(startRow) || 2);
  const endRowNum = Math.max(startRowNum, Number(endRow) || startRowNum);

  /** Parse "2,5,8,12" or "2, 5, 8-12" into a Set of row numbers */
  const specificRowNums = useMemo(() => {
    const trimmed = specificRows.trim();
    if (!trimmed) return null; // null = use range mode
    const nums = new Set<number>();
    for (const part of trimmed.split(',')) {
      const p = part.trim();
      const rangeMatch = p.match(/^(\d+)\s*-\s*(\d+)$/);
      if (rangeMatch) {
        const a = Number(rangeMatch[1]);
        const b = Number(rangeMatch[2]);
        for (let i = Math.min(a, b); i <= Math.max(a, b); i++) nums.add(i);
      } else {
        const n = Number(p);
        if (Number.isFinite(n) && n >= 2) nums.add(n);
      }
    }
    return nums.size > 0 ? nums : null;
  }, [specificRows]);

  const useSpecificMode = specificRowNums !== null;

  const selectedRows = useMemo(() => {
    if (specificRowNums) {
      return allRows.filter((row) => specificRowNums.has(row.rowNumber));
    }
    return allRows.filter((row) => row.rowNumber >= startRowNum && row.rowNumber <= endRowNum);
  }, [allRows, startRowNum, endRowNum, specificRowNums]);

  const clearPersistedData = () => {
    [LS_BULK_ROWS, LS_ALL_ROWS].forEach((k) => localStorage.removeItem(k));
  };

  // Gender is read directly from CSV at load time via parseGenderFromNormalized().
  // No automatic gender detection/reclassification — user's dropdown choice is final.

  /** Refresh all generated files: re-prepare PDFs for all completed rows */
  const [isRefreshingPdfs, setIsRefreshingPdfs] = useState(false);
  const refreshAllFiles = async () => {
    const targets = bulkRows.filter((r) => r.status === 'completed' && r.jobId);
    if (!targets.length) {
      toast.error('No completed rows to refresh');
      return;
    }
    setIsRefreshingPdfs(true);
    toast(`Regenerating PDFs for ${targets.length} completed row(s)…`);

    // Clear existing download URLs so preparePdfForRow runs fresh
    for (const t of targets) {
      updateBulkRow(t.rowNumber, { downloadUrl: undefined, bucketSignedUrl: undefined, isPreparingPdf: false });
    }

    for (const row of targets) {
      const freshRow = { ...row, downloadUrl: undefined, bucketSignedUrl: undefined };
      await preparePdfForRow(freshRow).catch((e) =>
        console.warn(`[Bulk] Refresh PDF failed for row ${row.rowNumber}:`, e),
      );
    }

    setIsRefreshingPdfs(false);
    toast.success('All PDFs refreshed');
  };

  const loadSheetRows = async () => {
    setIsLoadingSheet(true);
    // Clear old persisted data — fresh start
    clearPersistedData();
    restoredRef.current = true; // allow saving the new data
    try {
      const { data, error } = await supabase.functions.invoke('load-kundli-sheet', {
        body: { sheetUrl },
      });

      if (error) {
        throw new Error(error.message || 'Failed to load sheet');
      }

      const rows: LoadedSheetRow[] = Array.isArray(data?.rows)
        ? data.rows.map((r: any) => ({
            rowNumber: Number(r.rowNumber),
            normalized: r.normalized || {},
            raw: r.raw || {},
          }))
        : [];

      setAllRows(rows);
      // Debug: log normalized keys so we can see actual column names from the sheet
      if (rows.length > 0) {
        console.log('[BulkKundliRunner] Normalized keys:', Object.keys(rows[0].normalized));
        console.log('[BulkKundliRunner] First row normalized:', rows[0].normalized);
      }
      // Pre-populate bulkRows for the selected range or specific rows
      const sNum = Math.max(2, Number(startRow) || 2);
      const eNum = Math.max(sNum, Number(endRow) || sNum);
      const filteredRows = specificRowNums
        ? rows.filter((r) => specificRowNums.has(r.rowNumber))
        : rows.filter((r) => r.rowNumber >= sNum && r.rowNumber <= eNum);
      setBulkRows(
        filteredRows.map((r) => ({
          rowNumber: r.rowNumber,
          name: r.normalized.offering_user_name || r.normalized.name || '',
          place: r.normalized.place_of_birth || '',
          status: 'pending' as BulkStatus,
          gender: parseGenderFromNormalized(r.normalized, r.raw),
          language: bulkLanguage,
          dateOfBirth: parseDateOfBirthFromNormalized(r.normalized),
          timeOfBirth: parseTimeOfBirthFromNormalized(r.normalized),
        })),
      );
      toast.success(`Loaded ${filteredRows.length} rows.`);
    } catch (err) {
      console.error('[BulkKundliRunner] Failed loading sheet:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load Google Sheet');
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const updateBulkRow = (rowNumber: number, patch: Partial<BulkRowState>) => {
    setBulkRows((prev) => prev.map((row) => (row.rowNumber === rowNumber ? { ...row, ...patch } : row)));
  };

  useEffect(() => {
    return () => {
      for (const url of blobUrlsRef.current) URL.revokeObjectURL(url);
      blobUrlsRef.current = [];
    };
  }, []);

  const buildDownloadFileName = (name: string, _rowNumber?: number): string => {
    const safeName = String(name || 'Kundli')
      .trim()
      .replace(/[^a-zA-Z0-9 _-]+/g, ' ')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return `Kundli_Report_${safeName || 'Kundli'}.pdf`;
  };

  const saveAsDialog = async (blobUrl: string, suggestedName: string) => {
    // Helper: classic <a download> fallback
    const fallbackDownload = () => {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };

    // Try File System Access API first (gives a real Save-As folder picker)
    if ('showSaveFilePicker' in window) {
      try {
        const blob = await fetch(blobUrl).then((r) => r.blob());
        const handle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [
            {
              description: 'PDF Document',
              accept: { 'application/pdf': ['.pdf'] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        toast.success(`Saved: ${suggestedName}`);
        return;
      } catch (err: any) {
        // User cancelled the dialog — not an error
        if (err?.name === 'AbortError') return;
        console.warn('showSaveFilePicker failed, using fallback download:', err);
      }
    }

    // Fallback for browsers without the API or if it failed
    fallbackDownload();
  };

  const blobToBase64Data = async (blob: Blob): Promise<string> => {
    const buffer = await blob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  };

  const fetchJobPayload = async (jobId: string, sessionId: string, visitorId: string): Promise<any> => {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-kundli-job?jobId=${jobId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-session-id': sessionId,
          'x-visitor-id': visitorId,
        },
      },
    );
    if (!response.ok) throw new Error(`Failed to fetch job payload (${response.status})`);
    return response.json();
  };

  // Mutex to prevent concurrent PDF generation which corrupts global language state
  const pdfMutexRef = useRef(Promise.resolve());

  const preparePdfForRow = async (row: BulkRowState) => {
    if (!row.jobId) {
      toast.error(`Row ${row.rowNumber}: missing jobId`);
      return;
    }
    if (row.downloadUrl) return;

    const { visitorId, sessionId } = getVisitorAndSessionIds();
    updateBulkRow(row.rowNumber, { isPreparingPdf: true, error: undefined });

    try {
      const payload = await fetchJobPayload(row.jobId, sessionId, visitorId);
      if (payload.status !== 'completed' || !payload.report) {
        throw new Error(`Job ${row.jobId} is not completed yet`);
      }

      const report = payload.report;
      // CRITICAL LOG: capture exactly what the backend returned for birth details
      console.log(`[Bulk PDF] Row ${row.rowNumber} REPORT birthDetails:`, JSON.stringify(report.birthDetails));
      const [year, month, day] = String(report.birthDetails?.dateOfBirth || '').split('-').map(Number);
      const [hour, minute] = String(report.birthDetails?.timeOfBirth || '12:00').split(':').map(Number);

      const birthDetails: BirthDetails = {
        day: Number.isFinite(day) ? day : 1,
        month: Number.isFinite(month) ? month : 1,
        year: Number.isFinite(year) ? year : 1990,
        hour: Number.isFinite(hour) ? hour : 12,
        minute: Number.isFinite(minute) ? minute : 0,
        lat: Number(report.birthDetails?.latitude || 0),
        lon: Number(report.birthDetails?.longitude || 0),
        tzone: (report.birthDetails?.timezone != null && Number.isFinite(Number(report.birthDetails.timezone)))
          ? Number(report.birthDetails.timezone)
          : 5.5,
      };

      const rowLang = (row.language || bulkLanguage) as 'en' | 'hi' | 'te' | 'kn' | 'mr';
      const charts = await fetchMultipleCharts(birthDetails, 'North', rowLang === 'te' ? 'en' : rowLang, PDF_CHARTS);
      const reportWithCharts = { ...report, charts };
      // Pre-wrap Indic text to prevent mid-word line breaks in PDF.
      await ensurePreWrapFontsLoaded(rowLang);
      const wrappedReport = preWrapReportTexts(reportWithCharts as Record<string, unknown>, rowLang);
      // Serialize PDF generation via mutex — global ACTIVE_PDF_LANGUAGE must not be
      // corrupted by concurrent renders (e.g., Hindi overwriting Telugu mid-render).
      const blob = await (pdfMutexRef.current = pdfMutexRef.current.then(() =>
        pdf(<KundliPDFDocument report={wrappedReport} language={rowLang} />).toBlob()
      ));
      const downloadUrl = URL.createObjectURL(blob);
      blobUrlsRef.current.push(downloadUrl);
      const fileName = buildDownloadFileName(row.name, row.rowNumber);

      let bucketSignedUrl: string | undefined;
      let pdfStorageBucket: string | undefined;
      let pdfStoragePath: string | undefined;
      try {
        const pdfBase64 = await blobToBase64Data(blob);
        const { data: storeData, error: storeError } = await supabase.functions.invoke('store-kundli-pdf', {
          body: {
            jobId: row.jobId,
            fileName,
            previewMode: false,
            pdfBase64,
          },
        });
        if (storeError) {
          throw new Error(storeError.message || 'Failed to store PDF in bucket');
        }
        bucketSignedUrl = typeof storeData?.signedUrl === 'string' ? storeData.signedUrl : undefined;
        pdfStorageBucket = typeof storeData?.bucket === 'string' ? storeData.bucket : undefined;
        pdfStoragePath = typeof storeData?.path === 'string' ? storeData.path : undefined;
      } catch (storageErr) {
        console.warn(`[BulkKundliRunner] Row ${row.rowNumber} storage upload failed:`, storageErr);
      }

      updateBulkRow(row.rowNumber, {
        isPreparingPdf: false,
        downloadUrl,
        downloadFileName: fileName,
        bucketSignedUrl,
        pdfStorageBucket,
        pdfStoragePath,
      });
    } catch (err) {
      updateBulkRow(row.rowNumber, {
        isPreparingPdf: false,
        error: err instanceof Error ? err.message : 'PDF preparation failed',
      });
      toast.error(`Row ${row.rowNumber}: ${err instanceof Error ? err.message : 'PDF preparation failed'}`);
    }
  };

  const prepareAllCompletedPdfs = async () => {
    const targets = bulkRows.filter((r) => r.status === 'completed' && !r.downloadUrl && !r.isPreparingPdf);
    if (!targets.length) {
      toast('No completed rows pending PDF preparation');
      return;
    }
    for (const row of targets) {
      // sequential to avoid browser memory spikes
      // eslint-disable-next-line no-await-in-loop
      await preparePdfForRow(row);
    }
    toast.success('Prepared downloadable PDFs for completed rows');
  };

  const pollJobUntilDone = async (
    jobId: string,
    sessionId: string,
    visitorId: string,
  ): Promise<{ status: 'completed' | 'failed'; error?: string }> => {
    const pollIntervalMs = 3000;
    const maxPolls = 360; // ~18 minutes

    // ── Stall detection & auto-retry ──────────────────────────────────────
    let lastProgress = -1;
    let lastProgressChangeTime = Date.now();
    let retriesAttempted = 0;
    const maxRetries = 2;
    const stallThresholdMs = 90_000; // 90s without progress change = stalled

    for (let i = 0; i < maxPolls; i++) {
      if (stopRequestedRef.current) {
        return { status: 'failed', error: 'Stopped by user' };
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-kundli-job?jobId=${jobId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'x-session-id': sessionId,
            'x-visitor-id': visitorId,
          },
        },
      );

      if (!response.ok) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
        continue;
      }

      const payload = await response.json();
      if (payload.status === 'completed') {
        return { status: 'completed' };
      }
      if (payload.status === 'failed') {
        return { status: 'failed', error: payload.error || 'Job failed' };
      }

      // ── Stall detection: if progress stuck for 90s, re-trigger stalled stage ──
      const currentProgress = payload.progressPercent || 0;
      if (currentProgress !== lastProgress) {
        lastProgress = currentProgress;
        lastProgressChangeTime = Date.now();
      }

      const stallDuration = Date.now() - lastProgressChangeTime;
      if (stallDuration > stallThresholdMs && retriesAttempted < maxRetries && payload.status === 'processing') {
        retriesAttempted++;
        const phase = (payload.currentPhase || '').toLowerCase();
        let functionName = 'translate-kundli-report';
        if (phase.includes('finaliz') || phase.includes('quality') || phase.includes('chart')) {
          functionName = 'finalize-kundli-report';
        }
        console.log(`🔄 [BulkRunner] Job ${jobId} stalled at "${payload.currentPhase}" — auto-retrigger ${retriesAttempted}/${maxRetries}: ${functionName}`);
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
            body: JSON.stringify({ jobId }),
          });
        } catch (e) { console.warn('[BulkRunner] Retrigger failed:', e); }
        lastProgressChangeTime = Date.now(); // reset stall timer
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return { status: 'failed', error: 'Timed out while waiting for completion' };
  };

  const resolveCoordinates = async (place: string): Promise<{ lat: number; lon: number; displayName: string; country: string }> => {
    const key = place.trim().toLowerCase();
    const cached = placeCacheRef.current.get(key);
    if (cached) return cached;

    const results = await searchPlaces(place);
    if (!results.length) {
      throw new Error(`Could not resolve place: ${place}`);
    }

    const best = results[0];
    const country = extractCountryFromPlace(best);
    const value = {
      lat: best.lat,
      lon: best.lon,
      displayName: best.display_name || place,
      country: country || 'India', // Default to India for local DB results without explicit country
    };
    placeCacheRef.current.set(key, value);
    return value;
  };

  const runBulkGeneration = async () => {
    if (!selectedRows.length) {
      toast.error('No rows available in selected range');
      return;
    }

    stopRequestedRef.current = false;
    setIsRunning(true);
    restoredRef.current = true; // ensure state gets persisted

    // ── FIELD SNAPSHOTS ────────────────────────────────────────────────
    // Capture user-editable fields at the exact same moment as the state reset.
    // These plain JS Maps are immune to React timing / stale closures.
    // Whatever the user sees in the dropdowns/inputs IS what gets sent to the backend.
    const genderSnapshot = new Map<number, 'M' | 'F'>();
    const langSnapshot = new Map<number, 'en' | 'hi' | 'te' | 'kn' | 'mr'>();
    const dobSnapshot = new Map<number, string>();
    const tobSnapshot = new Map<number, string>();

    setBulkRows((prev) => {
      const existing = new Map(prev.map((r) => [r.rowNumber, r]));
      return selectedRows.map((row) => {
        const ex = existing.get(row.rowNumber);
        const gender = ex?.gender || parseGenderFromNormalized(row.normalized, row.raw);
        const language = ex?.language || bulkLanguage;
        const dob = ex?.dateOfBirth || parseDateOfBirthFromNormalized(row.normalized);
        const tob = ex?.timeOfBirth || parseTimeOfBirthFromNormalized(row.normalized);

        // Populate snapshots inside the updater — guaranteed to match state
        genderSnapshot.set(row.rowNumber, gender);
        langSnapshot.set(row.rowNumber, language);
        dobSnapshot.set(row.rowNumber, dob);
        tobSnapshot.set(row.rowNumber, tob);

        return {
          rowNumber: row.rowNumber,
          name: ex?.name || row.normalized.offering_user_name || row.normalized.name || '',
          place: ex?.place || row.normalized.place_of_birth || '',
          status: 'pending' as BulkStatus,
          gender,
          language,
          dateOfBirth: dob,
          timeOfBirth: tob,
        };
      });
    });

    // Log ALL genders for visibility — this is the exact gender being sent to the backend
    const genderSummary = Array.from(genderSnapshot.entries())
      .map(([rowNum, g]) => `Row ${rowNum}: ${g === 'F' ? 'Female' : 'Male'}`)
      .join(', ');
    console.log(`[Bulk] GENDER SNAPSHOT (final, sent to backend): ${genderSummary}`);
    toast(`Gender: ${genderSummary}`);

    const { visitorId, sessionId } = getVisitorAndSessionIds();

    // Track which rows failed for the auto-retry pass
    const firstPassFailed = new Set<number>();

    for (const row of selectedRows) {
      if (stopRequestedRef.current) break;

      try {
        updateBulkRow(row.rowNumber, { status: 'normalizing' });

        const { data: decoded, error: decodeError } = await supabase.functions.invoke('decipher-kundli-input', {
          body: { row: row.normalized },
        });

        if (decodeError) {
          throw new Error(decodeError.message || 'Failed to normalize row');
        }

        const name = String(decoded?.name || '').trim();
        const decipheredDob = String(decoded?.dateOfBirth || '').trim();
        const decipheredTob = String(decoded?.timeOfBirth || '').trim();
        const placeOfBirth = String(decoded?.placeOfBirth || '').trim();
        const source = String(decoded?.source || 'deterministic');

        // Use user-edited DoB/ToB from snapshot if non-empty; else fall back to decipher output.
        // IMPORTANT: normalize to YYYY-MM-DD / HH:MM — backend strictly expects these formats.
        const userDob = dobSnapshot.get(row.rowNumber) || '';
        const userTob = tobSnapshot.get(row.rowNumber) || '';
        const normalizedDob = normalizeDateToYMD(userDob);
        const normalizedTob = normalizeTimeToHHMM(userTob);
        const dateOfBirth = normalizedDob || decipheredDob;
        let timeOfBirth = normalizedTob || decipheredTob || '12:00';
        // Safety net: if time is not valid HH:MM, force to 12:00
        if (!/^\d{2}:\d{2}$/.test(timeOfBirth)) timeOfBirth = '12:00';

        // DETAILED LOGGING to debug date/gender issues
        console.log(`[Bulk] Row ${row.rowNumber} DATE TRACE: userDob="${userDob}" → normalized="${normalizedDob}" | decipheredDob="${decipheredDob}" → FINAL="${dateOfBirth}"`);
        console.log(`[Bulk] Row ${row.rowNumber} TIME TRACE: userTob="${userTob}" → normalized="${normalizedTob}" | decipheredTob="${decipheredTob}" → FINAL="${timeOfBirth}"`);

        if (!name || !dateOfBirth || !timeOfBirth || !placeOfBirth) {
          throw new Error(`Missing normalized values after decipher step: name="${name}" dob="${dateOfBirth}" tob="${timeOfBirth}" place="${placeOfBirth}"`);
        }

        // Use snapshots — NOT React state, NOT decipher API detection.
        // The user's dropdown/input choices are the single source of truth.
        const finalGender = genderSnapshot.get(row.rowNumber) || 'M';
        const finalLanguage = langSnapshot.get(row.rowNumber) || bulkLanguage;

        console.log(`[Bulk] Row ${row.rowNumber} SENDING TO BACKEND: gender=${finalGender} dob=${dateOfBirth} tob=${timeOfBirth} lang=${finalLanguage}`);

        updateBulkRow(row.rowNumber, {
          name,
          place: placeOfBirth,
          source,
          status: 'geocoding',
        });

        // Check if Excel already has lat/long columns — skip geocoding if so
        const n = row.normalized;
        const rawLat = parseFloat(n.latitude || n.lat || '');
        const rawLon = parseFloat(n.longitude || n.lng || n.lon || '');
        const hasExcelCoords = !isNaN(rawLat) && !isNaN(rawLon) && rawLat !== 0 && rawLon !== 0;

        const coords = hasExcelCoords
          ? { lat: rawLat, lon: rawLon, displayName: placeOfBirth, country: n.country || 'India' }
          : await resolveCoordinates(placeOfBirth);

        if (hasExcelCoords) {
          console.log(`[Bulk] Row ${row.rowNumber}: using Excel lat/lon ${rawLat},${rawLon}`);
        }

        // Detect timezone from country + coordinates
        const tz = detectTimezone(coords.country, coords.lat, coords.lon, dateOfBirth, timeOfBirth);
        console.log(`[Bulk] Row ${row.rowNumber} TIMEZONE: ${tz.displayLabel} (country="${coords.country}")`);

        updateBulkRow(row.rowNumber, { status: 'queued' });

        const { data: startData, error: startError } = await supabase.functions.invoke('start-kundli-job', {
          body: {
            name,
            dateOfBirth,
            timeOfBirth,
            placeOfBirth: coords.displayName,
            latitude: coords.lat,
            longitude: coords.lon,
            timezone: tz.utcOffsetHours,
            language: finalLanguage,
            gender: finalGender,
            visitorId,
            sessionId,
          },
        });

        if (startError || !startData?.jobId) {
          throw new Error(startError?.message || 'Failed to start row job');
        }

        const jobId = String(startData.jobId);
        updateBulkRow(row.rowNumber, { status: 'processing', jobId });

        const result = await pollJobUntilDone(jobId, sessionId, visitorId);
        if (result.status === 'completed') {
          updateBulkRow(row.rowNumber, { status: 'completed' });
          // Auto-prepare PDF + upload to bucket for download link
          const completedRow = { rowNumber: row.rowNumber, name, place: placeOfBirth, status: 'completed' as BulkStatus, gender: finalGender, language: finalLanguage, jobId };
          await preparePdfForRow(completedRow).catch((e) => console.warn(`[Bulk] Auto PDF prep failed for row ${row.rowNumber}:`, e));
        } else {
          firstPassFailed.add(row.rowNumber);
          updateBulkRow(row.rowNumber, {
            status: 'failed',
            error: result.error || 'Job failed',
          });
        }
      } catch (err) {
        firstPassFailed.add(row.rowNumber);
        updateBulkRow(row.rowNumber, {
          status: 'failed',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    // ── Auto-retry failed rows once ──────────────────────────────────────
    // Agent timeouts are intermittent; a second attempt usually succeeds.
    if (!stopRequestedRef.current && firstPassFailed.size > 0) {
      const retryRows = selectedRows.filter((r) => firstPassFailed.has(r.rowNumber));
      toast(`Retrying ${retryRows.length} failed row(s)…`);
      console.log(`[Bulk] Auto-retrying ${retryRows.length} failed rows: ${retryRows.map((r) => r.rowNumber).join(', ')}`);

      for (const row of retryRows) {
        if (stopRequestedRef.current) break;

        try {
          updateBulkRow(row.rowNumber, { status: 'normalizing', error: undefined, jobId: undefined });

          const { data: decoded, error: decodeError } = await supabase.functions.invoke('decipher-kundli-input', {
            body: { row: row.normalized },
          });

          if (decodeError) throw new Error(decodeError.message || 'Failed to normalize row');

          const name = String(decoded?.name || '').trim();
          const decipheredDob = String(decoded?.dateOfBirth || '').trim();
          const decipheredTob = String(decoded?.timeOfBirth || '').trim();
          const placeOfBirth = String(decoded?.placeOfBirth || '').trim();

          // Use user's snapshot dates (same as first pass) — user's input is truth
          const userDob = dobSnapshot.get(row.rowNumber) || '';
          const userTob = tobSnapshot.get(row.rowNumber) || '';
          const dateOfBirth = normalizeDateToYMD(userDob) || decipheredDob;
          let timeOfBirth = normalizeTimeToHHMM(userTob) || decipheredTob || '12:00';
          if (!/^\d{2}:\d{2}$/.test(timeOfBirth)) timeOfBirth = '12:00';

          if (!name || !dateOfBirth || !timeOfBirth || !placeOfBirth) {
            throw new Error('Missing normalized values after decipher step');
          }

          // Use the same gender snapshot from before the loop — user's dropdown is truth
          const finalGender = genderSnapshot.get(row.rowNumber) || 'M';
          const finalLanguage = langSnapshot.get(row.rowNumber) || bulkLanguage;

          console.log(`[Bulk] RETRY Row ${row.rowNumber} DOB=${dateOfBirth} TOB=${timeOfBirth} (user snapshot used)`);

          updateBulkRow(row.rowNumber, { status: 'geocoding' });

          const rn = row.normalized;
          const rawLat = parseFloat(rn.latitude || rn.lat || '');
          const rawLon = parseFloat(rn.longitude || rn.lng || rn.lon || '');
          const hasExcelCoords = !isNaN(rawLat) && !isNaN(rawLon) && rawLat !== 0 && rawLon !== 0;
          const coords = hasExcelCoords
            ? { lat: rawLat, lon: rawLon, displayName: placeOfBirth, country: rn.country || 'India' }
            : await resolveCoordinates(placeOfBirth);

          const tz = detectTimezone(coords.country, coords.lat, coords.lon, dateOfBirth, timeOfBirth);
          console.log(`[Bulk] RETRY Row ${row.rowNumber} TIMEZONE: ${tz.displayLabel}`);

          updateBulkRow(row.rowNumber, { status: 'queued' });

          const { data: startData, error: startError } = await supabase.functions.invoke('start-kundli-job', {
            body: {
              name, dateOfBirth, timeOfBirth,
              placeOfBirth: coords.displayName,
              latitude: coords.lat, longitude: coords.lon,
              timezone: tz.utcOffsetHours,
              language: finalLanguage, gender: finalGender,
              visitorId, sessionId,
            },
          });

          if (startError || !startData?.jobId) {
            throw new Error(startError?.message || 'Failed to start row job');
          }

          const jobId = String(startData.jobId);
          updateBulkRow(row.rowNumber, { status: 'processing', jobId });

          const result = await pollJobUntilDone(jobId, sessionId, visitorId);
          if (result.status === 'completed') {
            updateBulkRow(row.rowNumber, { status: 'completed', error: undefined });
            // Auto-prepare PDF for retried row
            const completedRow = { rowNumber: row.rowNumber, name, place: placeOfBirth, status: 'completed' as BulkStatus, gender: finalGender as 'M' | 'F', language: finalLanguage as 'en' | 'hi' | 'te' | 'kn' | 'mr', jobId };
            await preparePdfForRow(completedRow).catch((e) => console.warn(`[Bulk] Auto PDF prep (retry) failed for row ${row.rowNumber}:`, e));
          } else {
            updateBulkRow(row.rowNumber, { status: 'failed', error: `Retry failed: ${result.error || 'Job failed'}` });
          }
        } catch (err) {
          updateBulkRow(row.rowNumber, {
            status: 'failed',
            error: `Retry failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
          });
        }
      }
    }

    setIsRunning(false);
    if (stopRequestedRef.current) {
      toast('Bulk run stopped');
    } else {
      toast.success('Bulk run completed');
    }
  };

  const stopBulkRun = () => {
    stopRequestedRef.current = true;
  };

  /** Force-reset a stuck run: clears running state and resets in-flight rows to pending */
  const forceResetRun = () => {
    stopRequestedRef.current = true;
    setIsRunning(false);
    setBulkRows((prev) => sanitizeRestoredRows(prev));
    toast('Run force-reset — in-flight rows set back to pending');
  };

  /** Continue from where we left off — skip completed rows, process pending/failed only */
  const continueBulkGeneration = async () => {
    // Find rows that still need processing (not completed)
    const completedRowNums = new Set(
      bulkRows.filter((r) => r.status === 'completed').map((r) => r.rowNumber)
    );
    const remainingSheetRows = selectedRows.filter((r) => !completedRowNums.has(r.rowNumber));

    if (!remainingSheetRows.length) {
      toast('All rows already completed — nothing to continue');
      return;
    }

    stopRequestedRef.current = false;
    setIsRunning(true);
    restoredRef.current = true;

    // Snapshot gender, language, dob & tob — reset only non-completed rows to pending
    const genderSnapshot = new Map<number, 'M' | 'F'>();
    const langSnapshot = new Map<number, 'en' | 'hi' | 'te' | 'kn' | 'mr'>();
    const dobSnapshot = new Map<number, string>();
    const tobSnapshot = new Map<number, string>();

    setBulkRows((prev) => {
      const existing = new Map(prev.map((r) => [r.rowNumber, r]));
      // Keep ALL existing rows — only reset non-completed ones
      const allRowNums = new Set([...prev.map((r) => r.rowNumber), ...selectedRows.map((r) => r.rowNumber)]);
      return Array.from(allRowNums).sort((a, b) => a - b).map((rowNum) => {
        const ex = existing.get(rowNum);
        const sheetRow = selectedRows.find((r) => r.rowNumber === rowNum);
        const gender = ex?.gender || (sheetRow ? parseGenderFromNormalized(sheetRow.normalized, sheetRow.raw) : 'M' as const);
        const language = ex?.language || bulkLanguage;
        const dob = ex?.dateOfBirth || (sheetRow ? parseDateOfBirthFromNormalized(sheetRow.normalized) : '');
        const tob = ex?.timeOfBirth || (sheetRow ? parseTimeOfBirthFromNormalized(sheetRow.normalized) : '');

        genderSnapshot.set(rowNum, gender);
        langSnapshot.set(rowNum, language);
        dobSnapshot.set(rowNum, dob);
        tobSnapshot.set(rowNum, tob);

        // Keep completed rows exactly as they are
        if (ex?.status === 'completed') return ex;

        return {
          rowNumber: rowNum,
          name: ex?.name || sheetRow?.normalized.offering_user_name || sheetRow?.normalized.name || '',
          place: ex?.place || sheetRow?.normalized.place_of_birth || '',
          status: 'pending' as BulkStatus,
          gender,
          language,
          jobId: undefined,
          error: undefined,
        };
      });
    });

    toast(`Continuing: ${remainingSheetRows.length} remaining rows (${completedRowNums.size} already done)`);

    const { visitorId, sessionId } = getVisitorAndSessionIds();
    const firstPassFailed = new Set<number>();

    for (const row of remainingSheetRows) {
      if (stopRequestedRef.current) break;

      try {
        updateBulkRow(row.rowNumber, { status: 'normalizing' });

        const { data: decoded, error: decodeError } = await supabase.functions.invoke('decipher-kundli-input', {
          body: { row: row.normalized },
        });

        if (decodeError) throw new Error(decodeError.message || 'Failed to normalize row');

        const name = String(decoded?.name || '').trim();
        const decipheredDob = String(decoded?.dateOfBirth || '').trim();
        const decipheredTob = String(decoded?.timeOfBirth || '').trim();
        const placeOfBirth = String(decoded?.placeOfBirth || '').trim();
        const source = String(decoded?.source || 'deterministic');

        // Use user's snapshot dates — user's input field is the single source of truth
        const userDob = dobSnapshot.get(row.rowNumber) || '';
        const userTob = tobSnapshot.get(row.rowNumber) || '';
        const normalizedDob = normalizeDateToYMD(userDob);
        const normalizedTob = normalizeTimeToHHMM(userTob);
        const dateOfBirth = normalizedDob || decipheredDob;
        let timeOfBirth = normalizedTob || decipheredTob || '12:00';
        if (!/^\d{2}:\d{2}$/.test(timeOfBirth)) timeOfBirth = '12:00';

        console.log(`[Bulk] CONTINUE Row ${row.rowNumber} DATE TRACE: userDob="${userDob}" → normalized="${normalizedDob}" | decipheredDob="${decipheredDob}" → FINAL="${dateOfBirth}"`);

        if (!name || !dateOfBirth || !timeOfBirth || !placeOfBirth) {
          throw new Error(`Missing normalized values after decipher step: name="${name}" dob="${dateOfBirth}" tob="${timeOfBirth}" place="${placeOfBirth}"`);
        }

        const finalGender = genderSnapshot.get(row.rowNumber) || 'M';
        const finalLanguage = langSnapshot.get(row.rowNumber) || bulkLanguage;

        console.log(`[Bulk] CONTINUE Row ${row.rowNumber} SENDING: gender=${finalGender} dob=${dateOfBirth} tob=${timeOfBirth} lang=${finalLanguage}`);

        updateBulkRow(row.rowNumber, { name, place: placeOfBirth, source, status: 'geocoding' });

        const n = row.normalized;
        const rawLat = parseFloat(n.latitude || n.lat || '');
        const rawLon = parseFloat(n.longitude || n.lng || n.lon || '');
        const hasExcelCoords = !isNaN(rawLat) && !isNaN(rawLon) && rawLat !== 0 && rawLon !== 0;

        const coords = hasExcelCoords
          ? { lat: rawLat, lon: rawLon, displayName: placeOfBirth, country: n.country || 'India' }
          : await resolveCoordinates(placeOfBirth);

        const tz = detectTimezone(coords.country, coords.lat, coords.lon, dateOfBirth, timeOfBirth);
        console.log(`[Bulk] CONTINUE Row ${row.rowNumber} TIMEZONE: ${tz.displayLabel}`);

        updateBulkRow(row.rowNumber, { status: 'queued' });

        const { data: startData, error: startError } = await supabase.functions.invoke('start-kundli-job', {
          body: {
            name, dateOfBirth, timeOfBirth,
            placeOfBirth: coords.displayName,
            latitude: coords.lat, longitude: coords.lon,
            timezone: tz.utcOffsetHours,
            language: finalLanguage, gender: finalGender,
            visitorId, sessionId,
          },
        });

        if (startError || !startData?.jobId) throw new Error(startError?.message || 'Failed to start row job');

        const jobId = String(startData.jobId);
        updateBulkRow(row.rowNumber, { status: 'processing', jobId });

        const result = await pollJobUntilDone(jobId, sessionId, visitorId);
        if (result.status === 'completed') {
          updateBulkRow(row.rowNumber, { status: 'completed' });
          const completedRow = { rowNumber: row.rowNumber, name, place: placeOfBirth, status: 'completed' as BulkStatus, gender: finalGender, language: finalLanguage, jobId };
          await preparePdfForRow(completedRow).catch((e) => console.warn(`[Bulk] Auto PDF prep failed for row ${row.rowNumber}:`, e));
        } else {
          firstPassFailed.add(row.rowNumber);
          updateBulkRow(row.rowNumber, { status: 'failed', error: result.error || 'Job failed' });
        }
      } catch (err) {
        firstPassFailed.add(row.rowNumber);
        updateBulkRow(row.rowNumber, { status: 'failed', error: err instanceof Error ? err.message : 'Unknown error' });
      }
    }

    // Auto-retry failed rows once
    if (!stopRequestedRef.current && firstPassFailed.size > 0) {
      const retryRows = remainingSheetRows.filter((r) => firstPassFailed.has(r.rowNumber));
      toast(`Retrying ${retryRows.length} failed row(s)…`);

      for (const row of retryRows) {
        if (stopRequestedRef.current) break;
        try {
          updateBulkRow(row.rowNumber, { status: 'normalizing', error: undefined, jobId: undefined });
          const { data: decoded, error: decodeError } = await supabase.functions.invoke('decipher-kundli-input', { body: { row: row.normalized } });
          if (decodeError) throw new Error(decodeError.message || 'Failed to normalize row');
          const name = String(decoded?.name || '').trim();
          const decipheredDob2 = String(decoded?.dateOfBirth || '').trim();
          const decipheredTob2 = String(decoded?.timeOfBirth || '').trim();
          const placeOfBirth = String(decoded?.placeOfBirth || '').trim();
          // Use user's snapshot dates — consistent with first pass
          const userDob2 = dobSnapshot.get(row.rowNumber) || '';
          const userTob2 = tobSnapshot.get(row.rowNumber) || '';
          const dateOfBirth = normalizeDateToYMD(userDob2) || decipheredDob2;
          let timeOfBirth = normalizeTimeToHHMM(userTob2) || decipheredTob2 || '12:00';
          if (!/^\d{2}:\d{2}$/.test(timeOfBirth)) timeOfBirth = '12:00';
          if (!name || !dateOfBirth || !timeOfBirth || !placeOfBirth) throw new Error('Missing normalized values');
          const finalGender = genderSnapshot.get(row.rowNumber) || 'M';
          const finalLanguage = langSnapshot.get(row.rowNumber) || bulkLanguage;
          console.log(`[Bulk] CONTINUE-RETRY Row ${row.rowNumber} DOB=${dateOfBirth} TOB=${timeOfBirth}`);
          updateBulkRow(row.rowNumber, { status: 'geocoding' });
          const rn = row.normalized;
          const rawLat = parseFloat(rn.latitude || rn.lat || '');
          const rawLon = parseFloat(rn.longitude || rn.lng || rn.lon || '');
          const hasExcelCoords = !isNaN(rawLat) && !isNaN(rawLon) && rawLat !== 0 && rawLon !== 0;
          const coords = hasExcelCoords ? { lat: rawLat, lon: rawLon, displayName: placeOfBirth, country: rn.country || 'India' } : await resolveCoordinates(placeOfBirth);
          const tz = detectTimezone(coords.country, coords.lat, coords.lon, dateOfBirth, timeOfBirth);
          console.log(`[Bulk] CONTINUE-RETRY Row ${row.rowNumber} TIMEZONE: ${tz.displayLabel}`);
          updateBulkRow(row.rowNumber, { status: 'queued' });
          const { data: startData, error: startError } = await supabase.functions.invoke('start-kundli-job', {
            body: { name, dateOfBirth, timeOfBirth, placeOfBirth: coords.displayName, latitude: coords.lat, longitude: coords.lon, timezone: tz.utcOffsetHours, language: finalLanguage, gender: finalGender, visitorId, sessionId },
          });
          if (startError || !startData?.jobId) throw new Error(startError?.message || 'Failed to start row job');
          const jobId = String(startData.jobId);
          updateBulkRow(row.rowNumber, { status: 'processing', jobId });
          const result = await pollJobUntilDone(jobId, sessionId, visitorId);
          if (result.status === 'completed') {
            updateBulkRow(row.rowNumber, { status: 'completed', error: undefined });
            const completedRow = { rowNumber: row.rowNumber, name, place: placeOfBirth, status: 'completed' as BulkStatus, gender: finalGender as 'M' | 'F', language: finalLanguage as 'en' | 'hi' | 'te' | 'kn' | 'mr', jobId };
            await preparePdfForRow(completedRow).catch((e) => console.warn(`[Bulk] Auto PDF prep (retry) failed for row ${row.rowNumber}:`, e));
          } else {
            updateBulkRow(row.rowNumber, { status: 'failed', error: `Retry failed: ${result.error || 'Job failed'}` });
          }
        } catch (err) {
          updateBulkRow(row.rowNumber, { status: 'failed', error: `Retry failed: ${err instanceof Error ? err.message : 'Unknown error'}` });
        }
      }
    }

    setIsRunning(false);
    if (stopRequestedRef.current) {
      toast('Bulk run stopped');
    } else {
      toast.success('Bulk run completed');
    }
  };

  const completedCount = bulkRows.filter((r) => r.status === 'completed').length;
  const failedCount = bulkRows.filter((r) => r.status === 'failed').length;
  const pendingCount = bulkRows.filter((r) => r.status !== 'completed').length;

  return (
    <Card className="w-full max-w-4xl mx-auto mb-6 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Table2 className="w-5 h-5 text-primary" />
          Bulk Google Sheet Runner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-4 space-y-2">
            <Label htmlFor="sheet-url">Google Sheet URL</Label>
            <Input
              id="sheet-url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="Paste Google Sheet URL"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="start-row" className={useSpecificMode ? 'opacity-40' : ''}>Start Row</Label>
            <Input
              id="start-row"
              type="number"
              min={2}
              value={startRow}
              onChange={(e) => setStartRow(e.target.value)}
              disabled={useSpecificMode}
              className={useSpecificMode ? 'opacity-40' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-row" className={useSpecificMode ? 'opacity-40' : ''}>End Row</Label>
            <Input
              id="end-row"
              type="number"
              min={2}
              value={endRow}
              onChange={(e) => setEndRow(e.target.value)}
              disabled={useSpecificMode}
              className={useSpecificMode ? 'opacity-40' : ''}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-language">Report Language</Label>
            <select
              id="bulk-language"
              value={bulkLanguage}
              onChange={(e) => {
                const lang = e.target.value as 'en' | 'hi' | 'te' | 'kn' | 'mr';
                setBulkLanguage(lang);
                // Update all pending rows to the new default language
                setBulkRows((prev) => prev.map((r) => r.status === 'pending' ? { ...r, language: lang } : r));
              }}
              disabled={isRunning}
              className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="te">Telugu</option>
              <option value="kn">Kannada</option>
              <option value="mr">Marathi</option>
              <option value="ta">Tamil</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" onClick={loadSheetRows} disabled={isLoadingSheet || isRunning} className="w-full">
              {isLoadingSheet ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Load Rows
            </Button>
          </div>
          <div className="md:col-span-4 space-y-2">
            <Label htmlFor="specific-rows" className={useSpecificMode ? '' : 'opacity-60'}>
              Specific Rows <span className="text-xs text-muted-foreground font-normal">(overrides range when filled, e.g. 2,5,8-12)</span>
            </Label>
            <Input
              id="specific-rows"
              value={specificRows}
              onChange={(e) => setSpecificRows(e.target.value)}
              placeholder="e.g. 2,5,8,12  or  3-7,10,15"
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Selected rows: <strong>{selectedRows.length}</strong>
          {useSpecificMode
            ? ` (specific: ${specificRows.trim()})`
            : ` (range ${startRowNum}-${endRowNum})`}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={runBulkGeneration} disabled={isRunning || selectedRows.length === 0}>
            {isRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Start Fresh
          </Button>
          <Button type="button" variant="outline" onClick={continueBulkGeneration} disabled={isRunning || pendingCount === 0}>
            <FastForward className="w-4 h-4 mr-2" />
            Continue ({pendingCount})
          </Button>
          <Button type="button" variant="destructive" onClick={stopBulkRun} disabled={!isRunning}>
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
          <Button type="button" variant="destructive" onClick={forceResetRun} disabled={!isRunning}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Force Reset
          </Button>
          <Button type="button" variant="outline" onClick={refreshAllFiles} disabled={isRunning || isRefreshingPdfs || completedCount === 0}>
            {isRefreshingPdfs ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
            Refresh All PDFs
          </Button>
          <Button type="button" variant="outline" onClick={prepareAllCompletedPdfs} disabled={isRunning || completedCount === 0}>
            Prepare Downloads
          </Button>
        </div>

        {!!bulkRows.length && (
          <div className="rounded-md border border-border overflow-hidden">
            <div className="p-3 border-b bg-muted/40 text-sm">
              Completed: <strong>{completedCount}</strong> | Failed: <strong>{failedCount}</strong> | Total: <strong>{bulkRows.length}</strong>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Row</th>
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Place</th>
                    <th className="text-left p-2">DoB</th>
                    <th className="text-left p-2">ToB</th>
                    <th className="text-left p-2">Gender</th>
                    <th className="text-left p-2">Language</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Job ID</th>
                    <th className="text-left p-2">Save PDF</th>
                    <th className="text-left p-2">Download Link (7 days)</th>
                    <th className="text-left p-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map((row) => (
                    <tr key={row.rowNumber} className="border-t">
                      <td className="p-2">{row.rowNumber}</td>
                      <td className="p-2">{row.name || '-'}</td>
                      <td className="p-2">{row.place || '-'}</td>
                      <td className="p-2">
                        {row.status === 'pending' ? (
                          <input
                            type="text"
                            value={row.dateOfBirth || ''}
                            onChange={(e) => updateBulkRow(row.rowNumber, { dateOfBirth: e.target.value })}
                            placeholder="YYYY-MM-DD"
                            className="px-1 py-0.5 border border-input bg-background rounded text-xs w-24"
                          />
                        ) : (
                          <span className="text-xs">{row.dateOfBirth || '-'}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {row.status === 'pending' ? (
                          <input
                            type="text"
                            value={row.timeOfBirth || ''}
                            onChange={(e) => updateBulkRow(row.rowNumber, { timeOfBirth: e.target.value })}
                            placeholder="HH:MM"
                            className="px-1 py-0.5 border border-input bg-background rounded text-xs w-16"
                          />
                        ) : (
                          <span className="text-xs">{row.timeOfBirth || '-'}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {row.status === 'pending' ? (
                          <select
                            value={row.gender}
                            onChange={(e) => updateBulkRow(row.rowNumber, { gender: e.target.value as 'M' | 'F' })}
                            className="px-1 py-0.5 border border-input bg-background rounded text-xs w-16"
                          >
                            <option value="M">Male</option>
                            <option value="F">Female</option>
                          </select>
                        ) : (
                          <span className="text-xs">{row.gender === 'M' ? 'Male' : 'Female'}</span>
                        )}
                      </td>
                      <td className="p-2">
                        {row.status === 'pending' ? (
                          <select
                            value={row.language}
                            onChange={(e) => updateBulkRow(row.rowNumber, { language: e.target.value as 'en' | 'hi' | 'te' | 'kn' | 'mr' })}
                            className="px-1 py-0.5 border border-input bg-background rounded text-xs w-18"
                          >
                            <option value="en">EN</option>
                            <option value="hi">HI</option>
                            <option value="te">TE</option>
                            <option value="kn">KN</option>
                            <option value="mr">MR</option>
                            <option value="ta">TA</option>
                          </select>
                        ) : (
                          <span className="text-xs">{row.language === 'hi' ? 'HI' : row.language === 'te' ? 'TE' : row.language === 'kn' ? 'KN' : row.language === 'mr' ? 'MR' : 'EN'}</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge className={STATUS_COLORS[row.status]}>{row.status}</Badge>
                      </td>
                      <td className="p-2 font-mono text-xs">{row.jobId || '-'}</td>
                      <td className="p-2">
                        {row.status === 'completed' ? (
                          row.downloadUrl ? (
                            <button
                              type="button"
                              className="text-primary underline text-xs cursor-pointer bg-transparent border-none p-0"
                              onClick={() => void saveAsDialog(
                                row.downloadUrl!,
                                row.downloadFileName || buildDownloadFileName(row.name),
                              )}
                            >
                              Save PDF
                            </button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => void preparePdfForRow(row)}
                              disabled={!!row.isPreparingPdf}
                            >
                              {row.isPreparingPdf ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                              {row.isPreparingPdf ? 'Preparing...' : 'Prepare PDF'}
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        {row.bucketSignedUrl ? (
                          <a
                            href={row.bucketSignedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary underline text-xs font-medium"
                          >
                            📥 Download
                          </a>
                        ) : row.isPreparingPdf ? (
                          <span className="text-xs text-muted-foreground">Generating…</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-2 text-red-700 text-xs">{row.error || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

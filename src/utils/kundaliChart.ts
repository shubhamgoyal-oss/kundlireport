import { supabase } from '@/integrations/supabase/client';

export interface BirthDetails {
  day: number;
  month: number;
  year: number;
  hour: number;
  minute: number;
  lat: number;
  lon: number;
  tzone: number;
}

export type ChartType = 'North' | 'South';

interface CacheEntry {
  svg: string;
  timestamp: number;
}

// In-memory cache
const svgCache = new Map<string, CacheEntry>();

// Cache TTL: 30 minutes
const CACHE_TTL = 30 * 60 * 1000;

function getCacheKey(birthDetails: BirthDetails, chartType: ChartType, language: string): string {
  return `D1|${chartType}|svg|${birthDetails.day}-${birthDetails.month}-${birthDetails.year}-${birthDetails.hour}-${birthDetails.minute}-${birthDetails.lat}-${birthDetails.lon}-${birthDetails.tzone}|${language}`;
}

function getFromCache(key: string): string | null {
  // Try memory cache first
  const memEntry = svgCache.get(key);
  if (memEntry && Date.now() - memEntry.timestamp < CACHE_TTL) {
    return memEntry.svg;
  }
  
  // Try sessionStorage
  try {
    const stored = sessionStorage.getItem(`kundali_${key}`);
    if (stored) {
      const parsed = JSON.parse(stored) as CacheEntry;
      if (Date.now() - parsed.timestamp < CACHE_TTL) {
        // Restore to memory cache
        svgCache.set(key, parsed);
        return parsed.svg;
      }
      // Expired, remove it
      sessionStorage.removeItem(`kundali_${key}`);
    }
  } catch (e) {
    // sessionStorage not available or parse error
  }
  
  return null;
}

function setCache(key: string, svg: string): void {
  const entry: CacheEntry = { svg, timestamp: Date.now() };
  
  // Set memory cache
  svgCache.set(key, entry);
  
  // Try sessionStorage
  try {
    sessionStorage.setItem(`kundali_${key}`, JSON.stringify(entry));
  } catch (e) {
    // sessionStorage full or not available
  }
}

/**
 * Transform SVG string to be responsive
 */
function makeResponsiveSvg(svgString: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    
    if (!svg) return svgString;
    
    // Remove fixed width/height
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    
    // Ensure viewBox exists
    if (!svg.getAttribute('viewBox')) {
      svg.setAttribute('viewBox', '0 0 350 350');
    }
    
    // Set preserveAspectRatio
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    
    // Set responsive style
    svg.setAttribute('style', 'width:100%;height:auto;display:block;');
    
    return new XMLSerializer().serializeToString(doc);
  } catch (e) {
    console.error('[kundaliChart] SVG transform error:', e);
    return svgString;
  }
}

export interface FetchKundaliOptions {
  birthDetails: BirthDetails;
  chartType: ChartType;
  language: 'en' | 'hi';
  signal?: AbortSignal;
}

export async function fetchKundaliSvg(options: FetchKundaliOptions): Promise<string> {
  const { birthDetails, chartType, language, signal } = options;
  
  const cacheKey = getCacheKey(birthDetails, chartType, language);
  
  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    console.log('[kundaliChart] Cache hit:', cacheKey);
    return cached;
  }
  
  console.log('[kundaliChart] Fetching:', cacheKey);
  
  const response = await supabase.functions.invoke('get-kundali-chart', {
    body: {
      ...birthDetails,
      chartType,
      language
    }
  });
  
  // Check if aborted
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  
  if (response.error) {
    throw new Error(response.error.message || 'Failed to fetch kundali chart');
  }
  
  const svg = response.data?.data?.svg;
  if (!svg) {
    throw new Error('No SVG data in response');
  }
  
  // Transform to responsive
  const responsiveSvg = makeResponsiveSvg(svg);
  
  // Cache the result
  setCache(cacheKey, responsiveSvg);
  
  return responsiveSvg;
}

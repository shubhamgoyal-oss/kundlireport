import { supabase } from "@/integrations/supabase/client";

const UTM_STORAGE_KEY = 'stored_utm_params';

interface UTMParameters {
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_term?: string;
  utm_content?: string;
}

interface TrafficSourceData {
  visitor_id: string;
  session_id: string;
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
  utm_term?: string;
  utm_content?: string;
  country_code?: string;
  landing_page: string;
  referrer?: string;
}

/**
 * Store UTM parameters in sessionStorage for persistence during navigation
 */
function storeUTMParameters(params: UTMParameters): void {
  if (params.utm_source || params.utm_campaign || params.utm_medium) {
    try {
      sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(params));
    } catch (e) {
      console.warn('[UTM] Failed to store UTM params:', e);
    }
  }
}

/**
 * Retrieve stored UTM parameters from sessionStorage
 */
function getStoredUTMParameters(): UTMParameters {
  try {
    const stored = sessionStorage.getItem(UTM_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[UTM] Failed to retrieve stored UTM params:', e);
  }
  return {};
}

/**
 * Extract UTM parameters from URL search params and store them
 */
export function extractUTMParameters(): UTMParameters {
  const params = new URLSearchParams(window.location.search);
  
  const urlParams: UTMParameters = {
    utm_source: params.get('utm_source') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_term: params.get('utm_term') || undefined,
    utm_content: params.get('utm_content') || undefined,
  };
  
  // If we have UTM params in URL, store them for later use
  if (urlParams.utm_source || urlParams.utm_campaign) {
    storeUTMParameters(urlParams);
  }
  
  return urlParams;
}

/**
 * Get UTM parameters - first from URL, then from storage
 */
function getEffectiveUTMParameters(): UTMParameters {
  const urlParams = extractUTMParameters();
  const storedParams = getStoredUTMParameters();
  
  // URL params take precedence over stored params
  return {
    utm_source: urlParams.utm_source || storedParams.utm_source,
    utm_campaign: urlParams.utm_campaign || storedParams.utm_campaign,
    utm_medium: urlParams.utm_medium || storedParams.utm_medium,
    utm_term: urlParams.utm_term || storedParams.utm_term,
    utm_content: urlParams.utm_content || storedParams.utm_content,
  };
}

/**
 * Get current UTM parameters and append them to a URL
 * - Overrides utm_source with the actual source from user's landing
 * - Passes utm_campaign as utm_medium (with underscore format)
 * - Preserves existing utm_campaign in the destination URL
 * @param baseUrl - The base URL to append UTM params to
 * @returns URL with UTM parameters appended
 */
export function appendUTMToUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  
  const utmParams = getEffectiveUTMParameters();
  const hasRelevantUTM = utmParams.utm_source || utmParams.utm_campaign;
  
  if (!hasRelevantUTM) return baseUrl;
  
  try {
    const url = new URL(baseUrl);
    
    // Override utm_source with actual source from user's landing
    if (utmParams.utm_source) {
      url.searchParams.set('utm_source', utmParams.utm_source);
    }
    
    // Pass utm_campaign from traffic_sources as utm_medium in puja link
    if (utmParams.utm_campaign) {
      url.searchParams.set('utm_medium', utmParams.utm_campaign);
    }
    
    // Also pass utm_content if available
    if (utmParams.utm_content) {
      url.searchParams.set('utm_content', utmParams.utm_content);
    }
    
    return url.toString();
  } catch (e) {
    // If URL parsing fails, try manual concatenation
    const separator = baseUrl.includes('?') ? '&' : '?';
    const params: string[] = [];
    
    if (utmParams.utm_source) params.push(`utm_source=${encodeURIComponent(utmParams.utm_source)}`);
    if (utmParams.utm_campaign) params.push(`utm_medium=${encodeURIComponent(utmParams.utm_campaign)}`);
    if (utmParams.utm_content) params.push(`utm_content=${encodeURIComponent(utmParams.utm_content)}`);
    
    return params.length > 0 ? `${baseUrl}${separator}${params.join('&')}` : baseUrl;
  }
}

/**
 * Get country code from geolocation API
 */
async function getCountryCode(): Promise<string | undefined> {
  try {
    // Try to get from ipapi.co (free tier allows reasonable requests)
    const response = await fetch('https://ipapi.co/json/');
    if (response.ok) {
      const data = await response.json();
      return data.country_code;
    }
  } catch (error) {
    console.error('Failed to get country code:', error);
  }
  return undefined;
}

// Module-level flag to prevent race conditions within the same page load
const trackingInProgress = new Set<string>();

/**
 * Track traffic source for the current visitor
 * Should be called once per session on initial page load
 */
export async function trackTrafficSource(visitorId: string, sessionId: string): Promise<void> {
  const trackingKey = `traffic_tracked_${sessionId}`;
  
  try {
    // Check localStorage first (synchronous)
    if (localStorage.getItem(trackingKey)) {
      return; // Already tracked this session
    }
    
    // Check module-level flag to prevent race condition from multiple simultaneous calls
    if (trackingInProgress.has(sessionId)) {
      return; // Already tracking this session
    }
    
    // Set BOTH flags immediately BEFORE any async work to prevent duplicates
    trackingInProgress.add(sessionId);
    localStorage.setItem(trackingKey, 'pending'); // Mark as pending immediately
    
    const utmParams = extractUTMParameters();
    
    // Get country code with timeout to prevent blocking
    let countryCode: string | undefined;
    try {
      const countryPromise = getCountryCode();
      const timeoutPromise = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 3000));
      countryCode = await Promise.race([countryPromise, timeoutPromise]);
    } catch (e) {
      countryCode = undefined;
    }
    
    const trafficData: TrafficSourceData = {
      visitor_id: visitorId,
      session_id: sessionId,
      ...utmParams,
      country_code: countryCode,
      landing_page: window.location.pathname + window.location.search,
      referrer: document.referrer || undefined,
    };

    // Store in database
    const { error } = await supabase
      .from('traffic_sources')
      .insert(trafficData);

    if (error) {
      console.error('[TrafficTracking] Failed to insert:', error.message, error.code);
      // On error, remove the pending flag so it can be retried on next page load
      localStorage.removeItem(trackingKey);
    } else {
      // Mark as successfully tracked
      localStorage.setItem(trackingKey, 'true');
    }
  } catch (e) {
    console.error('[TrafficTracking] Unexpected error:', e);
    // On error, remove the pending flag
    try { localStorage.removeItem(trackingKey); } catch {}
  } finally {
    trackingInProgress.delete(sessionId);
  }
}

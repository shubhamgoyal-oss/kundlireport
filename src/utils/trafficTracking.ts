import { supabase } from "@/integrations/supabase/client";

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
 * Extract UTM parameters from URL search params
 */
export function extractUTMParameters(): UTMParameters {
  const params = new URLSearchParams(window.location.search);
  
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_term: params.get('utm_term') || undefined,
    utm_content: params.get('utm_content') || undefined,
  };
}

/**
 * Get current UTM parameters and append them to a URL
 * @param baseUrl - The base URL to append UTM params to
 * @returns URL with UTM parameters appended
 */
export function appendUTMToUrl(baseUrl: string): string {
  if (!baseUrl) return baseUrl;
  
  const utmParams = extractUTMParameters();
  const hasAnyUTM = Object.values(utmParams).some(v => v);
  
  if (!hasAnyUTM) return baseUrl;
  
  try {
    const url = new URL(baseUrl);
    
    // Append each UTM parameter if it exists
    if (utmParams.utm_source) url.searchParams.set('utm_source', utmParams.utm_source);
    if (utmParams.utm_campaign) url.searchParams.set('utm_campaign', utmParams.utm_campaign);
    if (utmParams.utm_medium) url.searchParams.set('utm_medium', utmParams.utm_medium);
    if (utmParams.utm_term) url.searchParams.set('utm_term', utmParams.utm_term);
    if (utmParams.utm_content) url.searchParams.set('utm_content', utmParams.utm_content);
    
    return url.toString();
  } catch (e) {
    // If URL parsing fails, try manual concatenation
    const separator = baseUrl.includes('?') ? '&' : '?';
    const params: string[] = [];
    
    if (utmParams.utm_source) params.push(`utm_source=${encodeURIComponent(utmParams.utm_source)}`);
    if (utmParams.utm_campaign) params.push(`utm_campaign=${encodeURIComponent(utmParams.utm_campaign)}`);
    if (utmParams.utm_medium) params.push(`utm_medium=${encodeURIComponent(utmParams.utm_medium)}`);
    if (utmParams.utm_term) params.push(`utm_term=${encodeURIComponent(utmParams.utm_term)}`);
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

/**
 * Track traffic source for the current visitor
 * Should be called once per session on initial page load
 */
export async function trackTrafficSource(visitorId: string, sessionId: string): Promise<void> {
  try {
    // Check if we've already tracked this session
    const trackingKey = `traffic_tracked_${sessionId}`;
    if (localStorage.getItem(trackingKey)) {
      console.log('[TrafficTracking] Session already tracked:', sessionId);
      return; // Already tracked this session
    }

    console.log('[TrafficTracking] Starting tracking for session:', sessionId);

    const utmParams = extractUTMParameters();
    
    // Get country code with timeout to prevent blocking
    let countryCode: string | undefined;
    try {
      const countryPromise = getCountryCode();
      const timeoutPromise = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 3000));
      countryCode = await Promise.race([countryPromise, timeoutPromise]);
    } catch (e) {
      console.warn('[TrafficTracking] Country code fetch failed:', e);
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

    console.log('[TrafficTracking] Inserting traffic data:', { session_id: sessionId, utm_source: utmParams.utm_source });

    // Store in database
    const { error } = await supabase
      .from('traffic_sources')
      .insert(trafficData);

    if (error) {
      console.error('[TrafficTracking] Failed to insert:', error.message, error.code);
    } else {
      // Mark this session as tracked
      localStorage.setItem(trackingKey, 'true');
      console.log('[TrafficTracking] Success for session:', sessionId);
    }
  } catch (e) {
    console.error('[TrafficTracking] Unexpected error:', e);
  }
}

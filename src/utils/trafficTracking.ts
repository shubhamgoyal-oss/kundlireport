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
  // Check if we've already tracked this session
  const trackingKey = `traffic_tracked_${sessionId}`;
  if (localStorage.getItem(trackingKey)) {
    return; // Already tracked this session
  }

  const utmParams = extractUTMParameters();
  const countryCode = await getCountryCode();
  
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
    console.error('Failed to track traffic source:', error);
  } else {
    // Mark this session as tracked
    localStorage.setItem(trackingKey, 'true');
    console.log('Traffic source tracked:', trafficData);
  }
}

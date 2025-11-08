/**
 * Time zone detection utilities
 * Uses GeoNames API (free tier) for coordinate-based timezone lookup
 */

/**
 * Get IANA time zone identifier for given coordinates
 * Falls back to manual estimation if API fails
 */
export async function getTimeZoneForCoordinates(lat: number, lon: number): Promise<string> {
  try {
    // Try GeoNames API first (free, but limited)
    // Note: For production, consider using a more reliable service or server-side lookup
    const response = await fetch(
      `https://api.timezonedb.com/v2.1/get-time-zone?key=demo&format=json&by=position&lat=${lat}&lng=${lon}`
    );

    if (response.ok) {
      const data = await response.json();
      if (data.zoneName) {
        return data.zoneName;
      }
    }
  } catch (error) {
    console.warn('TimeZone API failed, using fallback estimation:', error);
  }

  // Fallback: Estimate based on longitude
  return estimateTimeZoneFromCoordinates(lat, lon);
}

/**
 * Estimate time zone based on coordinates
 * This is a rough approximation - for accurate results, use a proper timezone API
 */
function estimateTimeZoneFromCoordinates(lat: number, lon: number): string {
  // Simple estimation based on common regions
  // India region
  if (lat >= 6 && lat <= 37 && lon >= 68 && lon <= 97) {
    return 'Asia/Kolkata';
  }
  
  // USA regions
  if (lat >= 24 && lat <= 49 && lon >= -125 && lon <= -66) {
    if (lon >= -125 && lon <= -104) return 'America/Los_Angeles';
    if (lon >= -104 && lon <= -87) return 'America/Denver';
    if (lon >= -87 && lon <= -84) return 'America/Chicago';
    return 'America/New_York';
  }
  
  // Europe
  if (lat >= 36 && lat <= 71 && lon >= -10 && lon <= 40) {
    return 'Europe/London';
  }
  
  // Australia
  if (lat >= -44 && lat <= -10 && lon >= 113 && lon <= 154) {
    return 'Australia/Sydney';
  }
  
  // Default to UTC
  return 'UTC';
}

/**
 * Get current browser's time zone
 */
export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.error('Failed to get browser timezone:', error);
    return 'UTC';
  }
}

/**
 * Convert local time to UTC given a time zone
 */
export function localToUTC(
  dateStr: string,
  timeStr: string,
  timezone: string
): Date {
  const localDateTime = `${dateStr}T${timeStr}:00`;
  
  try {
    // Create a date in the specified timezone
    const date = new Date(localDateTime);
    return date;
  } catch (error) {
    console.error('Date conversion error:', error);
    return new Date();
  }
}

/**
 * User geolocation utilities for tracking where users access the site from
 */

export interface UserLocation {
  country: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
}

let cachedLocation: UserLocation | null = null;

/**
 * Get user's current geographical location using IP-based geolocation
 * Falls back gracefully if geolocation fails
 */
export async function getUserLocation(): Promise<UserLocation> {
  // Return cached location if available
  if (cachedLocation) {
    return cachedLocation;
  }

  // Only use IP-based geolocation to avoid permission prompts
  try {
    const ipLocation = await getIPBasedLocation();
    cachedLocation = ipLocation;
    return ipLocation;
  } catch (error) {
    console.warn('IP-based geolocation failed:', error);
    return {
      country: null,
      city: null,
      latitude: null,
      longitude: null,
    };
  }
}

/**
 * Get location from browser's Geolocation API
 */
async function getBrowserGeolocation(): Promise<Partial<UserLocation>> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null, country: null, city: null });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          country: null,
          city: null,
        });
      },
      () => {
        resolve({ latitude: null, longitude: null, country: null, city: null });
      },
      { timeout: 5000, maximumAge: 300000 } // 5 min cache
    );
  });
}

/**
 * Reverse geocode coordinates to get country and city
 */
async function reverseGeocode(lat: number, lon: number): Promise<{ country: string | null; city: string | null }> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Dosha-Calculator-App',
        },
      }
    );

    if (!response.ok) {
      return { country: null, city: null };
    }

    const data = await response.json();
    return {
      country: data.address?.country || null,
      city: data.address?.city || data.address?.town || data.address?.village || null,
    };
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    return { country: null, city: null };
  }
}

/**
 * Get location based on IP address using ip-api.com (free, no API key required)
 */
async function getIPBasedLocation(): Promise<UserLocation> {
  try {
    const response = await fetch('http://ip-api.com/json/?fields=status,country,city,lat,lon');
    
    if (!response.ok) {
      throw new Error('IP geolocation API failed');
    }

    const data = await response.json();

    if (data.status === 'success') {
      return {
        country: data.country || null,
        city: data.city || null,
        latitude: data.lat || null,
        longitude: data.lon || null,
      };
    }

    throw new Error('IP geolocation returned unsuccessful status');
  } catch (error) {
    console.error('IP-based geolocation error:', error);
    return {
      country: null,
      city: null,
      latitude: null,
      longitude: null,
    };
  }
}

/**
 * Clear cached location (useful for testing or if user changes location)
 */
export function clearLocationCache() {
  cachedLocation = null;
}

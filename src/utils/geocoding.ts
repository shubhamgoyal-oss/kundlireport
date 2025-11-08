/**
 * Geocoding utilities using OpenStreetMap Nominatim API
 * Free service, no API key required
 */

export interface Place {
  display_name: string;
  lat: number;
  lon: number;
  type?: string;
  address?: {
    city?: string;
    state?: string;
    country?: string;
  };
}

/**
 * Search for places using OpenStreetMap Nominatim
 * Rate limit: 1 request per second
 */
export async function searchPlaces(query: string): Promise<Place[]> {
  if (!query || query.length < 3) {
    return [];
  }

  const sanitizedQuery = encodeURIComponent(query.trim());
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${sanitizedQuery}&format=json&limit=5&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'VedicDoshaCalculator/1.0',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();

    return data.map((item: any) => ({
      display_name: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
      address: item.address,
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to search places. Please try again.');
  }
}

/**
 * Get coordinates for a specific place name
 */
export async function getCoordinates(placeName: string): Promise<{ lat: number; lon: number } | null> {
  const results = await searchPlaces(placeName);
  return results.length > 0 ? { lat: results[0].lat, lon: results[0].lon } : null;
}

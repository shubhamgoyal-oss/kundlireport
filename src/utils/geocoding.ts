/**
 * India-first geocoding with provider fallback
 * Primary: Photon | Secondary: Nominatim (OSM) | Tertiary: GeoNames
 */

export interface Place {
  display_name: string;
  lat: number;
  lon: number;
  type?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    state_district?: string;
    county?: string;
  };
  confidence?: 'city' | 'district' | 'locality' | 'other';
}

// Rate limiting and caching
const queryCache = new Map<string, { results: Place[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 10;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 400; // ms

// Preloaded city data for instant first search
interface CityData {
  State: string;
  Location: string;
  Latitude: number;
  Longitude: number;
  Combined: string;
}

let cityDataCache: CityData[] | null = null;
let cityDataLoading: Promise<CityData[]> | null = null;

// Load city data on-demand (lazy load) - only when user starts searching
async function loadCityData(): Promise<CityData[]> {
  if (cityDataCache) return cityDataCache;
  if (cityDataLoading) return cityDataLoading;

  cityDataLoading = (async () => {
    try {
      console.log('🚀 Loading Indian cities database on-demand...');
      const XLSX = await import('xlsx');
      const response = await fetch('/indian-cities.xlsx');
      
      if (!response.ok) {
        throw new Error('Failed to fetch city database');
      }

      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<CityData>(firstSheet);
      
      cityDataCache = data;
      console.log(`✓ Loaded ${data.length} cities`);
      return data;
    } catch (error) {
      console.error('Failed to load city data:', error);
      cityDataLoading = null;
      return [];
    }
  })();

  return cityDataLoading;
}

// Export function to trigger preload when user focuses on place input
export function preloadCityDatabase() {
  if (!cityDataCache && !cityDataLoading) {
    loadCityData();
  }
}

/**
 * Nominatim (Primary) - Free OSM geocoder with India filters
 */
async function searchNominatim(query: string): Promise<Place[]> {
  const params = new URLSearchParams({
    q: query,
    countrycodes: 'IN', // Hard restrict to India
    viewbox: '68,8,98,37', // India bounding box
    bounded: '1', // Restrict to viewbox
    limit: '8',
    format: 'jsonv2',
    addressdetails: '1',
    'accept-language': 'en-IN',
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        'User-Agent': 'VedicDoshaCalculator/2.0',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Nominatim error: ${response.status}`);
  }

  const data = await response.json();
  return data.map((item: any) => normalizeNominatimResult(item));
}

/**
 * Photon (Secondary) - Komoot's OSM autocomplete with India bias
 */
async function searchPhoton(query: string): Promise<Place[]> {
  const params = new URLSearchParams({
    q: query,
    lang: 'en',
    limit: '8',
    lat: '22.97', // India centroid bias
    lon: '78.65',
  });

  const response = await fetch(
    `https://photon.komoot.io/api/?${params}`
  );

  if (!response.ok) {
    throw new Error(`Photon error: ${response.status}`);
  }

  const data = await response.json();
  return data.features
    .filter((f: any) => f.properties.countrycode === 'IN')
    .map((item: any) => normalizePhotonResult(item));
}

/**
 * GeoNames (Tertiary) - Free with username
 */
async function searchGeoNames(query: string): Promise<Place[]> {
  const username = import.meta.env.VITE_GEONAMES_USERNAME || 'demo';
  const params = new URLSearchParams({
    q: query,
    country: 'IN',
    maxRows: '8',
    username: username,
    featureClass: 'P', // Populated places (cities, towns, villages)
    lang: 'en',
  });

  const response = await fetch(
    `https://secure.geonames.org/searchJSON?${params}`
  );

  if (!response.ok) {
    throw new Error(`GeoNames error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.geonames || data.geonames.length === 0) {
    return [];
  }

  return data.geonames.map((item: any) => normalizeGeoNamesResult(item));
}

function normalizeNominatimResult(item: any): Place {
  const address = item.address || {};
  const displayParts = [
    address.city || address.town || address.village,
    address.state_district || address.county,
    address.state,
  ].filter(Boolean);

  return {
    display_name: displayParts.join(', '),
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    type: item.type,
    address: {
      city: address.city || address.town || address.village,
      state: address.state,
      state_district: address.state_district || address.county,
      country: address.country,
    },
    confidence: determineConfidence(item.type, address),
  };
}

function normalizePhotonResult(item: any): Place {
  const props = item.properties;
  const coords = item.geometry.coordinates;
  
  const displayParts = [
    props.city || props.name,
    props.district || props.county,
    props.state,
  ].filter(Boolean);

  return {
    display_name: displayParts.join(', '),
    lat: coords[1],
    lon: coords[0],
    type: props.osm_value,
    address: {
      city: props.city || props.name,
      state: props.state,
      state_district: props.district || props.county,
      country: props.country,
    },
    confidence: determineConfidence(props.osm_value, props),
  };
}

function normalizeGeoNamesResult(item: any): Place {
  const displayParts = [
    item.name,
    item.adminName1, // State
  ].filter(Boolean);

  return {
    display_name: displayParts.join(', '),
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lng),
    type: item.fcode,
    address: {
      city: item.name,
      state: item.adminName1,
      country: item.countryName,
    },
    confidence: determineConfidenceFromFcode(item.fcode),
  };
}

function determineConfidenceFromFcode(fcode?: string): Place['confidence'] {
  if (!fcode) return 'other';
  
  const cityFcodes = ['PPLA', 'PPLC']; // Admin capital, country capital
  const districtFcodes = ['PPLA2', 'PPLA3']; // District capitals
  const localityFcodes = ['PPL', 'PPLL', 'PPLX']; // General populated place
  
  if (cityFcodes.includes(fcode)) return 'city';
  if (districtFcodes.includes(fcode)) return 'district';
  if (localityFcodes.includes(fcode)) return 'locality';
  
  return 'other';
}

function determineConfidence(type?: string, address?: any): Place['confidence'] {
  if (!type) return 'other';
  
  const cityTypes = ['city', 'town', 'municipality'];
  const districtTypes = ['district', 'county', 'state_district'];
  const localityTypes = ['village', 'hamlet', 'suburb', 'locality'];
  
  if (cityTypes.some(t => type.includes(t))) return 'city';
  if (districtTypes.some(t => type.includes(t))) return 'district';
  if (localityTypes.some(t => type.includes(t))) return 'locality';
  
  return 'other';
}

/**
 * Search local Indian cities database (Google Sheets fallback)
 */
async function searchLocalIndianCities(query: string): Promise<Place[]> {
  try {
    console.log('🏙️ Searching local Indian cities database...');
    
    // Load data on-demand (lazy load)
    const data = await loadCityData();
    
    if (data.length === 0) {
      console.warn('City data not available');
      return [];
    }
    
    const results: Place[] = [];
    const queryLower = query.toLowerCase().trim();
    
    // Search through all cities
    for (const row of data) {
      if (!row.Location || !row.Latitude || !row.Longitude) continue;
      
      // Check if location matches query (search in both Location and Combined)
      const locationMatch = row.Location.toLowerCase().includes(queryLower);
      const combinedMatch = row.Combined?.toLowerCase().includes(queryLower);
      
      if (locationMatch || combinedMatch) {
        results.push({
          display_name: row.Combined || `${row.Location}, ${row.State}`,
          lat: row.Latitude,
          lon: row.Longitude,
          type: 'city',
          address: {
            city: row.Location,
            state: row.State,
            country: 'India'
          },
          confidence: 'city'
        });
      }
      
      // Limit results to 15 for better coverage
      if (results.length >= 15) break;
    }
    
    console.log(`✓ Found ${results.length} results from local database`);
    return results;
  } catch (error) {
    console.error('Error searching local database:', error);
    return [];
  }
}

/**
 * Main search with provider fallback and caching
 */
export async function searchPlaces(query: string): Promise<Place[]> {
  if (!query || query.length < 2) {
    return [];
  }

  const sanitizedQuery = query.trim();
  
  // Check cache first
  const cached = queryCache.get(sanitizedQuery);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.results;
  }

  // Priority 1: Search local database first (fastest, 4.2k Indian cities)
  const localResults = await searchLocalIndianCities(sanitizedQuery).catch(err => {
    console.warn('Local database search failed:', err);
    return [];
  });

  console.log(`📊 Local search results: ${localResults.length}`);

  // If local database has results, return them immediately (no API calls needed)
  if (localResults.length > 0) {
    const results = localResults.slice(0, 10);
    
    // Update cache
    if (queryCache.size >= MAX_CACHE_SIZE) {
      const firstKey = queryCache.keys().next().value;
      queryCache.delete(firstKey);
    }
    queryCache.set(sanitizedQuery, { results, timestamp: Date.now() });
    
    console.log(`✓ Returning ${results.length} local results (no API calls needed)`);
    return results;
  }

  // Priority 2: Only query external APIs if local database has no results
  console.log('⚠️ No local results, querying external APIs...');
  
  // Rate limiting for external APIs
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => 
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }
  lastRequestTime = Date.now();

  const externalResults = await Promise.race([
    searchPhoton(sanitizedQuery),
    searchNominatim(sanitizedQuery),
    searchGeoNames(sanitizedQuery),
  ]).catch(async (err) => {
    console.warn('All fast APIs failed, trying fallback:', err);
    // If race fails, try them sequentially
    try {
      return await searchNominatim(sanitizedQuery);
    } catch {
      try {
        return await searchGeoNames(sanitizedQuery);
      } catch {
        return [];
      }
    }
  });

  console.log(`📊 External search results: ${externalResults.length}`);

  // Limit total results
  const results = externalResults.slice(0, 10);

  if (results.length === 0) {
    throw new Error('No locations found. Please try a different search.');
  }

  // Update cache
  if (queryCache.size >= MAX_CACHE_SIZE) {
    const firstKey = queryCache.keys().next().value;
    queryCache.delete(firstKey);
  }
  queryCache.set(sanitizedQuery, { results, timestamp: Date.now() });

  console.log(`✓ Returning ${results.length} merged results (local prioritized)`);
  return results;
}

/**
 * Get coordinates for a specific place name
 */
export async function getCoordinates(placeName: string): Promise<{ lat: number; lon: number } | null> {
  const results = await searchPlaces(placeName);
  return results.length > 0 ? { lat: results[0].lat, lon: results[0].lon } : null;
}

/**
 * Offline fallback: Top 50 Indian cities
 */
export const INDIAN_CITIES_FALLBACK: Place[] = [
  { display_name: 'Mumbai, Maharashtra', lat: 19.0760, lon: 72.8777, confidence: 'city' as const },
  { display_name: 'Delhi, Delhi', lat: 28.7041, lon: 77.1025, confidence: 'city' as const },
  { display_name: 'Bangalore, Karnataka', lat: 12.9716, lon: 77.5946, confidence: 'city' as const },
  { display_name: 'Hyderabad, Telangana', lat: 17.3850, lon: 78.4867, confidence: 'city' as const },
  { display_name: 'Ahmedabad, Gujarat', lat: 23.0225, lon: 72.5714, confidence: 'city' as const },
  { display_name: 'Chennai, Tamil Nadu', lat: 13.0827, lon: 80.2707, confidence: 'city' as const },
  { display_name: 'Kolkata, West Bengal', lat: 22.5726, lon: 88.3639, confidence: 'city' as const },
  { display_name: 'Pune, Maharashtra', lat: 18.5204, lon: 73.8567, confidence: 'city' as const },
  { display_name: 'Jaipur, Rajasthan', lat: 26.9124, lon: 75.7873, confidence: 'city' as const },
  { display_name: 'Surat, Gujarat', lat: 21.1702, lon: 72.8311, confidence: 'city' as const },
  { display_name: 'Lucknow, Uttar Pradesh', lat: 26.8467, lon: 80.9462, confidence: 'city' as const },
  { display_name: 'Kanpur, Uttar Pradesh', lat: 26.4499, lon: 80.3319, confidence: 'city' as const },
  { display_name: 'Nagpur, Maharashtra', lat: 21.1458, lon: 79.0882, confidence: 'city' as const },
  { display_name: 'Indore, Madhya Pradesh', lat: 22.7196, lon: 75.8577, confidence: 'city' as const },
  { display_name: 'Thane, Maharashtra', lat: 19.2183, lon: 72.9781, confidence: 'city' as const },
  { display_name: 'Bhopal, Madhya Pradesh', lat: 23.2599, lon: 77.4126, confidence: 'city' as const },
  { display_name: 'Visakhapatnam, Andhra Pradesh', lat: 17.6869, lon: 83.2185, confidence: 'city' as const },
  { display_name: 'Pimpri-Chinchwad, Maharashtra', lat: 18.6298, lon: 73.7997, confidence: 'city' as const },
  { display_name: 'Patna, Bihar', lat: 25.5941, lon: 85.1376, confidence: 'city' as const },
  { display_name: 'Vadodara, Gujarat', lat: 22.3072, lon: 73.1812, confidence: 'city' as const },
  { display_name: 'Ghaziabad, Uttar Pradesh', lat: 28.6692, lon: 77.4538, confidence: 'city' as const },
  { display_name: 'Ludhiana, Punjab', lat: 30.9010, lon: 75.8573, confidence: 'city' as const },
  { display_name: 'Agra, Uttar Pradesh', lat: 27.1767, lon: 78.0081, confidence: 'city' as const },
  { display_name: 'Nashik, Maharashtra', lat: 19.9975, lon: 73.7898, confidence: 'city' as const },
  { display_name: 'Faridabad, Haryana', lat: 28.4089, lon: 77.3178, confidence: 'city' as const },
  { display_name: 'Meerut, Uttar Pradesh', lat: 28.9845, lon: 77.7064, confidence: 'city' as const },
  { display_name: 'Rajkot, Gujarat', lat: 22.3039, lon: 70.8022, confidence: 'city' as const },
  { display_name: 'Kalyan-Dombivali, Maharashtra', lat: 19.2403, lon: 73.1305, confidence: 'city' as const },
  { display_name: 'Vasai-Virar, Maharashtra', lat: 19.4612, lon: 72.7985, confidence: 'city' as const },
  { display_name: 'Varanasi, Uttar Pradesh', lat: 25.3176, lon: 82.9739, confidence: 'city' as const },
  { display_name: 'Srinagar, Jammu and Kashmir', lat: 34.0837, lon: 74.7973, confidence: 'city' as const },
  { display_name: 'Aurangabad, Maharashtra', lat: 19.8762, lon: 75.3433, confidence: 'city' as const },
  { display_name: 'Dhanbad, Jharkhand', lat: 23.7957, lon: 86.4304, confidence: 'city' as const },
  { display_name: 'Amritsar, Punjab', lat: 31.6340, lon: 74.8723, confidence: 'city' as const },
  { display_name: 'Navi Mumbai, Maharashtra', lat: 19.0330, lon: 73.0297, confidence: 'city' as const },
  { display_name: 'Allahabad, Uttar Pradesh', lat: 25.4358, lon: 81.8463, confidence: 'city' as const },
  { display_name: 'Ranchi, Jharkhand', lat: 23.3441, lon: 85.3096, confidence: 'city' as const },
  { display_name: 'Howrah, West Bengal', lat: 22.5958, lon: 88.2636, confidence: 'city' as const },
  { display_name: 'Coimbatore, Tamil Nadu', lat: 11.0168, lon: 76.9558, confidence: 'city' as const },
  { display_name: 'Jabalpur, Madhya Pradesh', lat: 23.1815, lon: 79.9864, confidence: 'city' as const },
  { display_name: 'Gwalior, Madhya Pradesh', lat: 26.2183, lon: 78.1828, confidence: 'city' as const },
  { display_name: 'Vijayawada, Andhra Pradesh', lat: 16.5062, lon: 80.6480, confidence: 'city' as const },
  { display_name: 'Jodhpur, Rajasthan', lat: 26.2389, lon: 73.0243, confidence: 'city' as const },
  { display_name: 'Madurai, Tamil Nadu', lat: 9.9252, lon: 78.1198, confidence: 'city' as const },
  { display_name: 'Raipur, Chhattisgarh', lat: 21.2514, lon: 81.6296, confidence: 'city' as const },
  { display_name: 'Kota, Rajasthan', lat: 25.2138, lon: 75.8648, confidence: 'city' as const },
  { display_name: 'Chandigarh, Chandigarh', lat: 30.7333, lon: 76.7794, confidence: 'city' as const },
  { display_name: 'Guwahati, Assam', lat: 26.1445, lon: 91.7362, confidence: 'city' as const },
  { display_name: 'Thiruvananthapuram, Kerala', lat: 8.5241, lon: 76.9366, confidence: 'city' as const },
  { display_name: 'Mysore, Karnataka', lat: 12.2958, lon: 76.6394, confidence: 'city' as const },
].map(city => ({
  ...city,
  address: {
    city: city.display_name.split(',')[0].trim(),
    state: city.display_name.split(',')[1]?.trim(),
  },
}));

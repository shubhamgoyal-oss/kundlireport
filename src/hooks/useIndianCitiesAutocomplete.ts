import { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';

interface CityData {
  state: string;
  location: string;
  latitude: number;
  longitude: number;
  combined: string;
}

interface CityPrediction {
  id: string;
  displayName: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

let citiesCache: CityData[] | null = null;
let loadingPromise: Promise<CityData[]> | null = null;

async function loadCitiesData(): Promise<CityData[]> {
  if (citiesCache) return citiesCache;
  
  if (loadingPromise) return loadingPromise;
  
  loadingPromise = (async () => {
    try {
      const response = await fetch('/indian-cities.xlsx');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      // Skip header row (index 0)
      const cities: CityData[] = [];
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row[0] && row[1] && row[2] != null && row[3] != null) {
          cities.push({
            state: String(row[0]).trim(),
            location: String(row[1]).trim(),
            latitude: parseFloat(row[2]),
            longitude: parseFloat(row[3]),
            combined: row[4] ? String(row[4]).trim() : `${row[1]}, ${row[0]}`,
          });
        }
      }
      
      citiesCache = cities;
      console.log(`[IndianCities] Loaded ${cities.length} cities`);
      return cities;
    } catch (error) {
      console.error('[IndianCities] Failed to load cities data:', error);
      loadingPromise = null;
      return [];
    }
  })();
  
  return loadingPromise;
}

export function useIndianCitiesAutocomplete() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [predictions, setPredictions] = useState<CityPrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const citiesRef = useRef<CityData[]>([]);

  useEffect(() => {
    loadCitiesData().then((cities) => {
      citiesRef.current = cities;
      setIsLoaded(true);
    });
  }, []);

  const searchPlaces = useCallback(async (query: string): Promise<void> => {
    if (!query || query.length < 2) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);

    try {
      const cities = citiesRef.current;
      const searchTermLower = query.toLowerCase().trim();
      
      // Search for matches - prioritize cities starting with query, then containing query
      const startsWithMatches: CityPrediction[] = [];
      const containsMatches: CityPrediction[] = [];
      
      for (const city of cities) {
        const locationLower = city.location.toLowerCase();
        const stateLower = city.state.toLowerCase();
        const combinedLower = city.combined.toLowerCase();
        
        if (locationLower.startsWith(searchTermLower)) {
          startsWithMatches.push({
            id: `${city.location}-${city.state}`,
            displayName: city.combined,
            city: city.location,
            state: city.state,
            lat: city.latitude,
            lng: city.longitude,
          });
        } else if (
          locationLower.includes(searchTermLower) ||
          stateLower.includes(searchTermLower) ||
          combinedLower.includes(searchTermLower)
        ) {
          containsMatches.push({
            id: `${city.location}-${city.state}`,
            displayName: city.combined,
            city: city.location,
            state: city.state,
            lat: city.latitude,
            lng: city.longitude,
          });
        }
        
        // Limit results for performance
        if (startsWithMatches.length + containsMatches.length >= 50) break;
      }
      
      // Combine with priority to startsWith matches, limit to 10 results
      const results = [...startsWithMatches, ...containsMatches].slice(0, 10);
      setPredictions(results);
    } catch (error) {
      console.error('[IndianCities] Search error:', error);
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const getPlaceDetails = useCallback(async (cityId: string): Promise<{
    display_name: string;
    lat: number;
    lng: number;
    city?: string;
    state?: string;
    country?: string;
  } | null> => {
    // Find the city in predictions (already have all details)
    const prediction = predictions.find(p => p.id === cityId);
    if (prediction) {
      return {
        display_name: prediction.displayName,
        lat: prediction.lat,
        lng: prediction.lng,
        city: prediction.city,
        state: prediction.state,
        country: 'India',
      };
    }
    return null;
  }, [predictions]);

  const clearPredictions = useCallback(() => {
    setPredictions([]);
  }, []);

  return {
    isLoaded,
    predictions,
    isSearching,
    searchPlaces,
    getPlaceDetails,
    clearPredictions,
  };
}

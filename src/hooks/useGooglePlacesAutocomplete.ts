/// <reference types="@types/google.maps" />
import { useState, useEffect, useRef, useCallback } from 'react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyCEsEBy-JYuu9SSITQrpYU3tpaq5HQOhi4';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface PlaceDetails {
  display_name: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
}

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  if (googleMapsPromise) return googleMapsPromise;

  if (window.google?.maps?.places) {
    return Promise.resolve();
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const start = Date.now();
      const check = () => {
        if (window.google?.maps?.places) {
          resolve();
          return;
        }
        if (Date.now() - start > 2000) {
          reject(
            new Error(
              'Google Maps loaded but Places library is unavailable. This usually happens due to API key referrer restrictions (RefererNotAllowedMapError).'
            )
          );
          return;
        }
        setTimeout(check, 50);
      };
      check();
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps API'));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export function useGooglePlacesAutocomplete() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);
  const sessionToken = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => {
        autocompleteService.current = new google.maps.places.AutocompleteService();
        // PlacesService needs a div element, create a hidden one
        const div = document.createElement('div');
        placesService.current = new google.maps.places.PlacesService(div);
        sessionToken.current = new google.maps.places.AutocompleteSessionToken();
        setIsLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load Google Maps:', error);
      });
  }, []);

  const searchPlaces = useCallback(async (query: string): Promise<void> => {
    if (!query || query.length < 2 || !autocompleteService.current) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);

    try {
      const response = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
        autocompleteService.current!.getPlacePredictions(
          {
            input: query,
            componentRestrictions: { country: ['in', 'us', 'ca'] }, // India, US, Canada
            types: ['(cities)'], // Only cities
            sessionToken: sessionToken.current!,
          },
          (predictions, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              resolve(predictions);
            } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              resolve([]);
            } else {
              reject(new Error(`Places API error: ${status}`));
            }
          }
        );
      });

      setPredictions(
        response.map((p) => ({
          place_id: p.place_id,
          description: p.description,
          structured_formatting: {
            main_text: p.structured_formatting?.main_text || p.description,
            secondary_text: p.structured_formatting?.secondary_text || '',
          },
        }))
      );
    } catch (error) {
      console.error('Place search error:', error);
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const getPlaceDetails = useCallback(async (placeId: string): Promise<PlaceDetails | null> => {
    if (!placesService.current) return null;

    try {
      const place = await new Promise<google.maps.places.PlaceResult>((resolve, reject) => {
        placesService.current!.getDetails(
          {
            placeId,
            fields: ['geometry', 'address_components', 'formatted_address'],
            sessionToken: sessionToken.current!,
          },
          (result, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && result) {
              resolve(result);
            } else {
              reject(new Error(`Place details error: ${status}`));
            }
          }
        );
      });

      // Reset session token after fetching details (ends billing session)
      sessionToken.current = new google.maps.places.AutocompleteSessionToken();

      const lat = place.geometry?.location?.lat() || 0;
      const lng = place.geometry?.location?.lng() || 0;

      // Extract address components
      let city = '';
      let state = '';
      let country = '';

      place.address_components?.forEach((component) => {
        if (component.types.includes('locality')) {
          city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
        if (component.types.includes('country')) {
          country = component.long_name;
        }
      });

      return {
        display_name: place.formatted_address || '',
        lat,
        lng,
        city,
        state,
        country,
      };
    } catch (error) {
      console.error('Failed to get place details:', error);
      return null;
    }
  }, []);

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

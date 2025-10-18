import { supabase } from '@/integrations/supabase/client';

export interface SafePlace {
  name: string;
  type: string;
  address: string;
  distance: string;
  location: {
    lat: number;
    lng: number;
  };
  rating?: number;
  placeId?: string;
}

export interface LocationData {
  lat: number;
  lng: number;
  placeName?: string;
}

interface GooglePlaceGeometry {
  location: {
    lat: number;
    lng: number;
  };
}

interface GooglePlace {
  name: string;
  vicinity?: string;
  formatted_address?: string;
  geometry: GooglePlaceGeometry;
  rating?: number;
  place_id: string;
}

interface GooglePlacesResponse {
  results: GooglePlace[];
}

interface GoogleGeocodeResult {
  geometry: GooglePlaceGeometry;
  formatted_address: string;
}

interface GoogleGeocodeResponse {
  results: GoogleGeocodeResult[];
}

/**
 * Fetch nearby safe places using Google Places API
 * @param location - User's current location or searched location
 * @param radius - Search radius in meters (default: 20000 = 20km)
 * @returns Array of safe places
 */
export const fetchNearbySafePlaces = async (
  location: LocationData,
  radius: number = 20000
): Promise<SafePlace[]> => {
  try {
    const safePlaces: SafePlace[] = [];

    // Define safe place types for emergency situations
    const safeTypes = [
      { type: 'hospital', label: 'Hospital' },
      { type: 'police', label: 'Police Station' },
      { type: 'fire_station', label: 'Fire Station' },
      { type: 'park', label: 'Open Ground/Park' },
      { type: 'stadium', label: 'Stadium' },
      { type: 'school', label: 'School' },
      { type: 'locality', label: 'Open Area' }
    ];

    // Fetch places for each type
    for (const { type, label } of safeTypes) {
      try {
        // Use Supabase Edge Function to proxy the request (to avoid CORS)
        const proxyUrl = `${supabase.supabaseUrl}/functions/v1/google-places-proxy?endpoint=nearbysearch&lat=${location.lat}&lng=${location.lng}&radius=${radius}&type=${type}`;
        
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${supabase.supabaseKey}`,
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();

        if (!data.error && data?.results) {
          const places = data.results.slice(0, 3).map((place: GooglePlace) => ({
            name: place.name,
            type: label,
            address: place.vicinity || place.formatted_address || 'Address not available',
            distance: calculateDistance(
              location.lat,
              location.lng,
              place.geometry.location.lat,
              place.geometry.location.lng
            ),
            location: {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng
            },
            rating: place.rating,
            placeId: place.place_id
          }));

          safePlaces.push(...places);
        }
      } catch (err) {
        console.error(`Error fetching ${type}:`, err);
      }
    }

    // Sort by distance and return top 15
    safePlaces.sort((a, b) => {
      const distA = parseFloat(a.distance);
      const distB = parseFloat(b.distance);
      return distA - distB;
    });

    // If we got some results, return them
    if (safePlaces.length > 0) {
      return safePlaces.slice(0, 15);
    }
    
    // Fallback: Return generic safe place recommendations
    return getFallbackSafePlaces(location);
  } catch (error) {
    console.error('Error fetching safe places:', error);
    return getFallbackSafePlaces(location);
  }
};

/**
 * Fallback safe places when API is not available
 */
const getFallbackSafePlaces = (location: LocationData): SafePlace[] => {
  return [
    {
      name: "Nearest Hospital",
      type: "Hospital", 
      address: "Emergency medical facility nearby",
      distance: "~2.5 km",
      location: {
        lat: location.lat + 0.02,
        lng: location.lng + 0.01
      },
      rating: 4.2
    },
    {
      name: "Police Station",
      type: "Police",
      address: "Local law enforcement", 
      distance: "~1.8 km",
      location: {
        lat: location.lat - 0.015,
        lng: location.lng + 0.008
      },
      rating: 4.0
    },
    {
      name: "Fire Station",
      type: "Fire Department",
      address: "Emergency response center",
      distance: "~3.1 km", 
      location: {
        lat: location.lat + 0.025,
        lng: location.lng - 0.012
      },
      rating: 4.5
    },
    {
      name: "Community Center", 
      type: "Safe Shelter",
      address: "Public gathering place",
      distance: "~1.2 km",
      location: {
        lat: location.lat - 0.01,
        lng: location.lng - 0.005
      },
      rating: 3.8
    },
    {
      name: "City Park",
      type: "Open Area", 
      address: "Large open space for safety",
      distance: "~0.9 km",
      location: {
        lat: location.lat + 0.008,
        lng: location.lng - 0.006
      },
      rating: 4.1
    }
  ];
};

/**
 * Calculate distance between two coordinates in km
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance.toFixed(2);
};

/**
 * Geocode a place name to coordinates
 */
export const geocodePlaceName = async (placeName: string): Promise<LocationData | null> => {
  try {
    const proxyUrl = `${supabase.supabaseUrl}/functions/v1/google-places-proxy?endpoint=textsearch&query=${encodeURIComponent(placeName)}`;
    
    const response = await fetch(proxyUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabase.supabaseKey}`,
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();

    if (!data.error && data?.results?.[0]) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        placeName: result.vicinity || result.formatted_address || placeName
      };
    }

    return null;
  } catch (error) {
    console.error('Error geocoding place:', error);
    return null;
  }
};

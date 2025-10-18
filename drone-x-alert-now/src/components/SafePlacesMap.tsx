import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Navigation, ExternalLink, Car, Clock, Route } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SafePlace } from '@/services/safePlacesService';

interface SafePlacesMapProps {
  places: SafePlace[];
  userLocation: { lat: number; lng: number };
  onPlaceSelect?: (place: SafePlace) => void;
}

export const SafePlacesMap: React.FC<SafePlacesMapProps> = ({
  places,
  userLocation,
  onPlaceSelect
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const userMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<SafePlace | null>(null);
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    steps: string[];
  } | null>(null);
  const [showingRoute, setShowingRoute] = useState(false);
  
  const { toast } = useToast();

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      try {
        if (!mapRef.current) return;

        // Get API key
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (error || !data?.apiKey) {
          throw new Error('Failed to get API key');
        }

        // Load Google Maps with marker library
        const loader = new Loader({
          apiKey: data.apiKey,
          version: 'weekly',
          libraries: ['places', 'marker']
        });

        await loader.load();

        // Create map centered on user location with mapId for AdvancedMarkerElement
        const map = new google.maps.Map(mapRef.current, {
          center: userLocation,
          zoom: 14,
          mapId: 'SAFE_PLACES_MAP_ID', // Required for AdvancedMarkerElement
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
          },
          scaleControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels.icon',
              stylers: [{ visibility: 'off' }]
            }
          ]
        });

        googleMapRef.current = map;
        
        // Initialize directions service and renderer
        directionsServiceRef.current = new google.maps.DirectionsService();
        directionsRendererRef.current = new google.maps.DirectionsRenderer({
          draggable: false,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: '#3B82F6',
            strokeWeight: 4,
            strokeOpacity: 0.8
          }
        });
        directionsRendererRef.current.setMap(map);

        // Load the AdvancedMarkerElement library
        await google.maps.importLibrary('marker');
        
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load map:', error);
        toast({
          title: "Map Error",
          description: "Failed to load interactive map",
          variant: "destructive",
        });
      }
    };

    initMap();
  }, [userLocation]);

  // Add markers when map loads or places change
  useEffect(() => {
    const addMarkers = async () => {
      if (!isLoaded || !googleMapRef.current) return;

      // Clear existing markers
      markersRef.current.forEach(marker => {
        if (marker.map) {
          marker.map = null;
        }
      });
      markersRef.current = [];

      // Create user location pin element
      const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;
    
    const userPin = new PinElement({
      background: '#3B82F6',
      borderColor: '#FFFFFF',
      glyphColor: '#FFFFFF',
      scale: 1.2
    });

    // Add user location marker
    const userMarker = new AdvancedMarkerElement({
      map: googleMapRef.current,
      position: userLocation,
      title: 'Your Location',
      content: userPin.element
    });

    userMarkerRef.current = userMarker;

    // Add safe place markers
    for (let index = 0; index < places.length; index++) {
      const place = places[index];
      const pinColor = getMarkerColor(place.type);
      
      const pin = new PinElement({
        background: pinColor,
        borderColor: '#FFFFFF',
        glyphColor: '#FFFFFF',
        glyph: String(index + 1),
        scale: 1.0
      });
      
      const marker = new AdvancedMarkerElement({
        map: googleMapRef.current,
        position: place.location,
        title: place.name,
        content: pin.element
      });

      // Create info window for each place
      const infoWindow = new google.maps.InfoWindow({
        content: createInfoWindowContent(place, index + 1)
      });

      marker.addListener('click', () => {
        infoWindow.open(googleMapRef.current, marker);
        setSelectedPlace(place);
        onPlaceSelect?.(place);
      });

      markersRef.current.push(marker);
    }

    // Adjust map bounds to show all markers
    if (places.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(userLocation);
      places.forEach(place => bounds.extend(place.location));
      googleMapRef.current.fitBounds(bounds);
    }
    };

    addMarkers();
  }, [isLoaded, places, userLocation]);

  // Get marker color based on place type
  const getMarkerColor = (type: string): string => {
    const colorMap = {
      'hospital': '#EF4444',
      'police station': '#3B82F6',
      'fire station': '#F97316',
      'open ground/park': '#10B981',
      'park': '#10B981',
      'stadium': '#8B5CF6',
      'school': '#F59E0B'
    };

    return colorMap[type.toLowerCase() as keyof typeof colorMap] || '#6B7280';
  };

  // Create info window content
  const createInfoWindowContent = (place: SafePlace, index: number) => {
    return `
      <div style="padding: 12px; min-width: 220px; font-family: system-ui;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="background: #3B82F6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">${index}</span>
          <h3 style="margin: 0; font-size: 14px; font-weight: bold;">${place.name}</h3>
        </div>
        <p style="margin: 0 0 8px 0; font-size: 12px; color: #666; line-height: 1.4;">${place.address}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="background: #EFF6FF; color: #1D4ED8; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;">${place.type}</span>
          <span style="font-size: 12px; font-weight: 500; color: #059669;">${place.distance} km away</span>
        </div>
        <div style="display: flex; gap: 4px; margin-top: 8px;">
          <button onclick="showRoute('${place.name}')" style="flex: 1; background: #3B82F6; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 500;">Show Route</button>
          <button onclick="openInGoogleMaps(${place.location.lat}, ${place.location.lng})" style="flex: 1; background: #10B981; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 500;">Navigate</button>
        </div>
      </div>
    `;
  };

  // Show route to selected place
  const showRoute = async (place: SafePlace) => {
    if (!directionsServiceRef.current || !directionsRendererRef.current) return;

    setShowingRoute(true);
    setSelectedPlace(place);

    try {
      const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
        directionsServiceRef.current!.route(
          {
            origin: userLocation,
            destination: place.location,
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
            avoidHighways: false,
            avoidTolls: false
          },
          (result, status) => {
            if (status === 'OK' && result) {
              resolve(result);
            } else {
              reject(new Error(`Directions request failed: ${status}`));
            }
          }
        );
      });

      directionsRendererRef.current.setDirections(result);

      const route = result.routes[0];
      const leg = route.legs[0];
      
      setRouteInfo({
        distance: leg.distance?.text || 'N/A',
        duration: leg.duration?.text || 'N/A',
        steps: leg.steps?.map(step => step.instructions) || []
      });

      toast({
        title: "Route Found!",
        description: `Distance: ${leg.distance?.text}, Time: ${leg.duration?.text}`,
      });

    } catch (error) {
      console.error('Error getting directions:', error);
      toast({
        title: "Route Error",
        description: "Could not calculate route to this location",
        variant: "destructive",
      });
    }
  };

  // Clear route
  const clearRoute = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setDirections({ routes: [], status: 'OK' } as google.maps.DirectionsResult);
    }
    setShowingRoute(false);
    setSelectedPlace(null);
    setRouteInfo(null);
  };

  // Open in Google Maps
  const openInGoogleMaps = (place: SafePlace) => {
    const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${place.location.lat},${place.location.lng}`;
    window.open(url, '_blank');
  };

  // Make functions available globally for info window buttons
  useEffect(() => {
    const globalWindow = window as typeof window & {
      showRoute?: (placeName: string) => void;
      openInGoogleMaps?: (lat: number, lng: number) => void;
    };

    globalWindow.showRoute = (placeName: string) => {
      const place = places.find(p => p.name === placeName);
      if (place) showRoute(place);
    };

    globalWindow.openInGoogleMaps = (lat: number, lng: number) => {
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${lat},${lng}`;
      window.open(url, '_blank');
    };

    return () => {
      delete globalWindow.showRoute;
      delete globalWindow.openInGoogleMaps;
    };
  }, [places, userLocation, showRoute]);

  if (places.length === 0) return null;

  return (
    <Card className="my-4 border-sky-200 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-sky-50 to-blue-50">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MapPin className="h-5 w-5 text-sky-500" />
          Interactive Safe Places Map
        </CardTitle>
        <CardDescription>
          Click on markers to view details and get directions. {places.length} safe places found nearby.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {/* Map Container */}
        <div className="relative h-96 w-full">
          <div 
            ref={mapRef} 
            className="w-full h-full"
            style={{ minHeight: '384px' }}
          />
          
          {/* Loading overlay */}
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading interactive map...</p>
              </div>
            </div>
          )}

          {/* Map Controls */}
          {isLoaded && (
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <Badge variant="default" className="bg-sky-100 text-sky-800">
                <MapPin className="w-3 h-3 mr-1" />
                {places.length} Safe Places
              </Badge>
              
              {showingRoute && selectedPlace && (
                <div className="bg-white/95 p-3 rounded-lg shadow-lg max-w-xs">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Route to {selectedPlace.name}</h4>
                    <Button size="sm" variant="ghost" onClick={clearRoute} className="h-6 w-6 p-0">
                      ×
                    </Button>
                  </div>
                  {routeInfo && (
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <Route className="w-3 h-3 text-blue-500" />
                        <span>{routeInfo.distance}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-green-500" />
                        <span>{routeInfo.duration}</span>
                      </div>
                      <Button 
                        size="sm" 
                        className="w-full mt-2" 
                        onClick={() => openInGoogleMaps(selectedPlace)}
                      >
                        <Car className="w-3 h-3 mr-1" />
                        Start Navigation
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Places List Below Map */}
        <div className="p-4 bg-gray-50 space-y-3 max-h-48 overflow-y-auto">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Navigation className="w-4 h-4 text-sky-500" />
            Quick Actions
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {places.slice(0, 6).map((place, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => showRoute(place)}
                className="justify-start text-left h-auto p-2"
              >
                <span className="bg-sky-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-2">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{place.name}</div>
                  <div className="text-xs text-gray-500">{place.distance} km • {place.type}</div>
                </div>
                <ExternalLink className="w-3 h-3 ml-2 flex-shrink-0" />
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
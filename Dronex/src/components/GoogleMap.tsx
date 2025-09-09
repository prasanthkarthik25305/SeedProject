// import React, { useEffect, useRef, useState } from 'react';
// import { Loader } from '@googlemaps/js-api-loader';
// import { Button } from '@/components/ui/button';
// import { Badge } from '@/components/ui/badge';
// import { Card } from '@/components/ui/card';
// import { MapPin, Users, AlertTriangle, Crosshair } from 'lucide-react';
// import { supabase } from '@/integrations/supabase/client';
// import { useToast } from '@/components/ui/use-toast';

// interface GoogleMapProps {
//   fullSize?: boolean;
//   showEmergencies?: boolean;
//   showSharedLocations?: boolean;
//   onLocationChange?: (lat: number, lng: number) => void;
// }

// interface EmergencyLocation {
//   id: string;
//   latitude: number;
//   longitude: number;
//   emergency_type: string;
//   status: string;
//   priority: string;
//   created_at: string;
// }

// interface SharedLocation {
//   id: string;
//   user_id: string;
//   latitude: number;
//   longitude: number;
//   accuracy?: number;
//   expires_at?: string;
//   created_at: string;
// }

// export const GoogleMap: React.FC<GoogleMapProps> = ({
//   fullSize = false,
//   showEmergencies = true,
//   showSharedLocations = true,
//   onLocationChange
// }) => {
//   const mapRef = useRef<HTMLDivElement>(null);
//   const googleMapRef = useRef<google.maps.Map | null>(null);
//   const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
//   const [emergencies, setEmergencies] = useState<EmergencyLocation[]>([]);
//   const [sharedLocations, setSharedLocations] = useState<SharedLocation[]>([]);
//   const [isLoaded, setIsLoaded] = useState(false);
//   const [locationError, setLocationError] = useState<string | null>(null);
//   const markersRef = useRef<google.maps.Marker[]>([]);
//   const { toast } = useToast();

//   // Initialize Google Maps
//   useEffect(() => {
//     const initMap = async () => {
//       try {
//         // Check if Maps is already loaded to prevent duplicates
//         if (window.google?.maps) {
//           if (!mapRef.current) return;
          
//           const map = new google.maps.Map(mapRef.current, {
//             center: { lat: 40.7128, lng: -74.0060 },
//             zoom: 13,
//             styles: [
//               {
//                 featureType: 'poi',
//                 elementType: 'labels',
//                 stylers: [{ visibility: 'off' }]
//               }
//             ],
//             mapTypeControl: false,
//             streetViewControl: false,
//             fullscreenControl: false
//           });

//           googleMapRef.current = map;
//           setIsLoaded(true);
//           getUserLocation();
//           return;
//         }

//         const loader = new Loader({
//           apiKey: await getGoogleMapsApiKey(),
//           version: 'weekly',
//           libraries: ['places'],
//           id: '__googleMapsScriptId__' // Prevent duplicate loads
//         });

//         await loader.load();
        
//         if (!mapRef.current) return;

//         const map = new google.maps.Map(mapRef.current, {
//           center: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
//           zoom: 13,
//           styles: [
//             {
//               featureType: 'poi',
//               elementType: 'labels',
//               stylers: [{ visibility: 'off' }]
//             }
//           ],
//           mapTypeControl: false,
//           streetViewControl: false,
//           fullscreenControl: false
//         });

//         googleMapRef.current = map;
//         setIsLoaded(true);
        
//         // Get user location after map is ready
//         getUserLocation();
        
//       } catch (error) {
//         console.error('Failed to load Google Maps:', error);
//         setLocationError('Failed to load map');
//         toast({
//           title: "Map Error",
//           description: "Failed to load Google Maps. Check console for details.",
//           variant: "destructive",
//         });
//       }
//     };

//     initMap();
//   }, []);

//   // Get Google Maps API key from Supabase Edge Function
//   const getGoogleMapsApiKey = async (): Promise<string> => {
//     try {
//       const { data, error } = await supabase.functions.invoke('get-google-maps-key');
      
//       if (error) {
//         console.error('Error fetching Google Maps API key:', error);
//         throw new Error('Failed to fetch API key');
//       }
      
//       return data.apiKey;
//     } catch (error) {
//       console.error('Error fetching Google Maps API key:', error);
//       toast({
//         title: "Map Configuration Error",
//         description: "Unable to load Google Maps. Please check your API key configuration.",
//         variant: "destructive",
//       });
//       throw error;
//     }
//   };

//   // Get user location - moved to button click to avoid geolocation warning
//   const getUserLocation = () => {
//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           const { latitude, longitude } = position.coords;
//           const newLocation = { lat: latitude, lng: longitude };
          
//           setUserLocation(newLocation);
//           setLocationError(null);
          
//           if (googleMapRef.current) {
//             googleMapRef.current.setCenter(newLocation);
//             addUserMarker(newLocation);
//           }
          
//           onLocationChange?.(latitude, longitude);
//         },
//         (error) => {
//           console.error('Geolocation error:', error);
//           setLocationError('Location access denied');
//         },
//         {
//           enableHighAccuracy: true,
//           timeout: 10000,
//           maximumAge: 60000
//         }
//       );
//     } else {
//       setLocationError('Geolocation not supported');
//     }
//   };

//   // Add user location marker
//   const addUserMarker = (location: { lat: number; lng: number }) => {
//     if (!googleMapRef.current) return;

//     const marker = new google.maps.Marker({
//       position: location,
//       map: googleMapRef.current,
//       title: 'Your Location',
//       icon: {
//         url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
//           <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//             <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2"/>
//             <circle cx="12" cy="12" r="3" fill="#FFFFFF"/>
//           </svg>
//         `),
//         scaledSize: new google.maps.Size(24, 24),
//         anchor: new google.maps.Point(12, 12)
//       }
//     });

//     markersRef.current.push(marker);
//   };

//   // Load emergencies
//   useEffect(() => {
//     if (!showEmergencies) return;

//     const loadEmergencies = async () => {
//       try {
//         const { data, error } = await supabase
//           .from('emergency_requests')
//           .select('*')
//           .eq('status', 'pending');

//         if (error) throw error;
//         setEmergencies(data || []);
//       } catch (error) {
//         console.error('Error loading emergencies:', error);
//       }
//     };

//     loadEmergencies();
//   }, [showEmergencies]);

//   // Load shared locations
//   useEffect(() => {
//     if (!showSharedLocations) return;

//     const loadSharedLocations = async () => {
//       try {
//         const { data, error } = await supabase
//           .from('shared_locations')
//           .select('*')
//           .eq('is_active', true)
//           .or('expires_at.is.null,expires_at.gt.now()');

//         if (error) throw error;
//         setSharedLocations(data || []);
//       } catch (error) {
//         console.error('Error loading shared locations:', error);
//       }
//     };

//     loadSharedLocations();

//     // Subscribe to real-time updates
//     const channel = supabase
//       .channel('shared-locations-changes')
//       .on(
//         'postgres_changes',
//         {
//           event: '*',
//           schema: 'public',
//           table: 'shared_locations'
//         },
//         () => loadSharedLocations()
//       )
//       .subscribe();

//     return () => {
//       supabase.removeChannel(channel);
//     };
//   }, [showSharedLocations]);

//   // Add emergency markers
//   useEffect(() => {
//     if (!googleMapRef.current || !isLoaded) return;

//     // Clear existing markers (except user marker)
//     markersRef.current.forEach(marker => marker.setMap(null));
//     markersRef.current = [];

//     // Re-add user marker if available
//     if (userLocation) {
//       addUserMarker(userLocation);
//     }

//     // Add emergency markers
//     emergencies.forEach(emergency => {
//       const marker = new google.maps.Marker({
//         position: { lat: emergency.latitude, lng: emergency.longitude },
//         map: googleMapRef.current,
//         title: `${emergency.emergency_type} Emergency`,
//         icon: {
//           url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
//             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//               <circle cx="12" cy="12" r="8" fill="#EF4444" stroke="#FFFFFF" stroke-width="2"/>
//               <path d="M12 8v4l2 2" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
//             </svg>
//           `),
//           scaledSize: new google.maps.Size(24, 24),
//           anchor: new google.maps.Point(12, 12)
//         }
//       });

//       const infoWindow = new google.maps.InfoWindow({
//         content: `
//           <div style="padding: 8px;">
//             <h3 style="margin: 0 0 4px 0; font-weight: bold;">${emergency.emergency_type}</h3>
//             <p style="margin: 0; font-size: 12px;">Priority: ${emergency.priority}</p>
//             <p style="margin: 0; font-size: 12px;">Status: ${emergency.status}</p>
//           </div>
//         `
//       });

//       marker.addListener('click', () => {
//         infoWindow.open(googleMapRef.current, marker);
//       });

//       markersRef.current.push(marker);
//     });

//     // Add shared location markers
//     sharedLocations.forEach(location => {
//       const marker = new google.maps.Marker({
//         position: { lat: location.latitude, lng: location.longitude },
//         map: googleMapRef.current,
//         title: 'Shared Location',
//         icon: {
//           url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
//             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
//               <circle cx="12" cy="12" r="8" fill="#10B981" stroke="#FFFFFF" stroke-width="2"/>
//               <path d="M8 12l2 2 4-4" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
//             </svg>
//           `),
//           scaledSize: new google.maps.Size(24, 24),
//           anchor: new google.maps.Point(12, 12)
//         }
//       });

//       markersRef.current.push(marker);
//     });
//   }, [emergencies, sharedLocations, userLocation, isLoaded]);

//   const centerOnUser = () => {
//     if (!userLocation) {
//       // Get location when user clicks the button
//       getUserLocation();
//       return;
//     }
    
//     if (googleMapRef.current) {
//       googleMapRef.current.setCenter(userLocation);
//       googleMapRef.current.setZoom(15);
//     }
//   };

//   if (!isLoaded) {
//     return (
//       <Card className={`${fullSize ? 'h-screen' : 'h-96'} flex items-center justify-center`}>
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
//           <p className="text-sm text-muted-foreground">Loading map...</p>
//         </div>
//       </Card>
//     );
//   }

//   return (
//     <div className={`relative ${fullSize ? 'h-screen' : 'h-96'} w-full`}>
//       {/* CRITICAL FIX: Add minHeight to guarantee container size */}
//       <div 
//         ref={mapRef} 
//         className="w-full h-full rounded-lg" 
//         style={{ minHeight: fullSize ? '100vh' : '384px' }}
//       />
      
//       {/* Map Controls */}
//       <div className="absolute top-4 left-4 flex flex-col gap-2">
//         <Badge variant={userLocation ? "default" : "destructive"}>
//           <MapPin className="w-3 h-3 mr-1" />
//           GPS {userLocation ? 'Active' : 'Inactive'}
//         </Badge>
        
//         {locationError && (
//           <Badge variant="destructive">
//             <AlertTriangle className="w-3 h-3 mr-1" />
//             {locationError}
//           </Badge>
//         )}
//       </div>

//       {/* Center on User Button */}
//       <div className="absolute top-4 right-4">
//         <Button
//           size="sm"
//           variant="outline"
//           onClick={centerOnUser}
//           className="bg-background/90 backdrop-blur-sm"
//         >
//           <Crosshair className="w-4 h-4" />
//         </Button>
//       </div>

//       {/* Location Info */}
//       {userLocation && (
//         <Card className="absolute bottom-4 left-4 p-3 bg-background/90 backdrop-blur-sm">
//           <div className="flex items-center gap-2 text-sm">
//             <MapPin className="w-4 h-4 text-primary" />
//             <div>
//               <p className="font-medium">Your Location</p>
//               <p className="text-xs text-muted-foreground">
//                 {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
//               </p>
//             </div>
//           </div>
//         </Card>
//       )}

//       {/* Map Statistics */}
//       <div className="absolute bottom-4 right-4 flex gap-2">
//         {showEmergencies && (
//           <Badge variant="destructive">
//             <AlertTriangle className="w-3 h-3 mr-1" />
//             {emergencies.length} Emergencies
//           </Badge>
//         )}
        
//         {showSharedLocations && (
//           <Badge variant="default">
//             <Users className="w-3 h-3 mr-1" />
//             {sharedLocations.length} Shared
//           </Badge>
//         )}
//       </div>
//     </div>
//   );
// };

// export default GoogleMap;






import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { MapPin, Copy, MessageCircle, Crosshair, Map, Navigation } from 'lucide-react';

export const GoogleMap = ({ fullSize = false }) => {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const trafficLayerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentMapType, setCurrentMapType] = useState('roadmap');
  const [showTraffic, setShowTraffic] = useState(false);
  const { toast } = useToast();

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      setIsLoading(true);
      
      try {
        console.log('🗺️ Starting initialization...');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!mapRef.current) {
          console.error('❌ Map container not found');
          return;
        }
        
        // Get API key
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (error || !data?.apiKey) {
          throw new Error('Failed to get API key');
        }
        
        console.log('✅ Got API key');
        
        // Load Google Maps
        const loader = new Loader({
          apiKey: data.apiKey,
          version: 'weekly',
          libraries: ['places']
        });
        
        await loader.load();
        console.log('✅ SDK loaded');
        
        // Create map with all map types enabled
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 16.9891, lng: 81.7473 }, // Rajahmundry, Andhra Pradesh
          zoom: 13,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          // Disable default controls to avoid overlapping
          disableDefaultUI: true,
          // Enable only essential controls in safe positions
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
          },
          scaleControl: true,
          // Enable all map types
          mapTypeControl: false, // We'll use custom control
          streetViewControl: false
        });
        
        googleMapRef.current = map;
        
        // Initialize traffic layer (hidden by default)
        const trafficLayer = new google.maps.TrafficLayer();
        trafficLayerRef.current = trafficLayer;
        
        setIsLoaded(true);
        
        console.log('🎉 MAP CREATED SUCCESSFULLY!');
        
        // Automatically get user location after map loads
        setTimeout(() => {
          getCurrentLocation();
        }, 1000);
        
      } catch (error) {
        console.error('❌ Error:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    initMap();
  }, []);

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const location = { lat: latitude, lng: longitude };
        
        console.log('📍 User location found:', location);
        setUserLocation(location);
        setIsGettingLocation(false);
        
        if (googleMapRef.current) {
          // Center map on user location
          googleMapRef.current.setCenter(location);
          googleMapRef.current.setZoom(15);
          
          // Remove existing user marker
          if (userMarkerRef.current) {
            userMarkerRef.current.setMap(null);
          }
          
          // Add user location marker
          const marker = new google.maps.Marker({
            position: location,
            map: googleMapRef.current,
            title: 'Your Current Location',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="#FFFFFF" stroke-width="3"/>
                  <circle cx="16" cy="16" r="4" fill="#FFFFFF"/>
                  <circle cx="16" cy="16" r="14" fill="none" stroke="#3B82F6" stroke-width="2" stroke-opacity="0.3"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(32, 32),
              anchor: new google.maps.Point(16, 16)
            }
          });
          
          userMarkerRef.current = marker;
          
          // Add info window with enhanced location details
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 12px; text-align: center; min-width: 200px;">
                <h3 style="margin: 0 0 8px 0; color: #3B82F6; font-size: 16px;">📍 Your Location</h3>
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
                  <strong>Coordinates:</strong><br>
                  ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
                </p>
                <p style="margin: 4px 0 0 0; font-size: 11px; color: #888;">
                  Rajahmundry, Andhra Pradesh, India
                </p>
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
                  <small style="color: #999;">Click to view in different map modes above</small>
                </div>
              </div>
            `
          });
          
          marker.addListener('click', () => {
            infoWindow.open(googleMapRef.current, marker);
          });
        }
        
        toast({
          title: "Location Found!",
          description: `Located in Rajahmundry area (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        });
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsGettingLocation(false);
        
        let errorMessage = 'Unable to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        
        setLocationError(errorMessage);
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000
      }
    );
  };

  // Handle map type change
  const handleMapTypeChange = (mapType) => {
    if (!googleMapRef.current) return;
    
    setCurrentMapType(mapType);
    
    switch (mapType) {
      case 'satellite':
        googleMapRef.current.setMapTypeId(google.maps.MapTypeId.SATELLITE);
        break;
      case 'hybrid':
        googleMapRef.current.setMapTypeId(google.maps.MapTypeId.HYBRID);
        break;
      case 'terrain':
        googleMapRef.current.setMapTypeId(google.maps.MapTypeId.TERRAIN);
        break;
      case 'roadmap':
      default:
        googleMapRef.current.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        break;
    }
    
    toast({
      title: "Map View Changed",
      description: `Switched to ${mapType} view`,
    });
  };

  // Toggle traffic layer
  const toggleTraffic = () => {
    if (!googleMapRef.current || !trafficLayerRef.current) return;
    
    const newShowTraffic = !showTraffic;
    setShowTraffic(newShowTraffic);
    
    if (newShowTraffic) {
      trafficLayerRef.current.setMap(googleMapRef.current);
      toast({
        title: "Traffic View Enabled",
        description: "Showing real-time traffic conditions and safest routes",
      });
    } else {
      trafficLayerRef.current.setMap(null);
      toast({
        title: "Traffic View Disabled",
        description: "Hidden traffic layer",
      });
    }
  };

  // Generate Google Maps link with current map type
  const generateMapLink = () => {
    if (!userLocation) return null;
    
    let mapTypeParam = '';
    switch (currentMapType) {
      case 'satellite':
        mapTypeParam = '&t=k'; // satellite
        break;
      case 'hybrid':
        mapTypeParam = '&t=h'; // hybrid
        break;
      case 'terrain':
        mapTypeParam = '&t=p'; // terrain
        break;
      default:
        mapTypeParam = '&t=m'; // roadmap
        break;
    }
    
    return `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}${mapTypeParam}&z=15`;
  };

  // Generate enhanced shareable text
  const generateShareText = () => {
    if (!userLocation) return '';
    
    const mapTypeText = currentMapType === 'roadmap' ? 'Standard' : 
                       currentMapType === 'satellite' ? 'Satellite' :
                       currentMapType === 'hybrid' ? 'Hybrid' : 'Terrain';
    
    return `📍 My current location in Rajahmundry, Andhra Pradesh, India:

📊 Coordinates: ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}
🗺️ Map View: ${mapTypeText}${showTraffic ? ' (with Traffic)' : ''}
🕒 Shared at: ${new Date().toLocaleString()}

🔗 View on Google Maps: ${generateMapLink()}

📱 Open this link to see my exact location with the same view settings!`;
  };

  // Share via WhatsApp
  const shareViaWhatsApp = () => {
    if (!userLocation) return;
    
    const text = generateShareText();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  // Copy link to clipboard
  const copyToClipboard = async () => {
    if (!userLocation) return;
    
    const shareText = generateShareText();
    
    try {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: "Location Details Copied!",
        description: "Full location details with map link copied to clipboard",
      });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Location Details Copied!",
        description: "Full location details with map link copied to clipboard",
      });
    }
  };

  // Center map on user location
  const centerOnUser = () => {
    if (!userLocation && !isGettingLocation) {
      getCurrentLocation();
      return;
    }
    
    if (userLocation && googleMapRef.current) {
      googleMapRef.current.setCenter(userLocation);
      googleMapRef.current.setZoom(15);
    }
  };

  // Always render the container
  return (
    <div className={`relative ${fullSize ? 'h-screen' : 'h-96'} w-full`}>
      {/* Map container */}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-lg"
        style={{ 
          minHeight: fullSize ? '100vh' : '384px',
          backgroundColor: isLoaded ? 'transparent' : '#e5e7eb'
        }}
      />
      
      {/* Loading overlay */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">
              {isLoading ? 'Loading Google Maps...' : 'Initializing...'}
            </p>
          </div>
        </div>
      )}
      
      {/* Enhanced Map Controls - Top Left Corner */}
      {isLoaded && (
        <>
          {/* Sharing Buttons - Top Left (as requested) */}
          {userLocation && (
            <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
              <Button
                size="sm"
                onClick={shareViaWhatsApp}
                className="bg-green-500 hover:bg-green-600 text-white shadow-lg min-w-[180px]"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Share via WhatsApp
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="bg-white/95 backdrop-blur-sm border shadow-sm hover:bg-white min-w-[180px]"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Full Details
              </Button>
            </div>
          )}

          {/* Map View Controls - Top Right */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
            {/* Map Type Selector */}
            <Select value={currentMapType} onValueChange={handleMapTypeChange}>
              <SelectTrigger className="w-36 bg-white/95 backdrop-blur-sm border shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="roadmap">🗺️ Standard</SelectItem>
                <SelectItem value="satellite">🛰️ Satellite</SelectItem>
                <SelectItem value="hybrid">🗺️ Hybrid</SelectItem>
                <SelectItem value="terrain">🏔️ Terrain</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Traffic Toggle */}
            <Button
              size="sm"
              variant={showTraffic ? "default" : "outline"}
              onClick={toggleTraffic}
              className={`min-w-[144px] ${showTraffic 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-white/95 backdrop-blur-sm border shadow-sm hover:bg-white'}`}
            >
              <Navigation className="w-4 h-4 mr-2" />
              {showTraffic ? 'Traffic ON' : 'Traffic OFF'}
            </Button>
            
            {/* Center Location Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={centerOnUser}
              disabled={isGettingLocation}
              className="bg-white/95 backdrop-blur-sm border shadow-sm hover:bg-white"
            >
              <Crosshair className="w-4 h-4" />
            </Button>
          </div>

          {/* Location Status - Bottom Left */}
          <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
            <Badge variant={userLocation ? "default" : "secondary"} className="bg-white/90 backdrop-blur-sm border">
              <MapPin className="w-3 h-3 mr-1" />
              {userLocation ? 'Location Active' : 'Getting Location...'}
            </Badge>
            
            {isGettingLocation && (
              <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm border">
                <div className="animate-spin w-3 h-3 mr-1 border border-current border-t-transparent rounded-full"></div>
                Detecting Location...
              </Badge>
            )}
            
            {locationError && (
              <Badge variant="destructive" className="max-w-xs bg-white/90 backdrop-blur-sm">
                <span className="text-xs">{locationError}</span>
              </Badge>
            )}

            {/* Enhanced Location Info */}
            {userLocation && (
              <div className="bg-white/95 backdrop-blur-sm border p-3 rounded-lg shadow-sm max-w-xs">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="font-medium">Your Location</p>
                    <p className="text-xs text-gray-600">
                      {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Rajahmundry, Andhra Pradesh
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      View: {currentMapType.charAt(0).toUpperCase() + currentMapType.slice(1)}
                      {showTraffic && ' + Traffic'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GoogleMap;

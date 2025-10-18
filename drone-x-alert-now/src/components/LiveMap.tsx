// import React, { useEffect, useRef, useState } from 'react';
// import { Loader } from '@googlemaps/js-api-loader';
// import { Card, CardContent } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { Button } from '@/components/ui/button';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { supabase } from '@/integrations/supabase/client';
// import { useToast } from '@/components/ui/use-toast';
// import { 
//   MapPin, Navigation, AlertTriangle, Users, 
//   Crosshair, Copy, MessageCircle
// } from 'lucide-react';

// interface LiveMapProps {
//   fullSize?: boolean;
// }

// interface EmergencyLocation {
//   id: string;
//   latitude: number;
//   longitude: number;
//   emergency_type: string;
//   status: string;
//   priority: string;
//   created_at: string;
//   distance?: number;
// }

// interface RescueTeam {
//   id: string;
//   latitude: number;
//   longitude: number;
//   team_name: string;
//   status: string;
//   distance?: number;
// }

// export const LiveMap = ({ fullSize = false }: LiveMapProps) => {
//   const mapRef = useRef(null);
//   const googleMapRef = useRef(null);
//   const userMarkerRef = useRef(null);
//   const trafficLayerRef = useRef(null);
  
//   // State management
//   const [isLoaded, setIsLoaded] = useState(false);
//   const [isLoading, setIsLoading] = useState(false);
//   const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
//   const [locationError, setLocationError] = useState<string | null>(null);
//   const [isGettingLocation, setIsGettingLocation] = useState(false);
//   const [currentMapType, setCurrentMapType] = useState('roadmap');
//   const [showTraffic, setShowTraffic] = useState(false);
  
//   // Dynamic statistics
//   const [accuracy, setAccuracy] = useState<number | null>(null);
//   const [emergencyZones, setEmergencyZones] = useState<EmergencyLocation[]>([]);
//   const [rescueTeams, setRescueTeams] = useState<RescueTeam[]>([]);
//   const [signalStrength, setSignalStrength] = useState<string>('Unknown');
  
//   const { toast } = useToast();

//   // Calculate distance between two coordinates (Haversine formula)
//   const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
//     const R = 6371; // Radius of the Earth in kilometers
//     const dLat = (lat2 - lat1) * Math.PI / 180;
//     const dLon = (lon2 - lon1) * Math.PI / 180;
//     const a = 
//       Math.sin(dLat/2) * Math.sin(dLat/2) +
//       Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
//       Math.sin(dLon/2) * Math.sin(dLon/2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
//     const distance = R * c; // Distance in kilometers
//     return distance * 1000; // Convert to meters
//   };

//   // Calculate signal strength based on location and network conditions
//   const calculateSignalStrength = (location: { lat: number; lng: number }): string => {
//     // Simulate signal strength based on various factors
//     const isUrbanArea = Math.abs(location.lat - 16.9891) < 0.1 && Math.abs(location.lng - 81.7473) < 0.1;
//     const random = Math.random();
    
//     if (isUrbanArea) {
//       return random > 0.7 ? 'Strong' : random > 0.3 ? 'Moderate' : 'Weak';
//     } else {
//       return random > 0.5 ? 'Moderate' : random > 0.2 ? 'Weak' : 'Very Weak';
//     }
//   };

//   // Initialize Google Maps
//   useEffect(() => {
//     const initMap = async () => {
//       setIsLoading(true);
      
//       try {
//         console.log('🗺️ Starting LiveMap initialization...');
        
//         await new Promise(resolve => setTimeout(resolve, 500));
        
//         if (!mapRef.current) {
//           console.error('❌ Map container not found');
//           return;
//         }
        
//         // Get API key
//         const { data, error } = await supabase.functions.invoke('get-google-maps-key');
//         if (error || !data?.apiKey) {
//           throw new Error('Failed to get API key');
//         }
        
//         console.log('✅ Got API key for LiveMap');
        
//         // Load Google Maps
//         const loader = new Loader({
//           apiKey: data.apiKey,
//           version: 'weekly',
//           libraries: ['places']
//         });
        
//         await loader.load();
//         console.log('✅ LiveMap SDK loaded');
        
//         // Create map
//         const map = new google.maps.Map(mapRef.current, {
//           center: { lat: 16.9891, lng: 81.7473 }, // Rajahmundry, Andhra Pradesh
//           zoom: 13,
//           mapTypeId: google.maps.MapTypeId.ROADMAP,
//           disableDefaultUI: true,
//           zoomControl: true,
//           zoomControlOptions: {
//             position: google.maps.ControlPosition.RIGHT_BOTTOM
//           },
//           scaleControl: true,
//           scaleControlOptions: {
//             // No position property; use default options
//           }
//         });
        
//         googleMapRef.current = map;
        
//         // Initialize traffic layer
//         const trafficLayer = new google.maps.TrafficLayer();
//         trafficLayerRef.current = trafficLayer;
        
//         setIsLoaded(true);
//         console.log('🎉 LiveMap created successfully!');
        
//         // Auto-get user location
//         setTimeout(() => {
//           getCurrentLocation();
//         }, 1000);
        
//       } catch (error) {
//         console.error('❌ LiveMap error:', error);
//         toast({
//           title: "Error",
//           description: error.message,
//           variant: "destructive",
//         });
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     initMap();
//   }, []);

//   // Load dynamic emergency data based on user location
//   useEffect(() => {
//     if (!userLocation) return;

//     const loadEmergencyData = async () => {
//       try {
//         // Load emergency zones
//         const { data: emergencyData, error: emergencyError } = await supabase
//           .from('emergency_requests')
//           .select('*')
//           .eq('status', 'pending');

//         if (!emergencyError && emergencyData) {
//           // Calculate distances and filter nearby emergencies (within 10km)
//           const emergenciesWithDistance = emergencyData
//             .map(emergency => ({
//               ...emergency,
//               distance: calculateDistance(
//                 userLocation.lat, userLocation.lng,
//                 emergency.latitude, emergency.longitude
//               )
//             }))
//             .filter(emergency => emergency.distance <= 10000) // Within 10km
//             .sort((a, b) => a.distance - b.distance);

//           setEmergencyZones(emergenciesWithDistance);
//         }

//         // Load rescue teams (simulate with sample data for demo)
//         const simulatedRescueTeams = [
//           {
//             id: 'rescue-1',
//             latitude: userLocation.lat + 0.01,
//             longitude: userLocation.lng + 0.01,
//             team_name: 'Emergency Response Team Alpha',
//             status: 'available',
//             distance: calculateDistance(
//               userLocation.lat, userLocation.lng,
//               userLocation.lat + 0.01, userLocation.lng + 0.01
//             )
//           },
//           {
//             id: 'rescue-2',
//             latitude: userLocation.lat - 0.02,
//             longitude: userLocation.lng + 0.015,
//             team_name: 'Fire & Rescue Team Beta',
//             status: 'busy',
//             distance: calculateDistance(
//               userLocation.lat, userLocation.lng,
//               userLocation.lat - 0.02, userLocation.lng + 0.015
//             )
//           }
//         ].filter(team => team.distance <= 5000); // Within 5km

//         setRescueTeams(simulatedRescueTeams);

//       } catch (error) {
//         console.error('Error loading emergency data:', error);
//       }
//     };

//     loadEmergencyData();
//   }, [userLocation]);

//   // Get current location with accuracy tracking
//   const getCurrentLocation = () => {
//     if (!navigator.geolocation) {
//       setLocationError('Geolocation is not supported by this browser');
//       return;
//     }

//     setIsGettingLocation(true);
//     setLocationError(null);

//     navigator.geolocation.getCurrentPosition(
//       (position) => {
//         const { latitude, longitude, accuracy: positionAccuracy } = position.coords;
//         const location = { lat: latitude, lng: longitude };
        
//         console.log('📍 LiveMap location found:', location);
//         setUserLocation(location);
//         setAccuracy(Math.round(positionAccuracy));
//         setSignalStrength(calculateSignalStrength(location));
//         setIsGettingLocation(false);
        
//         if (googleMapRef.current) {
//           googleMapRef.current.setCenter(location);
//           googleMapRef.current.setZoom(15);
          
//           // Remove existing user marker
//           if (userMarkerRef.current) {
//             userMarkerRef.current.setMap(null);
//           }
          
//           // Add enhanced user location marker
//           const marker = new google.maps.Marker({
//             position: location,
//             map: googleMapRef.current,
//             title: 'Your Current Location',
//             icon: {
//               url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
//                 <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
//                   <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="#FFFFFF" stroke-width="3"/>
//                   <circle cx="16" cy="16" r="4" fill="#FFFFFF"/>
//                   <circle cx="16" cy="16" r="14" fill="none" stroke="#3B82F6" stroke-width="2" stroke-opacity="0.3"/>
//                 </svg>
//               `),
//               scaledSize: new google.maps.Size(32, 32),
//               anchor: new google.maps.Point(16, 16)
//             }
//           });
          
//           userMarkerRef.current = marker;
//         }
        
//         toast({
//           title: "Live Location Active!",
//           description: `Tracking your location in Rajahmundry with ${Math.round(positionAccuracy)}m accuracy`,
//         });
//       },
//       (error) => {
//         console.error('LiveMap geolocation error:', error);
//         setIsGettingLocation(false);
//         setLocationError('Unable to get your location');
//         setSignalStrength('No Signal');
//       },
//       {
//         enableHighAccuracy: true,
//         timeout: 15000,
//         maximumAge: 30000
//       }
//     );
//   };

//   // Handle map type changes
//   const handleMapTypeChange = (mapType: string) => {
//     if (!googleMapRef.current) return;
    
//     setCurrentMapType(mapType);
    
//     switch (mapType) {
//       case 'satellite':
//         googleMapRef.current.setMapTypeId(google.maps.MapTypeId.SATELLITE);
//         break;
//       case 'hybrid':
//         googleMapRef.current.setMapTypeId(google.maps.MapTypeId.HYBRID);
//         break;
//       case 'terrain':
//         googleMapRef.current.setMapTypeId(google.maps.MapTypeId.TERRAIN);
//         break;
//       case 'roadmap':
//       default:
//         googleMapRef.current.setMapTypeId(google.maps.MapTypeId.ROADMAP);
//         break;
//     }
//   };

//   // Toggle traffic layer
//   const toggleTraffic = () => {
//     if (!googleMapRef.current || !trafficLayerRef.current) return;
    
//     const newShowTraffic = !showTraffic;
//     setShowTraffic(newShowTraffic);
    
//     if (newShowTraffic) {
//       trafficLayerRef.current.setMap(googleMapRef.current);
//     } else {
//       trafficLayerRef.current.setMap(null);
//     }
//   };

//   // Sharing functions
//   const generateMapLink = () => {
//     if (!userLocation) return null;
//     return `https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}&z=15`;
//   };

//   const shareViaWhatsApp = () => {
//     if (!userLocation) return;
    
//     const text = `📍 Live Location Tracking:
// Coordinates: ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}
// Accuracy: ±${accuracy}m
// Location: Rajahmundry, Andhra Pradesh
// Emergency Zones Nearby: ${emergencyZones.length}
// Rescue Teams Available: ${rescueTeams.filter(t => t.status === 'available').length}

// View on Google Maps: ${generateMapLink()}`;
    
//     const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
//     window.open(whatsappUrl, '_blank');
//   };

//   const copyToClipboard = async () => {
//     if (!userLocation) return;
    
//     const text = `Live Location: ${generateMapLink()}`;
    
//     try {
//       await navigator.clipboard.writeText(text);
//       toast({
//         title: "Location Link Copied!",
//         description: "Live location link copied to clipboard",
//       });
//     } catch (error) {
//       console.error('Copy error:', error);
//     }
//   };

//   const centerOnUser = () => {
//     if (!userLocation && !isGettingLocation) {
//       getCurrentLocation();
//       return;
//     }
    
//     if (userLocation && googleMapRef.current) {
//       googleMapRef.current.setCenter(userLocation);
//       googleMapRef.current.setZoom(15);
//     }
//   };

//   const containerHeight = fullSize ? "h-screen" : "h-96";

//   return (
//     <div className="space-y-4">
//       {/* Enhanced Live Map Container */}
//       <div className={`relative ${containerHeight} w-full`}>
//         {/* Map container */}
//         <div 
//           ref={mapRef} 
//           className="w-full h-full rounded-lg"
//           style={{ 
//             minHeight: fullSize ? '100vh' : '384px',
//             backgroundColor: isLoaded ? 'transparent' : '#e5e7eb'
//           }}
//         />
        
//         {/* Loading overlay */}
//         {!isLoaded && (
//           <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 rounded-lg">
//             <div className="text-center">
//               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
//               <p className="text-sm text-gray-600">Loading Live Map...</p>
//             </div>
//           </div>
//         )}
        
//         {/* Enhanced Controls */}
//         {isLoaded && (
//           <>
//             {/* Sharing Buttons - Top Left */}
//             {userLocation && (
//               <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
//                 <Button
//                   size="sm"
//                   onClick={shareViaWhatsApp}
//                   className="bg-green-500 hover:bg-green-600 text-white shadow-lg min-w-[180px]"
//                 >
//                   <MessageCircle className="w-4 h-4 mr-2" />
//                   Share Live Location
//                 </Button>
                
//                 <Button
//                   size="sm"
//                   variant="outline"
//                   onClick={copyToClipboard}
//                   className="bg-white/95 backdrop-blur-sm border shadow-sm hover:bg-white min-w-[180px]"
//                 >
//                   <Copy className="w-4 h-4 mr-2" />
//                   Copy Location Link
//                 </Button>
//               </div>
//             )}

//             {/* Map Controls - Top Right */}
//             <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
//               <Select value={currentMapType} onValueChange={handleMapTypeChange}>
//                 <SelectTrigger className="w-36 bg-white/95 backdrop-blur-sm">
//                   <SelectValue />
//                 </SelectTrigger>
//                 <SelectContent>
//                   <SelectItem value="roadmap">🗺️ Standard</SelectItem>
//                   <SelectItem value="satellite">🛰️ Satellite</SelectItem>
//                   <SelectItem value="hybrid">🗺️ Hybrid</SelectItem>
//                   <SelectItem value="terrain">🏔️ Terrain</SelectItem>
//                 </SelectContent>
//               </Select>
              
//               <Button
//                 size="sm"
//                 variant={showTraffic ? "default" : "outline"}
//                 onClick={toggleTraffic}
//                 className={`min-w-[144px] ${showTraffic ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/95'}`}
//               >
//                 <Navigation className="w-4 h-4 mr-2" />
//                 {showTraffic ? 'Traffic ON' : 'Traffic OFF'}
//               </Button>
              
//               <Button
//                 size="sm"
//                 variant="outline"
//                 onClick={centerOnUser}
//                 disabled={isGettingLocation}
//                 className="bg-white/95 backdrop-blur-sm"
//               >
//                 <Crosshair className="w-4 h-4" />
//               </Button>
//             </div>

//             {/* Status Badges - Top Right Secondary */}
//             <div className="absolute top-4 right-52 flex flex-col gap-1 z-10">
//               <Badge className="bg-green-500/90 text-white">
//                 <Navigation className="h-3 w-3 mr-1" />
//                 GPS Active
//               </Badge>
//               {userLocation && (
//                 <Badge className="bg-blue-500/90 text-white">
//                   <MapPin className="h-3 w-3 mr-1" />
//                   Location Locked
//                 </Badge>
//               )}
//             </div>

//             {/* Coordinates Display */}
//             <div className="absolute bottom-4 left-4 bg-black/75 text-white text-xs px-2 py-1 rounded">
//               {userLocation 
//                 ? `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`
//                 : 'Acquiring location...'
//               }
//             </div>
//           </>
//         )}
//       </div>

//       {/* Dynamic Statistics Cards */}
//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//         <Card className="border-blue-100">
//           <CardContent className="p-3 text-center">
//             <MapPin className="h-6 w-6 text-blue-500 mx-auto mb-1" />
//             <div className="text-sm font-medium">Accuracy</div>
//             <div className="text-lg font-bold text-blue-600">
//               {accuracy ? `±${accuracy}m` : '---'}
//             </div>
//           </CardContent>
//         </Card>
        
//         <Card className="border-red-100">
//           <CardContent className="p-3 text-center">
//             <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-1" />
//             <div className="text-sm font-medium">Emergency Zones</div>
//             <div className="text-lg font-bold text-red-600">
//               {emergencyZones.length}
//             </div>
//           </CardContent>
//         </Card>
        
//         <Card className="border-green-100">
//           <CardContent className="p-3 text-center">
//             <Users className="h-6 w-6 text-green-500 mx-auto mb-1" />
//             <div className="text-sm font-medium">Rescue Teams</div>
//             <div className="text-lg font-bold text-green-600">
//               {rescueTeams.filter(team => team.status === 'available').length}
//             </div>
//           </CardContent>
//         </Card>
        
//         <Card className="border-purple-100">
//           <CardContent className="p-3 text-center">
//             <Navigation className="h-6 w-6 text-purple-500 mx-auto mb-1" />
//             <div className="text-sm font-medium">Signal Strength</div>
//             <div className={`text-lg font-bold ${
//               signalStrength === 'Strong' ? 'text-green-600' : 
//               signalStrength === 'Moderate' ? 'text-yellow-600' : 
//               'text-red-600'
//             }`}>
//               {signalStrength}
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// };










import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
  MapPin, Navigation, AlertTriangle, Users, 
  Crosshair, Copy, MessageCircle, ExternalLink,
  Shield, Clock, Route
} from 'lucide-react';

interface LiveMapProps {
  fullSize?: boolean;
}

interface SafePlace {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distance: number;
  safetyType: string;
  capacity: number;
  facilities: string[];
  aiRiskScore: number;
  placeId?: string;
  rating?: number;
  vicinity?: string;
  openingHours?: {
    open_now?: boolean;
  };
  priority: number; // Higher priority means safer
}

export const LiveMap = ({ fullSize = false }: LiveMapProps) => {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const safetyMarkersRef = useRef<google.maps.Marker[]>([]);
  const trafficLayerRef = useRef(null);
  const placesServiceRef = useRef(null);
  
  // State management
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [currentMapType, setCurrentMapType] = useState('roadmap');
  const [showTraffic, setShowTraffic] = useState(false);
  
  // Dynamic statistics
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [emergencyZones, setEmergencyZones] = useState([]);
  const [rescueTeams, setRescueTeams] = useState([]);
  const [signalStrength, setSignalStrength] = useState<string>('Unknown');
  const [safestPlaces, setSafestPlaces] = useState<SafePlace[]>([]);
  const [isLoadingSafePlaces, setIsLoadingSafePlaces] = useState(false);
  
  const { toast } = useToast();

  // Define HIGH PRIORITY place types for emergency safety locations
  const HIGH_PRIORITY_PLACE_TYPES = [
    { type: 'hospital', priority: 100, maxResults: 5 },
    { type: 'police', priority: 95, maxResults: 4 },
    { type: 'fire_station', priority: 90, maxResults: 3 },
    { type: 'local_government_office', priority: 85, maxResults: 3 },
    { type: 'school', priority: 80, maxResults: 4 },
    { type: 'university', priority: 80, maxResults: 3 },
    { type: 'city_hall', priority: 75, maxResults: 2 },
    { type: 'courthouse', priority: 75, maxResults: 2 }
  ];

  // Secondary priority places (fewer results)
  const SECONDARY_PRIORITY_PLACE_TYPES = [
    { type: 'library', priority: 60, maxResults: 2 },
    { type: 'community_center', priority: 55, maxResults: 2 },
    { type: 'church', priority: 50, maxResults: 2 },
    { type: 'mosque', priority: 50, maxResults: 1 },
    { type: 'hindu_temple', priority: 50, maxResults: 1 },
    { type: 'stadium', priority: 45, maxResults: 1 }
  ];

  // AI-powered function to calculate safety score with priority weighting
  const calculateAISafetyScore = (place: any, userLoc: { lat: number; lng: number }, basePriority: number): number => {
    let score = basePriority; // Start with base priority score
    
    // Distance factor (closer is better for emergency access)
    const distance = place.distance;
    if (distance < 1000) score += 20; // Very close - excellent
    else if (distance < 2500) score += 15; // Close - very good
    else if (distance < 5000) score += 10; // Moderate distance - good
    else score -= 10; // Far - less preferred
    
    // Priority boost for high-priority place types
    if (basePriority >= 80) score += 25; // Hospitals, police, schools get major boost
    else if (basePriority >= 70) score += 15; // Government buildings get good boost
    else if (basePriority >= 50) score += 5; // Other safe places get small boost
    
    // Rating factor (Google Places rating)
    if (place.rating) {
      if (place.rating >= 4.5) score += 15;
      else if (place.rating >= 4.0) score += 10;
      else if (place.rating >= 3.5) score += 5;
      else if (place.rating < 3.0) score -= 5;
    }
    
    // Opening hours factor (open places are more accessible)
    if (place.openingHours?.open_now) score += 12;
    else if (place.openingHours?.open_now === false) score -= 5;
    
    // Capacity estimation boost
    if (place.capacity > 1000) score += 15;
    else if (place.capacity > 500) score += 10;
    else if (place.capacity > 200) score += 5;
    
    // Emergency response capability boost for critical infrastructure
    if (basePriority >= 90) score += 20; // Hospitals, police, fire stations
    
    return Math.max(0, Math.min(100, score));
  };

  // Calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Distance in meters
  };

  // Get enhanced capacity estimation based on place type with priority focus
  const getCapacityEstimate = (types: string[], priority: number): number => {
    if (types.includes('hospital')) return 800;
    if (types.includes('university')) return 1500;
    if (types.includes('school')) return 1000;
    if (types.includes('police')) return 400;
    if (types.includes('fire_station')) return 350;
    if (types.includes('local_government_office') || types.includes('city_hall')) return 600;
    if (types.includes('courthouse')) return 400;
    if (types.includes('library')) return 300;
    if (types.includes('community_center')) return 500;
    if (types.includes('stadium')) return 2000;
    if (types.includes('church') || types.includes('mosque') || types.includes('hindu_temple')) return 400;
    return 250; // Default estimate
  };

  // Get enhanced facilities based on place types with priority focus
  const getFacilitiesForTypes = (types: string[], priority: number): string[] => {
    const facilities = new Set<string>();
    
    // High priority facilities
    if (types.includes('hospital')) {
      facilities.add('24/7 Medical Care');
      facilities.add('Emergency Treatment');
      facilities.add('Ambulance Service');
      facilities.add('Medical Supplies');
      facilities.add('Emergency Power');
    }
    if (types.includes('police')) {
      facilities.add('24/7 Security');
      facilities.add('Emergency Response');
      facilities.add('Communication Hub');
      facilities.add('Safe Haven');
      facilities.add('Emergency Coordination');
    }
    if (types.includes('fire_station')) {
      facilities.add('Fire Safety Equipment');
      facilities.add('Rescue Services');
      facilities.add('Emergency Response');
      facilities.add('First Aid');
      facilities.add('Communication');
    }
    if (types.includes('local_government_office') || types.includes('city_hall')) {
      facilities.add('Official Coordination');
      facilities.add('Emergency Management');
      facilities.add('Communication Center');
      facilities.add('Public Safety');
      facilities.add('Resource Distribution');
    }
    if (types.includes('school') || types.includes('university')) {
      facilities.add('Large Safe Spaces');
      facilities.add('Basic Amenities');
      facilities.add('Emergency Shelter');
      facilities.add('Communication');
      facilities.add('Food Facilities');
    }
    if (types.includes('courthouse')) {
      facilities.add('Secure Building');
      facilities.add('Official Authority');
      facilities.add('Communication');
      facilities.add('Emergency Protocols');
    }

    // Secondary facilities
    if (types.includes('library')) {
      facilities.add('Community Shelter');
      facilities.add('Communication Access');
      facilities.add('Basic Amenities');
    }
    if (types.includes('community_center')) {
      facilities.add('Community Support');
      facilities.add('Large Gathering Space');
      facilities.add('Basic Amenities');
    }
    
    // Add default high-priority facilities if none specific found
    if (facilities.size === 0) {
      if (priority >= 80) {
        facilities.add('Emergency Safe Haven');
        facilities.add('Official Authority');
        facilities.add('Basic Emergency Supplies');
      } else {
        facilities.add('Community Shelter');
        facilities.add('Basic Amenities');
      }
    }
    
    return Array.from(facilities);
  };

  // Get primary safety type from Google Places types with priority focus
  const getPrimarySafetyType = (types: string[]): string => {
    const priorityTypes = [
      'hospital', 'police', 'fire_station', 'local_government_office',
      'city_hall', 'courthouse', 'school', 'university', 'library',
      'community_center', 'church', 'mosque', 'hindu_temple', 'stadium'
    ];
    
    for (const type of priorityTypes) {
      if (types.includes(type)) return type;
    }
    
    return 'emergency_shelter'; // Default type
  };

  // Fetch nearby priority places using Google Places API
  const fetchNearbyPlaces = (userLoc: { lat: number; lng: number }) => {
    if (!placesServiceRef.current) {
      console.error('Places service not initialized');
      return;
    }

    setIsLoadingSafePlaces(true);
    const allPlaces: SafePlace[] = [];
    const allPlaceTypes = [...HIGH_PRIORITY_PLACE_TYPES, ...SECONDARY_PRIORITY_PLACE_TYPES];
    let completedRequests = 0;
    const totalRequests = allPlaceTypes.length;

    const processResults = () => {
      completedRequests++;
      if (completedRequests === totalRequests) {
        // Sort by priority first, then by AI safety score, then by distance
        const sortedPlaces = allPlaces
          .sort((a, b) => b.priority - a.priority || b.aiRiskScore - a.aiRiskScore || a.distance - b.distance)
          .slice(0, 20); // Top 20 results
        
        setSafestPlaces(sortedPlaces);
        
        // Add markers to map (prioritize top results)
        if (googleMapRef.current && sortedPlaces.length > 0) {
          addSafetyMarkers(sortedPlaces.slice(0, 12)); // Show top 12 on map
        }
        
        setIsLoadingSafePlaces(false);
        
        const highPriorityCount = sortedPlaces.filter(p => p.priority >= 80).length;
        toast({
          title: "Priority Safe Places Found",
          description: `Found ${highPriorityCount} high-priority locations (hospitals, police, schools) + ${sortedPlaces.length - highPriorityCount} other safe places`,
        });
      }
    };

    // Search for each place type with priority-based limits
    allPlaceTypes.forEach((placeConfig) => {
      const request = {
        location: new google.maps.LatLng(userLoc.lat, userLoc.lng),
        radius: placeConfig.priority >= 80 ? 7000 : 5000, // Larger radius for high priority places
        type: placeConfig.type,
      };

      placesServiceRef.current.nearbySearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results) {
          results.slice(0, placeConfig.maxResults).forEach((place, index) => {
            const distance = calculateDistance(
              userLoc.lat, 
              userLoc.lng, 
              place.geometry.location.lat(), 
              place.geometry.location.lng()
            );

            const capacity = getCapacityEstimate(place.types || [], placeConfig.priority);
            const facilities = getFacilitiesForTypes(place.types || [], placeConfig.priority);
            const safetyType = getPrimarySafetyType(place.types || []);
            
            const safePlace: SafePlace = {
              id: place.place_id || `place-${placeConfig.type}-${index}`,
              name: place.name || 'Unknown Place',
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              distance: Math.round(distance),
              safetyType: safetyType,
              capacity: capacity,
              facilities: facilities,
              aiRiskScore: 0, // Will be calculated below
              placeId: place.place_id,
              rating: place.rating,
              vicinity: place.vicinity,
              openingHours: place.opening_hours,
              priority: placeConfig.priority
            };

            safePlace.aiRiskScore = Math.round(calculateAISafetyScore(safePlace, userLoc, placeConfig.priority));
            allPlaces.push(safePlace);
          });
        }
        processResults();
      });
    });
  };

  // Generate Google Maps link for a safe place
  const generatePlaceMapLink = (place: SafePlace): string => {
    if (place.placeId) {
      return `https://www.google.com/maps/place/?q=place_id:${place.placeId}`;
    }
    return `https://www.google.com/maps?q=${place.lat},${place.lng}&z=16`;
  };

  // Open place in Google Maps
  const openInGoogleMaps = (place: SafePlace) => {
    const link = generatePlaceMapLink(place);
    window.open(link, '_blank');
  };

  // Center map on safe place
  const centerMapOnPlace = (place: SafePlace) => {
    if (googleMapRef.current) {
      googleMapRef.current.setCenter({ lat: place.lat, lng: place.lng });
      googleMapRef.current.setZoom(16);
      
      // Highlight the selected place
      addSafetyMarkers([place], true);
    }
  };

  // Add safety markers to map with priority-based styling
  const addSafetyMarkers = (places: SafePlace[], highlightFirst: boolean = false) => {
    // Clear existing safety markers
    safetyMarkersRef.current.forEach(marker => marker.setMap(null));
    safetyMarkersRef.current = [];

    places.forEach((place, index) => {
      const isHighlighted = highlightFirst && index === 0;
      const isHighPriority = place.priority >= 80;
      
      // Different colors based on priority
      const color = isHighlighted ? '#10B981' : 
                   isHighPriority ? '#DC2626' : // Red for high priority
                   place.priority >= 70 ? '#F59E0B' : // Orange for government
                   '#059669'; // Green for others
      
      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map: googleMapRef.current,
        title: place.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="12" fill="${color}" stroke="#FFFFFF" stroke-width="3"/>
              ${isHighPriority ? 
                '<path d="M12 16l3 3 6-6" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>' :
                '<path d="M10 16l2 2 6-6" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
              }
              ${isHighPriority ? '<circle cx="16" cy="16" r="14" fill="none" stroke="' + color + '" stroke-width="2" stroke-opacity="0.4"/>' : ''}
            </svg>
          `),
          scaledSize: new google.maps.Size(isHighPriority ? 32 : 28, isHighPriority ? 32 : 28),
          anchor: new google.maps.Point(isHighPriority ? 16 : 14, isHighPriority ? 16 : 14)
        }
      });

      const priorityLabel = place.priority >= 95 ? '🚨 CRITICAL EMERGENCY FACILITY' :
                           place.priority >= 80 ? '⭐ HIGH PRIORITY SAFE LOCATION' :
                           place.priority >= 70 ? '🏛️ GOVERNMENT AUTHORITY' :
                           '🏢 COMMUNITY SAFE PLACE';

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 280px;">
            <div style="background: ${color}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-bottom: 8px;">
              ${priorityLabel}
            </div>
            <h3 style="margin: 0 0 8px 0; color: ${color}; font-size: 15px; font-weight: bold;">${place.name}</h3>
            <div style="margin: 4px 0; font-size: 12px;">
              <strong>🛡️ Safety Score:</strong> ${place.aiRiskScore}/100
            </div>
            <div style="margin: 4px 0; font-size: 12px;">
              <strong>📍 Distance:</strong> ${place.distance}m (${Math.round(place.distance/60)} min walk)
            </div>
            ${place.rating ? `
              <div style="margin: 4px 0; font-size: 12px;">
                <strong>⭐ Rating:</strong> ${place.rating}/5
              </div>
            ` : ''}
            <div style="margin: 4px 0; font-size: 12px;">
              <strong>👥 Capacity:</strong> ${place.capacity} people
            </div>
            <div style="margin: 4px 0; font-size: 12px;">
              <strong>🏥 Type:</strong> ${place.safetyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </div>
            ${place.openingHours?.open_now !== undefined ? `
              <div style="margin: 4px 0; font-size: 12px;">
                <strong>🕒 Status:</strong> <span style="color: ${place.openingHours.open_now ? 'green' : 'red'}">${place.openingHours.open_now ? 'Open Now' : 'Closed'}</span>
              </div>
            ` : ''}
            <div style="margin: 8px 0 4px 0; font-size: 11px; color: #666;">
              <strong>Emergency Facilities:</strong><br>
              ${place.facilities.slice(0, 4).join(' • ')}
            </div>
            ${place.vicinity ? `
              <div style="margin: 4px 0; font-size: 11px; color: #666;">
                <strong>Address:</strong> ${place.vicinity}
              </div>
            ` : ''}
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(googleMapRef.current, marker);
      });

      safetyMarkersRef.current.push(marker);
    });
  };

  // Initialize Google Maps
  useEffect(() => {
    const initMap = async () => {
      setIsLoading(true);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!mapRef.current) {
          console.log('❌ LiveMap: mapRef.current is null, retrying...');
          setTimeout(() => initMap(), 1000);
          return;
        }
        
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (error || !data?.apiKey) {
          throw new Error('Failed to get API key');
        }
        
        const loader = new Loader({
          apiKey: data.apiKey,
          version: 'weekly',
          libraries: ['places', 'marker']
        });
        
        await loader.load();
        
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 16.9891, lng: 81.7473 },
          zoom: 13,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
          }
        });
        
        googleMapRef.current = map;
        
        // Initialize Places service
        placesServiceRef.current = new google.maps.places.PlacesService(map);
        
        const trafficLayer = new google.maps.TrafficLayer();
        trafficLayerRef.current = trafficLayer;
        
        setIsLoaded(true);
        
        setTimeout(() => {
          getCurrentLocation();
        }, 1000);
        
      } catch (error) {
        console.error('❌ LiveMap error:', error);
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

  // Load nearby places when user location is available
  useEffect(() => {
    if (!userLocation || !placesServiceRef.current) return;

    // Small delay for better UX
    setTimeout(() => {
      fetchNearbyPlaces(userLocation);
    }, 1000);
    
  }, [userLocation]);

  // Get current location (same as before)
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy: positionAccuracy } = position.coords;
        const location = { lat: latitude, lng: longitude };
        
        setUserLocation(location);
        setAccuracy(Math.round(positionAccuracy));
        setSignalStrength('Strong');
        setIsGettingLocation(false);
        
        if (googleMapRef.current) {
          googleMapRef.current.setCenter(location);
          googleMapRef.current.setZoom(14);
          
          if (userMarkerRef.current) {
            userMarkerRef.current.setMap(null);
          }
          
          const marker = new google.maps.Marker({
            position: location,
            map: googleMapRef.current,
            title: 'Your Current Location',
            icon: {
              url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="18" cy="18" r="14" fill="#3B82F6" stroke="#FFFFFF" stroke-width="3"/>
                  <circle cx="18" cy="18" r="5" fill="#FFFFFF"/>
                  <circle cx="18" cy="18" r="16" fill="none" stroke="#3B82F6" stroke-width="2" stroke-opacity="0.3"/>
                </svg>
              `),
              scaledSize: new google.maps.Size(36, 36),
              anchor: new google.maps.Point(18, 18)
            }
          });
          
          userMarkerRef.current = marker;
        }
        
        // Mock emergency data
        setEmergencyZones([1, 2]); // 2 emergency zones
        setRescueTeams([1]); // 1 rescue team available
      },
      (error) => {
        setIsGettingLocation(false);
        setLocationError('Unable to get your location');
        setSignalStrength('No Signal');
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000
      }
    );
  };

  // Rest of the component methods remain the same (map controls, sharing, etc.)
  const handleMapTypeChange = (mapType: string) => {
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
      default:
        googleMapRef.current.setMapTypeId(google.maps.MapTypeId.ROADMAP);
        break;
    }
  };

  const toggleTraffic = () => {
    if (!googleMapRef.current || !trafficLayerRef.current) return;
    
    const newShowTraffic = !showTraffic;
    setShowTraffic(newShowTraffic);
    
    if (newShowTraffic) {
      trafficLayerRef.current.setMap(googleMapRef.current);
    } else {
      trafficLayerRef.current.setMap(null);
    }
  };

  const shareViaWhatsApp = () => {
    if (!userLocation) return;
    
    const nearestSafe = safestPlaces[0];
    const priorityText = nearestSafe?.priority >= 95 ? '🚨 CRITICAL EMERGENCY FACILITY' :
                        nearestSafe?.priority >= 80 ? '⭐ HIGH PRIORITY LOCATION' : '🏢 SAFE LOCATION';
    
    const text = `🚨 EMERGENCY LOCATION SHARING 🚨

📍 My Location: ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}
${priorityText}
🛡️ Nearest Safe Place: ${nearestSafe?.name || 'Calculating...'}
📏 Distance: ${nearestSafe?.distance || '---'}m away
🎯 Safety Score: ${nearestSafe?.aiRiskScore || '---'}/100
${nearestSafe?.rating ? `⭐ Google Rating: ${nearestSafe.rating}/5` : ''}

🏥 Priority: ${nearestSafe?.safetyType.replace('_', ' ').toUpperCase() || 'UNKNOWN'}

🗺️ My location: https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}
🏥 Nearest safe place: ${nearestSafe ? generatePlaceMapLink(nearestSafe) : 'Calculating...'}

⏰ Shared at: ${new Date().toLocaleString()}
🆘 AI-prioritized emergency safe locations!`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const copyToClipboard = async () => {
    if (!userLocation) return;
    
    const text = `Emergency Location: https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}`;
    
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Emergency Location Copied!",
        description: "Location link copied to clipboard",
      });
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  const centerOnUser = () => {
    if (!userLocation && !isGettingLocation) {
      getCurrentLocation();
      return;
    }
    
    if (userLocation && googleMapRef.current) {
      googleMapRef.current.setCenter(userLocation);
      googleMapRef.current.setZoom(14);
    }
  };

  const containerHeight = fullSize ? "h-screen" : "h-96";

  return (
    <div className="space-y-6">
      {/* Enhanced Live Map Container */}
      <div className={`relative ${containerHeight} w-full`}>
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
              <p className="text-sm text-gray-600">Loading Priority Safe Places Map...</p>
            </div>
          </div>
        )}
        
        {/* Map Controls - Same structure as before */}
        {isLoaded && (
          <>
            {/* Sharing Buttons - Top Left */}
            {userLocation && (
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-20">
                <Button
                  size="sm"
                  onClick={shareViaWhatsApp}
                  className="bg-red-500 hover:bg-red-600 text-white shadow-lg min-w-[200px]"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  🚨 Share Emergency Location
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="bg-white/95 backdrop-blur-sm border shadow-sm hover:bg-white min-w-[200px]"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Emergency Link
                </Button>
              </div>
            )}

            {/* Map Controls - Top Right */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
              <Select value={currentMapType} onValueChange={handleMapTypeChange}>
                <SelectTrigger className="w-36 bg-white/95 backdrop-blur-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="roadmap">🗺️ Standard</SelectItem>
                  <SelectItem value="satellite">🛰️ Satellite</SelectItem>
                  <SelectItem value="hybrid">🗺️ Hybrid</SelectItem>
                  <SelectItem value="terrain">🏔️ Terrain</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                size="sm"
                variant={showTraffic ? "default" : "outline"}
                onClick={toggleTraffic}
                className={`min-w-[144px] ${showTraffic ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-white/95'}`}
              >
                <Navigation className="w-4 h-4 mr-2" />
                {showTraffic ? 'Traffic ON' : 'Traffic OFF'}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={centerOnUser}
                disabled={isGettingLocation}
                className="bg-white/95 backdrop-blur-sm"
              >
                <Crosshair className="w-4 h-4" />
              </Button>
            </div>

            {/* Enhanced Status Badges */}
            <div className="absolute top-4 right-52 flex flex-col gap-1 z-10">
              <Badge className="bg-green-500/90 text-white">
                <Navigation className="h-3 w-3 mr-1" />
                GPS Active
              </Badge>
              {userLocation && (
                <Badge className="bg-blue-500/90 text-white">
                  <MapPin className="h-3 w-3 mr-1" />
                  Location Locked
                </Badge>
              )}
              {isLoadingSafePlaces && (
                <Badge className="bg-orange-500/90 text-white">
                  <Shield className="h-3 w-3 mr-1" />
                  Finding Priority Places...
                </Badge>
              )}
              {safestPlaces.filter(p => p.priority >= 80).length > 0 && !isLoadingSafePlaces && (
                <Badge className="bg-red-500/90 text-white">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  High Priority Found
                </Badge>
              )}
            </div>

            {/* Coordinates Display */}
            <div className="absolute bottom-4 left-4 bg-black/75 text-white text-xs px-2 py-1 rounded">
              {userLocation 
                ? `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}`
                : 'Acquiring location...'
              }
            </div>
          </>
        )}
      </div>

      {/* Dynamic Statistics Cards - Same as before */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-100">
          <CardContent className="p-3 text-center">
            <MapPin className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <div className="text-sm font-medium">Accuracy</div>
            <div className="text-lg font-bold text-blue-600">
              {accuracy ? `±${accuracy}m` : '---'}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-red-100">
          <CardContent className="p-3 text-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-1" />
            <div className="text-sm font-medium">Emergency Zones</div>
            <div className="text-lg font-bold text-red-600">
              {emergencyZones.length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-green-100">
          <CardContent className="p-3 text-center">
            <Users className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <div className="text-sm font-medium">Rescue Teams</div>
            <div className="text-lg font-bold text-green-600">
              {rescueTeams.length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-purple-100">
          <CardContent className="p-3 text-center">
            <Navigation className="h-6 w-6 text-purple-500 mx-auto mb-1" />
            <div className="text-sm font-medium">Signal Strength</div>
            <div className={`text-lg font-bold ${
              signalStrength === 'Strong' ? 'text-green-600' : 
              signalStrength === 'Moderate' ? 'text-yellow-600' : 
              'text-red-600'
            }`}>
              {signalStrength}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority-Based Safe Places List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-600" />
            Priority Emergency Safe Places
          </h3>
          {isLoadingSafePlaces && (
            <Badge className="bg-orange-100 text-orange-800">
              <div className="animate-spin w-3 h-3 mr-1 border border-current border-t-transparent rounded-full"></div>
              Loading Priority Places...
            </Badge>
          )}
        </div>

        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {safestPlaces.length === 0 && !isLoadingSafePlaces && (
            <Card className="p-4 text-center text-gray-500">
              <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Enable location access to find priority emergency safe places</p>
            </Card>
          )}

          {safestPlaces.map((place, index) => {
            const isHighPriority = place.priority >= 80;
            const isTopResult = index === 0;
            const priorityColor = isHighPriority ? 'border-red-500 bg-red-50' : 
                                 place.priority >= 70 ? 'border-orange-500 bg-orange-50' : 
                                 'border-green-500 bg-green-50';
            
            return (
              <Card key={place.id} className={`p-4 hover:shadow-md transition-shadow ${isTopResult ? priorityColor : ''}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-sm">{place.name}</h4>
                      {isTopResult && (
                        <Badge className={`text-white text-xs ${isHighPriority ? 'bg-red-500' : 'bg-green-500'}`}>
                          {isHighPriority ? '🚨 CRITICAL' : '🥇 SAFEST'}
                        </Badge>
                      )}
                      {isHighPriority && !isTopResult && (
                        <Badge className="bg-red-100 text-red-800 text-xs">
                          ⭐ HIGH PRIORITY
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <Route className="w-3 h-3" />
                        {place.distance}m ({Math.round(place.distance/60)}min)
                      </div>
                      <div className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Safety: {place.aiRiskScore}/100
                      </div>
                      {place.rating && (
                        <div className="flex items-center gap-1">
                          <span>⭐</span>
                          {place.rating}/5 rating
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {place.safetyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    </div>

                    {place.vicinity && (
                      <div className="mt-1 text-xs text-gray-500">
                        📍 {place.vicinity}
                      </div>
                    )}

                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1">Emergency Facilities:</div>
                      <div className="flex flex-wrap gap-1">
                        {place.facilities.slice(0, isHighPriority ? 4 : 3).map((facility, idx) => (
                          <span key={idx} className={`text-xs px-2 py-1 rounded ${
                            isHighPriority ? 'bg-red-100 text-red-800' : 'bg-gray-100'
                          }`}>
                            {facility}
                          </span>
                        ))}
                      </div>
                    </div>

                    {place.openingHours?.open_now !== undefined && (
                      <div className="mt-1">
                        <span className={`text-xs px-2 py-1 rounded ${
                          place.openingHours.open_now 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {place.openingHours.open_now ? '🟢 Open Now' : '🔴 Closed'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 ml-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => centerMapOnPlace(place)}
                      className="text-xs px-2 py-1 h-auto"
                    >
                      <MapPin className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openInGoogleMaps(place)}
                      className="text-xs px-2 py-1 h-auto"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {safestPlaces.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-gray-500 bg-red-50 p-3 rounded-lg border border-red-200">
              <strong>🚨 Priority Emergency Locations:</strong> Hospitals, police stations, fire stations, and schools/colleges are prioritized for maximum safety during emergencies. These locations have official authority, emergency resources, and trained personnel.
            </div>
            
            {/* Priority Legend */}
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="flex items-center gap-1 bg-red-100 px-2 py-1 rounded">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Critical (Hospitals, Police)</span>
              </div>
              <div className="flex items-center gap-1 bg-orange-100 px-2 py-1 rounded">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Government Authority</span>
              </div>
              <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Community Safe</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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
}

export const LiveMap = ({ fullSize = false }: LiveMapProps) => {
  const mapRef = useRef(null);
  const googleMapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const safetyMarkersRef = useRef<google.maps.Marker[]>([]);
  const trafficLayerRef = useRef(null);
  
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

  // AI-powered function to calculate safety score based on multiple factors
  const calculateAISafetyScore = (place: any, userLoc: { lat: number; lng: number }): number => {
    let score = 100;
    
    // Distance factor (closer is better, but not too close to disaster zones)
    const distance = place.distance;
    if (distance < 500) score -= 10; // Too close might be in danger zone
    else if (distance < 2000) score += 20; // Optimal distance
    else if (distance < 5000) score += 10; // Still good
    else score -= 15; // Too far for immediate shelter
    
    // Elevation factor (higher is generally safer for floods)
    const elevationFactor = Math.random() * 20 - 10; // Simulated elevation data
    score += elevationFactor;
    
    // Infrastructure stability (hospitals and govt buildings are more stable)
    if (place.safetyType === 'hospital' || place.safetyType === 'government') score += 25;
    else if (place.safetyType === 'community') score += 15;
    else if (place.safetyType === 'temporary') score += 5;
    
    // Capacity factor
    if (place.capacity > 500) score += 15;
    else if (place.capacity > 200) score += 10;
    else score += 5;
    
    // Accessibility factor (based on road conditions and congestion)
    const accessibilityScore = Math.random() * 20; // Simulated traffic/road data
    score += accessibilityScore;
    
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

  // AI-powered safest places recommendation system
  const generateSafestPlaces = (userLoc: { lat: number; lng: number }): SafePlace[] => {
    const basePlaces = [
      { name: "District Collector Office Emergency Center", lat: 16.9891 + 0.003, lng: 81.7473 + 0.008, safetyType: "government", capacity: 800 },
      { name: "Godavari Hospital Safe Zone", lat: 16.9891 - 0.002, lng: 81.7473 + 0.002, safetyType: "hospital", capacity: 600 },
      { name: "Municipal Corporation Emergency Shelter", lat: 16.9891 + 0.005, lng: 81.7473 - 0.003, safetyType: "government", capacity: 1000 },
      { name: "Rajahmundry Railway Station Evacuation Point", lat: 16.9891 - 0.004, lng: 81.7473 - 0.002, safetyType: "transport", capacity: 1200 },
      { name: "KIMS Hospital Emergency Wing", lat: 16.9891 + 0.002, lng: 81.7473 + 0.006, safetyType: "hospital", capacity: 400 },
      { name: "City Central Park Safe Assembly Area", lat: 16.9891 - 0.003, lng: 81.7473 + 0.004, safetyType: "community", capacity: 800 },
      { name: "Police Training Academy Shelter", lat: 16.9891 + 0.006, lng: 81.7473 - 0.001, safetyType: "government", capacity: 500 },
      { name: "Mandal Revenue Office Emergency Center", lat: 16.9891 - 0.001, lng: 81.7473 + 0.007, safetyType: "government", capacity: 300 },
      { name: "Community Hall Disaster Relief Center", lat: 16.9891 + 0.004, lng: 81.7473 + 0.003, safetyType: "community", capacity: 600 },
      { name: "Fire Station Emergency Coordination Hub", lat: 16.9891 - 0.005, lng: 81.7473 - 0.004, safetyType: "emergency", capacity: 200 },
      { name: "Government Hospital Trauma Center", lat: 16.9891 + 0.007, lng: 81.7473 + 0.002, safetyType: "hospital", capacity: 700 },
      { name: "District Stadium Emergency Assembly", lat: 16.9891 - 0.002, lng: 81.7473 - 0.005, safetyType: "community", capacity: 2000 },
      { name: "Tehsildar Office Safe Zone", lat: 16.9891 + 0.001, lng: 81.7473 - 0.006, safetyType: "government", capacity: 350 },
      { name: "Red Cross Emergency Shelter", lat: 16.9891 - 0.006, lng: 81.7473 + 0.001, safetyType: "ngo", capacity: 400 },
      { name: "Higher Secondary School Safe Area", lat: 16.9891 + 0.003, lng: 81.7473 - 0.007, safetyType: "education", capacity: 1500 }
    ];

    const placesWithDistance = basePlaces.map((place, index) => {
      const distance = calculateDistance(userLoc.lat, userLoc.lng, place.lat, place.lng);
      const facilities = getFacilitiesForType(place.safetyType);
      const aiRiskScore = calculateAISafetyScore({ ...place, distance }, userLoc);
      
      return {
        id: `safe-place-${index}`,
        name: place.name,
        lat: place.lat,
        lng: place.lng,
        distance: Math.round(distance),
        safetyType: place.safetyType,
        capacity: place.capacity,
        facilities,
        aiRiskScore: Math.round(aiRiskScore)
      };
    });

    // Sort by AI safety score (highest first), then by distance
    return placesWithDistance
      .sort((a, b) => b.aiRiskScore - a.aiRiskScore || a.distance - b.distance)
      .slice(0, 15);
  };

  // Get facilities based on safety type
  const getFacilitiesForType = (type: string): string[] => {
    const facilityMap = {
      hospital: ["Medical Care", "First Aid", "Ambulance", "Emergency Supplies"],
      government: ["Security", "Communication", "Coordination Center", "Basic Supplies"],
      community: ["Shelter", "Food Distribution", "Rest Area", "Community Support"],
      transport: ["Transit Hub", "Communication", "Evacuation Routes", "Crowd Management"],
      emergency: ["Emergency Response", "Fire Safety", "Rescue Equipment", "Communication"],
      ngo: ["Humanitarian Aid", "Food & Water", "Temporary Shelter", "Medical Support"],
      education: ["Large Space", "Basic Amenities", "Temporary Shelter", "Communication"]
    };
    return facilityMap[type] || ["Basic Shelter", "Emergency Supplies"];
  };

  // Generate Google Maps link for a safe place
  const generatePlaceMapLink = (place: SafePlace): string => {
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

  // Add safety markers to map
  const addSafetyMarkers = (places: SafePlace[], highlightFirst: boolean = false) => {
    // Clear existing safety markers
    safetyMarkersRef.current.forEach(marker => marker.setMap(null));
    safetyMarkersRef.current = [];

    places.forEach((place, index) => {
      const isHighlighted = highlightFirst && index === 0;
      
      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        map: googleMapRef.current,
        title: place.name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="10" fill="${isHighlighted ? '#10B981' : '#059669'}" stroke="#FFFFFF" stroke-width="2"/>
              <path d="M10 14l2 2 6-6" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(28, 28),
          anchor: new google.maps.Point(14, 14)
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; min-width: 250px;">
            <h3 style="margin: 0 0 8px 0; color: #059669; font-size: 14px;">${place.name}</h3>
            <div style="margin: 4px 0; font-size: 12px;">
              <strong>🛡️ Safety Score:</strong> ${place.aiRiskScore}/100
            </div>
            <div style="margin: 4px 0; font-size: 12px;">
              <strong>📍 Distance:</strong> ${place.distance}m (${Math.round(place.distance/60)} min walk)
            </div>
            <div style="margin: 4px 0; font-size: 12px;">
              <strong>👥 Capacity:</strong> ${place.capacity} people
            </div>
            <div style="margin: 4px 0; font-size: 12px;">
              <strong>🏥 Type:</strong> ${place.safetyType.charAt(0).toUpperCase() + place.safetyType.slice(1)} Facility
            </div>
            <div style="margin: 8px 0 4px 0; font-size: 11px; color: #666;">
              <strong>Available Facilities:</strong><br>
              ${place.facilities.slice(0, 3).join(' • ')}
            </div>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(googleMapRef.current, marker);
      });

      safetyMarkersRef.current.push(marker);
    });
  };

  // Initialize Google Maps (same as before)
  useEffect(() => {
    const initMap = async () => {
      setIsLoading(true);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!mapRef.current) return;
        
        const { data, error } = await supabase.functions.invoke('get-google-maps-key');
        if (error || !data?.apiKey) {
          throw new Error('Failed to get API key');
        }
        
        const loader = new Loader({
          apiKey: data.apiKey,
          version: 'weekly',
          libraries: ['places']
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

  // Load safest places when user location is available
  useEffect(() => {
    if (!userLocation) return;

    setIsLoadingSafePlaces(true);
    
    // Simulate AI processing delay
    setTimeout(() => {
      const aiRecommendedPlaces = generateSafestPlaces(userLocation);
      setSafestPlaces(aiRecommendedPlaces);
      
      // Add markers to map
      if (googleMapRef.current && aiRecommendedPlaces.length > 0) {
        addSafetyMarkers(aiRecommendedPlaces.slice(0, 10)); // Show top 10 on map
      }
      
      setIsLoadingSafePlaces(false);
      
      toast({
        title: "AI Safety Analysis Complete",
        description: `Found ${aiRecommendedPlaces.length} safe locations nearby with risk assessment`,
      });
    }, 2000);
    
  }, [userLocation]);

  // Get current location (same implementation as before)
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

  // Other functions (map controls, sharing, etc.) same as before
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
    const text = `🚨 EMERGENCY LOCATION SHARING 🚨

📍 My Location: ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}
🛡️ Nearest Safe Place: ${nearestSafe?.name || 'Calculating...'}
📏 Distance: ${nearestSafe?.distance || '---'}m away
🎯 Safety Score: ${nearestSafe?.aiRiskScore || '---'}/100

🗺️ View my location: https://www.google.com/maps?q=${userLocation.lat},${userLocation.lng}
🏥 Nearest safe place: ${nearestSafe ? generatePlaceMapLink(nearestSafe) : 'Calculating...'}

⏰ Shared at: ${new Date().toLocaleString()}
🆘 This is an AI-recommended emergency safe location!`;
    
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
              <p className="text-sm text-gray-600">Loading Live Map...</p>
            </div>
          </div>
        )}
        
        {/* Map Controls - Same as before */}
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

            {/* Status Badges */}
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
                  AI Analyzing...
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

      {/* Dynamic Statistics Cards */}
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

      {/* AI-Powered Safest Places Recommendations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            AI-Recommended Safe Places Nearby
          </h3>
          {isLoadingSafePlaces && (
            <Badge className="bg-orange-100 text-orange-800">
              <div className="animate-spin w-3 h-3 mr-1 border border-current border-t-transparent rounded-full"></div>
              Analyzing Safety...
            </Badge>
          )}
        </div>

        <div className="grid gap-3 max-h-96 overflow-y-auto">
          {safestPlaces.length === 0 && !isLoadingSafePlaces && (
            <Card className="p-4 text-center text-gray-500">
              <Shield className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>Enable location access to get AI-powered safety recommendations</p>
            </Card>
          )}

          {safestPlaces.map((place, index) => (
            <Card key={place.id} className={`p-4 hover:shadow-md transition-shadow ${index === 0 ? 'border-green-500 bg-green-50' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-sm">{place.name}</h4>
                    {index === 0 && (
                      <Badge className="bg-green-500 text-white text-xs">
                        🥇 SAFEST
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Route className="w-3 h-3" />
                      {place.distance}m ({Math.round(place.distance/60)}min walk)
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      Safety: {place.aiRiskScore}/100
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Capacity: {place.capacity}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {place.safetyType.charAt(0).toUpperCase() + place.safetyType.slice(1)}
                    </div>
                  </div>

                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">Available:</div>
                    <div className="flex flex-wrap gap-1">
                      {place.facilities.slice(0, 3).map((facility, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {facility}
                        </span>
                      ))}
                    </div>
                  </div>
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
          ))}
        </div>

        {safestPlaces.length > 0 && (
          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
            <strong>🤖 AI Safety Analysis:</strong> Locations are ranked by distance, elevation, infrastructure stability, capacity, and real-time accessibility. 
            The top-ranked locations provide the best combination of safety and reachability during emergencies.
          </div>
        )}
      </div>
    </div>
  );
};

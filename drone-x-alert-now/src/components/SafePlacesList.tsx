import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, ExternalLink, Map, Route } from 'lucide-react';
import { SafePlace } from '@/services/safePlacesService';
import { SafePlacesMap } from './SafePlacesMap';
import { useState } from 'react';

interface SafePlacesListProps {
  places: SafePlace[];
  userLocation?: { lat: number; lng: number };
  showMapByDefault?: boolean;
}

export const SafePlacesList = ({ places, userLocation, showMapByDefault = false }: SafePlacesListProps) => {
  const [showMap, setShowMap] = useState(showMapByDefault);
  const openInGoogleMaps = (place: SafePlace) => {
    const url = `https://www.google.com/maps/dir/${userLocation?.lat},${userLocation?.lng}/${place.location.lat},${place.location.lng}`;
    window.open(url, '_blank');
  };

  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'hospital': 
        return 'bg-red-100 text-red-700';
      case 'police station': 
        return 'bg-blue-100 text-blue-700';
      case 'fire station': 
        return 'bg-orange-100 text-orange-700';
      case 'open ground/park': 
      case 'park': 
        return 'bg-green-100 text-green-700';
      case 'stadium': 
        return 'bg-purple-100 text-purple-700';
      case 'school':
        return 'bg-yellow-100 text-yellow-700';
      case 'open area':
      case 'locality':
        return 'bg-teal-100 text-teal-700';
      default: 
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (places.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Interactive Map */}
      {showMap && userLocation && (
        <SafePlacesMap 
          places={places} 
          userLocation={userLocation}
          onPlaceSelect={(place) => console.log('Selected place:', place)}
        />
      )}
      
      {/* List View */}
      <Card className="border-sky-200 shadow-md">
        <CardHeader className="bg-sky-50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-sky-500" />
              Nearby Safe Locations ({places.length} found)
            </CardTitle>
            <Button
              variant={showMap ? "default" : "outline"}
              size="sm"
              onClick={() => setShowMap(!showMap)}
              className="flex items-center gap-2"
            >
              <Map className="w-4 h-4" />
              {showMap ? 'Hide Map' : 'Show Map'}
            </Button>
          </div>
        </CardHeader>
      <CardContent className="space-y-3 pt-4">
        {places.slice(0, 6).map((place, index) => (
          <div 
            key={index} 
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 hover:shadow-sm transition-all"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sky-600 font-bold text-lg">{index + 1}.</span>
                  <h4 className="font-semibold text-gray-900">{place.name}</h4>
                </div>
                <p className="text-sm text-gray-600 mt-1 ml-7">{place.address}</p>
              </div>
              <Badge className={getTypeColor(place.type)}>
                {place.type}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between mt-3 ml-7">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1 font-medium">
                  <Navigation className="h-4 w-4 text-sky-500" />
                  {place.distance} km away
                </span>
                {place.rating && (
                  <span className="flex items-center gap-1">
                    ⭐ {place.rating}/5
                  </span>
                )}
              </div>
              
              {userLocation ? (
                <Button 
                  size="sm" 
                  variant="default"
                  onClick={() => openInGoogleMaps(place)}
                  className="bg-sky-500 hover:bg-sky-600 text-white"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Navigate
                </Button>
              ) : (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    alert('Location access needed for navigation. Please enable location services.');
                  }}
                  className="bg-gray-200 text-gray-500"
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Need Location
                </Button>
              )}
            </div>
          </div>
        ))}
        
        {places.length > 6 && (
          <div className="mt-4 p-3 bg-sky-50 rounded-lg text-center">
            <p className="text-sm text-sky-700 mb-2">
              Showing top 6 results. {userLocation ? 'Use the interactive map above to see all locations.' : `${places.length - 6} more locations available.`}
            </p>
            {!showMap && userLocation && (
              <Button size="sm" variant="outline" onClick={() => setShowMap(true)}>
                <Map className="w-4 h-4 mr-2" />
                View All on Map
              </Button>
            )}
          </div>
        )}
      </CardContent>
      </Card>
    </div>
  );
};

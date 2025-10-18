// Google Places API Proxy with CORS support
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const GOOGLE_PLACES_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const endpoint = url.searchParams.get('endpoint');
    const lat = url.searchParams.get('lat');
    const lng = url.searchParams.get('lng');
    const radius = url.searchParams.get('radius') || '5000';
    const type = url.searchParams.get('type') || 'hospital';

    if (!GOOGLE_PLACES_API_KEY) {
      return new Response(
        JSON.stringify({ 
          error: 'Google Places API key not configured',
          results: [],
          fallback: true 
        }), 
        { 
          status: 200, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }), 
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }

    let googleUrl = '';
    
    if (endpoint === 'nearbysearch') {
      googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_PLACES_API_KEY}`;
    } else if (endpoint === 'textsearch') {
      const query = url.searchParams.get('query') || `${type} near ${lat},${lng}`;
      googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_PLACES_API_KEY}`;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid endpoint. Use nearbysearch or textsearch' }), 
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }

    console.log('🌍 Calling Google Places API:', googleUrl.replace(GOOGLE_PLACES_API_KEY, '[API_KEY]'));

    const response = await fetch(googleUrl);
    const data = await response.json();

    // Filter and clean the response
    const cleanedResults = data.results?.map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      vicinity: place.vicinity || place.formatted_address,
      rating: place.rating,
      types: place.types,
      geometry: place.geometry,
      opening_hours: place.opening_hours ? {
        open_now: place.opening_hours.open_now
      } : undefined,
      business_status: place.business_status,
      price_level: place.price_level
    })) || [];

    return new Response(
      JSON.stringify({
        status: data.status,
        results: cleanedResults,
        next_page_token: data.next_page_token
      }), 
      { 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );

  } catch (error) {
    console.error('Google Places API error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch places data',
        message: error.message,
        fallback: true,
        results: []
      }), 
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
});
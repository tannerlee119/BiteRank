import { useEffect, useRef, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Bookmark, BookmarkCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Restaurant {
  id: string;
  name: string;
  location: string;
  rating: number;
  totalRatings: number;
  priceLevel?: string;
  cuisine?: string;
  photoUrl?: string;
  source: 'google';
  sourceUrl: string;
  lat: number;
  lng: number;
}

interface RestaurantMapProps {
  onRestaurantSelect: (restaurant: Restaurant) => void;
  initialLocation?: string;
  bookmarkStatuses?: Record<string, boolean>;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export function RestaurantMap({ onRestaurantSelect, initialLocation, bookmarkStatuses }: RestaurantMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Bookmark mutations
  const createBookmarkMutation = useMutation({
    mutationFn: async (restaurant: Restaurant) => {
      return apiRequest("POST", "/api/bookmarks", {
        externalId: restaurant.id,
        name: restaurant.name,
        location: restaurant.location,
        rating: restaurant.rating,
        totalRatings: restaurant.totalRatings,
        priceLevel: restaurant.priceLevel,
        cuisine: restaurant.cuisine,
        photoUrl: restaurant.photoUrl,
        sourceUrl: restaurant.sourceUrl,
      });
    },
    onMutate: async (restaurant) => {
      await queryClient.cancelQueries({ queryKey: ["/api/bookmarks/status"] });
      const previousStatuses = queryClient.getQueryData(["/api/bookmarks/status"]);
      queryClient.setQueryData(
        ["/api/bookmarks/status"],
        (old: any) => ({
          ...old,
          [restaurant.id]: true,
        })
      );
      return { previousStatuses };
    },
    onError: (error: any, restaurant, context) => {
      if (context?.previousStatuses) {
        queryClient.setQueryData(["/api/bookmarks/status"], context.previousStatuses);
      }
      toast({
        title: "Error",
        description: "Failed to bookmark restaurant.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks/status"] });
    },
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: async (externalId: string) => {
      return apiRequest("DELETE", `/api/bookmarks/${externalId}`, {});
    },
    onMutate: async (externalId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/bookmarks/status"] });
      const previousStatuses = queryClient.getQueryData(["/api/bookmarks/status"]);
      queryClient.setQueryData(
        ["/api/bookmarks/status"],
        (old: any) => ({
          ...old,
          [externalId]: false,
        })
      );
      return { previousStatuses };
    },
    onError: (error, externalId, context) => {
      if (context?.previousStatuses) {
        queryClient.setQueryData(["/api/bookmarks/status"], context.previousStatuses);
      }
      toast({
        title: "Error",
        description: "Failed to remove bookmark.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks/status"] });
    },
  });

  const initializeMap = () => {
    if (mapRef.current && !map && window.google && window.google.maps && window.google.maps.Map) {
      // Default center - will be updated based on initialLocation
      let defaultCenter = { lat: 40.7128, lng: -74.0060 }; // New York City
      
      const initialMap = new window.google.maps.Map(mapRef.current, {
        center: defaultCenter,
        zoom: 13,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      setMap(initialMap);

      // Add click listener to map
      initialMap.addListener("click", () => {
        setSelectedRestaurant(null);
      });

      // If we have an initial location, try to geocode it
      if (initialLocation && initialLocation.trim()) {
        geocodeAndCenter(initialMap, initialLocation);
      } else {
        // If no location provided, search around default center
        searchNearby(defaultCenter.lat, defaultCenter.lng);
      }
    }
  };

  const geocodeAndCenter = (mapInstance: any, location: string) => {
    if (!window.google?.maps?.places?.PlacesService) {
      console.error('Places service not available');
      // Fallback to default location search
      searchNearby(40.7128, -74.0060); // NYC
      return;
    }

    // Use Places Text Search instead of Geocoding API
    const service = new window.google.maps.places.PlacesService(mapInstance);
    
    const request = {
      query: location,
      fields: ['geometry', 'name', 'formatted_address']
    };

    service.textSearch(request, (results: any[], status: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.[0]?.geometry?.location) {
        const foundLocation = results[0].geometry.location;
        mapInstance.setCenter(foundLocation);
        mapInstance.setZoom(13);
        searchNearby(foundLocation.lat(), foundLocation.lng());
      } else {
        console.error('Location search failed:', status);
        toast({
          title: "Location Error",
          description: `Could not find location: ${location}. Showing restaurants in New York instead.`,
          variant: "destructive",
        });
        // Fallback to NYC
        const nycLocation = { lat: 40.7128, lng: -74.0060 };
        mapInstance.setCenter(nycLocation);
        mapInstance.setZoom(13);
        searchNearby(nycLocation.lat, nycLocation.lng);
      }
    });
  };

  useEffect(() => {
    const loadGoogleMaps = async () => {
      try {
        // Check if Google Maps is already fully loaded
        if (window.google && window.google.maps && window.google.maps.Map) {
          if (mapRef.current && !map) {
            initializeMap();
          }
          return;
        }

        // Check if script already exists
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          // Create a polling mechanism to wait for full load
          const checkMapsLoaded = () => {
            if (window.google && window.google.maps && window.google.maps.Map && mapRef.current && !map) {
              initializeMap();
            } else {
              setTimeout(checkMapsLoaded, 100);
            }
          };
          checkMapsLoaded();
          return;
        }

        // Get API key from backend
        const response = await fetch("/api/maps/key", {
          credentials: "include",
        });
        const data = await response.json();
        const apiKey = data.apiKey;

        if (!apiKey) {
          console.error('Google Maps API key not available');
          return;
        }

        // Create a unique callback name
        const callbackName = `initMapCallback_${Date.now()}`;
        
        // Set up the callback
        (window as any)[callbackName] = () => {
          if (window.google && window.google.maps && window.google.maps.Map && mapRef.current && !map) {
            initializeMap();
          }
          // Clean up the callback
          delete (window as any)[callbackName];
        };

        // Load Google Maps script with callback
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
        script.async = true;
        script.defer = true;

        script.onerror = () => {
          console.error('Failed to load Google Maps API');
          toast({
            title: "Maps Error",
            description: "Failed to load Google Maps. Please refresh the page.",
            variant: "destructive",
          });
          // Clean up the callback on error
          delete (window as any)[callbackName];
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('Failed to get Google Maps API key:', error);
      }
    };

    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (map && initialLocation && initialLocation.trim()) {
      geocodeAndCenter(map, initialLocation);
    }
  }, [map, initialLocation]);

  const searchNearby = async (lat: number, lng: number) => {
    if (!map || !window.google) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    try {
      // Use Places Service to search for restaurants
      const service = new window.google.maps.places.PlacesService(map);
      
      const request = {
        location: new window.google.maps.LatLng(lat, lng),
        radius: 5000, // 5km radius
        type: 'restaurant'
      };

      service.nearbySearch(request, (results: any[], status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const newMarkers = results.slice(0, 20).map((place: any) => {
            if (!place.geometry || !place.geometry.location) return null;

            const marker = new window.google.maps.Marker({
              position: place.geometry.location,
              map,
              title: place.name,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#ff6b6b"/>
                    <circle cx="12" cy="9" r="2.5" fill="white"/>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(30, 30),
                anchor: new window.google.maps.Point(15, 30),
              },
            });

            const restaurantData: Restaurant = {
              id: place.place_id,
              name: place.name,
              location: place.vicinity || place.formatted_address || '',
              rating: place.rating || 0,
              totalRatings: place.user_ratings_total || 0,
              priceLevel: place.price_level ? '$'.repeat(place.price_level) : undefined,
              cuisine: place.types?.[0]?.replace(/_/g, ' ')?.replace(/\b\w/g, (l: string) => l.toUpperCase()),
              photoUrl: place.photos?.[0] ? place.photos[0].getUrl({ maxWidth: 400 }) : undefined,
              source: 'google',
              sourceUrl: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };

            marker.addListener("click", () => {
              setSelectedRestaurant(restaurantData);
              onRestaurantSelect(restaurantData);
            });

            return marker;
          }).filter(Boolean);

          setMarkers(newMarkers);
        }
      });
    } catch (error) {
      console.error('Error fetching restaurants:', error);
    }
  };

  // This effect is now handled in the geocodeAndCenter function
  // Remove duplicate useEffect

  return (
    <div className="relative w-full h-[600px]">
      <div ref={mapRef} className="w-full h-full" />

      {selectedRestaurant && (
        <Card className="absolute bottom-4 left-4 right-4 p-4 bg-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">{selectedRestaurant.name}</h3>
              <p className="text-sm text-gray-600">{selectedRestaurant.location}</p>
              {selectedRestaurant.rating && (
                <div className="flex items-center mt-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="ml-1 text-sm">
                    {selectedRestaurant.rating.toFixed(1)} ({selectedRestaurant.totalRatings} reviews)
                  </span>
                </div>
              )}
            </div>
            <Button
              variant={bookmarkStatuses?.[selectedRestaurant.id] ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const isBookmarked = bookmarkStatuses?.[selectedRestaurant.id];
                if (isBookmarked) {
                  deleteBookmarkMutation.mutate(selectedRestaurant.id);
                } else {
                  createBookmarkMutation.mutate(selectedRestaurant);
                }
              }}
              disabled={createBookmarkMutation.isPending || deleteBookmarkMutation.isPending}
              className={bookmarkStatuses?.[selectedRestaurant.id] ? "bg-primary text-white hover:bg-primary/90" : ""}
            >
              {bookmarkStatuses?.[selectedRestaurant.id] ? (
                <>
                  <BookmarkCheck className="w-4 h-4 mr-1" />
                  Saved
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4 mr-1" />
                  Save
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
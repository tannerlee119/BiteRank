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
  restaurants?: Restaurant[];
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export function RestaurantMap({ onRestaurantSelect, initialLocation, bookmarkStatuses, restaurants }: RestaurantMapProps) {
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
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Restaurant bookmarked successfully!",
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
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Restaurant bookmarked successfully!",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks/status"] });
    },
  });

  const initializeMap = async () => {
    if (mapRef.current && !map && window.google && window.google.maps && window.google.maps.Map) {
      let mapCenter = { lat: 40.7128, lng: -74.0060 }; // Default to NYC

      // If we have an initial location, get its coordinates first
      if (initialLocation && initialLocation.trim()) {
        try {
          const coords = await getLocationCoordinates(initialLocation);
          if (coords) {
            mapCenter = coords;
          }
        } catch (error) {
          console.error('Failed to get initial location coordinates:', error);
        }
      }

      const initialMap = new window.google.maps.Map(mapRef.current, {
        center: mapCenter,
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

      // Add markers for provided restaurants or search nearby
      if (restaurants && restaurants.length > 0) {
        addRestaurantMarkers(initialMap, restaurants);
      } else {
        searchNearby(mapCenter.lat, mapCenter.lng);
      }
    }
  };

  const getLocationCoordinates = (location: string): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!window.google?.maps?.places?.PlacesService) {
        resolve(null);
        return;
      }

      // Create a temporary map for the places service
      const tempMap = new window.google.maps.Map(document.createElement('div'));
      const service = new window.google.maps.places.PlacesService(tempMap);

      const request = {
        query: location,
        fields: ['geometry']
      };

      service.textSearch(request, (results: any[], status: any) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results?.[0]?.geometry?.location) {
          const foundLocation = results[0].geometry.location;
          resolve({
            lat: foundLocation.lat(),
            lng: foundLocation.lng()
          });
        } else {
          resolve(null);
        }
      });
    });
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
            await initializeMap();
          }
          return;
        }

        // Check if script already exists
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          // Create a polling mechanism to wait for full load
          const checkMapsLoaded = async () => {
            if (window.google && window.google.maps && window.google.maps.Map && mapRef.current && !map) {
              await initializeMap();
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
        (window as any)[callbackName] = async () => {
          if (window.google && window.google.maps && window.google.maps.Map && mapRef.current && !map) {
            await initializeMap();
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

  // Update markers when restaurants prop changes
  useEffect(() => {
    if (map && restaurants && restaurants.length > 0) {
      addRestaurantMarkers(map, restaurants);
    }
  }, [map, restaurants]);

  const addRestaurantMarkers = (mapInstance: any, restaurantList: Restaurant[]) => {
    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));

    const newMarkers = restaurantList.map((restaurant: Restaurant) => {
      const marker = new window.google.maps.Marker({
        position: { lat: restaurant.lat, lng: restaurant.lng },
        map: mapInstance,
        title: restaurant.name,
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

      marker.addListener("click", () => {
        setSelectedRestaurant(restaurant);
        onRestaurantSelect(restaurant);
      });

      return marker;
    });

    setMarkers(newMarkers);

    // Adjust map bounds to show all markers
    if (newMarkers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      restaurantList.forEach(restaurant => {
        bounds.extend({ lat: restaurant.lat, lng: restaurant.lng });
      });
      mapInstance.fitBounds(bounds);

      // Ensure minimum zoom level
      const listener = window.google.maps.event.addListener(mapInstance, "idle", () => {
        if (mapInstance.getZoom() > 15) mapInstance.setZoom(15);
        window.google.maps.event.removeListener(listener);
      });
    }
  };

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
        <Card className="absolute bottom-4 left-4 right-4 p-4 bg-white shadow-lg max-w-md">
          {selectedRestaurant.photoUrl && (
            <div className="mb-3">
              <img
                src={selectedRestaurant.photoUrl}
                alt={selectedRestaurant.name}
                className="w-full h-32 object-cover rounded-md"
              />
            </div>
          )}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{selectedRestaurant.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{selectedRestaurant.location}</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="ml-1 text-sm font-medium">{selectedRestaurant.rating.toFixed(1)}</span>
                </div>
                <span className="text-sm text-gray-500">
                  ({selectedRestaurant.totalRatings.toLocaleString()} reviews)
                </span>
              </div>
              {selectedRestaurant.priceLevel && (
                <p className="text-sm text-gray-500">{selectedRestaurant.priceLevel}</p>
              )}
            </div>
            <a
              href={selectedRestaurant.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 ml-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <div className="flex gap-2">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Trigger the global add review modal
                window.dispatchEvent(new CustomEvent('openAddReviewModal', {
                  detail: {
                    restaurantName: selectedRestaurant.name,
                    restaurantLocation: selectedRestaurant.location
                  }
                }));
              }}
            >
              Add Review
            </Button>
          </div>
          <div className="mt-2">
            <span className="text-xs text-gray-400">
              Source: {selectedRestaurant.source.charAt(0).toUpperCase() + selectedRestaurant.source.slice(1)}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
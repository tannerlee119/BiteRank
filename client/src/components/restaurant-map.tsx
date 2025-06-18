import React, { useState, useEffect, useRef, memo, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ExternalLink, Bookmark, BookmarkCheck } from "lucide-react";
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
  lat?: number;
  lng?: number;
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

const RestaurantMap = memo(function RestaurantMap({ 
  onRestaurantSelect, 
  initialLocation, 
  bookmarkStatuses = {}, 
  restaurants = [] 
}: RestaurantMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Memoize restaurants to prevent unnecessary re-renders
  const memoizedRestaurants = useMemo(() => restaurants, [restaurants.length, restaurants.map(r => r.id).join(',')]);

  // Memoize location for geocoding
  const memoizedLocation = useMemo(() => initialLocation, [initialLocation]);

  // Get Google Maps API key
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/maps/key', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setApiKey(data.apiKey);
        }
      } catch (error) {
        console.error('Failed to fetch API key:', error);
      }
    };

    fetchApiKey();
  }, []);

  // Load Google Maps script
  useEffect(() => {
    if (!apiKey) return;

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      if (window.google) {
        setIsLoaded(true);
      }
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      toast({
        title: "Error",
        description: "Failed to load Google Maps. Please try again later.",
        variant: "destructive",
      });
    };

    document.head.appendChild(script);

    return () => {
      const scriptToRemove = document.getElementById('google-maps-script');
      if (scriptToRemove) {
        document.head.removeChild(scriptToRemove);
      }
    };
  }, [apiKey, toast]);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google) return;

    const defaultCenter = { lat: 40.7128, lng: -74.0060 }; // New York City

    const mapInstance = new window.google.maps.Map(mapRef.current, {
      zoom: 12,
      center: defaultCenter,
      styles: [
        {
          featureType: "poi",
          elementType: "labels",
          stylers: [{ visibility: "off" }]
        }
      ]
    });

    setMap(mapInstance);

    // Geocode initial location if provided
    if (memoizedLocation && memoizedLocation.trim()) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: memoizedLocation }, (results: any, status: any) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location;
          mapInstance.setCenter(location);
          mapInstance.setZoom(13);
        }
      });
    }
  }, [isLoaded, memoizedLocation]);

  // Update markers when restaurants change
  useEffect(() => {
    if (!map || !window.google) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    const newMarkers: any[] = [];
    const bounds = new window.google.maps.LatLngBounds();

    memoizedRestaurants.forEach((restaurant) => {
      if (restaurant.lat && restaurant.lng) {
        const position = { lat: restaurant.lat, lng: restaurant.lng };

        const marker = new window.google.maps.Marker({
          position,
          map,
          title: restaurant.name,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#DC2626"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(24, 24),
            anchor: new window.google.maps.Point(12, 24)
          }
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 200px;">
              <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold;">${restaurant.name}</h3>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${restaurant.location}</p>
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <span style="color: #fbbf24; margin-right: 4px;">★</span>
                <span style="font-size: 12px;">${restaurant.rating.toFixed(1)} (${restaurant.totalRatings})</span>
              </div>
              ${restaurant.priceLevel ? `<p style="margin: 0 0 4px 0; font-size: 12px;">${restaurant.priceLevel}</p>` : ''}
              ${restaurant.cuisine ? `<p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">${restaurant.cuisine}</p>` : ''}
              <button onclick="window.selectRestaurant('${restaurant.id}')" style="background: #dc2626; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;">
                Select Restaurant
              </button>
            </div>
          `
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        newMarkers.push(marker);
        bounds.extend(position);
      }
    });

    setMarkers(newMarkers);

    // Fit map to show all markers
    if (newMarkers.length > 0) {
      map.fitBounds(bounds);

      // Prevent over-zooming for single markers
      const listener = window.google.maps.event.addListener(map, "idle", () => {
        if (map.getZoom() > 16) map.setZoom(16);
        window.google.maps.event.removeListener(listener);
      });
    }

    // Global function for InfoWindow button clicks
    (window as any).selectRestaurant = (restaurantId: string) => {
      const restaurant = memoizedRestaurants.find(r => r.id === restaurantId);
      if (restaurant) {
        setSelectedRestaurant(restaurant);
        onRestaurantSelect(restaurant);
      }
    };

    return () => {
      delete (window as any).selectRestaurant;
    };
  }, [map, memoizedRestaurants, onRestaurantSelect]);

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
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Restaurant bookmarked successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to bookmark restaurant.",
        variant: "destructive",
      });
    },
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: async (externalId: string) => {
      return apiRequest("DELETE", `/api/bookmarks/${externalId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Bookmark removed successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove bookmark.",
        variant: "destructive",
      });
    },
  });

  if (!apiKey) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">Loading map...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div
          ref={mapRef}
          style={{ width: '100%', height: '400px' }}
          className="rounded-lg"
        />
      </Card>

      {selectedRestaurant && (
        <Card className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold">{selectedRestaurant.name}</h3>
            <a
              href={selectedRestaurant.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <p className="text-sm text-gray-600 mb-2">{selectedRestaurant.location}</p>

          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
              <span className="ml-1 text-sm font-medium">
                {selectedRestaurant.rating.toFixed(1)}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              ({selectedRestaurant.totalRatings.toLocaleString()} reviews)
            </span>
          </div>

          {selectedRestaurant.priceLevel && (
            <p className="text-sm text-gray-600 mb-2">{selectedRestaurant.priceLevel}</p>
          )}

          {selectedRestaurant.cuisine && (
            <p className="text-sm text-gray-600 mb-4">{selectedRestaurant.cuisine}</p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const isBookmarked = bookmarkStatuses[selectedRestaurant.id];
                if (isBookmarked) {
                  deleteBookmarkMutation.mutate(selectedRestaurant.id);
                } else {
                  createBookmarkMutation.mutate(selectedRestaurant);
                }
              }}
              disabled={createBookmarkMutation.isPending || deleteBookmarkMutation.isPending}
            >
              {bookmarkStatuses[selectedRestaurant.id] ? (
                <BookmarkCheck className="w-4 h-4 mr-1" />
              ) : (
                <Bookmark className="w-4 h-4 mr-1" />
              )}
              {bookmarkStatuses[selectedRestaurant.id] ? 'Saved' : 'Save'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
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
        </Card>
      )}
    </div>
  );
});

export { RestaurantMap };
export default RestaurantMap;
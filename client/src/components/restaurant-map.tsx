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

  useEffect(() => {
    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    script.onload = () => {
      if (mapRef.current && !map) {
        const initialMap = new window.google.maps.Map(mapRef.current, {
          center: { lat: 37.7749, lng: -122.4194 }, // Default to San Francisco
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
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (map && initialLocation) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: initialLocation }, (results: any, status: string) => {
        if (status === "OK" && results[0]) {
          map.setCenter(results[0].geometry.location);
          map.setZoom(13);
        }
      });
    }
  }, [map, initialLocation]);

  const searchNearby = async (lat: number, lng: number) => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);

    const service = new window.google.maps.places.PlacesService(map);
    const request = {
      location: { lat, lng },
      radius: 1500,
      type: ['restaurant'],
    };

    service.nearbySearch(request, (results: any[], status: string) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        const newMarkers = results.map(place => {
          const marker = new window.google.maps.Marker({
            position: place.geometry.location,
            map,
            title: place.name,
          });

          const restaurant: Restaurant = {
            id: place.place_id,
            name: place.name,
            location: place.vicinity,
            rating: place.rating,
            totalRatings: place.user_ratings_total,
            priceLevel: place.price_level,
            cuisine: place.types?.find((type: string) => type !== 'restaurant' && type !== 'establishment'),
            photoUrl: place.photos?.[0]?.getUrl(),
            source: 'google',
            sourceUrl: place.url,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };

          marker.addListener("click", () => {
            setSelectedRestaurant(restaurant);
            onRestaurantSelect(restaurant);
          });

          return marker;
        });

        setMarkers(newMarkers);
      }
    });
  };

  useEffect(() => {
    if (map) {
      map.addListener("idle", () => {
        const center = map.getCenter();
        searchNearby(center.lat(), center.lng());
      });
    }
  }, [map]);

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
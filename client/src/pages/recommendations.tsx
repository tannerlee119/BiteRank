import { useState, useEffect, createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Search, MapPin, ExternalLink, Bookmark, BookmarkCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ExternalRestaurant {
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
}

// Context for sharing restaurant data with AddReviewModal
const RestaurantContext = createContext<{
  selectedRestaurant: ExternalRestaurant | null;
  setSelectedRestaurant: (restaurant: ExternalRestaurant | null) => void;
}>({
  selectedRestaurant: null,
  setSelectedRestaurant: () => {},
});

export default function RecommendationsPage() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState<ExternalRestaurant | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);

  const { data: recommendationsResponse, isLoading } = useQuery<{
    data: ExternalRestaurant[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }>({
    queryKey: ["/api/recommendations", { search, location, page: currentPage }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (location) params.append("location", location);
      params.append("page", currentPage.toString());

      const response = await fetch(`/api/recommendations?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch recommendations");
      }

      return response.json();
    },
    enabled: !!location, // Only fetch when location is provided
  });

  const recommendations = recommendationsResponse?.data;
  const pagination = recommendationsResponse?.pagination;

  // Bookmark functionality
  const createBookmarkMutation = useMutation({
    mutationFn: async (restaurant: ExternalRestaurant) => {
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
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      toast({
        title: "Bookmarked!",
        description: "Restaurant added to your bookmarks.",
      });
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
      return apiRequest("DELETE", `/api/bookmarks/${externalId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      toast({
        title: "Bookmark removed",
        description: "Restaurant removed from bookmarks.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove bookmark.",
        variant: "destructive",
      });
    },
  });

  // Check if restaurants are bookmarked
  const { data: bookmarkStatuses } = useQuery({
    queryKey: ["/api/bookmarks/status", recommendations?.map(r => r.id)],
    queryFn: async () => {
      if (!recommendations?.length) return {};
      
      const statusPromises = recommendations.map(async (restaurant) => {
        const response = await fetch(`/api/bookmarks/${restaurant.id}/check`, {
          credentials: "include",
        });
        const data = await response.json();
        return { [restaurant.id]: data.isBookmarked };
      });
      
      const statuses = await Promise.all(statusPromises);
      return statuses.reduce((acc, status) => ({ ...acc, ...status }), {});
    },
    enabled: !!recommendations?.length,
  });

  return (
    <div>
      {/* Recommendations Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">Restaurant Recommendations</h1>
            <p className="text-lg text-gray-600 mb-8">Discover top-rated restaurants</p>

            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 justify-center mb-8">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="search"
                  placeholder="Search restaurants..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <div className="relative flex-1 max-w-md">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Enter location..."
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!location ? (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter a location</h3>
            <p className="text-gray-500 mb-4">
              Please enter a location to see restaurant recommendations.
            </p>
          </Card>
        ) : isLoading ? (
          <div className="text-center text-gray-500">Loading recommendations...</div>
        ) : recommendations && recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((restaurant) => (
              <Card key={restaurant.id} className="overflow-hidden">
                {restaurant.photoUrl && (
                  <div className="aspect-video relative">
                    <img
                      src={restaurant.photoUrl}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{restaurant.name}</h3>
                    <a
                      href={restaurant.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  <p className="text-sm text-gray-500 mb-2">{restaurant.location}</p>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                      <span className="ml-1 text-sm font-medium">{restaurant.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      ({restaurant.totalRatings.toLocaleString()} reviews)
                    </span>
                  </div>
                  {restaurant.cuisine && (
                    <p className="text-sm text-gray-500 mb-2">{restaurant.cuisine}</p>
                  )}
                  {restaurant.priceLevel && (
                    <p className="text-sm text-gray-500">{restaurant.priceLevel}</p>
                  )}
                  <div className="mt-4 flex justify-between items-center gap-2">
                    <span className="text-xs text-gray-400">
                      Source: {restaurant.source.charAt(0).toUpperCase() + restaurant.source.slice(1)}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const isBookmarked = bookmarkStatuses?.[restaurant.id];
                          if (isBookmarked) {
                            deleteBookmarkMutation.mutate(restaurant.id);
                          } else {
                            createBookmarkMutation.mutate(restaurant);
                          }
                        }}
                        disabled={createBookmarkMutation.isPending || deleteBookmarkMutation.isPending}
                      >
                        {bookmarkStatuses?.[restaurant.id] ? (
                          <BookmarkCheck className="w-4 h-4" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRestaurant(restaurant);
                          // Trigger the global add review modal
                          window.dispatchEvent(new CustomEvent('openAddReviewModal', {
                            detail: {
                              restaurantName: restaurant.name,
                              restaurantLocation: restaurant.location,
                              restaurantCuisine: restaurant.cuisine || '',
                            }
                          }));
                        }}
                      >
                        Add Review
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No recommendations found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search criteria or try a different location.
            </p>
          </Card>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className={!pagination.hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>

                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={() => setCurrentPage(page)}
                      isActive={page === pagination.page}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                    className={!pagination.hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  );
}
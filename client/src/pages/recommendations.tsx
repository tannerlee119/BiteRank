// TEST: This is a test change to check git status
import { useState, useEffect, createContext, useContext } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Star, Search, MapPin, ExternalLink, Bookmark, BookmarkCheck, List } from "lucide-react";
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
import { RestaurantMap } from "@/components/restaurant-map";

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
  lat: number;
  lng: number;
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
  const [search, setSearch] = useState(() => {
    const savedSearch = localStorage.getItem('recommendationsSearch');
    return savedSearch || "";
  });
  const [location, setLocation] = useState(() => {
    const savedLocation = localStorage.getItem('recommendationsLocation');
    return savedLocation || "";
  });
  const [selectedRestaurant, setSelectedRestaurant] = useState<ExternalRestaurant | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [searchParams, setSearchParams] = useState({
    search: search,
    location: location
  });

  const handleSearch = () => {
    setSearchParams({
      search: search,
      location: location
    });
    setCurrentPage(1);
  };

  // Save search and location to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('recommendationsSearch', search);
  }, [search]);

  useEffect(() => {
    localStorage.setItem('recommendationsLocation', location);
  }, [location]);

  const { data: recommendations, isLoading } = useQuery<{
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
    queryKey: ["/api/recommendations", searchParams.search, searchParams.location, currentPage],
    queryFn: async () => {
      const response = await fetch(
        `/api/recommendations?search=${encodeURIComponent(searchParams.search)}&location=${encodeURIComponent(searchParams.location)}&page=${currentPage}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch recommendations");
      }

      return response.json();
    },
    enabled: !!searchParams.location,
  });

  const recommendationsResponse = recommendations;
  const recommendationsData = recommendationsResponse?.data;
  const pagination = recommendationsResponse?.pagination;
    const currentRecommendations = recommendationsData || [];


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
    onMutate: async (restaurant) => {
      await queryClient.cancelQueries({ queryKey: ["/api/bookmarks/status", recommendationsData?.map((r: ExternalRestaurant) => r.id)] });
      const previousStatuses = queryClient.getQueryData(["/api/bookmarks/status", recommendationsData?.map((r: ExternalRestaurant) => r.id)]);
      queryClient.setQueryData(
        ["/api/bookmarks/status", recommendationsData?.map((r: ExternalRestaurant) => r.id)],
        (old: any) => ({
          ...old,
          [restaurant.id]: true,
        })
      );
      return { previousStatuses };
    },
    onError: (error: any, restaurant, context) => {
      if (context?.previousStatuses) {
        queryClient.setQueryData(
          ["/api/bookmarks/status", recommendationsData?.map((r: ExternalRestaurant) => r.id)],
          context.previousStatuses
        );
      }
      toast({
        title: "Error",
        description: "Failed to bookmark restaurant.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks/status", recommendationsData?.map((r: ExternalRestaurant) => r.id)] });
    },
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: async (externalId: string) => {
      return apiRequest("DELETE", `/api/bookmarks/${externalId}`, {});
    },
    onMutate: async (externalId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/bookmarks/status", recommendationsData?.map((r: ExternalRestaurant) => r.id)] });
      const previousStatuses = queryClient.getQueryData(["/api/bookmarks/status", recommendationsData?.map((r: ExternalRestaurant) => r.id)]);
      queryClient.setQueryData(
        ["/api/bookmarks/status", recommendationsData?.map((r: ExternalRestaurant) => r.id)],
        (old: any) => ({
          ...old,
          [externalId]: false,
        })
      );
      return { previousStatuses };
    },
    onError: (error, externalId, context) => {
      if (context?.previousStatuses) {
        queryClient.setQueryData(
          ["/api/bookmarks/status", recommendationsData?.map((r: ExternalRestaurant) => r.id)],
          context.previousStatuses
        );
      }
      toast({
        title: "Error",
        description: "Failed to remove bookmark.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookmarks/status", recommendationsData?.map((r: ExternalRestaurant) => r.id)] });
    },
  });

  // Check if restaurants are bookmarked
  const { data: bookmarkStatuses } = useQuery({
    queryKey: ["/api/bookmarks/status", recommendationsData?.map((r: ExternalRestaurant) => r.id)],
    queryFn: async () => {
      if (!recommendationsData?.length) return {};

      const statusPromises = recommendationsData.map(async (restaurant: ExternalRestaurant) => {
        const response = await fetch(`/api/bookmarks/${restaurant.id}/check`, {
          credentials: "include",
        });
        const data = await response.json();
        return { [restaurant.id]: data.isBookmarked };
      });

      const statuses = await Promise.all(statusPromises);
      return statuses.reduce((acc, status) => ({ ...acc, ...status }), {});
    },
    enabled: !!recommendationsData?.length,
  });

  return (
    <div>
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">Restaurant Recommendations</h1>
            <p className="text-lg text-gray-600 mb-8">Discover top-rated restaurants in your area</p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search for restaurants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Enter location..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="whitespace-nowrap"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </Card>
      </div>

      {/* View Toggle Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
            className="flex items-center gap-2"
            disabled={isLoading || !recommendationsData?.length}
          >
            {viewMode === 'list' ? (
              <>
                <MapPin className="w-4 h-4" />
                Switch to Map View
              </>
            ) : (
              <>
                <List className="w-4 h-4" />
                Switch to List View
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center text-gray-500">Loading recommendations...</div>
        ) : recommendationsData && recommendationsData.length > 0 ? (
          viewMode === 'map' ? (
            <div className="w-full">
              <RestaurantMap
                onRestaurantSelect={setSelectedRestaurant}
                initialLocation={searchParams.location}
                bookmarkStatuses={bookmarkStatuses}
                restaurants={currentRecommendations}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendationsData.map((restaurant) => (
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
                    {restaurant.priceLevel && (
                      <p className="text-sm text-gray-500">{restaurant.priceLevel}</p>
                    )}
                    <div className="mt-4 flex justify-between items-center gap-2">
                      <span className="text-xs text-gray-400">
                        Source: {restaurant.source.charAt(0).toUpperCase() + restaurant.source.slice(1)}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant={bookmarkStatuses?.[restaurant.id] ? "default" : "outline"}
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
                          className={bookmarkStatuses?.[restaurant.id] ? "bg-primary text-white hover:bg-primary/90" : ""}
                        >
                          {bookmarkStatuses?.[restaurant.id] ? (
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
                            setSelectedRestaurant(restaurant);
                            // Trigger the global add review modal
                            window.dispatchEvent(new CustomEvent('openAddReviewModal', {
                              detail: {
                                restaurantName: restaurant.name,
                                restaurantLocation: restaurant.location
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
          )
        ) : (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No recommendations found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search criteria or try a different location.
            </p>
          </Card>
        )}
      </div>

      {/* Pagination - only show in list view */}
      {viewMode === 'list' && pagination && pagination.totalPages > 1 && (
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
  );
}
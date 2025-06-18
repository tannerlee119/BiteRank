
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/stats-cards";
import { Filters } from "@/components/filters";
import { RestaurantCard } from "@/components/restaurant-card";
import { ReviewModal } from "@/components/review-modal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, ExternalLink, Bookmark, BookmarkCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ReviewWithRestaurant } from "@shared/schema";

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

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [selectedReview, setSelectedReview] = useState<ReviewWithRestaurant | null>(null);
  const [search, setSearch] = useState("");
  const [location_, setLocation_] = useState("");
  const [rating, setRating] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [tags, setTags] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reviewsData, isLoading } = useQuery<ReviewWithRestaurant[]>({
    queryKey: ["/api/reviews", { rating, location: location_, search, cuisine, tags }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (rating) params.append("rating", rating);
      if (location_ && location_.trim()) params.append("location", location_);
      if (search) params.append("search", search);
      if (cuisine && cuisine.trim()) params.append("cuisine", cuisine);
      if (tags) params.append("tags", tags);
      
      const response = await fetch(`/api/reviews?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch reviews");
      }
      
      return response.json();
    },
  });

  // Get recommended restaurants based on most reviewed locations
  const { data: recommendations, isLoading: isLoadingRecommendations } = useQuery<{
    data: ExternalRestaurant[];
    locations: Array<{ location: string; reviewCount: number }>;
  }>({
    queryKey: ["/api/recommendations/popular-locations"],
    queryFn: async () => {
      const response = await fetch(
        `/api/recommendations/popular-locations?page=1&limit=12`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch recommendations");
      }

      return response.json();
    },
  });

  // Apply client-side sorting and limit to 6 reviews for home page
  const allReviews = reviewsData ? [...reviewsData].sort((a, b) => {
    switch (sortBy) {
      case "rating-high":
        return (b.score || 0) - (a.score || 0);
      case "rating-low":
        return (a.score || 0) - (b.score || 0);
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "default":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  }) : reviewsData;

  // Limit to 6 reviews for the home page
  const reviews = allReviews?.slice(0, 6);
  const hasMoreReviews = allReviews && allReviews.length > 6;

  // Get top 3 recommendations for the home page
  const topRecommendations = recommendations?.data?.slice(0, 3) || [];

  // Bookmark functionality for recommendations
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

  // Get highly rated reviews (score 3 - "Loved")
  const highlyRatedReviews = allReviews?.filter(review => review.score === 3).slice(0, 3) || [];

  return (
    <div>
      {/* Dashboard Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">Your Food Journey</h1>
            <p className="text-lg text-gray-600 mb-8">Track, rate, and discover amazing restaurants</p>
            <StatsCards />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Recommended Restaurants Section */}
        {topRecommendations.length > 0 && (
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Recommended Restaurants</h2>
                {recommendations?.locations && recommendations.locations.length > 0 && (
                  <p className="text-sm text-gray-600 mt-1">
                    Based on popular locations: {recommendations.locations.map(loc => loc.location).join(", ")}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setLocation("/recommendations")}
                className="text-sm"
              >
                View All Recommendations
              </Button>
            </div></div>
        )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topRecommendations.map((restaurant) => (
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
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400">
                          Source: {restaurant.source.charAt(0).toUpperCase() + restaurant.source.slice(1)}
                        </span>
                        <span className="text-xs text-blue-600">
                          From popular locations
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => createBookmarkMutation.mutate(restaurant)}
                          disabled={createBookmarkMutation.isPending}
                        >
                          <Bookmark className="w-4 h-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
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
          </div>
        )}

        {/* Your Highly Rated Restaurants */}
        {highlyRatedReviews.length > 0 && (
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Your Favorite Restaurants</h2>
              <Button
                variant="outline"
                onClick={() => setLocation("/my-reviews")}
                className="text-sm"
              >
                View All Reviews
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {highlyRatedReviews.map((review) => (
                <RestaurantCard 
                  key={review.id} 
                  review={review} 
                  onClick={() => setSelectedReview(review)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recent Reviews Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Reviews</h2>
            {hasMoreReviews && (
              <Button
                variant="outline"
                onClick={() => setLocation("/my-reviews")}
                className="text-sm"
              >
                View All Reviews ({allReviews?.length})
              </Button>
            )}
          </div>

          <Filters
            search={search}
            location={location_}
            rating={rating}
            cuisine={cuisine}
            tags={tags}
            sortBy={sortBy}
            onSearchChange={setSearch}
            onLocationChange={setLocation_}
            onRatingChange={setRating}
            onCuisineChange={setCuisine}
            onTagsChange={setTags}
            onSortChange={setSortBy}
          />

          {/* Restaurant Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="h-64 animate-pulse">
                  <div className="h-full bg-gray-200 rounded"></div>
                </Card>
              ))}
            </div>
          ) : reviews && reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <RestaurantCard 
                  key={review.id} 
                  review={review} 
                  onClick={() => setSelectedReview(review)}
                />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No reviews found</h3>
                <p className="text-gray-600 mb-6">
                  {search || location_ || rating
                    ? "Try adjusting your filters or search terms."
                    : "Start your food journey by adding your first restaurant review!"}
                </p>
                <p className="text-sm text-gray-500">
                  Click the "Add Review" button in the navbar to get started.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <ReviewModal
        review={selectedReview}
        open={!!selectedReview}
        onOpenChange={(open) => !open && setSelectedReview(null)}
      />
    </div>
  );
}

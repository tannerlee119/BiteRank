
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { RestaurantCard } from "@/components/restaurant-card";
import { Filters } from "@/components/filters";
import { ReviewModal } from "@/components/review-modal";
import { StatsCards } from "@/components/stats-cards";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { useLocation } from "wouter";
import type { ReviewWithRestaurant } from "@shared/schema";

export default function MyReviewsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedReview, setSelectedReview] = useState<ReviewWithRestaurant | null>(null);
  const [search, setSearch] = useState("");
  const [location_, setLocation_] = useState("");
  const [rating, setRating] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [tags, setTags] = useState("");
  const [sortBy, setSortBy] = useState("default");

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

  // Apply client-side sorting
  const reviews = reviewsData ? [...reviewsData].sort((a, b) => {
    switch (sortBy) {
      case "rating-high":
        return (b.overallRating || 0) - (a.overallRating || 0);
      case "rating-low":
        return (a.overallRating || 0) - (b.overallRating || 0);
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "default":
      default:
        return 0;
    }
  }) : reviewsData;

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Reviews</h1>
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          className="flex items-center gap-2"
        >
          ← Back to Home
        </Button>
      </div>

      {/* Stats Cards */}
      <StatsCards />

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
                : "You haven't added any reviews yet. Start your food journey by adding your first restaurant review!"}
            </p>
            <p className="text-sm text-gray-500">
              Click the "Add Review" button in the navbar to get started.
            </p>
          </div>
        </Card>
      )}

      {/* Review Modal */}
      <ReviewModal
        review={selectedReview}
        open={!!selectedReview}
        onOpenChange={(open) => !open && setSelectedReview(null)}
      />
    </div>
  );
}

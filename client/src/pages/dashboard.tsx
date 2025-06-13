import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { StatsCards } from "@/components/stats-cards";
import { Filters } from "@/components/filters";
import { RestaurantCard } from "@/components/restaurant-card";
import { AddReviewModal } from "@/components/add-review-modal";
import { Card } from "@/components/ui/card";
import type { ReviewWithRestaurant } from "@shared/schema";

export default function Dashboard() {
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [rating, setRating] = useState("");

  const { data: reviews, isLoading } = useQuery<ReviewWithRestaurant[]>({
    queryKey: ["/api/reviews", { rating, location, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (rating) params.append("rating", rating);
      if (location && location !== "all") params.append("location", location);
      if (search) params.append("search", search);
      
      const response = await fetch(`/api/reviews?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch reviews");
      }
      
      return response.json();
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onAddReview={() => setIsAddReviewOpen(true)} />

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
        <Filters
          search={search}
          location={location}
          rating={rating}
          onSearchChange={setSearch}
          onLocationChange={setLocation}
          onRatingChange={setRating}
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
              <RestaurantCard key={review.id} review={review} />
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No reviews found</h3>
              <p className="text-gray-600 mb-6">
                {search || location || rating
                  ? "Try adjusting your filters or search terms."
                  : "Start your food journey by adding your first restaurant review!"}
              </p>
              <button
                onClick={() => setIsAddReviewOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Add Your First Review
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* Add Review Modal */}
      <AddReviewModal
        open={isAddReviewOpen}
        onOpenChange={setIsAddReviewOpen}
      />

      {/* Mobile Navigation Padding */}
      <div className="md:hidden h-16"></div>
    </div>
  );
}

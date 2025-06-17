import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { RestaurantCard } from "@/components/restaurant-card";
import { AddReviewModal } from "@/components/add-review-modal";
import { ReviewModal } from "@/components/review-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import type { ReviewWithRestaurant } from "@shared/schema";

export default function RecommendationsPage() {
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewWithRestaurant | null>(null);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");

  const { data: recommendations, isLoading } = useQuery<ReviewWithRestaurant[]>({
    queryKey: ["/api/recommendations", { search, location }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (location) params.append("location", location);
      
      const response = await fetch(`/api/recommendations?${params.toString()}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch recommendations");
      }
      
      return response.json();
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onAddReview={() => setIsAddReviewOpen(true)} />

      {/* Recommendations Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">Restaurant Recommendations</h1>
            <p className="text-lg text-gray-600 mb-8">Discover new restaurants based on your preferences</p>
            
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row gap-4 justify-center mb-8">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="search"
                  placeholder="Search restaurants..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative flex-1 max-w-md">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Enter location..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center text-gray-500">Loading recommendations...</div>
        ) : recommendations && recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((review) => (
              <RestaurantCard
                key={review.id}
                review={review}
                onClick={() => setSelectedReview(review)}
              />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No recommendations found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search criteria or add more reviews to get better recommendations.
            </p>
            <Button onClick={() => setIsAddReviewOpen(true)}>
              Add a Review
            </Button>
          </Card>
        )}
      </div>

      {/* Add Review Modal */}
      <AddReviewModal
        open={isAddReviewOpen}
        onOpenChange={setIsAddReviewOpen}
      />

      {/* Review Modal */}
      <ReviewModal
        review={selectedReview}
        open={!!selectedReview}
        onOpenChange={(open) => !open && setSelectedReview(null)}
      />

      {/* Mobile Navigation Padding */}
      <div className="md:hidden h-16"></div>
    </div>
  );
} 
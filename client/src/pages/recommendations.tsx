import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Card } from "@/components/ui/card";
import { RestaurantCard } from "@/components/restaurant-card";
import { AddReviewModal } from "@/components/add-review-modal";
import { ReviewModal } from "@/components/review-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Star, ExternalLink } from "lucide-react";
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
  source: 'google' | 'yelp';
  sourceUrl: string;
}

export default function RecommendationsPage() {
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewWithRestaurant | null>(null);
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");

  const { data: recommendations, isLoading } = useQuery<ExternalRestaurant[]>({
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
    enabled: !!location, // Only fetch when location is provided
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onAddReview={() => setIsAddReviewOpen(true)} />

      {/* Recommendations Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">Restaurant Recommendations</h1>
            <p className="text-lg text-gray-600 mb-8">Discover top-rated restaurants from Google and Yelp</p>
            
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
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      Source: {restaurant.source.charAt(0).toUpperCase() + restaurant.source.slice(1)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddReviewOpen(true)}
                    >
                      Add Review
                    </Button>
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
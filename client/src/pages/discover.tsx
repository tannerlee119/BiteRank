import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Users, Star, Search, Utensils } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { getRatingColor, getRatingLabel } from "@/lib/auth";

interface DiscoverRestaurant {
  id: string;
  name: string;
  city: string;
  cuisine?: string;
  address?: string;
  priceRange?: string;
  averageRating: number;
  totalReviews: number;
  favoriteDishes: string[];
  popularLabels: string[];
  ratingDistribution: {
    like: number;
    alright: number;
    dislike: number;
  };
}

export default function DiscoverPage() {
  const [search, setSearch] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [city, setCity] = useState("");

  const { data: restaurants, isLoading } = useQuery<DiscoverRestaurant[]>({
    queryKey: ["/api/discover", search, cuisine, city],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (cuisine) params.append("cuisine", cuisine);
      if (city) params.append("city", city);

      return apiRequest("GET", `/api/discover?${params.toString()}`);
    },
  });

  const handleSearch = () => {
    // The query will automatically refetch when search params change
  };

  const getAverageRatingCategory = (rating: number) => {
    if (rating >= 6.6) return 'like';
    if (rating <= 3.4) return 'dislike';
    return 'alright';
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">Discover Restaurants</h1>
            <p className="text-lg text-gray-600 mb-8">
              Explore restaurants reviewed by our community
            </p>
          </div>
        </div>
      </div>

      {/* Search Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search restaurants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Filter by cuisine..."
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Filter by city..."
                value={city}
                onChange={(e) => setCity(e.target.value)}
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center text-gray-500">Loading restaurants...</div>
        ) : restaurants && restaurants.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <Card key={restaurant.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-neutral-900 mb-1">
                        {restaurant.name}
                      </h3>
                      <p className="text-sm text-gray-600 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {restaurant.city}
                      </p>
                      {restaurant.cuisine && (
                        <p className="text-sm text-gray-500 mt-1 capitalize">
                          {restaurant.cuisine}
                        </p>
                      )}
                      {restaurant.priceRange && (
                        <p className="text-sm text-gray-500 mt-1">
                          {restaurant.priceRange}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-neutral-900">
                          {restaurant.averageRating.toFixed(1)}
                        </div>
                        <div className="text-xs text-gray-500">out of 10</div>
                      </div>
                      <Badge className={`${getRatingColor(getAverageRatingCategory(restaurant.averageRating))} text-white`}>
                        {getRatingLabel(getAverageRatingCategory(restaurant.averageRating))}
                      </Badge>
                    </div>
                  </div>

                  {/* Review stats */}
                  <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {restaurant.totalReviews} review{restaurant.totalReviews !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 mr-1" />
                      {restaurant.ratingDistribution.like} likes
                    </div>
                  </div>

                  {/* Popular labels */}
                  {restaurant.popularLabels && restaurant.popularLabels.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {restaurant.popularLabels.slice(0, 3).map((label, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Favorite dishes */}
                  {restaurant.favoriteDishes && restaurant.favoriteDishes.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <Utensils className="w-4 h-4 mr-1 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">Popular dishes:</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {restaurant.favoriteDishes.slice(0, 3).map((dish, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {dish}
                          </Badge>
                        ))}
                        {restaurant.favoriteDishes.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{restaurant.favoriteDishes.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <div className="text-xs text-gray-500">
                      Community rated
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Trigger the global add review modal with restaurant data
                        window.dispatchEvent(new CustomEvent('openAddReviewModal', {
                          detail: {
                            restaurantName: restaurant.name,
                            restaurantLocation: restaurant.city,
                            restaurantCuisine: restaurant.cuisine
                          }
                        }));
                      }}
                    >
                      Add Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No restaurants found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search criteria or be the first to review a restaurant!
            </p>
            <Button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openAddReviewModal', { detail: {} }));
              }}
            >
              Add First Review
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
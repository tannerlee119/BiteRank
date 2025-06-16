import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { RestaurantCard } from "@/components/restaurant-card";
import { Filters } from "@/components/filters";
import { useState } from "react";

export default function MyReviewsPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    rating: "",
    location: "",
    search: "",
    cuisine: "",
    tags: "",
  });

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["/api/reviews", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/reviews?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch reviews");
      return response.json();
    },
  });

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Reviews</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <Filters filters={filters} onFiltersChange={setFilters} />
        </div>

        <div className="lg:col-span-3">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : reviews?.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No reviews found. Start by adding your first review!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {reviews?.map((review) => (
                <RestaurantCard key={review.id} review={review} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
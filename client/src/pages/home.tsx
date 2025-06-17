import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddReviewModal } from "@/components/add-review-modal";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { ReviewWithRestaurant } from "@shared/schema";

export default function HomePage() {
  const [isAddReviewOpen, setIsAddReviewOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewWithRestaurant | null>(null);

  const { data: reviews, isLoading } = useQuery<ReviewWithRestaurant[]>({
    queryKey: ["/api/reviews"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/reviews");
      return response.json();
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-neutral-900 mb-4">Welcome to BiteRank</h1>
        <p className="text-lg text-gray-600 mb-8">
          Track your restaurant experiences and discover new places to eat
        </p>
        <Button onClick={() => setIsAddReviewOpen(true)}>Add a Review</Button>
      </div>

      {isLoading ? (
        <div className="text-center text-gray-500">Loading reviews...</div>
      ) : reviews && reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <Card
              key={review.id}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedReview(review)}
            >
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                {review.restaurant.name}
              </h3>
              <p className="text-sm text-gray-500 mb-4">{review.restaurant.location}</p>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-neutral-900">
                  {review.score.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
          <p className="text-gray-500 mb-4">
            Start by adding your first restaurant review!
          </p>
          <Button onClick={() => setIsAddReviewOpen(true)}>Add a Review</Button>
        </Card>
      )}

      <AddReviewModal
        open={isAddReviewOpen}
        onOpenChange={setIsAddReviewOpen}
      />
    </div>
  );
} 
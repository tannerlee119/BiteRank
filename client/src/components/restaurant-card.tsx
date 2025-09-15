import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getRatingColor, getRatingLabel } from "@/lib/auth";
import type { ReviewWithRestaurant } from "@shared/schema";

interface RestaurantCardProps {
  review: ReviewWithRestaurant;
  onClick: () => void;
}

export function RestaurantCard({ review, onClick }: RestaurantCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiRequest("DELETE", `/api/reviews/${reviewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Review deleted",
        description: "Your review has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking delete
    if (window.confirm("Are you sure you want to delete this review?")) {
      deleteMutation.mutate(review.id);
    }
  };

  return (
    <Card 
      className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-neutral-900 mb-1">
              {review.restaurant.name}
            </h3>
            <p className="text-sm text-gray-600 flex items-center">
              <MapPin className="w-4 h-4 mr-1" />
              {review.restaurant.city}
            </p>
            {review.restaurant.cuisine && (
              <p className="text-sm text-gray-500 mt-1 capitalize">
                {review.restaurant.cuisine}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-2xl font-bold text-neutral-900">
                {review.score ? review.score.toFixed(1) : (review.overallRating || 'N/A')}
              </div>
              <div className="text-xs text-gray-500">out of {review.score ? '10' : (review.overallRating > 5 ? '10' : '5')}</div>
            </div>
            <Badge className={`${getRatingColor(review.rating || (review.overallRating >= (review.overallRating > 5 ? 6.6 : 4) ? 'like' : review.overallRating <= (review.overallRating > 5 ? 3.4 : 2) ? 'dislike' : 'alright'))} text-white`}>
              {getRatingLabel(review.rating || (review.overallRating >= (review.overallRating > 5 ? 6.6 : 4) ? 'like' : review.overallRating <= (review.overallRating > 5 ? 3.4 : 2) ? 'dislike' : 'alright'))}
            </Badge>
          </div>
        </div>

        {review.labels && review.labels.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {review.labels.map((label, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 mt-4">
          <span>
            {new Date(review.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-gray-500 hover:text-red-500"
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getRatingColor, getRatingLabel } from "@/lib/auth";
import type { ReviewWithRestaurant } from "@shared/schema";

interface ReviewModalProps {
  review: ReviewWithRestaurant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewModal({ review, open, onOpenChange }: ReviewModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editedReview, setEditedReview] = useState<{
    note: string;
    favoriteDishes: string[];
    labels: string[];
  }>({
    note: "",
    favoriteDishes: [],
    labels: [],
  });

  // Initialize editedReview when review changes
  useEffect(() => {
    if (review) {
      setEditedReview({
        note: review.note || "",
        favoriteDishes: review.favoriteDishes || [],
        labels: review.labels || [],
      });
      setIsEditing(false); // Reset editing state when review changes
    }
  }, [review]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!review) return;
      await apiRequest("PUT", `/api/reviews/${review.id}`, editedReview);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({
        title: "Review updated",
        description: "Your review has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate();
  };

  const handleCancel = () => {
    if (review) {
      setEditedReview({
        note: review.note || "",
        favoriteDishes: review.favoriteDishes || [],
        labels: review.labels || [],
      });
    }
    setIsEditing(false);
  };

  if (!review) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-neutral-900">
            {review.restaurant.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Restaurant Info */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 flex items-center mb-2">
                <MapPin className="w-4 h-4 mr-1" />
                {review.restaurant.location}
              </p>
              {review.restaurant.cuisine && (
                <p className="text-sm text-gray-500 capitalize">
                  {review.restaurant.cuisine}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-neutral-900">
                  {review.score.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">out of 10</div>
              </div>
              <Badge className={`${getRatingColor(review.rating)} text-white`}>
                {getRatingLabel(review.rating)}
              </Badge>
            </div>
          </div>

          {/* Review Content */}
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Review
                </label>
                <Textarea
                  value={editedReview.note}
                  onChange={(e) => setEditedReview(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="Write your review..."
                  className="min-h-[100px]"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Favorite Dishes
                </label>
                <Input
                  value={editedReview.favoriteDishes.join(", ")}
                  onChange={(e) => setEditedReview(prev => ({
                    ...prev,
                    favoriteDishes: e.target.value.split(",").map(dish => dish.trim()).filter(Boolean)
                  }))}
                  placeholder="Enter favorite dishes (comma-separated)"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Tags
                </label>
                <Input
                  value={editedReview.labels.join(", ")}
                  onChange={(e) => setEditedReview(prev => ({
                    ...prev,
                    labels: e.target.value.split(",").map(label => label.trim()).filter(Boolean)
                  }))}
                  placeholder="Enter tags (comma-separated)"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={updateMutation.isPending}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <>
              {review.note && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Review</h4>
                  <p className="text-gray-700">{review.note}</p>
                </div>
              )}

              {review.favoriteDishes && review.favoriteDishes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Favorite Dishes</h4>
                  <div className="flex flex-wrap gap-2">
                    {review.favoriteDishes.map((dish, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {dish}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {review.labels && review.labels.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {review.labels.map((label, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Date and Edit Button */}
              <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                <span>
                  Reviewed on {new Date(review.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="text-gray-500 hover:text-primary"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Review
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 
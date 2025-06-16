import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star } from "lucide-react";
import { getRatingColor, getRatingLabel } from "@/lib/auth";
import type { ReviewWithRestaurant } from "@shared/schema";

interface ReviewModalProps {
  review: ReviewWithRestaurant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewModal({ review, open, onOpenChange }: ReviewModalProps) {
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
          {review.note && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Review</h4>
              <p className="text-gray-700">{review.note}</p>
            </div>
          )}

          {/* Favorite Dishes */}
          {review.favoriteDishes && review.favoriteDishes.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Favorite Dishes</h4>
              <div className="flex flex-wrap gap-2">
                {review.favoriteDishes.map((dish, index) => (
                  <Badge key={index} variant="secondary" className="text-sm bg-blue-100 text-blue-800 border-blue-200">
                    {dish}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Labels */}
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

          {/* Date */}
          <div className="text-sm text-gray-500">
            Reviewed on {new Date(review.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 
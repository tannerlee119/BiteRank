import { Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface FiltersProps {
  search: string;
  location: string;
  rating: string;
  onSearchChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onRatingChange: (value: string) => void;
}

export function Filters({
  search,
  location,
  rating,
  onSearchChange,
  onLocationChange,
  onRatingChange,
}: FiltersProps) {
  return (
    <Card className="p-6 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 flex-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search restaurants..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="relative w-full sm:w-48">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Any location..."
              value={location}
              onChange={(e) => onLocationChange(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <Button
            variant={rating === "like" ? "default" : "outline"}
            onClick={() => onRatingChange(rating === "like" ? "" : "like")}
            className={rating === "like" ? "bg-green-500 hover:bg-green-600" : ""}
          >
            👍 Loved
          </Button>
          <Button
            variant={rating === "alright" ? "default" : "outline"}
            onClick={() => onRatingChange(rating === "alright" ? "" : "alright")}
            className={rating === "alright" ? "bg-orange-500 hover:bg-orange-600" : ""}
          >
            ⊖ Alright
          </Button>
          <Button
            variant={rating === "dislike" ? "default" : "outline"}
            onClick={() => onRatingChange(rating === "dislike" ? "" : "dislike")}
            className={rating === "dislike" ? "bg-red-500 hover:bg-red-600" : ""}
          >
            👎 Not For Me
          </Button>
        </div>
      </div>
    </Card>
  );
}

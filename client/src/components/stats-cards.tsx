import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Heart, Minus, ThumbsDown } from "lucide-react";

export function StatsCards() {
  const { data: stats, isLoading } = useQuery<{
    likedCount: number;
    alrightCount: number;
    dislikedCount: number;
  }>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-green-100 text-sm font-medium">Loved Places</p>
            <p className="text-3xl font-bold">{stats?.likedCount || 0}</p>
          </div>
          <Heart className="text-2xl text-green-200" />
        </div>
      </div>

      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-orange-100 text-sm font-medium">It's Alright</p>
            <p className="text-3xl font-bold">{stats?.alrightCount || 0}</p>
          </div>
          <div className="w-8 h-8 text-orange-200 flex items-center justify-center border-2 border-orange-200 rounded-full">
            <Minus className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-red-100 text-sm font-medium">Not For Me</p>
            <p className="text-3xl font-bold">{stats?.dislikedCount || 0}</p>
          </div>
          <ThumbsDown className="text-2xl text-red-200" />
        </div>
      </div>
    </div>
  );
}

import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/stats-cards";
import { BarChart2, ThumbsUp, Meh, ThumbsDown } from "lucide-react";

export default function StatsPage() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  if (!user) return null;

  const totalReviews = (stats?.likedCount || 0) + (stats?.alrightCount || 0) + (stats?.dislikedCount || 0);
  const likedPercentage = totalReviews ? Math.round((stats?.likedCount / totalReviews) * 100) : 0;
  const alrightPercentage = totalReviews ? Math.round((stats?.alrightCount / totalReviews) * 100) : 0;
  const dislikedPercentage = totalReviews ? Math.round((stats?.dislikedCount / totalReviews) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center space-x-2 mb-8">
        <BarChart2 className="text-primary text-2xl" />
        <h1 className="text-3xl font-bold">Statistics</h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <StatsCards stats={stats} />

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Rating Distribution</h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <ThumbsUp className="w-5 h-5 text-green-500 mr-2" />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span>Liked</span>
                    <span>{likedPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${likedPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <Meh className="w-5 h-5 text-yellow-500 mr-2" />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span>Alright</span>
                    <span>{alrightPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${alrightPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <ThumbsDown className="w-5 h-5 text-red-500 mr-2" />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span>Disliked</span>
                    <span>{dislikedPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${dislikedPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Reviews</p>
                <p className="text-2xl font-bold">{totalReviews}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Average Rating</p>
                <p className="text-2xl font-bold">
                  {totalReviews
                    ? ((stats?.likedCount * 1 + stats?.alrightCount * 0.5) / totalReviews).toFixed(1)
                    : "0.0"}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Most Common Cuisine</p>
                <p className="text-2xl font-bold">-</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
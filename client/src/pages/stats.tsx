
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/stats-cards";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart2, ThumbsUp, Meh, ThumbsDown, Calendar, TrendingUp, Award, MapPin, Utensils, Clock, Flame, Target } from "lucide-react";
import { useLocation } from "wouter";

export default function StatsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-2">
          <BarChart2 className="text-primary text-2xl" />
          <h1 className="text-3xl font-bold">Your Food Journey Analytics</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => setLocation("/")}
          className="flex items-center gap-2"
        >
          ← Back to Home
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <StatsCards stats={stats} />

          {/* Fun Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-600 text-sm font-medium">Review Streak</p>
                  <p className="text-2xl font-bold text-purple-700">{stats?.currentStreak || 0} weeks</p>
                  <p className="text-xs text-purple-500">Current streak</p>
                </div>
                <Flame className="w-8 h-8 text-purple-500" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Longest Streak</p>
                  <p className="text-2xl font-bold text-blue-700">{stats?.longestStreak || 0} weeks</p>
                  <p className="text-xs text-blue-500">Personal best</p>
                </div>
                <Award className="w-8 h-8 text-blue-500" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-600 text-sm font-medium">Unique Dishes</p>
                  <p className="text-2xl font-bold text-orange-700">{stats?.uniqueFavoriteDishes || 0}</p>
                  <p className="text-xs text-orange-500">Favorite dishes tried</p>
                </div>
                <Utensils className="w-8 h-8 text-orange-500" />
              </div>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-teal-50 to-teal-100 border-teal-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-600 text-sm font-medium">Review Frequency</p>
                  <p className="text-2xl font-bold text-teal-700">{stats?.averageDaysBetween || 0} days</p>
                  <p className="text-xs text-teal-500">Average between reviews</p>
                </div>
                <Clock className="w-8 h-8 text-teal-500" />
              </div>
            </Card>
          </div>

          {/* Rating Distribution */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Rating Distribution
            </h2>
            <div className="space-y-4">
              <div className="flex items-center">
                <ThumbsUp className="w-5 h-5 text-green-500 mr-3" />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Loved It</span>
                    <span className="text-sm text-gray-500">{stats?.likedCount || 0} reviews ({likedPercentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${likedPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <Meh className="w-5 h-5 text-yellow-500 mr-3" />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">It's Alright</span>
                    <span className="text-sm text-gray-500">{stats?.alrightCount || 0} reviews ({alrightPercentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${alrightPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <ThumbsDown className="w-5 h-5 text-red-500 mr-3" />
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">Not For Me</span>
                    <span className="text-sm text-gray-500">{stats?.dislikedCount || 0} reviews ({dislikedPercentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-red-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${dislikedPercentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Review Activity Chart */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Review Activity (Last 12 Months)
            </h2>
            <div className="h-64 flex items-end justify-between gap-2">
              {stats?.monthlyReviews?.map((month: any, index: number) => {
                const maxReviews = Math.max(...(stats.monthlyReviews?.map((m: any) => m.count) || [1]));
                const height = maxReviews > 0 ? (month.count / maxReviews) * 200 : 0;
                
                return (
                  <div key={index} className="flex flex-col items-center flex-1">
                    <div
                      className="bg-blue-500 rounded-t-md w-full min-h-[4px] transition-all duration-700 hover:bg-blue-600"
                      style={{ height: `${height}px` }}
                      title={`${month.month}: ${month.count} reviews`}
                    />
                    <span className="text-xs text-gray-500 mt-2 rotate-45 origin-center">{month.month}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Top Cuisines */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Cuisine Explorer
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-3">Top Cuisines</h3>
                <div className="space-y-3">
                  {stats?.topCuisines?.slice(0, 5).map((cuisine: any, index: number) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{cuisine.cuisine}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${(cuisine.count / totalReviews) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 min-w-[2rem]">{cuisine.count}</span>
                      </div>
                    </div>
                  )) || []}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200">
                  <p className="text-sm text-indigo-600 font-medium">Most Common Cuisine</p>
                  <p className="text-2xl font-bold text-indigo-700">{stats?.mostCommonCuisine || 'None'}</p>
                </div>
                
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                  <p className="text-sm text-emerald-600 font-medium">Cuisine Diversity</p>
                  <p className="text-2xl font-bold text-emerald-700">{stats?.cuisineCount || 0}</p>
                  <p className="text-xs text-emerald-500">Different cuisines tried</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Summary Stats */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Your Food Journey Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-500">Total Reviews</p>
                <p className="text-3xl font-bold text-gray-700">{totalReviews}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-500">Average Score</p>
                <p className="text-3xl font-bold text-gray-700">
                  {stats?.averageScore ? stats.averageScore.toFixed(1) : "0.0"}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-500">Success Rate</p>
                <p className="text-3xl font-bold text-gray-700">{likedPercentage}%</p>
                <p className="text-xs text-gray-400">Restaurants you loved</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-sm text-gray-500">Food Explorer Level</p>
                <p className="text-3xl font-bold text-gray-700">
                  {totalReviews >= 50 ? "Expert" : totalReviews >= 20 ? "Explorer" : totalReviews >= 10 ? "Enthusiast" : "Beginner"}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

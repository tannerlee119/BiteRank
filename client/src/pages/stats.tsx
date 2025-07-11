
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/stats-cards";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarChart2, ThumbsUp, Meh, ThumbsDown, Calendar, TrendingUp, Award, MapPin, Utensils, Clock, Flame, Target, Heart } from "lucide-react";
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
            {stats?.monthlyReviews && stats.monthlyReviews.length > 0 ? (
              <div className="space-y-4">
                <div className="h-48 flex items-end justify-center gap-1 md:gap-2 lg:gap-3 px-2">
                  {stats.monthlyReviews.map((month: any, index: number) => {
                    const maxReviews = Math.max(...(stats.monthlyReviews?.map((m: any) => m.count) || [1]));
                    const minHeight = 8; // Minimum height for visibility
                    const maxHeight = 160; // Maximum height for the chart
                    const height = maxReviews > 0 ? Math.max(minHeight, (month.count / maxReviews) * maxHeight) : minHeight;
                    const hasReviews = month.count > 0;
                    
                    return (
                      <div key={index} className="flex flex-col items-center group relative">
                        <div
                          className={`rounded-t-lg transition-all duration-500 hover:opacity-80 ${
                            hasReviews 
                              ? 'bg-gradient-to-t from-blue-600 to-blue-400 shadow-sm' 
                              : 'bg-gray-200'
                          } ${
                            stats.monthlyReviews.length <= 6 ? 'w-12' : 'w-8'
                          }`}
                          style={{ height: `${height}px` }}
                        />
                        
                        {/* Tooltip */}
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                          {month.month}: {month.count} review{month.count !== 1 ? 's' : ''}
                        </div>
                        
                        <span className={`text-xs text-gray-500 mt-2 text-center leading-tight ${
                          stats.monthlyReviews.length <= 6 ? 'max-w-[3rem]' : 'max-w-[2rem]'
                        }`}>
                          {stats.monthlyReviews.length <= 6 
                            ? month.month 
                            : month.month.split(' ')[0] // Show only month abbreviation for smaller spaces
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Summary for small datasets */}
                {stats.monthlyReviews.length > 0 && (
                  <div className="flex items-center justify-between text-sm text-gray-600 pt-2 border-t">
                    <span>
                      Total: {stats.monthlyReviews.reduce((sum: number, m: any) => sum + m.count, 0)} reviews
                    </span>
                    <span>
                      Peak: {Math.max(...(stats.monthlyReviews?.map((m: any) => m.count) || [0]))} in a month
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-lg font-medium">No review activity yet</p>
                  <p className="text-sm">Start reviewing restaurants to see your activity chart!</p>
                </div>
              </div>
            )}
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

          {/* Achievement System */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Food Explorer Achievements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Review Milestone Badges */}
              <div className={`p-4 rounded-lg border-2 transition-all ${
                totalReviews >= 10 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    totalReviews >= 10 ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    <Utensils className={`w-5 h-5 ${
                      totalReviews >= 10 ? 'text-green-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">Food Enthusiast</p>
                    <p className="text-sm text-gray-500">Write 10 reviews</p>
                    <p className="text-xs text-green-600">{totalReviews >= 10 ? '✓ Unlocked' : `${totalReviews}/10`}</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border-2 transition-all ${
                (stats?.cuisineCount || 0) >= 5 ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    (stats?.cuisineCount || 0) >= 5 ? 'bg-purple-100' : 'bg-gray-100'
                  }`}>
                    <MapPin className={`w-5 h-5 ${
                      (stats?.cuisineCount || 0) >= 5 ? 'text-purple-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">Globe Trotter</p>
                    <p className="text-sm text-gray-500">Try 5 different cuisines</p>
                    <p className="text-xs text-purple-600">{(stats?.cuisineCount || 0) >= 5 ? '✓ Unlocked' : `${stats?.cuisineCount || 0}/5`}</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border-2 transition-all ${
                (stats?.currentStreak || 0) >= 4 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    (stats?.currentStreak || 0) >= 4 ? 'bg-orange-100' : 'bg-gray-100'
                  }`}>
                    <Flame className={`w-5 h-5 ${
                      (stats?.currentStreak || 0) >= 4 ? 'text-orange-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">On Fire</p>
                    <p className="text-sm text-gray-500">4 week review streak</p>
                    <p className="text-xs text-orange-600">{(stats?.currentStreak || 0) >= 4 ? '✓ Unlocked' : `${stats?.currentStreak || 0}/4 weeks`}</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border-2 transition-all ${
                likedPercentage >= 80 ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    likedPercentage >= 80 ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    <Target className={`w-5 h-5 ${
                      likedPercentage >= 80 ? 'text-yellow-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">Great Taste</p>
                    <p className="text-sm text-gray-500">80% success rate</p>
                    <p className="text-xs text-yellow-600">{likedPercentage >= 80 ? '✓ Unlocked' : `${likedPercentage}%/80%`}</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border-2 transition-all ${
                totalReviews >= 50 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    totalReviews >= 50 ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <TrendingUp className={`w-5 h-5 ${
                      totalReviews >= 50 ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">Food Expert</p>
                    <p className="text-sm text-gray-500">Write 50 reviews</p>
                    <p className="text-xs text-blue-600">{totalReviews >= 50 ? '✓ Unlocked' : `${totalReviews}/50`}</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border-2 transition-all ${
                (stats?.uniqueFavoriteDishes || 0) >= 20 ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    (stats?.uniqueFavoriteDishes || 0) >= 20 ? 'bg-indigo-100' : 'bg-gray-100'
                  }`}>
                    <Heart className={`w-5 h-5 ${
                      (stats?.uniqueFavoriteDishes || 0) >= 20 ? 'text-indigo-600' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium">Dish Collector</p>
                    <p className="text-sm text-gray-500">Try 20 favorite dishes</p>
                    <p className="text-xs text-indigo-600">{(stats?.uniqueFavoriteDishes || 0) >= 20 ? '✓ Unlocked' : `${stats?.uniqueFavoriteDishes || 0}/20`}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Food Journey Timeline */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Your Food Discovery Timeline
            </h2>
            {stats?.monthlyReviews && stats.monthlyReviews.length > 0 ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600 font-medium">Journey Started</p>
                    <p className="text-2xl font-bold text-blue-700">
                      {stats.monthlyReviews[stats.monthlyReviews.length - 1]?.month || 'N/A'}
                    </p>
                    <p className="text-xs text-blue-500">First review month</p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600 font-medium">Most Active Month</p>
                    <p className="text-2xl font-bold text-green-700">
                      {stats.monthlyReviews.find((m: any) => 
                        m.count === Math.max(...stats.monthlyReviews.map((month: any) => month.count))
                      )?.month || 'N/A'}
                    </p>
                    <p className="text-xs text-green-500">
                      {Math.max(...stats.monthlyReviews.map((month: any) => month.count))} reviews
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-600 font-medium">Total Journey</p>
                    <p className="text-2xl font-bold text-purple-700">
                      {Math.max(1, Math.ceil((Date.now() - new Date(stats.monthlyReviews[stats.monthlyReviews.length - 1]?.month + ' 1, 2024').getTime()) / (1000 * 60 * 60 * 24 * 30)))}
                    </p>
                    <p className="text-xs text-purple-500">months exploring</p>
                  </div>
                </div>

                {/* Mini timeline */}
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                  <div className="space-y-4">
                    {stats.monthlyReviews.slice(0, 6).map((month: any, index: number) => (
                      <div key={index} className="relative flex items-center">
                        <div className={`w-8 h-8 rounded-full border-4 border-white z-10 flex items-center justify-center text-xs font-bold ${
                          month.count > 0 
                            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg' 
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {month.count || 0}
                        </div>
                        <div className="ml-4 flex-1">
                          <p className="font-medium text-gray-900">{month.month}</p>
                          <p className="text-sm text-gray-500">
                            {month.count} review{month.count !== 1 ? 's' : ''}
                            {month.count > 0 && (
                              <span className="ml-2 text-xs text-blue-600 font-medium">
                                🍽️ Active month
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-lg font-medium text-gray-500">Your journey begins now!</p>
                <p className="text-sm text-gray-400">Start reviewing to see your timeline</p>
              </div>
            )}
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

import dotenv from "dotenv";
dotenv.config();

import { 
  type User, 
  type InsertUser,
  type Restaurant,
  type InsertRestaurant,
  type Review,
  type ReviewWithRestaurant,
  type Bookmark,
  type InsertBookmark
} from "@shared/schema";
import { supabase } from "./supabase";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: { username: string; displayName: string; passwordHash: string }): Promise<User>;
  updateUser(id: string, data: { displayName?: string; username?: string; passwordHash?: string }): Promise<User | undefined>;

  // Restaurants
  getRestaurantByNameAndLocation(name: string, location: string): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;
  updateRestaurant(id: string, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined>;

  // Reviews
  createReview(review: { userId: string; restaurantId: string; overallRating: number; foodRating?: number; serviceRating?: number; atmosphereRating?: number; title: string; comment: string; favoriteDishes?: string[]; photoUrls?: string[]; visitDate?: Date; wouldRecommend?: number }): Promise<Review>;
  getUserReviews(userId: string, filters?: { rating?: string; location?: string; search?: string; cuisine?: string; tags?: string; }): Promise<ReviewWithRestaurant[]>;
  getReviewsByUser(userId: string): Promise<ReviewWithRestaurant[]>;
  getReviewsByRestaurant(restaurantId: string): Promise<ReviewWithRestaurant[]>;
  getAllReviews(): Promise<ReviewWithRestaurant[]>;
  deleteReview(id: string, userId: string): Promise<boolean>;
  getUserReviewStats(userId: string): Promise<{ likedCount: number; alrightCount: number; dislikedCount: number; totalReviews: number; averageRating: number; }>;

  // Bookmarks
  createBookmark(bookmark: { userId: string; restaurantId: string }): Promise<Bookmark>;
  getBookmarksByUser(userId: string): Promise<Bookmark[]>;
  deleteBookmark(userId: string, restaurantId: string): Promise<boolean>;

  // Stats
  getUserStats(userId: string): Promise<any>;
  getGlobalStats(): Promise<any>;
  getMostReviewedLocations(limit: number): Promise<any[]>;

  // Discover
  getDiscoverRestaurants(filters?: { search?: string; cuisine?: string; city?: string; }): Promise<any[]>;
}

class SupabaseStorage implements IStorage {
  
  async getUser(id: string): Promise<User | undefined> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        passwordHash: data.password_hash,
        createdAt: new Date(data.created_at)
      } as User;
    } catch (error: any) {
      console.error("Error in getUser:", error);
      if (error.code === 'PGRST116') return undefined; // Not found
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error) throw error;
      return {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        passwordHash: data.password_hash,
        createdAt: new Date(data.created_at)
      } as User;
    } catch (error: any) {
      console.error("Error in getUserByUsername:", error);
      if (error.code === 'PGRST116') return undefined; // Not found
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async createUser(insertUser: { username: string; displayName: string; passwordHash: string }): Promise<User> {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username: insertUser.username,
          display_name: insertUser.displayName,
          password_hash: insertUser.passwordHash,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return {
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        passwordHash: data.password_hash,
        createdAt: new Date(data.created_at)
      } as User;
    } catch (error: any) {
      console.error("Error in createUser:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async updateUser(id: string, data: { displayName?: string; username?: string; passwordHash?: string }): Promise<User | undefined> {
    try {
      const updateData: any = {};
      if (data.displayName) updateData.display_name = data.displayName;
      if (data.username) updateData.username = data.username;
      if (data.passwordHash) updateData.password_hash = data.passwordHash;

      const { data: result, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return {
        id: result.id,
        username: result.username,
        displayName: result.display_name,
        passwordHash: result.password_hash,
        createdAt: new Date(result.created_at)
      } as User;
    } catch (error: any) {
      console.error("Error in updateUser:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  // Placeholder implementations for other methods
  async getRestaurantByNameAndLocation(name: string, location: string): Promise<Restaurant | undefined> {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('name', name)
        .eq('city', location)
        .single();
      
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        city: data.city,
        address: data.address,
        cuisine: data.cuisine,
        priceRange: data.price_range,
        phoneNumber: data.phone_number,
        website: data.website,
        latitude: data.latitude,
        longitude: data.longitude,
        createdAt: new Date(data.created_at)
      } as Restaurant;
    } catch (error: any) {
      console.error("Error in getRestaurantByNameAndLocation:", error);
      if (error.code === 'PGRST116') return undefined; // Not found
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .insert([{
          name: restaurant.name,
          city: restaurant.city,
          address: restaurant.address,
          cuisine: restaurant.cuisine,
          price_range: restaurant.priceRange,
          phone_number: restaurant.phoneNumber,
          website: restaurant.website,
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return {
        id: data.id,
        name: data.name,
        city: data.city,
        address: data.address,
        cuisine: data.cuisine,
        priceRange: data.price_range,
        phoneNumber: data.phone_number,
        website: data.website,
        latitude: data.latitude,
        longitude: data.longitude,
        createdAt: new Date(data.created_at)
      } as Restaurant;
    } catch (error: any) {
      console.error("Error in createRestaurant:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async updateRestaurant(id: string, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    // TODO: Implement
    return undefined;
  }

  async createReview(review: { userId: string; restaurantId: string; overallRating: number; foodRating?: number; serviceRating?: number; atmosphereRating?: number; title: string; comment: string; favoriteDishes?: string[]; photoUrls?: string[]; visitDate?: Date; wouldRecommend?: number }): Promise<Review> {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .insert([{
          user_id: review.userId,
          restaurant_id: review.restaurantId,
          overall_rating: review.overallRating,
          food_rating: review.foodRating,
          service_rating: review.serviceRating,
          atmosphere_rating: review.atmosphereRating,
          title: review.title,
          comment: review.comment,
          favorite_dishes: review.favoriteDishes,
          photo_urls: review.photoUrls,
          visit_date: review.visitDate,
          would_recommend: review.wouldRecommend,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return {
        id: data.id,
        userId: data.user_id,
        restaurantId: data.restaurant_id,
        overallRating: data.overall_rating,
        foodRating: data.food_rating,
        serviceRating: data.service_rating,
        atmosphereRating: data.atmosphere_rating,
        title: data.title,
        comment: data.comment,
        favoriteDishes: data.favorite_dishes,
        photoUrls: data.photo_urls,
        visitDate: data.visit_date ? new Date(data.visit_date) : null,
        wouldRecommend: data.would_recommend,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at)
      } as Review;
    } catch (error: any) {
      console.error("Error in createReview:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getUserReviews(userId: string, filters?: { rating?: string; location?: string; search?: string; cuisine?: string; tags?: string; }): Promise<ReviewWithRestaurant[]> {
    try {
      console.log(`SupabaseStorage: getUserReviews for user ${userId} with filters:`, filters);

      let query = supabase
        .from('reviews')
        .select(`
          *,
          restaurants (*)
        `)
        .eq('user_id', userId);

      // Apply filters
      if (filters?.rating) {
        console.log(`Filtering by rating: ${filters.rating}`);
        query = query.eq('rating', filters.rating);
      }

      // Note: For simplicity and reliability, we'll do all filtering except rating in post-processing
      // This ensures we can search across all fields including joined table data

      // Always order by created_at descending
      query = query.order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) {
        console.error("Supabase query error:", error);
        throw error;
      }

      console.log(`Found ${data?.length || 0} reviews from database`);

      // Transform data first
      let reviews = data?.map(row => {
        console.log(`Raw row data for review ${row.id}: rating=${row.rating}, overall_rating=${row.overall_rating}`);
        return {
          id: row.id,
          userId: row.user_id,
          restaurantId: row.restaurant_id,
          rating: row.rating,
          overallRating: row.overall_rating,
          foodRating: row.food_rating,
          serviceRating: row.service_rating,
          atmosphereRating: row.atmosphere_rating,
          title: row.title,
          comment: row.comment,
          favoriteDishes: row.favorite_dishes,
          photoUrls: row.photo_urls,
          labels: row.labels,
          visitDate: row.visit_date ? new Date(row.visit_date) : null,
          wouldRecommend: row.would_recommend,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
          restaurant: {
            id: row.restaurants.id,
            name: row.restaurants.name,
            city: row.restaurants.city,
            address: row.restaurants.address,
            cuisine: row.restaurants.cuisine,
            priceRange: row.restaurants.price_range,
            phoneNumber: row.restaurants.phone_number,
            website: row.restaurants.website,
            latitude: row.restaurants.latitude,
            longitude: row.restaurants.longitude,
            createdAt: new Date(row.restaurants.created_at)
          }
        };
      }) || [];

      // Apply post-processing filters for joined table fields
      if (filters?.location) {
        console.log(`Post-filtering by location: ${filters.location}`);
        reviews = reviews.filter(review =>
          review.restaurant.city?.toLowerCase().includes(filters.location!.toLowerCase())
        );
      }

      if (filters?.cuisine) {
        console.log(`Post-filtering by cuisine: ${filters.cuisine}`);
        reviews = reviews.filter(review =>
          review.restaurant.cuisine?.toLowerCase().includes(filters.cuisine!.toLowerCase())
        );
      }

      if (filters?.search) {
        console.log(`Post-filtering by search: ${filters.search}`);
        reviews = reviews.filter(review => {
          const searchTerm = filters.search!.toLowerCase();

          // Search in multiple fields
          const restaurantNameMatch = review.restaurant.name?.toLowerCase().includes(searchTerm);
          const titleMatch = review.title?.toLowerCase().includes(searchTerm);
          const commentMatch = review.comment?.toLowerCase().includes(searchTerm);
          const favoriteDishesMatch = review.favoriteDishes?.some(dish =>
            dish.toLowerCase().includes(searchTerm)
          );
          const labelsMatch = review.labels?.some(label =>
            label.toLowerCase().includes(searchTerm)
          );

          return restaurantNameMatch || titleMatch || commentMatch || favoriteDishesMatch || labelsMatch;
        });
      }

      if (filters?.tags && filters.tags.trim()) {
        console.log(`Post-filtering by tags: ${filters.tags}`);
        reviews = reviews.filter(review =>
          review.labels?.some(label =>
            label.toLowerCase().includes(filters.tags!.toLowerCase())
          )
        );
      }

      console.log(`Final filtered results: ${reviews.length} reviews`);
      return reviews;
    } catch (error: any) {
      console.error("Error in getUserReviews:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getReviewsByUser(userId: string): Promise<ReviewWithRestaurant[]> {
    return this.getUserReviews(userId);
  }

  async getReviewsByRestaurant(restaurantId: string): Promise<ReviewWithRestaurant[]> {
    // TODO: Implement
    return [];
  }

  async getAllReviews(): Promise<ReviewWithRestaurant[]> {
    // TODO: Implement
    return [];
  }

  async deleteReview(id: string, userId: string): Promise<boolean> {
    console.log(`SupabaseStorage: Attempting to delete review ${id} for user ${userId}`);

    // First, check if the review exists at all
    const existingReview = await supabase
      .from('reviews')
      .select('id, user_id')
      .eq('id', id)
      .single();

    console.log(`SupabaseStorage: Review lookup result:`, existingReview);

    if (existingReview.error) {
      console.log(`SupabaseStorage: Review ${id} not found:`, existingReview.error);
      return false;
    }

    if (existingReview.data.user_id !== userId) {
      console.log(`SupabaseStorage: Review ${id} belongs to user ${existingReview.data.user_id}, not ${userId}`);
      return false;
    }

    // Delete the review
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.log(`SupabaseStorage: Error deleting review:`, error);
      return false;
    }

    console.log(`SupabaseStorage: Successfully deleted review ${id}`);
    return true;
  }

  async createBookmark(bookmark: { userId: string; restaurantId: string }): Promise<Bookmark> {
    // TODO: Implement
    throw new Error("Not implemented");
  }

  async getBookmarksByUser(userId: string): Promise<Bookmark[]> {
    // TODO: Implement
    return [];
  }

  async deleteBookmark(userId: string, restaurantId: string): Promise<boolean> {
    // TODO: Implement
    return false;
  }

  async getUserReviewStats(userId: string): Promise<{ likedCount: number; alrightCount: number; dislikedCount: number; totalReviews: number; averageRating: number; }> {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('overall_rating')
        .eq('user_id', userId);

      if (error) throw error;

      const totalReviews = reviews?.length || 0;
      let likedCount = 0;
      let alrightCount = 0;
      let dislikedCount = 0;
      let totalRating = 0;

      reviews?.forEach(review => {
        totalRating += review.overall_rating;
        if (review.overall_rating >= 4) likedCount++;
        else if (review.overall_rating >= 3) alrightCount++;
        else dislikedCount++;
      });

      return {
        likedCount,
        alrightCount,
        dislikedCount,
        totalReviews,
        averageRating: totalReviews > 0 ? totalRating / totalReviews : 0
      };
    } catch (error: any) {
      console.error("Error in getUserReviewStats:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getUserStats(userId: string): Promise<any> {
    try {
      // Get basic user stats
      const [reviewCount, bookmarkCount] = await Promise.all([
        supabase.from('reviews').select('id', { count: 'exact' }).eq('user_id', userId),
        supabase.from('bookmarks').select('id', { count: 'exact' }).eq('user_id', userId)
      ]);

      return {
        totalReviews: reviewCount.count || 0,
        totalBookmarks: bookmarkCount.count || 0,
        averageRating: 0, // Will implement more complex queries later
        uniqueFavoriteDishes: 0,
        reviewsThisMonth: 0,
        reviewsThisYear: 0,
        topCuisines: [],
        recentActivity: []
      };
    } catch (error: any) {
      console.error("Error in getUserStats:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getGlobalStats(): Promise<any> {
    try {
      // Get basic global stats
      const [userCount, restaurantCount, reviewCount] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('restaurants').select('id', { count: 'exact' }),
        supabase.from('reviews').select('id', { count: 'exact' })
      ]);

      return {
        totalUsers: userCount.count || 0,
        totalRestaurants: restaurantCount.count || 0,
        totalReviews: reviewCount.count || 0,
        averageRating: 0, // Will implement more complex queries later
        topRestaurants: [],
        topCuisines: []
      };
    } catch (error: any) {
      console.error("Error in getGlobalStats:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getMostReviewedLocations(limit: number): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          city,
          id
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Group by city and count
      const locationCounts: { [key: string]: number } = {};
      data?.forEach(restaurant => {
        locationCounts[restaurant.city] = (locationCounts[restaurant.city] || 0) + 1;
      });

      // Convert to array and sort by count
      return Object.entries(locationCounts)
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error: any) {
      console.error("Error in getMostReviewedLocations:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getDiscoverRestaurants(filters?: { search?: string; cuisine?: string; city?: string; }): Promise<any[]> {
    try {
      // Get all restaurants with their reviews and aggregate data
      const { data: restaurants, error } = await supabase
        .from('restaurants')
        .select(`
          id,
          name,
          city,
          cuisine,
          address,
          price_range,
          reviews (
            id,
            rating,
            overall_rating,
            favorite_dishes,
            created_at
          )
        `);

      if (error) throw error;

      // Filter and aggregate the restaurant data
      const aggregatedRestaurants = restaurants
        ?.filter(restaurant => {
          // Only include restaurants that have reviews
          if (!restaurant.reviews || restaurant.reviews.length === 0) return false;

          // Apply filters
          if (filters?.search && !restaurant.name.toLowerCase().includes(filters.search.toLowerCase())) {
            return false;
          }
          if (filters?.cuisine && restaurant.cuisine?.toLowerCase() !== filters.cuisine.toLowerCase()) {
            return false;
          }
          if (filters?.city && restaurant.city?.toLowerCase() !== filters.city.toLowerCase()) {
            return false;
          }

          return true;
        })
        .map(restaurant => {
          const reviews = restaurant.reviews || [];

          // Calculate aggregated metrics
          const totalReviews = reviews.length;
          const averageRating = reviews.reduce((sum, review) => sum + review.overall_rating, 0) / totalReviews;

          // Count rating distribution
          const ratingDistribution = {
            like: reviews.filter(r => r.overall_rating >= 6.6).length,
            alright: reviews.filter(r => r.overall_rating > 3.4 && r.overall_rating < 6.6).length,
            dislike: reviews.filter(r => r.overall_rating <= 3.4).length
          };

          // Aggregate favorite dishes
          const allDishes = reviews
            .flatMap(review => review.favorite_dishes || [])
            .filter(dish => dish && dish.trim().length > 0);

          // Count dish frequency and get top dishes
          const dishCounts: { [key: string]: number } = {};
          allDishes.forEach(dish => {
            const normalizedDish = dish.trim().toLowerCase();
            dishCounts[normalizedDish] = (dishCounts[normalizedDish] || 0) + 1;
          });

          const favoriteDishes = Object.entries(dishCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5)
            .map(([dish]) => dish);

          // Extract popular labels/tags (would need to implement this based on review content)
          const popularLabels: string[] = [];

          return {
            id: restaurant.id,
            name: restaurant.name,
            city: restaurant.city,
            cuisine: restaurant.cuisine,
            address: restaurant.address,
            priceRange: restaurant.price_range,
            averageRating: Math.round(averageRating * 10) / 10,
            totalReviews,
            favoriteDishes,
            popularLabels,
            ratingDistribution
          };
        })
        .sort((a, b) => {
          // Sort by average rating (descending), then by number of reviews (descending)
          if (b.averageRating !== a.averageRating) {
            return b.averageRating - a.averageRating;
          }
          return b.totalReviews - a.totalReviews;
        }) || [];

      return aggregatedRestaurants;
    } catch (error: any) {
      console.error("Error in getDiscoverRestaurants:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }
}

export const storage = new SupabaseStorage();
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
  getReviewsByUser(userId: string): Promise<ReviewWithRestaurant[]>;
  getReviewsByRestaurant(restaurantId: string): Promise<ReviewWithRestaurant[]>;
  getAllReviews(): Promise<ReviewWithRestaurant[]>;
  deleteReview(id: string, userId: string): Promise<boolean>;

  // Bookmarks
  createBookmark(bookmark: { userId: string; restaurantId: string }): Promise<Bookmark>;
  getBookmarksByUser(userId: string): Promise<Bookmark[]>;
  deleteBookmark(userId: string, restaurantId: string): Promise<boolean>;

  // Stats
  getUserStats(userId: string): Promise<any>;
  getGlobalStats(): Promise<any>;
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

  async getReviewsByUser(userId: string): Promise<ReviewWithRestaurant[]> {
    // TODO: Implement
    return [];
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
    // TODO: Implement
    return false;
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
}

export const storage = new SupabaseStorage();
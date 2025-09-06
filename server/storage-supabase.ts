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
    // TODO: Implement
    return undefined;
  }

  async createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant> {
    // TODO: Implement
    throw new Error("Not implemented");
  }

  async updateRestaurant(id: string, data: Partial<InsertRestaurant>): Promise<Restaurant | undefined> {
    // TODO: Implement
    return undefined;
  }

  async createReview(review: any): Promise<Review> {
    // TODO: Implement
    throw new Error("Not implemented");
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
    // TODO: Implement
    return {};
  }

  async getGlobalStats(): Promise<any> {
    // TODO: Implement
    return {};
  }
}

export const storage = new SupabaseStorage();
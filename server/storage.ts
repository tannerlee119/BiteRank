import { 
  users, 
  restaurants, 
  reviews,
  type User, 
  type InsertUser,
  type Restaurant,
  type InsertRestaurant,
  type Review,
  type ReviewWithRestaurant
} from "@shared/schema";
import { eq, desc, and, ilike, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Restaurants
  getRestaurantByNameAndLocation(name: string, location: string): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;

  // Reviews
  getUserReviews(userId: string, filters?: {
    rating?: string;
    location?: string;
    search?: string;
  }): Promise<ReviewWithRestaurant[]>;
  createReview(userId: string, restaurantId: string, review: Omit<Review, 'id' | 'userId' | 'restaurantId' | 'createdAt'>): Promise<Review>;
  getUserReviewStats(userId: string): Promise<{
    likedCount: number;
    alrightCount: number;
    dislikedCount: number;
  }>;
  deleteReview(reviewId: string, userId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private restaurants: Map<string, Restaurant>;
  private reviews: Map<string, Review>;
  private currentUserId: number;
  private currentRestaurantId: number;
  private currentReviewId: number;

  constructor() {
    this.users = new Map();
    this.restaurants = new Map();
    this.reviews = new Map();
    this.currentUserId = 1;
    this.currentRestaurantId = 1;
    this.currentReviewId = 1;
  }

  private generateUuid(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.generateUuid();
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async getRestaurantByNameAndLocation(name: string, location: string): Promise<Restaurant | undefined> {
    return Array.from(this.restaurants.values()).find(
      restaurant => restaurant.name.toLowerCase() === name.toLowerCase() && 
                   restaurant.location.toLowerCase() === location.toLowerCase()
    );
  }

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const id = this.generateUuid();
    const restaurant: Restaurant = {
      ...insertRestaurant,
      id,
      createdAt: new Date(),
    };
    this.restaurants.set(id, restaurant);
    return restaurant;
  }

  async getUserReviews(userId: string, filters?: {
    rating?: string;
    location?: string;
    search?: string;
  }): Promise<ReviewWithRestaurant[]> {
    const userReviews = Array.from(this.reviews.values())
      .filter(review => review.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    let filteredReviews = userReviews;

    if (filters?.rating) {
      filteredReviews = filteredReviews.filter(review => review.rating === filters.rating);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filteredReviews = filteredReviews.filter(review => {
        const restaurant = this.restaurants.get(review.restaurantId);
        return restaurant?.name.toLowerCase().includes(searchLower) ||
               restaurant?.location.toLowerCase().includes(searchLower) ||
               review.note?.toLowerCase().includes(searchLower) ||
               review.favoriteDishes?.some(dish => dish.toLowerCase().includes(searchLower));
      });
    }

    if (filters?.location) {
      filteredReviews = filteredReviews.filter(review => {
        const restaurant = this.restaurants.get(review.restaurantId);
        return restaurant?.location.toLowerCase().includes(filters.location!.toLowerCase());
      });
    }

    return filteredReviews.map(review => ({
      ...review,
      restaurant: this.restaurants.get(review.restaurantId)!,
    }));
  }

  async createReview(userId: string, restaurantId: string, review: Omit<Review, 'id' | 'userId' | 'restaurantId' | 'createdAt'>): Promise<Review> {
    const id = this.generateUuid();
    const newReview: Review = {
      ...review,
      id,
      userId,
      restaurantId,
      createdAt: new Date(),
    };
    this.reviews.set(id, newReview);
    return newReview;
  }

  async getUserReviewStats(userId: string): Promise<{
    likedCount: number;
    alrightCount: number;
    dislikedCount: number;
  }> {
    const userReviews = Array.from(this.reviews.values()).filter(review => review.userId === userId);
    
    return {
      likedCount: userReviews.filter(review => review.rating === 'like').length,
      alrightCount: userReviews.filter(review => review.rating === 'alright').length,
      dislikedCount: userReviews.filter(review => review.rating === 'dislike').length,
    };
  }

  async deleteReview(reviewId: string, userId: string): Promise<boolean> {
    const review = this.reviews.get(reviewId);
    if (review && review.userId === userId) {
      this.reviews.delete(reviewId);
      return true;
    }
    return false;
  }
}

export const storage = new MemStorage();

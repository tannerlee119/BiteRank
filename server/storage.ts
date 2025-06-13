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
import { eq, desc, and, ilike, or, count, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { email: string; displayName: string; passwordHash: string }): Promise<User>;

  // Restaurants
  getRestaurantByNameAndLocation(name: string, location: string): Promise<Restaurant | undefined>;
  createRestaurant(restaurant: InsertRestaurant): Promise<Restaurant>;

  // Reviews
  getUserReviews(userId: string, filters?: {
    rating?: string;
    location?: string;
    search?: string;
    cuisine?: string;
    tags?: string;
  }): Promise<ReviewWithRestaurant[]>;
  createReview(userId: string, restaurantId: string, review: Omit<Review, 'id' | 'userId' | 'restaurantId' | 'createdAt'>): Promise<Review>;
  getUserReviewStats(userId: string): Promise<{
    likedCount: number;
    alrightCount: number;
    dislikedCount: number;
  }>;
  deleteReview(reviewId: string, userId: string): Promise<boolean>;
}

// Initialize database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sqlConnection = postgres(connectionString, {
  ssl: 'require',
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10
});

export const db = drizzle(sqlConnection);

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error: any) {
      console.error("Database error in getUser:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0];
    } catch (error: any) {
      console.error("Database error in getUserByEmail:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async createUser(insertUser: { email: string; displayName: string; passwordHash: string }): Promise<User> {
    try {
      const result = await db.insert(users).values({
        email: insertUser.email,
        displayName: insertUser.displayName,
        passwordHash: insertUser.passwordHash,
      }).returning();
      return result[0];
    } catch (error: any) {
      console.error("Database error in createUser:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async getRestaurantByNameAndLocation(name: string, location: string): Promise<Restaurant | undefined> {
    const result = await db.select()
      .from(restaurants)
      .where(and(
        ilike(restaurants.name, name),
        ilike(restaurants.location, location)
      ))
      .limit(1);
    return result[0];
  }

  async createRestaurant(insertRestaurant: InsertRestaurant): Promise<Restaurant> {
    const result = await db.insert(restaurants).values({
      ...insertRestaurant,
      googleRating: null,
      yelpRating: null,
    }).returning();
    return result[0];
  }

  async getUserReviews(userId: string, filters?: {
    rating?: string;
    location?: string;
    search?: string;
    cuisine?: string;
    tags?: string;
  }): Promise<ReviewWithRestaurant[]> {
    // Apply filters
    const conditions = [eq(reviews.userId, userId)];

    if (filters?.rating) {
      conditions.push(eq(reviews.rating, filters.rating as any));
    }

    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(restaurants.name, searchPattern),
          ilike(restaurants.location, searchPattern),
          ilike(reviews.note, searchPattern)
        )!
      );
    }

    if (filters?.location && filters.location.trim()) {
      const locationPattern = `%${filters.location.trim()}%`;
      conditions.push(ilike(restaurants.location, locationPattern));
    }

    if (filters?.cuisine && filters.cuisine.trim()) {
      const cuisinePattern = `%${filters.cuisine.trim()}%`;
      conditions.push(ilike(restaurants.cuisine, cuisinePattern));
    }

    if (filters?.tags && filters.tags.trim()) {
      // For now, we'll search in the note field as well for tags
      // In a future update, we can implement proper array searching
      const tagPattern = `%${filters.tags.trim()}%`;
      conditions.push(ilike(reviews.note, tagPattern));
    }

    const result = await db
      .select({
        id: reviews.id,
        userId: reviews.userId,
        restaurantId: reviews.restaurantId,
        rating: reviews.rating,
        score: reviews.score,
        note: reviews.note,
        favoriteDishes: reviews.favoriteDishes,
        photoUrls: reviews.photoUrls,
        labels: reviews.labels,
        createdAt: reviews.createdAt,
        restaurant: {
          id: restaurants.id,
          name: restaurants.name,
          location: restaurants.location,
          cuisine: restaurants.cuisine,
          googleRating: restaurants.googleRating,
          yelpRating: restaurants.yelpRating,
          createdAt: restaurants.createdAt,
        }
      })
      .from(reviews)
      .innerJoin(restaurants, eq(reviews.restaurantId, restaurants.id))
      .where(and(...conditions))
      .orderBy(desc(reviews.createdAt));
    
    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      restaurantId: row.restaurantId,
      rating: row.rating,
      score: row.score,
      note: row.note,
      favoriteDishes: row.favoriteDishes,
      photoUrls: row.photoUrls,
      labels: row.labels,
      createdAt: row.createdAt,
      restaurant: row.restaurant
    }));
  }

  async createReview(userId: string, restaurantId: string, review: Omit<Review, 'id' | 'userId' | 'restaurantId' | 'createdAt'>): Promise<Review> {
    const result = await db.insert(reviews).values({
      ...review,
      userId,
      restaurantId,
      favoriteDishes: review.favoriteDishes || null,
      photoUrls: review.photoUrls || null,
      labels: review.labels || null,
    }).returning();
    return result[0];
  }

  async getUserReviewStats(userId: string): Promise<{
    likedCount: number;
    alrightCount: number;
    dislikedCount: number;
  }> {
    const stats = await db
      .select({
        rating: reviews.rating,
        count: count()
      })
      .from(reviews)
      .where(eq(reviews.userId, userId))
      .groupBy(reviews.rating);

    const result = {
      likedCount: 0,
      alrightCount: 0,
      dislikedCount: 0,
    };

    stats.forEach(stat => {
      switch (stat.rating) {
        case 'like':
          result.likedCount = stat.count;
          break;
        case 'alright':
          result.alrightCount = stat.count;
          break;
        case 'dislike':
          result.dislikedCount = stat.count;
          break;
      }
    });

    return result;
  }

  async deleteReview(reviewId: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.userId, userId)))
      .returning();
    
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();

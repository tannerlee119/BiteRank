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
import { eq, desc, and, ilike, or, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

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

const sqlConnection = neon(connectionString);
export const db = drizzle(sqlConnection);

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: { email: string; displayName: string; passwordHash: string }): Promise<User> {
    const result = await db.insert(users).values({
      email: insertUser.email,
      displayName: insertUser.displayName,
      passwordHash: insertUser.passwordHash,
    }).returning();
    return result[0];
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

    if (filters?.location) {
      const locationPattern = `%${filters.location}%`;
      conditions.push(ilike(restaurants.location, locationPattern));
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

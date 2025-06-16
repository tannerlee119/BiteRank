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
  updateUser(id: string, data: { displayName?: string; email?: string; passwordHash?: string }): Promise<User | undefined>;

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
  updateReview(id: string, userId: string, data: {
    note?: string;
    favoriteDishes?: string[];
    labels?: string[];
    cuisine?: string;
  }): Promise<Review | undefined>;
  getUserReviewStats(userId: string): Promise<{
    likedCount: number;
    alrightCount: number;
    dislikedCount: number;
    averageScore: number;
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
  max: 5,
  idle_timeout: 300,
  connect_timeout: 60,
  max_lifetime: 1800
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

  async updateUser(id: string, data: { displayName?: string; email?: string; passwordHash?: string }): Promise<User | undefined> {
    try {
      const result = await db
        .update(users)
        .set({
          ...(data.displayName && { displayName: data.displayName }),
          ...(data.email && { email: data.email }),
          ...(data.passwordHash && { passwordHash: data.passwordHash }),
        })
        .where(eq(users.id, id))
        .returning();
      return result[0];
    } catch (error: any) {
      console.error("Database error in updateUser:", error);
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
      // Search in labels and note fields for tags
      const tagPattern = `%${filters.tags.trim()}%`;
      conditions.push(
        or(
          ilike(reviews.note, tagPattern),
          // Search for tag in the labels field (stored as comma-separated string)
          sql`array_to_string(${reviews.labels}, ',') ILIKE ${tagPattern}`
        )!
      );
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

  async updateReview(id: string, userId: string, data: {
    note?: string;
    favoriteDishes?: string[];
    labels?: string[];
    cuisine?: string;
  }): Promise<Review | undefined> {
    const result = await db
      .update(reviews)
      .set({
        ...(data.note !== undefined && { note: data.note }),
        ...(data.favoriteDishes !== undefined && { favoriteDishes: data.favoriteDishes }),
        ...(data.labels !== undefined && { labels: data.labels }),
        ...(data.cuisine !== undefined && { cuisine: data.cuisine }),
      })
      .where(and(eq(reviews.id, id), eq(reviews.userId, userId)))
      .returning();
    
    return result[0];
  }

  async getUserReviewStats(userId: string): Promise<{
    likedCount: number;
    alrightCount: number;
    dislikedCount: number;
    averageScore: number;
  }> {
    const stats = await db
      .select({
        rating: reviews.rating,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(reviews)
      .where(eq(reviews.userId, userId))
      .groupBy(reviews.rating);

    // Get average score
    const avgResult = await db
      .select({
        averageScore: sql<number>`avg(${reviews.score})`.as('averageScore'),
      })
      .from(reviews)
      .where(eq(reviews.userId, userId));

    const result = {
      likedCount: 0,
      alrightCount: 0,
      dislikedCount: 0,
      averageScore: avgResult[0]?.averageScore || 0,
    };

    stats.forEach((stat) => {
      if (stat.rating === 'like') result.likedCount = Number(stat.count);
      if (stat.rating === 'alright') result.alrightCount = Number(stat.count);
      if (stat.rating === 'dislike') result.dislikedCount = Number(stat.count);
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
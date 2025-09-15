import dotenv from "dotenv";
dotenv.config();

import { 
  users, 
  restaurants, 
  reviews,
  bookmarks,
  type User, 
  type InsertUser,
  type Restaurant,
  type InsertRestaurant,
  type Review,
  type ReviewWithRestaurant,
  type Bookmark,
  type InsertBookmark
} from "@shared/schema";
import { eq, desc, and, ilike, or, count, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: { username: string; displayName: string; passwordHash: string }): Promise<User>;
  updateUser(id: string, data: { displayName?: string; username?: string; passwordHash?: string }): Promise<User | undefined>;

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
  }): Promise<Review | undefined>;
  getUserReviewStats(userId: string): Promise<{
    likedCount: number;
    alrightCount: number;
    dislikedCount: number;
    averageScore: number;
  }>;
  deleteReview(reviewId: string, userId: string): Promise<boolean>;
  getReviewById(reviewId: string, userId: string): Promise<ReviewWithRestaurant | null>;

  // Bookmarks
  getUserBookmarks(userId: string): Promise<Bookmark[]>;
  createBookmark(userId: string, bookmark: InsertBookmark): Promise<Bookmark>;
  deleteBookmark(userId: string, externalId: string): Promise<boolean>;
  isBookmarked(userId: string, externalId: string): Promise<boolean>;

  // Scraped Data
  storeScrapedData(data: {
    restaurantId: string;
    reviews?: any[];
    menuItems?: any[];
    hours?: any;
    images?: string[];
  }): Promise<void>;

  getMostReviewedLocations(limit?: number): Promise<Array<{ location: string; reviewCount: number }>>;
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error: any) {
      console.error("Database error in getUserByUsername:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async createUser(insertUser: { username: string; displayName: string; passwordHash: string }): Promise<User> {
    try {
      const result = await db.insert(users).values({
        username: insertUser.username,
        displayName: insertUser.displayName,
        passwordHash: insertUser.passwordHash,
      }).returning();
      return result[0];
    } catch (error: any) {
      console.error("Database error in createUser:", error);
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async updateUser(id: string, data: { displayName?: string; username?: string; passwordHash?: string }): Promise<User | undefined> {
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

  async getReviewById(reviewId: string, userId: string): Promise<ReviewWithRestaurant | null> {
    const review = await db
      .select({
        ...reviews,
        restaurant: restaurants
      })
      .from(reviews)
      .innerJoin(restaurants, eq(reviews.restaurantId, restaurants.id))
      .where(and(eq(reviews.id, reviewId), eq(reviews.userId, userId)))
      .limit(1);

    if (review.length === 0) {
      return null;
    }

    return {
      ...review[0],
    };
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
        overallRating: reviews.overallRating,
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
      overallRating: row.overallRating,
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
  }): Promise<Review | undefined> {
    const result = await db
      .update(reviews)
      .set({
        ...(data.note !== undefined && { note: data.note }),
        ...(data.favoriteDishes !== undefined && { favoriteDishes: data.favoriteDishes }),
        ...(data.labels !== undefined && { labels: data.labels }),
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
    topCuisines: Array<{ cuisine: string; count: number }>;
    mostCommonCuisine: string;
    cuisineCount: number;
    monthlyReviews: Array<{ month: string; count: number }>;
    currentStreak: number;
    longestStreak: number;
    uniqueFavoriteDishes: number;
    averageDaysBetween: number;
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

    // Get cuisine stats
    const cuisineStats = await db
      .select({
        cuisine: restaurants.cuisine,
        count: sql<number>`count(*)`.as('count'),
      })
      .from(reviews)
      .innerJoin(restaurants, eq(reviews.restaurantId, restaurants.id))
      .where(and(eq(reviews.userId, userId), sql`${restaurants.cuisine} IS NOT NULL AND ${restaurants.cuisine} != ''`))
      .groupBy(restaurants.cuisine)
      .orderBy(sql`count(*) desc`);

    // Get monthly review activity for last 12 months
    const monthlyStats = await db
      .select({
        month: sql<string>`TO_CHAR(${reviews.createdAt}, 'Mon YYYY')`.as('month'),
        count: sql<number>`count(*)`.as('count'),
        year: sql<number>`EXTRACT(YEAR FROM ${reviews.createdAt})`.as('year'),
        monthNum: sql<number>`EXTRACT(MONTH FROM ${reviews.createdAt})`.as('monthNum'),
      })
      .from(reviews)
      .where(and(
        eq(reviews.userId, userId),
        sql`${reviews.createdAt} >= NOW() - INTERVAL '12 months'`
      ))
      .groupBy(sql`TO_CHAR(${reviews.createdAt}, 'Mon YYYY'), EXTRACT(YEAR FROM ${reviews.createdAt}), EXTRACT(MONTH FROM ${reviews.createdAt})`)
      .orderBy(sql`EXTRACT(YEAR FROM ${reviews.createdAt}), EXTRACT(MONTH FROM ${reviews.createdAt})`);

    // Get unique favorite dishes count - use a subquery to avoid nested aggregates
    const dishesSubquery = db
      .select({
        dish: sql<string>`unnest(${reviews.favoriteDishes})`.as('dish'),
      })
      .from(reviews)
      .where(and(
        eq(reviews.userId, userId),
        sql`${reviews.favoriteDishes} IS NOT NULL AND array_length(${reviews.favoriteDishes}, 1) > 0`
      ))
      .as('dishes_subquery');

    const favoriteDishesResult = await db
      .select({
        uniqueCount: sql<number>`count(DISTINCT ${dishesSubquery.dish})`.as('uniqueCount'),
      })
      .from(dishesSubquery);

    // Get review dates for streak calculation and average days between
    const reviewDates = await db
      .select({
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(eq(reviews.userId, userId))
      .orderBy(desc(reviews.createdAt));

    // Calculate streaks and average days between reviews
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let totalDaysBetween = 0;

    if (reviewDates.length > 1) {
      const dates = reviewDates.map(r => new Date(r.createdAt));

      // Calculate average days between reviews
      for (let i = 0; i < dates.length - 1; i++) {
        const daysDiff = Math.abs((dates[i].getTime() - dates[i + 1].getTime()) / (1000 * 60 * 60 * 24));
        totalDaysBetween += daysDiff;
      }

      // Calculate streaks (weeks with reviews)
      const weekGroups = new Map<string, boolean>();
      dates.forEach(date => {
        const weekKey = `${date.getFullYear()}-${Math.floor(date.getTime() / (7 * 24 * 60 * 60 * 1000))}`;
        weekGroups.set(weekKey, true);
      });

      const sortedWeeks = Array.from(weekGroups.keys()).sort().reverse();

      // Current streak
      if (sortedWeeks.length > 0) {
        const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
        const latestReviewWeek = parseInt(sortedWeeks[0].split('-')[1]);

        if (currentWeek - latestReviewWeek <= 1) {
          currentStreak = 1;
          for (let i = 1; i < sortedWeeks.length; i++) {
            const prevWeek = parseInt(sortedWeeks[i-1].split('-')[1]);
            const currWeek = parseInt(sortedWeeks[i].split('-')[1]);
            if (prevWeek - currWeek === 1) {
              currentStreak++;
            } else {
              break;
            }
          }
        }
      }

      // Longest streak
      tempStreak = 1;
      for (let i = 1; i < sortedWeeks.length; i++) {
        const prevWeek = parseInt(sortedWeeks[i-1].split('-')[1]);
        const currWeek = parseInt(sortedWeeks[i].split('-')[1]);
        if (prevWeek - currWeek === 1) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    const result = {
      likedCount: 0,
      alrightCount: 0,
      dislikedCount: 0,
      averageScore: avgResult[0]?.averageScore || 0,
      topCuisines: cuisineStats.map(c => ({ cuisine: c.cuisine || 'Unknown', count: Number(c.count) })),
      mostCommonCuisine: cuisineStats.length > 0 ? cuisineStats[0].cuisine || 'None' : 'None',
      cuisineCount: cuisineStats.length,
      monthlyReviews: monthlyStats.map(m => ({ month: m.month, count: Number(m.count) })),
      currentStreak,
      longestStreak,
      uniqueFavoriteDishes: Number(favoriteDishesResult[0]?.uniqueCount || 0),
      averageDaysBetween: reviewDates.length > 1 ? Math.round(totalDaysBetween / (reviewDates.length - 1)) : 0,
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

  async getUserBookmarks(userId: string): Promise<Bookmark[]> {
    const result = await db
      .select()
      .from(bookmarks)
      .where(eq(bookmarks.userId, userId))
      .orderBy(desc(bookmarks.createdAt));

    return result;
  }

  async createBookmark(userId: string, bookmark: InsertBookmark): Promise<Bookmark> {
    const result = await db.insert(bookmarks).values({
      ...bookmark,
      userId,
    }).returning();

    return result[0];
  }

  async deleteBookmark(userId: string, externalId: string): Promise<boolean> {
    const result = await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.externalId, externalId)))
      .returning();

    return result.length > 0;
  }

  async isBookmarked(userId: string, externalId: string): Promise<boolean> {
    const result = await db
      .select({ id: bookmarks.id })
      .from(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.externalId, externalId)))
      .limit(1);

    return result.length > 0;
  }

  async storeScrapedData(data: {
    restaurantId: string;
    reviews?: any[];
    menuItems?: any[];
    hours?: any;
    images?: string[];
  }): Promise<void> {
    // Here you would implement the logic to store the scraped data
    // This could involve:
    // 1. Storing reviews in the reviews table
    // 2. Creating a new table for menu items
    // 3. Updating restaurant hours
    // 4. Storing images
    // For now, we'll just log the data
    console.log('Storing scraped data:', data);
  }

  async getMostReviewedLocations(limit: number = 5): Promise<Array<{ location: string; reviewCount: number }>> {
    const result = await db
      .select({
        location: restaurants.location,
        reviewCount: sql<number>`count(${reviews.id})`.as('reviewCount'),
      })
      .from(restaurants)
      .innerJoin(reviews, eq(restaurants.id, reviews.restaurantId))
      .groupBy(restaurants.location)
      .orderBy(sql`count(${reviews.id}) desc`)
      .limit(limit);

    return result.map(r => ({
      location: r.location,
      reviewCount: Number(r.reviewCount)
    }));
  }
}

export const storage = new DatabaseStorage();
import { pgTable, text, uuid, timestamp, real, integer, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - simple username/password auth
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(), // What shows publicly in reviews
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Restaurants table - comprehensive restaurant info
export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  address: text("address"),
  cuisine: text("cuisine"),
  priceRange: text("price_range"), // e.g., "$", "$$", "$$$", "$$$$"
  phoneNumber: text("phone_number"),
  website: text("website"),
  // Location coordinates for mapping
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Reviews table - public reviews visible to all users
export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  
  // Rating system
  overallRating: integer("overall_rating").notNull(), // 1-5 stars
  foodRating: integer("food_rating"), // 1-5 stars (optional)
  serviceRating: integer("service_rating"), // 1-5 stars (optional)
  atmosphereRating: integer("atmosphere_rating"), // 1-5 stars (optional)
  
  // Review content
  title: text("title").notNull(),
  comment: text("comment").notNull(),
  favoriteDishes: text("favorite_dishes").array(), // Array of dish names
  photoUrls: text("photo_urls").array(), // Array of photo URLs
  
  // Metadata
  visitDate: timestamp("visit_date"),
  wouldRecommend: integer("would_recommend"), // 1 = yes, 0 = no, null = not specified
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User bookmarks/favorites (optional - keep if you want this feature)
export const bookmarks = pgTable("bookmarks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").max(20, "Username must be less than 20 characters"),
  displayName: z.string().min(1, "Display name is required").max(50, "Display name must be less than 50 characters"),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Restaurant name is required"),
  city: z.string().min(1, "City is required"),
  cuisine: z.string().optional(),
  priceRange: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  userId: true,
  restaurantId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  overallRating: z.number().min(1).max(5),
  foodRating: z.number().min(1).max(5).optional(),
  serviceRating: z.number().min(1).max(5).optional(),
  atmosphereRating: z.number().min(1).max(5).optional(),
  title: z.string().min(1, "Review title is required"),
  comment: z.string().min(10, "Comment must be at least 10 characters"),
  wouldRecommend: z.number().min(0).max(1).optional(),
  // For creating new restaurants on the fly
  restaurantName: z.string().optional(),
  restaurantCity: z.string().optional(),
  restaurantCuisine: z.string().optional(),
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
  userId: true,
  createdAt: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;

// Joined types for common queries
export type ReviewWithRestaurant = Review & {
  restaurant: Restaurant;
};

export type ReviewWithUser = Review & {
  user: Pick<User, 'id' | 'displayName'>;
};

export type ReviewWithRestaurantAndUser = Review & {
  restaurant: Restaurant;
  user: Pick<User, 'id' | 'displayName'>;
};
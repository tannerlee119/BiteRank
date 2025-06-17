import { pgTable, text, serial, uuid, timestamp, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const restaurants = pgTable("restaurants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  cuisine: text("cuisine"),
  googleRating: real("google_rating"),
  yelpRating: real("yelp_rating"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  restaurantId: uuid("restaurant_id").notNull().references(() => restaurants.id, { onDelete: "cascade" }),
  rating: text("rating", { enum: ["like", "alright", "dislike"] }).notNull(),
  score: real("score").notNull(),
  note: text("note"),
  favoriteDishes: text("favorite_dishes").array(),
  photoUrls: text("photo_urls").array(),
  labels: text("labels").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookmarks = pgTable("bookmarks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(), // Google Places ID
  name: text("name").notNull(),
  location: text("location").notNull(),
  rating: real("rating"),
  totalRatings: real("total_ratings"),
  priceLevel: text("price_level"),
  cuisine: text("cuisine"),
  photoUrl: text("photo_url"),
  sourceUrl: text("source_url").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  passwordHash: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertRestaurantSchema = createInsertSchema(restaurants).omit({
  id: true,
  createdAt: true,
  googleRating: true,
  yelpRating: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  userId: true,
  restaurantId: true,
  createdAt: true,
}).extend({
  restaurantName: z.string().min(1, "Restaurant name is required"),
  restaurantLocation: z.string().min(1, "Location is required"),
  restaurantCuisine: z.string().optional(),
  favoriteDishes: z.string().optional(),
  labels: z.string().optional(),
  score: z.number().min(0).max(10),
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
  userId: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Restaurant = typeof restaurants.$inferSelect;
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;

export type ReviewWithRestaurant = Review & {
  restaurant: Restaurant;
};

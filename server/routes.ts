import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertReviewSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        email: userData.email,
        displayName: userData.displayName,
        passwordHash,
      });

      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }
      res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Review routes
  app.get("/api/reviews", requireAuth, async (req, res) => {
    try {
      const { rating, location, search } = req.query;
      const reviews = await storage.getUserReviews(req.session.userId!, {
        rating: rating as string,
        location: location as string,
        search: search as string,
      });
      res.json(reviews);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/reviews", requireAuth, async (req, res) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      
      // Find or create restaurant
      let restaurant = await storage.getRestaurantByNameAndLocation(
        reviewData.restaurantName,
        reviewData.restaurantLocation
      );
      
      if (!restaurant) {
        restaurant = await storage.createRestaurant({
          name: reviewData.restaurantName,
          location: reviewData.restaurantLocation,
        });
      }

      // Calculate score based on rating
      let score: number;
      switch (reviewData.rating) {
        case 'like':
          score = 8.5; // Representative score in 6.7-10 range
          break;
        case 'alright':
          score = 5.0; // Representative score in 3.4-6.6 range
          break;
        case 'dislike':
          score = 2.0; // Representative score in 0-3.3 range
          break;
        default:
          score = 5.0;
      }

      // Parse comma-separated strings into arrays
      const favoriteDishes = reviewData.favoriteDishes 
        ? reviewData.favoriteDishes.split(',').map(dish => dish.trim()).filter(dish => dish.length > 0)
        : null;
      
      const labels = reviewData.labels
        ? reviewData.labels.split(',').map(label => label.trim()).filter(label => label.length > 0)
        : null;

      const review = await storage.createReview(req.session.userId!, restaurant.id, {
        rating: reviewData.rating,
        score,
        note: reviewData.note || null,
        favoriteDishes,
        photoUrls: null,
        labels,
      });

      res.json(review);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/reviews/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteReview(id, req.session.userId!);
      
      if (!success) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      res.json({ message: "Review deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getUserReviewStats(req.session.userId!);
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

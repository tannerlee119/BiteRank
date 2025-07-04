import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertReviewSchema, insertBookmarkSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import { z } from "zod";
import { ExternalAPIService } from "./services/external-apis";

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
      secure: false, // Set to false for development
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

  app.put("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const { displayName, email, password } = req.body;
      const userId = req.session.userId!;

      // If email is being changed, check if it's already taken
      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }

      // If password is being changed, hash it
      let passwordHash;
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      const updatedUser = await storage.updateUser(userId, {
        displayName,
        email,
        passwordHash,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        user: { 
          id: updatedUser.id, 
          email: updatedUser.email, 
          displayName: updatedUser.displayName 
        } 
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Review routes
  app.get("/api/reviews", requireAuth, async (req, res) => {
    try {
      const { rating, location, search, cuisine, tags } = req.query;
      const reviews = await storage.getUserReviews(req.session.userId!, {
        rating: rating as string,
        location: location as string,
        search: search as string,
        cuisine: cuisine as string,
        tags: tags as string,
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
          cuisine: reviewData.restaurantCuisine,
        });
      }

      // Use the precise score from the frontend (Beli-style rating)
      const score = reviewData.score;

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

      // Trigger webhook for n8n
      try {
        await fetch(`${req.protocol}://${req.get('host')}/api/webhooks/review-created`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': req.headers.cookie || ''
          },
          body: JSON.stringify({ reviewId: review.id })
        });
      } catch (webhookError) {
        console.error('Failed to trigger review webhook:', webhookError);
      }

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

  app.put("/api/reviews/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;

      // Validate the update data
      const updateSchema = z.object({
        note: z.string().optional(),
        favoriteDishes: z.array(z.string()).optional(),
        labels: z.array(z.string()).optional(),
      });

      const updateData = updateSchema.parse(req.body);

      // Get the existing review to ensure it belongs to the user
      const reviews = await storage.getUserReviews(userId);
      const existingReview = reviews.find(r => r.id === id);

      if (!existingReview) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Update the review
      const updatedReview = await storage.updateReview(id, userId, updateData);

      if (!updatedReview) {
        return res.status(404).json({ message: "Review not found" });
      }

      res.json(updatedReview);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Endpoint to receive scraped restaurant data
  app.post("/api/scraped-data", requireAuth, async (req, res) => {
    try {
      const { 
        restaurantName,
        restaurantLocation,
        restaurantCuisine,
        reviews,
        menuItems,
        hours,
        images
      } = req.body;

      // Find or create restaurant
      let restaurant = await storage.getRestaurantByNameAndLocation(
        restaurantName,
        restaurantLocation
      );

      if (!restaurant) {
        restaurant = await storage.createRestaurant({
          name: restaurantName,
          location: restaurantLocation,
          cuisine: restaurantCuisine,
        });
      }

      // Process and store the scraped data
      // You can add more fields to your schema as needed
      const processedData = {
        restaurantId: restaurant.id,
        reviews,
        menuItems,
        hours,
        images
      };

      // Store the processed data
      // You'll need to implement this in your storage layer
      await storage.storeScrapedData(processedData);

      res.json({ success: true, restaurant });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/maps/key", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Google Maps API key not configured" });
    }

    res.json({ apiKey });
  });

  app.get("/api/recommendations", requireAuth, async (req, res) => {
    try {
      const { search, location, page = "1", limit = "21" } = req.query;

      if (!location) {
        return res.status(400).json({ message: "Location is required" });
      }

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      const externalAPIService = new ExternalAPIService();
      const allRecommendations = await externalAPIService.getTopRatedRestaurants(
        location as string,
        search as string | undefined
      );

      // Limit to first 100 results max
      const limitedResults = allRecommendations.slice(0, 100);

      // Apply pagination
      const paginatedResults = limitedResults.slice(offset, offset + limitNum);

      const totalResults = limitedResults.length;
      const totalPages = Math.ceil(totalResults / limitNum);

      res.json({
        data: paginatedResults,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalResults,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/recommendations/popular-locations", requireAuth, async (req, res) => {
    try {
      const { page = "1", limit = "21" } = req.query;

      // Get most reviewed locations from user data
      const mostReviewedLocations = await storage.getMostReviewedLocations(5);
      
      if (mostReviewedLocations.length === 0) {
        // Fallback to default locations if no user data
        const defaultLocations = ["New York", "Los Angeles", "Chicago", "San Francisco", "Miami"];
        const allRecommendations = [];
        
        for (const location of defaultLocations) {
          const externalAPIService = new ExternalAPIService();
          const locationRecommendations = await externalAPIService.getTopRatedRestaurants(location);
          allRecommendations.push(...locationRecommendations.slice(0, 4)); // 4 per location
        }

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const offset = (pageNum - 1) * limitNum;
        const paginatedResults = allRecommendations.slice(offset, offset + limitNum);

        return res.json({
          data: paginatedResults,
          locations: defaultLocations.map(loc => ({ location: loc, reviewCount: 0 })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: allRecommendations.length,
            totalPages: Math.ceil(allRecommendations.length / limitNum),
            hasNext: pageNum < Math.ceil(allRecommendations.length / limitNum),
            hasPrev: pageNum > 1
          }
        });
      }

      // Get recommendations from most reviewed locations
      const allRecommendations = [];
      const externalAPIService = new ExternalAPIService();
      
      for (const locationData of mostReviewedLocations) {
        try {
          const locationRecommendations = await externalAPIService.getTopRatedRestaurants(locationData.location);
          // Add more restaurants from popular locations
          const restaurantsPerLocation = Math.max(3, Math.floor(20 / mostReviewedLocations.length));
          allRecommendations.push(...locationRecommendations.slice(0, restaurantsPerLocation));
        } catch (error) {
          console.error(`Error fetching recommendations for ${locationData.location}:`, error);
        }
      }

      // Sort by rating and shuffle within rating groups for variety
      allRecommendations.sort((a, b) => b.rating - a.rating);

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;
      const paginatedResults = allRecommendations.slice(offset, offset + limitNum);

      const totalResults = allRecommendations.length;
      const totalPages = Math.ceil(totalResults / limitNum);

      res.json({
        data: paginatedResults,
        locations: mostReviewedLocations,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalResults,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // n8n webhook endpoints
  app.post("/api/webhooks/review-analysis", requireAuth, async (req, res) => {
    try {
      const { reviewId } = req.body;
      const userId = req.session.userId!;
      
      // Get the review with restaurant data
      const review = await storage.getReviewById(reviewId, userId);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Prepare data for n8n workflow
      const webhookData = {
        reviewId: review.id,
        userId: userId,
        restaurantName: review.restaurant.name,
        restaurantLocation: review.restaurant.location,
        cuisine: review.restaurant.cuisine,
        rating: review.rating,
        score: review.score,
        note: review.note,
        favoriteDishes: review.favoriteDishes,
        labels: review.labels,
        visitDate: review.visitDate,
        createdAt: review.createdAt
      };

      res.json({ 
        message: "Review data prepared for analysis",
        data: webhookData 
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/webhooks/review-reminders", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Get bookmarked restaurants that haven't been reviewed
      const bookmarks = await storage.getUserBookmarks(userId);
      const reviews = await storage.getUserReviews(userId);
      
      // Find bookmarks without reviews (by restaurant name and location)
      const reviewedRestaurants = new Set(
        reviews.map(r => `${r.restaurant.name}-${r.restaurant.location}`)
      );
      
      const unreviewed = bookmarks.filter(bookmark => 
        !reviewedRestaurants.has(`${bookmark.name}-${bookmark.location}`)
      );

      // Get restaurants not visited in last 30 days for revisit reminders
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentReviews = reviews.filter(review => 
        new Date(review.visitDate) >= thirtyDaysAgo
      );
      
      const candidatesForRevisit = reviews.filter(review => 
        review.rating === "loved" && 
        new Date(review.visitDate) < thirtyDaysAgo &&
        !recentReviews.some(recent => 
          recent.restaurant.name === review.restaurant.name &&
          recent.restaurant.location === review.restaurant.location
        )
      );

      const reminderData = {
        userId: userId,
        unreviewedBookmarks: unreviewed.map(b => ({
          id: b.id,
          name: b.name,
          location: b.location,
          cuisine: b.cuisine,
          bookmarkedAt: b.createdAt
        })),
        revisitCandidates: candidatesForRevisit.slice(0, 5).map(r => ({
          restaurantName: r.restaurant.name,
          restaurantLocation: r.restaurant.location,
          cuisine: r.restaurant.cuisine,
          lastVisited: r.visitDate,
          rating: r.rating,
          score: r.score
        }))
      };

      res.json({
        message: "Reminder data prepared",
        data: reminderData
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Bookmark routes
  app.get("/api/bookmarks", requireAuth, async (req, res) => {
    try {
      const bookmarks = await storage.getUserBookmarks(req.session.userId!);
      res.json(bookmarks);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/bookmarks", requireAuth, async (req, res) => {
    try {
      const bookmarkData = insertBookmarkSchema.parse(req.body);
      const userId = req.session.userId!;

      // Check if bookmark already exists
      const existingBookmark = await storage.isBookmarked(userId, bookmarkData.externalId);
      if (existingBookmark) {
        return res.status(400).json({ message: "Restaurant is already bookmarked" });
      }

      const bookmark = await storage.createBookmark(userId, bookmarkData);
      
      // Trigger webhook for n8n
      try {
        await fetch(`${req.protocol}://${req.get('host')}/api/webhooks/bookmark-created`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': req.headers.cookie || ''
          },
          body: JSON.stringify({ externalId: bookmarkData.externalId })
        });
      } catch (webhookError) {
        console.error('Failed to trigger bookmark webhook:', webhookError);
      }
      
      res.json(bookmark);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/bookmarks/:externalId", requireAuth, async (req, res) => {
    try {
      const { externalId } = req.params;
      const success = await storage.deleteBookmark(req.session.userId!, externalId);

      if (!success) {
        return res.status(404).json({ message: "Bookmark not found" });
      }

      res.json({ message: "Bookmark deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/bookmarks/:externalId/check", requireAuth, async (req, res) => {
    try {
      const { externalId } = req.params;
      const isBookmarked = await storage.isBookmarked(req.session.userId!, externalId);
      res.json({ isBookmarked });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Webhook endpoints for n8n integration
  app.post("/api/webhooks/review-created", requireAuth, async (req, res) => {
    try {
      const { reviewId } = req.body;
      const userId = req.session.userId!;
      
      // Get the review details
      const reviews = await storage.getUserReviews(userId);
      const review = reviews.find(r => r.id === reviewId);
      
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Get user details
      const user = await storage.getUser(userId);
      
      // Prepare webhook payload for n8n
      const webhookPayload = {
        event: "review_created",
        timestamp: new Date().toISOString(),
        user: {
          id: user?.id,
          email: user?.email,
          displayName: user?.displayName
        },
        review: {
          id: review.id,
          rating: review.rating,
          score: review.score,
          note: review.note,
          favoriteDishes: review.favoriteDishes,
          labels: review.labels,
          createdAt: review.createdAt
        },
        restaurant: {
          name: review.restaurant.name,
          location: review.restaurant.location,
          cuisine: review.restaurant.cuisine
        }
      };

      // Send to n8n webhook (if configured)
      const n8nWebhookUrl = process.env.N8N_REVIEW_WEBHOOK_URL;
      if (n8nWebhookUrl) {
        try {
          await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload)
          });
        } catch (webhookError) {
          console.error('Failed to send webhook to n8n:', webhookError);
        }
      }

      res.json({ success: true, payload: webhookPayload });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/webhooks/bookmark-created", requireAuth, async (req, res) => {
    try {
      const { externalId } = req.body;
      const userId = req.session.userId!;
      
      // Get the bookmark details
      const bookmarks = await storage.getUserBookmarks(userId);
      const bookmark = bookmarks.find(b => b.externalId === externalId);
      
      if (!bookmark) {
        return res.status(404).json({ message: "Bookmark not found" });
      }

      // Get user details
      const user = await storage.getUser(userId);
      
      // Prepare webhook payload for n8n
      const webhookPayload = {
        event: "bookmark_created",
        timestamp: new Date().toISOString(),
        user: {
          id: user?.id,
          email: user?.email,
          displayName: user?.displayName
        },
        bookmark: {
          id: bookmark.id,
          name: bookmark.name,
          location: bookmark.location,
          rating: bookmark.rating,
          cuisine: bookmark.cuisine,
          priceLevel: bookmark.priceLevel,
          createdAt: bookmark.createdAt
        }
      };

      // Send to n8n webhook (if configured)
      const n8nWebhookUrl = process.env.N8N_BOOKMARK_WEBHOOK_URL;
      if (n8nWebhookUrl) {
        try {
          await fetch(n8nWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload)
          });
        } catch (webhookError) {
          console.error('Failed to send webhook to n8n:', webhookError);
        }
      }

      res.json({ success: true, payload: webhookPayload });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/webhooks/user-stats", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      
      // Get user details and stats
      const user = await storage.getUser(userId);
      const stats = await storage.getUserReviewStats(userId);
      const recentReviews = await storage.getUserReviews(userId);
      const bookmarks = await storage.getUserBookmarks(userId);

      // Prepare data for n8n workflow triggers
      const webhookPayload = {
        event: "user_stats_requested",
        timestamp: new Date().toISOString(),
        user: {
          id: user?.id,
          email: user?.email,
          displayName: user?.displayName
        },
        stats,
        recentReviews: recentReviews.slice(0, 5), // Last 5 reviews
        bookmarks: bookmarks.slice(0, 10), // Last 10 bookmarks
        triggers: {
          needsReviewReminder: stats.averageDaysBetween > 0 && 
            recentReviews.length > 0 && 
            (Date.now() - new Date(recentReviews[0].createdAt).getTime()) > (stats.averageDaysBetween * 24 * 60 * 60 * 1000),
          hasUnreviewedBookmarks: bookmarks.length > 0,
          lowActivityUser: stats.totalReviews < 5,
          highActivityUser: stats.totalReviews > 50
        }
      };

      res.json(webhookPayload);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
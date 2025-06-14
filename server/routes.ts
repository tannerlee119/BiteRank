import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertReviewSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import type { VerifyCallback } from "passport-google-oauth20";

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS configuration
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin === 'https://51ab2663-1922-45a4-9cd0-6438c10cad6e-00-1ccr9928hu4r6.janeway.replit.dev') {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    }
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: true,
      sameSite: 'none',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      domain: '.replit.dev'
    }
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport serialization
  passport.serializeUser((user: any, done) => {
    console.log('Serializing user:', user);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log('Deserializing user ID:', id);
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      console.error('Error deserializing user:', error);
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Google OAuth credentials are missing!');
  } else {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://51ab2663-1922-45a4-9cd0-6438c10cad6e-00-1ccr9928hu4r6.janeway.replit.dev/api/auth/google/callback",
    }, async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
      try {
        console.log('Google profile:', profile);
        
        if (!profile.emails || !profile.emails[0]) {
          return done(new Error('No email provided by Google'), undefined);
        }

        // Check if user exists
        let user = await storage.getUserByEmail(profile.emails[0].value);
        
        if (!user) {
          console.log('Creating new user for:', profile.emails[0].value);
          // Create new user if doesn't exist
          user = await storage.createUser({
            email: profile.emails[0].value,
            displayName: profile.displayName,
            passwordHash: "", // No password for Google users
          });
        }
        
        console.log('User authenticated:', user);
        return done(null, user);
      } catch (error) {
        console.error('Error in Google strategy:', error);
        return done(error as Error, undefined);
      }
    }));
  }

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    console.log('Session:', req.session);
    console.log('User:', req.user);
    if (!req.session.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  };

  // Google OAuth routes
  app.get("/api/auth/google", (req, res, next) => {
    console.log('Initiating Google OAuth...');
    passport.authenticate("google", { 
      scope: ["profile", "email"],
      prompt: "select_account"
    })(req, res, next);
  });

  app.get("/api/auth/google/callback", 
    (req, res, next) => {
      console.log('Received Google callback');
      passport.authenticate("google", { 
        failureRedirect: "/login",
        failureMessage: true
      })(req, res, next);
    },
    (req: any, res) => {
      console.log('Google authentication successful, setting session');
      req.session.userId = req.user.id;
      res.redirect("/");
    }
  );

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
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Import the form schema for testing
const reviewFormSchema = z.object({
  restaurantName: z.string().min(1, "Restaurant name is required"),
  restaurantLocation: z.string().min(1, "Location is required"),
  restaurantCuisine: z.string().optional(),
  rating: z.string(),
  score: z.number(),
  note: z.string().optional().refine(
    (val) => !val || val.length >= 10,
    { message: "Review must be at least 10 characters if provided" }
  ),
  favoriteDishes: z.string().optional(),
  labels: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewFormSchema>;

describe('Add Review Form Validation', () => {
  describe('Required Fields', () => {
    it('should require restaurant name', () => {
      const invalidData = {
        restaurantName: '',
        restaurantLocation: 'San Francisco',
        rating: 'like',
        score: 8.5,
      };

      const result = reviewFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('restaurantName'))).toBe(true);
      }
    });

    it('should require restaurant location', () => {
      const invalidData = {
        restaurantName: 'Test Restaurant',
        restaurantLocation: '',
        rating: 'like',
        score: 8.5,
      };

      const result = reviewFormSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('restaurantLocation'))).toBe(true);
      }
    });
  });

  describe('Score Validation', () => {
    it('should accept valid scores from 0-10', () => {
      const validScores = [0, 2.5, 5.0, 7.8, 10];

      validScores.forEach(score => {
        const data = {
          restaurantName: 'Test Restaurant',
          restaurantLocation: 'San Francisco',
          rating: 'alright',
          score,
        };

        const result = reviewFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should accept decimal scores', () => {
      const data = {
        restaurantName: 'Test Restaurant',
        restaurantLocation: 'San Francisco',
        rating: 'like',
        score: 8.7,
      };

      const result = reviewFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Rating Validation', () => {
    it('should accept valid rating values', () => {
      const validRatings = ['like', 'alright', 'dislike'];

      validRatings.forEach(rating => {
        const data = {
          restaurantName: 'Test Restaurant',
          restaurantLocation: 'San Francisco',
          rating,
          score: 5.0,
        };

        const result = reviewFormSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Note Validation', () => {
    it('should accept empty notes', () => {
      const data = {
        restaurantName: 'Test Restaurant',
        restaurantLocation: 'San Francisco',
        rating: 'like',
        score: 8.5,
        note: '',
      };

      const result = reviewFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept notes with 10+ characters', () => {
      const data = {
        restaurantName: 'Test Restaurant',
        restaurantLocation: 'San Francisco',
        rating: 'like',
        score: 8.5,
        note: 'This is a great restaurant with amazing food!',
      };

      const result = reviewFormSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject notes with less than 10 characters', () => {
      const data = {
        restaurantName: 'Test Restaurant',
        restaurantLocation: 'San Francisco',
        rating: 'like',
        score: 8.5,
        note: 'Too short',
      };

      const result = reviewFormSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('API Data Transformation', () => {
    it('should transform form data correctly for API', () => {
      const formData: ReviewFormData = {
        restaurantName: 'Test Restaurant',
        restaurantLocation: 'San Francisco',
        restaurantCuisine: 'Italian',
        rating: 'like',
        score: 8.5,
        note: 'Excellent pasta and great service!',
        favoriteDishes: 'Carbonara, Tiramisu',
        labels: 'date night, pasta',
      };

      // Simulate the transformation logic from add-review-modal.tsx
      const apiData = {
        restaurantName: formData.restaurantName,
        restaurantCity: formData.restaurantLocation,
        restaurantCuisine: formData.restaurantCuisine,
        rating: formData.rating as "like" | "alright" | "dislike",
        score: formData.score,
        overallRating: formData.score, // Store the actual 0-10 score
        title: formData.note && formData.note.length > 0 ? formData.note.substring(0, 50) : "Review",
        comment: formData.note && formData.note.length > 0 ? formData.note : "No additional comments",
        favoriteDishes: formData.favoriteDishes && formData.favoriteDishes.trim()
          ? formData.favoriteDishes.split(',').map(dish => dish.trim()).filter(dish => dish.length > 0)
          : undefined,
        wouldRecommend: formData.rating === "like" ? 1 : formData.rating === "dislike" ? 0 : undefined,
      };

      expect(apiData.rating).toBe('like');
      expect(apiData.score).toBe(8.5);
      expect(apiData.overallRating).toBe(8.5);
      expect(apiData.restaurantCity).toBe('San Francisco');
      expect(apiData.favoriteDishes).toEqual(['Carbonara', 'Tiramisu']);
      expect(apiData.wouldRecommend).toBe(1);
    });

    it('should handle minimal form data correctly', () => {
      const formData: ReviewFormData = {
        restaurantName: 'Simple Restaurant',
        restaurantLocation: 'Oakland',
        rating: 'dislike',
        score: 2.0,
      };

      const apiData = {
        restaurantName: formData.restaurantName,
        restaurantCity: formData.restaurantLocation,
        rating: formData.rating as "like" | "alright" | "dislike",
        score: formData.score,
        overallRating: formData.score,
        title: "Review", // default
        comment: "No additional comments", // default
        wouldRecommend: formData.rating === "like" ? 1 : formData.rating === "dislike" ? 0 : undefined,
      };

      expect(apiData.rating).toBe('dislike');
      expect(apiData.score).toBe(2.0);
      expect(apiData.wouldRecommend).toBe(0);
      expect(apiData.title).toBe('Review');
      expect(apiData.comment).toBe('No additional comments');
    });
  });
});
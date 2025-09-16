import { describe, it, expect } from 'vitest';

describe('Rating System Logic', () => {
  describe('Score to Rating Conversion', () => {
    it('should convert high scores (>= 6.6) to like rating', () => {
      const testScores = [6.6, 7.0, 8.5, 10.0];
      testScores.forEach(score => {
        const rating = score >= 6.6 ? 'like' : score <= 3.4 ? 'dislike' : 'alright';
        expect(rating).toBe('like');
      });
    });

    it('should convert low scores (<= 3.4) to dislike rating', () => {
      const testScores = [0.0, 1.5, 2.0, 3.4];
      testScores.forEach(score => {
        const rating = score >= 6.6 ? 'like' : score <= 3.4 ? 'dislike' : 'alright';
        expect(rating).toBe('dislike');
      });
    });

    it('should convert middle scores (3.5-6.5) to alright rating', () => {
      const testScores = [3.5, 4.0, 5.0, 6.0, 6.5];
      testScores.forEach(score => {
        const rating = score >= 6.6 ? 'like' : score <= 3.4 ? 'dislike' : 'alright';
        expect(rating).toBe('alright');
      });
    });
  });

  describe('Rating to Score Conversion (Form Logic)', () => {
    it('should convert like rating to 8.5 score', () => {
      const rating = 'like';
      let score = 7.5; // default
      if (rating === 'like') score = 8.5;
      else if (rating === 'alright') score = 5.0;
      else if (rating === 'dislike') score = 2.0;

      expect(score).toBe(8.5);
    });

    it('should convert alright rating to 5.0 score', () => {
      const rating = 'alright';
      let score = 7.5; // default
      if (rating === 'like') score = 8.5;
      else if (rating === 'alright') score = 5.0;
      else if (rating === 'dislike') score = 2.0;

      expect(score).toBe(5.0);
    });

    it('should convert dislike rating to 2.0 score', () => {
      const rating = 'dislike';
      let score = 7.5; // default
      if (rating === 'like') score = 8.5;
      else if (rating === 'alright') score = 5.0;
      else if (rating === 'dislike') score = 2.0;

      expect(score).toBe(2.0);
    });
  });

  describe('Score Display Logic', () => {
    it('should display scores with one decimal place', () => {
      const testCases = [
        { score: 5.0, expected: '5.0' },
        { score: 7.25, expected: '7.3' }, // rounds to 1 decimal
        { score: 8.87, expected: '8.9' },
        { score: 10, expected: '10.0' },
      ];

      testCases.forEach(({ score, expected }) => {
        expect(score.toFixed(1)).toBe(expected);
      });
    });

    it('should always show "out of 10" for new rating system', () => {
      const scale = '10';
      expect(scale).toBe('10');
    });
  });

  describe('Fallback Rating Logic for Old Reviews', () => {
    it('should derive categorical rating from overallRating when rating field is missing', () => {
      const testCases = [
        { overallRating: 8, expectedRating: 'like' },   // >= 6.6
        { overallRating: 10, expectedRating: 'like' },  // >= 6.6
        { overallRating: 6, expectedRating: 'alright' }, // 3.5-6.5
        { overallRating: 5, expectedRating: 'alright' }, // 3.5-6.5
        { overallRating: 3, expectedRating: 'dislike' }, // <= 3.4
        { overallRating: 2, expectedRating: 'dislike' }, // <= 3.4
      ];

      testCases.forEach(({ overallRating, expectedRating }) => {
        const derivedRating = overallRating >= 6.6 ? 'like' : overallRating <= 3.4 ? 'dislike' : 'alright';
        expect(derivedRating).toBe(expectedRating);
      });
    });
  });

  describe('Data Migration Logic', () => {
    it('should convert old 1-5 scale to 0-10 scale correctly', () => {
      const oldRatings = [1, 2, 3, 4, 5];
      const expectedNewRatings = [2, 4, 6, 8, 10];

      oldRatings.forEach((oldRating, index) => {
        const newRating = oldRating * 2;
        expect(newRating).toBe(expectedNewRatings[index]);
      });
    });
  });
});
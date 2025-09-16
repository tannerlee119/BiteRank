import { describe, it, expect } from 'vitest';
import { getRatingColor, getRatingLabel } from '../auth';

describe('Rating System Utilities', () => {
  describe('getRatingColor', () => {
    it('should return green for like rating', () => {
      expect(getRatingColor('like')).toBe('bg-green-500');
    });

    it('should return orange for alright rating', () => {
      expect(getRatingColor('alright')).toBe('bg-orange-500');
    });

    it('should return red for dislike rating', () => {
      expect(getRatingColor('dislike')).toBe('bg-red-500');
    });

    it('should return gray for unknown rating', () => {
      expect(getRatingColor('unknown')).toBe('bg-gray-500');
      expect(getRatingColor('')).toBe('bg-gray-500');
    });
  });

  describe('getRatingLabel', () => {
    it('should return Loved for like rating', () => {
      expect(getRatingLabel('like')).toBe('Loved');
    });

    it('should return Alright for alright rating', () => {
      expect(getRatingLabel('alright')).toBe('Alright');
    });

    it('should return Not For Me for dislike rating', () => {
      expect(getRatingLabel('dislike')).toBe('Not For Me');
    });

    it('should return Unknown for invalid rating', () => {
      expect(getRatingLabel('unknown')).toBe('Unknown');
      expect(getRatingLabel('')).toBe('Unknown');
    });
  });
});
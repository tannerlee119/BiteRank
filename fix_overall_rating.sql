-- Fix overallRating column type from integer to real to support decimal values (0-10 scale)
ALTER TABLE reviews ALTER COLUMN overall_rating TYPE real USING overall_rating::real;
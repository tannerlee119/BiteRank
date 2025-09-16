-- Remove the redundant score column from reviews table
-- The score field was always 5.0 and not providing any value
-- We're keeping overallRating which contains the actual user ratings

ALTER TABLE reviews DROP COLUMN score;
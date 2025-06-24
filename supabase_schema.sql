
-- Supabase Restaurant Database Schema
-- Run this in your Supabase SQL editor to create the restaurants table

CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    restaurant_id TEXT UNIQUE,
    name TEXT NOT NULL,
    link TEXT,
    cuisine TEXT,
    rating DECIMAL(3,2),
    review_count INTEGER,
    price_band TEXT,
    neighborhood TEXT,
    address TEXT,
    phone TEXT,
    image_url TEXT,
    description TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    has_bar BOOLEAN DEFAULT FALSE,
    has_outdoor BOOLEAN DEFAULT FALSE,
    has_takeout BOOLEAN DEFAULT FALSE,
    is_promoted BOOLEAN DEFAULT FALSE,
    top_review TEXT,
    scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source TEXT DEFAULT 'OpenTable',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_restaurants_name ON restaurants(name);
CREATE INDEX idx_restaurants_cuisine ON restaurants(cuisine);
CREATE INDEX idx_restaurants_rating ON restaurants(rating DESC);
CREATE INDEX idx_restaurants_neighborhood ON restaurants(neighborhood);
CREATE INDEX idx_restaurants_scraped_at ON restaurants(scraped_at DESC);

-- Add row level security (RLS) policies if needed
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON restaurants
    FOR ALL USING (auth.role() = 'authenticated');

-- Create a policy that allows read access for anonymous users
CREATE POLICY "Allow read access for anonymous users" ON restaurants
    FOR SELECT USING (true);

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON restaurants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

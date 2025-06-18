import axios from 'axios';

interface Restaurant {
  id: string;
  name: string;
  location: string;
  rating: number;
  totalRatings: number;
  priceLevel?: string;
  cuisine?: string;
  photoUrl?: string;
  source: 'google';
  sourceUrl: string;
}

interface GooglePlace {
  place_id: string;
  [key: string]: any;
}

export class ExternalAPIService {
  private googleApiKey: string;
  private cache: Map<string, { data: Restaurant[]; timestamp: number }> = new Map();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.googleApiKey = process.env.GOOGLE_PLACES_API_KEY || '';
  }

  async getTopRatedRestaurants(location: string, search?: string): Promise<Restaurant[]> {
    // Create cache key
    const cacheKey = `${location}:${search || ''}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    let results: Restaurant[];

    // If no API key is configured, return mock data for testing
    if (!this.googleApiKey) {
      results = this.getMockRestaurants(location, search);
    } else {
      try {
        const googleResults = await this.getGooglePlacesResults(location, search);
        // Sort by rating
        results = googleResults.sort((a, b) => b.rating - a.rating);
      } catch (error) {
        console.error('Error fetching Google Places results:', error);
        // Return mock data as fallback
        results = this.getMockRestaurants(location, search);
      }
    }

    // Cache the results
    this.cache.set(cacheKey, { data: results, timestamp: Date.now() });
    
    // Clean up old cache entries
    this.cleanupCache();
    
    return results;
  }

  private async getGooglePlacesResults(location: string, search?: string): Promise<Restaurant[]> {
    try {
      const restaurants: Restaurant[] = [];
      let nextPageToken: string | undefined;
      let pageCount = 0;
      const maxPages = 3; // Reduced to 3 pages for faster response
      const targetResults = 100;

      do {
        // Get place IDs for restaurants in the area
        const searchParams: any = {
          query: search ? `${search} restaurant in ${location}` : `restaurants in ${location}`,
          key: this.googleApiKey,
          type: 'restaurant',
        };

        if (nextPageToken) {
          searchParams.pagetoken = nextPageToken;
        }

        const searchResponse = await axios.get(
          `https://maps.googleapis.com/maps/api/place/textsearch/json`,
          { params: searchParams }
        );

        if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
          break;
        }

        // Process places concurrently in batches
        const batchSize = 10;
        const places = searchResponse.data.results;
        
        for (let i = 0; i < places.length; i += batchSize) {
          const batch = places.slice(i, i + batchSize);
          const batchPromises = batch.map(async (place: GooglePlace) => {
            try {
              // Get detailed information for each place
              const detailsResponse = await axios.get(
                `https://maps.googleapis.com/maps/api/place/details/json`,
                {
                  params: {
                    place_id: place.place_id,
                    fields: 'name,formatted_address,rating,user_ratings_total,price_level,types,photos,url',
                    key: this.googleApiKey
                  }
                }
              );

              const details = detailsResponse.data.result;
              
              if (details && details.rating) {
                let photoUrl;
                if (details.photos && details.photos.length > 0) {
                  photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${details.photos[0].photo_reference}&key=${this.googleApiKey}`;
                }

                const priceLevel = details.price_level 
                  ? '$'.repeat(details.price_level)
                  : undefined;

                // Extract cuisine from types
                const cuisine = this.extractCuisineFromTypes(details.types);

                return {
                  id: place.place_id,
                  name: details.name,
                  location: details.formatted_address,
                  rating: details.rating,
                  totalRatings: details.user_ratings_total || 0,
                  priceLevel,
                  cuisine,
                  photoUrl,
                  source: 'google',
                  sourceUrl: details.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
                  lat: place.geometry?.location?.lat || details.geometry?.location?.lat,
                  lng: place.geometry?.location?.lng || details.geometry?.location?.lng
                };
              }
              return null;
            } catch (error) {
              console.error(`Error fetching details for place ${place.place_id}:`, error);
              return null;
            }
          });

          const batchResults = await Promise.all(batchPromises);
          const validResults = batchResults.filter((result): result is Restaurant => result !== null);
          restaurants.push(...validResults);

          // Early termination if we have enough results
          if (restaurants.length >= targetResults) {
            return restaurants.slice(0, targetResults);
          }
        }

        // Set up for next page
        nextPageToken = searchResponse.data.next_page_token;
        pageCount++;

        // Google requires a short delay before using the next_page_token
        if (nextPageToken && pageCount < maxPages && restaurants.length < targetResults) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }

      } while (nextPageToken && pageCount < maxPages && restaurants.length < targetResults);

      return restaurants;
    } catch (error) {
      console.error('Error in getGooglePlacesResults:', error);
      throw error;
    }
  }

  private extractCuisineFromTypes(types: string[] | undefined): string | undefined {
    if (!types) return undefined;

    // Common cuisine types to look for
    const cuisineTypes = [
      'italian', 'chinese', 'japanese', 'mexican', 'indian', 'thai', 'vietnamese',
      'korean', 'american', 'french', 'greek', 'mediterranean', 'spanish', 'german',
      'brazilian', 'caribbean', 'middle_eastern', 'african', 'sushi', 'steakhouse',
      'seafood', 'vegetarian', 'vegan', 'cafe', 'bakery', 'dessert', 'ice_cream',
      'pizza', 'burger', 'sandwich', 'bbq', 'buffet'
    ];

    // First try to find a specific cuisine type
    const specificCuisine = types.find(type => 
      cuisineTypes.some(cuisine => type.toLowerCase().includes(cuisine))
    );

    if (specificCuisine) {
      return specificCuisine
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l: string) => l.toUpperCase())
        .replace(/Restaurant|Food|Meal|Takeaway|Delivery/g, '')
        .trim();
    }

    // If no specific cuisine found, look for general restaurant types
    const generalType = types.find(type => 
      ['restaurant', 'food', 'meal_takeaway', 'meal_delivery'].includes(type)
    );

    if (generalType) {
      return 'Restaurant';
    }

    return undefined;
  }

  private cleanupCache() {
    const now = Date.now();
    Array.from(this.cache.entries()).forEach(([key, value]) => {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    });
  }

  private getMockRestaurants(location: string, search?: string): Restaurant[] {
    const mockRestaurants = [
      {
        id: 'mock-1',
        name: 'The Golden Spoon',
        location: `123 Main St, ${location}`,
        rating: 4.5,
        totalRatings: 342,
        priceLevel: '$$',
        cuisine: 'American',
        photoUrl: undefined,
        source: 'google' as const,
        sourceUrl: 'https://www.google.com/maps'
      },
      {
        id: 'mock-2',
        name: 'Pasta Paradise',
        location: `456 Oak Ave, ${location}`,
        rating: 4.3,
        totalRatings: 218,
        priceLevel: '$$$',
        cuisine: 'Italian',
        photoUrl: undefined,
        source: 'google' as const,
        sourceUrl: 'https://www.google.com/maps'
      },
      {
        id: 'mock-3',
        name: 'Sushi Zen',
        location: `789 Pine St, ${location}`,
        rating: 4.7,
        totalRatings: 156,
        priceLevel: '$$$$',
        cuisine: 'Japanese',
        photoUrl: undefined,
        source: 'google' as const,
        sourceUrl: 'https://www.google.com/maps'
      },
      {
        id: 'mock-4',
        name: 'Burger Barn',
        location: `321 Elm St, ${location}`,
        rating: 4.2,
        totalRatings: 189,
        priceLevel: '$',
        cuisine: 'American',
        photoUrl: undefined,
        source: 'google' as const,
        sourceUrl: 'https://www.google.com/maps'
      },
      {
        id: 'mock-5',
        name: 'Taco Fiesta',
        location: `654 Maple Dr, ${location}`,
        rating: 4.4,
        totalRatings: 267,
        priceLevel: '$',
        cuisine: 'Mexican',
        photoUrl: undefined,
        source: 'google' as const,
        sourceUrl: 'https://www.google.com/maps'
      },
      {
        id: 'mock-6',
        name: 'China Garden',
        location: `987 Cedar Ln, ${location}`,
        rating: 4.1,
        totalRatings: 134,
        priceLevel: '$$',
        cuisine: 'Chinese',
        photoUrl: undefined,
        source: 'google' as const,
        sourceUrl: 'https://www.google.com/maps'
      },
      {
        id: 'mock-7',
        name: 'Pizza Palace',
        location: `147 Birch Rd, ${location}`,
        rating: 4.6,
        totalRatings: 298,
        priceLevel: '$$',
        cuisine: 'Italian',
        photoUrl: undefined,
        source: 'google' as const,
        sourceUrl: 'https://www.google.com/maps'
      },
      {
        id: 'mock-8',
        name: 'Thai Orchid',
        location: `258 Spruce Ave, ${location}`,
        rating: 4.3,
        totalRatings: 176,
        priceLevel: '$$',
        cuisine: 'Thai',
        photoUrl: undefined,
        source: 'google' as const,
        sourceUrl: 'https://www.google.com/maps'
      },
      {
        id: 'mock-9',
        name: 'Steakhouse Supreme',
        location: `369 Willow St, ${location}`,
        rating: 4.8,
        totalRatings: 412,
        priceLevel: '$$$$',
        cuisine: 'Steakhouse',
        photoUrl: undefined,
        source: 'google' as const,
        sourceUrl: 'https://www.google.com/maps'
      },
      {
        id: 'mock-10',
        name: 'Cafe Delight',
        location: `741 Cherry Blvd, ${location}`,
        rating: 4.0,
        totalRatings: 89,
        priceLevel: '$',
        cuisine: 'Cafe',
        photoUrl: undefined,
        source: 'google' as const,
        sourceUrl: 'https://www.google.com/maps'
      }
    ];

    // Generate more mock restaurants to test pagination
    const additionalMockRestaurants = [];
    for (let i = 11; i <= 50; i++) {
      const cuisines = ['Italian', 'Mexican', 'Chinese', 'Japanese', 'American', 'Thai', 'Indian', 'French', 'Greek', 'Mediterranean'];
      const adjectives = ['Golden', 'Royal', 'Fresh', 'Modern', 'Classic', 'Authentic', 'Gourmet', 'Artisan', 'Urban', 'Cozy'];
      const types = ['Bistro', 'Kitchen', 'Grill', 'House', 'Corner', 'Garden', 'Place', 'Spot', 'Table', 'Room'];
      
      const cuisine = cuisines[Math.floor(Math.random() * cuisines.length)];
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const type = types[Math.floor(Math.random() * types.length)];
      
      additionalMockRestaurants.push({
        id: `mock-${i}`,
        name: `${adjective} ${cuisine} ${type}`,
        location: `${i * 10} Restaurant Row, ${location}`,
        rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
        totalRatings: Math.floor(Math.random() * 500) + 50,
        priceLevel: ['$', '$$', '$$$', '$$$$'][Math.floor(Math.random() * 4)],
        cuisine,
        photoUrl: undefined,
        source: 'google' as const,
        sourceUrl: 'https://www.google.com/maps'
      });
    }

    const allMockRestaurants = [...mockRestaurants, ...additionalMockRestaurants];

    if (search) {
      return allMockRestaurants.filter(restaurant => 
        restaurant.name.toLowerCase().includes(search.toLowerCase()) ||
        restaurant.cuisine?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return allMockRestaurants;
  }
}

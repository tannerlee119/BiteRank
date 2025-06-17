
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

export class ExternalAPIService {
  private googleApiKey: string;

  constructor() {
    this.googleApiKey = process.env.GOOGLE_PLACES_API_KEY || '';
  }

  async getTopRatedRestaurants(location: string, search?: string): Promise<Restaurant[]> {
    // If no API key is configured, return mock data for testing
    if (!this.googleApiKey) {
      return this.getMockRestaurants(location, search);
    }

    try {
      const googleResults = await this.getGooglePlacesResults(location, search);
      // Sort by rating
      return googleResults.sort((a, b) => b.rating - a.rating);
    } catch (error) {
      console.error('Error fetching Google Places results:', error);
      // Return mock data as fallback
      return this.getMockRestaurants(location, search);
    }
  }

  private async getGooglePlacesResults(location: string, search?: string): Promise<Restaurant[]> {
    try {
      // First, get place IDs for restaurants in the area
      const searchResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/place/textsearch/json`,
        {
          params: {
            query: search ? `${search} restaurant in ${location}` : `restaurants in ${location}`,
            key: this.googleApiKey,
            type: 'restaurant',
          }
        }
      );

      if (!searchResponse.data.results || searchResponse.data.results.length === 0) {
        return [];
      }

      const restaurants: Restaurant[] = [];

      for (const place of searchResponse.data.results.slice(0, 20)) {
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

            const cuisine = details.types
              ? details.types.find((type: string) => 
                  ['restaurant', 'food', 'meal_takeaway'].includes(type) === false
                )?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
              : undefined;

            restaurants.push({
              id: place.place_id,
              name: details.name,
              location: details.formatted_address,
              rating: details.rating,
              totalRatings: details.user_ratings_total || 0,
              priceLevel,
              cuisine,
              photoUrl,
              source: 'google',
              sourceUrl: details.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
            });
          }
        } catch (error) {
          console.error(`Error fetching details for place ${place.place_id}:`, error);
          continue;
        }
      }

      return restaurants;
    } catch (error) {
      console.error('Error in getGooglePlacesResults:', error);
      throw error;
    }
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
      }
    ];

    if (search) {
      return mockRestaurants.filter(restaurant => 
        restaurant.name.toLowerCase().includes(search.toLowerCase()) ||
        restaurant.cuisine?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return mockRestaurants;
  }
}

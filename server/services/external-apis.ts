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
  source: 'google' | 'yelp';
  sourceUrl: string;
}

export class ExternalAPIService {
  private googleApiKey: string;
  private yelpApiKey: string;

  constructor() {
    this.googleApiKey = process.env.GOOGLE_PLACES_API_KEY || '';
    this.yelpApiKey = process.env.YELP_API_KEY || '';
  }

  async getTopRatedRestaurants(location: string, search?: string): Promise<Restaurant[]> {
    const [googleResults, yelpResults] = await Promise.all([
      this.getGooglePlacesResults(location, search),
      this.getYelpResults(location, search)
    ]);

    // Combine and deduplicate results
    const allResults = [...googleResults, ...yelpResults];
    const uniqueResults = this.deduplicateResults(allResults);

    // Sort by rating
    return uniqueResults.sort((a, b) => b.rating - a.rating);
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
            rankby: 'rating'
          }
        }
      );

      const placeIds = searchResponse.data.results.map((place: any) => place.place_id);

      // Then, get detailed information for each place
      const detailedResults = await Promise.all(
        placeIds.map(async (placeId: string) => {
          const detailsResponse = await axios.get(
            `https://maps.googleapis.com/maps/api/place/details/json`,
            {
              params: {
                place_id: placeId,
                key: this.googleApiKey,
                fields: 'name,formatted_address,rating,user_ratings_total,price_level,types,photos'
              }
            }
          );

          const place = detailsResponse.data.result;
          return {
            id: `google_${placeId}`,
            name: place.name,
            location: place.formatted_address,
            rating: place.rating,
            totalRatings: place.user_ratings_total,
            priceLevel: '💰'.repeat(place.price_level || 0),
            cuisine: place.types?.find((type: string) => type.includes('restaurant'))?.replace('_', ' '),
            photoUrl: place.photos?.[0]?.photo_reference 
              ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${place.photos[0].photo_reference}&key=${this.googleApiKey}`
              : undefined,
            source: 'google' as const,
            sourceUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`
          };
        })
      );

      return detailedResults;
    } catch (error) {
      console.error('Error fetching Google Places data:', error);
      return [];
    }
  }

  private async getYelpResults(location: string, search?: string): Promise<Restaurant[]> {
    try {
      const response = await axios.get(
        'https://api.yelp.com/v3/businesses/search',
        {
          headers: {
            'Authorization': `Bearer ${this.yelpApiKey}`
          },
          params: {
            term: search || 'restaurants',
            location,
            sort_by: 'rating',
            limit: 20
          }
        }
      );

      return response.data.businesses.map((business: any) => ({
        id: `yelp_${business.id}`,
        name: business.name,
        location: business.location.display_address.join(', '),
        rating: business.rating,
        totalRatings: business.review_count,
        priceLevel: business.price,
        cuisine: business.categories.map((cat: any) => cat.title).join(', '),
        photoUrl: business.image_url,
        source: 'yelp' as const,
        sourceUrl: business.url
      }));
    } catch (error) {
      console.error('Error fetching Yelp data:', error);
      return [];
    }
  }

  private deduplicateResults(results: Restaurant[]): Restaurant[] {
    const seen = new Set<string>();
    return results.filter(result => {
      const key = `${result.name.toLowerCase()}_${result.location.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
} 
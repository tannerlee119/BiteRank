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
    const googleResults = await this.getGooglePlacesResults(location, search);

    // Sort by rating
    return googleResults.sort((a, b) => b.rating - a.rating);
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


} 
import { Difficulty, VoteType } from '../enums';
import { PaginationQuery } from './api-response.dto';

export interface SpotResponse {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  region: string | null;
  difficulty: Difficulty;
  rating: number;
  ratingCount: number;
  amenities: SpotAmenities | null;
  isFavorited?: boolean;
}

export interface SpotAmenities {
  hasSurfShop?: boolean;
  hasShower?: boolean;
  hasParking?: boolean;
  hasRestroom?: boolean;
  hasRental?: boolean;
}

export interface SpotListQuery extends PaginationQuery {
  region?: string;
  difficulty?: Difficulty;
  search?: string;
}

export interface NearbySpotQuery {
  lat: number;
  lng: number;
  radius?: number;
}

export interface SpotVoteRequest {
  voteType: VoteType;
}

export interface SpotVoteDistribution {
  spotId: string;
  date: string;
  perfect: number;
  flat: number;
  mediocre: number;
  totalVotes: number;
  userVote?: VoteType | null;
}

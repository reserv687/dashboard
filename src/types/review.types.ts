export interface ReviewImage {
  url: string;
  alt: string;
}

export interface Review {
  _id?: string;
  productId: string;
  customerId: string;
  customerName: string;
  rating: number;
  comment: string;
  images: ReviewImage[];
  isVerifiedPurchase: boolean;
  likes: number;
  likedBy?: string[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReviewFormData {
  rating: number;
  comment: string;
  images?: File[];
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingCounts: {
    [key: number]: number;
  };
  verifiedPurchases: number;
  withImages: number;
  withComments: number;
}

export interface ReviewFilters {
  rating?: number;
  verifiedOnly?: boolean;
  withImages?: boolean;
  sortBy: 'newest' | 'oldest' | 'highest-rating' | 'lowest-rating' | 'most-liked';
}

export interface ReviewsResponse {
  reviews: Review[];
  stats: ReviewStats;
  pagination: {
    page: number;
    pages: number;
    total: number;
  };
}

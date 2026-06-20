export type WebsiteImageTargetType = 'category' | 'product' | 'both' | 'price';

export interface WebsiteImage {
  id: string;
  title: string;
  image: string;
  targetType: WebsiteImageTargetType;
  categoryIds: string[];
  productIds: string[];
  maxPrice: number | null;
  isActive: boolean;
  createdAt: string | null;
}

export interface WebsiteImagePayload {
  title: string;
  imageBase64?: string;
  targetType: WebsiteImageTargetType;
  categoryIds?: string[];
  productIds?: string[];
  maxPrice?: number;
  isActive: boolean;
}

export interface WebsiteImageCategoryOption {
  id: string;
  name: string;
}

export interface WebsiteImageProductOption {
  id: string;
  name: string;
  code: string;
  image: string;
  categoryId: string;
  categoryName: string;
  retailPrice: number;
}

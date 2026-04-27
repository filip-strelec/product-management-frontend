export interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  thumbnail: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type CreateProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProductInput = Partial<CreateProductInput>;

export interface ProductSearchResult {
  items: Product[];
  total: number;
  limit: number;
  skip: number;
}

export interface ProductSearchParams {
  q?: string;
  limit?: number;
  skip?: number;
  sortBy?: 'id' | 'title' | 'price' | 'category';
  order?: 'asc' | 'desc';
}

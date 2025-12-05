export interface Profile {
  id: string;
  bakery_name: string;
  email: string;
  currency: string;
  timezone: string;
  avatar_url: string | null;
  admin_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  description: string;
  unit: string;
  price: number;
  cost: number;
  is_active: boolean;
  product_type: 'product' | 'ingredient';
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  min_threshold: number;
  last_updated: string;
}

export interface Sale {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  sale_time: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Forecast {
  id: string;
  user_id: string;
  product_id: string;
  forecast_date: string;
  predicted_quantity: number;
  confidence_score: number;
  actual_quantity: number | null;
  model_version: string;
  created_at: string;
}

export interface SyncMetadata {
  id: string;
  user_id: string;
  table_name: string;
  record_id: string;
  last_synced: string;
  sync_status: 'pending' | 'synced' | 'failed';
}

export interface ProductWithCategory extends Product {
  category?: Category;
}

export interface SaleWithProduct extends Sale {
  product?: Product;
}

export interface InventoryWithProduct extends Inventory {
  product?: Product;
}

export interface ForecastWithProduct extends Forecast {
  product?: Product;
}

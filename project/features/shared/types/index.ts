/**
 * Shared Types for Flourcast
 * Central type definitions used across all features
 */

// Profile & User Types
export interface Profile {
  id: string;
  bakery_name: string;
  email: string;
  currency: string;
  timezone: string;
  avatar_url: string | null;
  admin_mode: boolean;
  role: 'admin' | 'staff';
  current_role: 'admin' | 'staff';
  admin_password_hash: string | null;
  recovery_email: string | null;
  admin_setup_completed: boolean;
  created_at: string;
  updated_at: string;
}

// Category Types
export interface Category {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

// Product Types
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

export interface ProductWithCategory extends Product {
  category?: Category;
}

// Inventory Types
export interface Inventory {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  min_threshold: number;
  last_updated: string;
}

export interface InventoryWithProduct extends Inventory {
  product?: Product;
}

// Sales Types
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
  created_by_role: 'admin' | 'staff';
  created_at: string;
  updated_at: string;
}

export interface SaleWithProduct extends Sale {
  product?: Product;
}

// Forecast Types
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

export interface ForecastWithProduct extends Forecast {
  product?: Product;
}

// Recipe/Ingredient Types
export interface ProductIngredient {
  id: string;
  product_id: string;
  ingredient_id: string;
  quantity: number;
  batch_size: number;
  created_at: string;
}

export interface ProductIngredientWithDetails extends ProductIngredient {
  ingredient?: Product;
}

// Sync Types
export interface SyncMetadata {
  id: string;
  user_id: string;
  table_name: string;
  record_id: string;
  last_synced: string;
  sync_status: 'pending' | 'synced' | 'failed';
}

// Permission Types
export type UserRole = 'admin' | 'staff';

export interface PermissionCheck {
  canEditPrices: boolean;
  canEditCosts: boolean;
  canDeleteProducts: boolean;
  canDeleteCategories: boolean;
  canDeleteSales: boolean;
  canEditOldSales: boolean;
  canGenerateForecasts: boolean;
  canAccessSettings: boolean;
  canViewForecasts: boolean;
  canRecordSales: boolean;
  canUpdateInventory: boolean;
  canViewAnalytics: boolean;
}

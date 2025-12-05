import * as SQLite from 'expo-sqlite';

const DB_NAME = 'flourcast.db';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) {
    return db;
  }

  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);

    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // Create tables
    await createTables(db);

    // Run migrations
    await runMigrations(db);

    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
};

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    return initDatabase();
  }
  return db;
};

const createTables = async (database: SQLite.SQLiteDatabase) => {
  const queries = `
    -- Profiles table (local cache of user profile)
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      bakery_name TEXT NOT NULL,
      email TEXT NOT NULL,
      currency TEXT DEFAULT 'PHP',
      timezone TEXT DEFAULT 'Asia/Manila',
      avatar_url TEXT,
      admin_mode INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT
    );

    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      unit TEXT NOT NULL DEFAULT 'pcs',
      price REAL NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      product_type TEXT NOT NULL DEFAULT 'product',
      image_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    -- Inventory table
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      min_threshold REAL NOT NULL DEFAULT 10,
      last_updated TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(user_id, product_id)
    );

    -- Sales table
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      sale_date TEXT NOT NULL,
      sale_time TEXT NOT NULL,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- Forecasts table
    CREATE TABLE IF NOT EXISTS forecasts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      forecast_date TEXT NOT NULL,
      predicted_quantity REAL NOT NULL,
      confidence_score REAL NOT NULL DEFAULT 0,
      actual_quantity REAL,
      model_version TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    -- Product ingredients table (recipes)
    CREATE TABLE IF NOT EXISTS product_ingredients (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      ingredient_id TEXT NOT NULL,
      quantity REAL NOT NULL,
      batch_size REAL NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (ingredient_id) REFERENCES products(id) ON DELETE CASCADE,
      UNIQUE(product_id, ingredient_id)
    );

    -- Sync metadata table
    CREATE TABLE IF NOT EXISTS sync_metadata (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      last_synced TEXT NOT NULL DEFAULT (datetime('now')),
      sync_status TEXT NOT NULL DEFAULT 'pending' CHECK(sync_status IN ('pending', 'synced', 'failed')),
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    -- Create indexes for better query performance
    CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
    CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
    CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
    CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
    CREATE INDEX IF NOT EXISTS idx_sales_product_id ON sales(product_id);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
    CREATE INDEX IF NOT EXISTS idx_forecasts_user_id ON forecasts(user_id);
    CREATE INDEX IF NOT EXISTS idx_forecasts_product_id ON forecasts(product_id);
    CREATE INDEX IF NOT EXISTS idx_forecasts_date ON forecasts(forecast_date);
    CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON product_ingredients(product_id);
    CREATE INDEX IF NOT EXISTS idx_product_ingredients_ingredient ON product_ingredients(ingredient_id);
  `;

  await database.execAsync(queries);
};

const runMigrations = async (database: SQLite.SQLiteDatabase) => {
  try {
    // Check if avatar_url column exists in profiles table
    const profileColumns = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(profiles)"
    );
    
    const hasAvatarUrl = profileColumns.some(col => col.name === 'avatar_url');
    
    if (!hasAvatarUrl) {
      console.log('Running migration: Adding avatar_url to profiles');
      await database.execAsync('ALTER TABLE profiles ADD COLUMN avatar_url TEXT;');
    }

    // Check if product_type column exists in products table
    const productColumns = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(products)"
    );
    
    const hasProductType = productColumns.some(col => col.name === 'product_type');
    
    if (!hasProductType) {
      console.log('Running migration: Adding product_type to products');
      await database.execAsync("ALTER TABLE products ADD COLUMN product_type TEXT NOT NULL DEFAULT 'product';");
    }

    // Check if admin_mode column exists in profiles table
    const hasAdminMode = profileColumns.some(col => col.name === 'admin_mode');
    
    if (!hasAdminMode) {
      console.log('Running migration: Adding admin_mode to profiles');
      await database.execAsync('ALTER TABLE profiles ADD COLUMN admin_mode INTEGER NOT NULL DEFAULT 0;');
    }
  } catch (error) {
    console.error('Migration error:', error);
    // Don't throw - migrations might fail if already applied
  }
};

export const resetDatabase = async () => {
  const database = await getDatabase();

  const tables = [
    'sync_metadata',
    'forecasts',
    'sales',
    'inventory',
    'products',
    'categories',
    'profiles'
  ];

  for (const table of tables) {
    await database.execAsync(`DROP TABLE IF EXISTS ${table};`);
  }

  await createTables(database);
  console.log('Database reset successfully');
};

// Helper function to generate UUID
export const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

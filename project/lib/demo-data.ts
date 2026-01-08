/**
 * Demo Data Service
 * Seeds the app with realistic bakery data for demo/presentation purposes
 * Bakery Name: Panmasa
 * Admin Password: test123
 */

import { getDatabase, generateId } from '@/lib/database';
import { hashPassword } from '@/lib/permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DEMO_MODE = true; // Set to false to use real Firebase auth
export const DEMO_USER_ID = 'demo-panmasa-001';
export const DEMO_EMAIL = 'demo@panmasa.ph';
export const DEMO_BAKERY_NAME = 'Panmasa';

// Product categories
const DEMO_CATEGORIES = {
  breads: { name: 'Breads', color: '#F59E0B' },
  pastries: { name: 'Pastries', color: '#EC4899' },
  cakes: { name: 'Cakes', color: '#8B5CF6' },
  cookies: { name: 'Cookies', color: '#10B981' },
};

// 12 Products with realistic small street bakery pricing (in PHP)
// Target: ~92k monthly revenue (~3,067/day)
// STOCK STATUS VARIETY: Mix of Low (red), Medium (yellow), Good (green), and Overstock
// Low: stock <= minThreshold | Medium: stock <= 2.5x minThreshold | Good: stock > 2.5x minThreshold
const DEMO_PRODUCTS = [
  // TOP SELLERS - varied stock statuses for visual diversity
  { name: 'Pandesal', unit: 'pcs', price: 3, cost: 1.2, category: 'breads', avgDaily: 120, variance: 25, stock: 150, minThreshold: 30, sporadic: false, image: 'pandesal.jpg' },
  { name: 'Spanish Bread', unit: 'pcs', price: 8, cost: 3, category: 'breads', avgDaily: 55, variance: 15, stock: 18, minThreshold: 20, sporadic: false, image: 'spanish-bread.jpg' },
  { name: 'Cheese Roll', unit: 'pcs', price: 15, cost: 6, category: 'pastries', avgDaily: 35, variance: 10, stock: 28, minThreshold: 15, sporadic: false, image: 'cheese-roll.jpg' },
  
  // MID PERFORMERS - mixed statuses
  { name: 'Ensaymada', unit: 'pcs', price: 25, cost: 10, category: 'breads', avgDaily: 18, variance: 6, stock: 11, minThreshold: 12, sporadic: false, image: 'ensaymada.jpg' },
  { name: 'Chicken Empanada', unit: 'pcs', price: 20, cost: 8, category: 'pastries', avgDaily: 15, variance: 5, stock: 42, minThreshold: 10, sporadic: false, image: 'chicken-empanada.jpg' },
  { name: 'Chocolate Cake Slice', unit: 'slice', price: 55, cost: 20, category: 'cakes', avgDaily: 8, variance: 3, stock: 15, minThreshold: 8, sporadic: false, image: 'chocolate-cake-slice.jpg' },
  { name: 'Red Velvet Crinkles', unit: 'pcs', price: 12, cost: 5, category: 'cookies', avgDaily: 20, variance: 8, stock: 120, minThreshold: 12, sporadic: false, image: 'red-velvet-crinkles.jpg' },
  
  // LOW PERFORMERS - mostly low/medium stock
  { name: 'Ham & Cheese Croissant', unit: 'pcs', price: 45, cost: 18, category: 'pastries', avgDaily: 4, variance: 3, stock: 3, minThreshold: 8, sporadic: true, image: 'ham-cheese-croissant.jpg' },
  { name: 'Ube Cheesecake Slice', unit: 'slice', price: 75, cost: 28, category: 'cakes', avgDaily: 3, variance: 2, stock: 2, minThreshold: 8, sporadic: true, image: 'ube-cheesecake-slice.jpg' },
  { name: 'Mango Graham Cake', unit: 'box', price: 280, cost: 110, category: 'cakes', avgDaily: 1, variance: 1, stock: 6, minThreshold: 2, sporadic: true, image: 'mango-graham-cake.jpg' },
  { name: 'Chocolate Chip Cookies', unit: 'pcs', price: 10, cost: 4, category: 'cookies', avgDaily: 12, variance: 6, stock: 25, minThreshold: 15, sporadic: true, image: 'chocolate-chip-cookies.jpg' },
  { name: 'Ube Crinkles', unit: 'pcs', price: 12, cost: 5, category: 'cookies', avgDaily: 8, variance: 5, stock: 8, minThreshold: 10, sporadic: true, image: 'ube-crinkles.jpg' },
];

// 10 Ingredients
const DEMO_INGREDIENTS = [
  { name: 'All-Purpose Flour', unit: 'kg', cost: 55, image: 'all-purpose-flour.jpg' },
  { name: 'Bread Flour', unit: 'kg', cost: 65, image: 'bread-flour.jpg' },
  { name: 'Sugar', unit: 'kg', cost: 70, image: 'sugar.jpg' },
  { name: 'Butter', unit: 'kg', cost: 450, image: 'butter.jpg' },
  { name: 'Eggs', unit: 'tray', cost: 220, image: 'eggs.jpg' },
  { name: 'Milk', unit: 'liter', cost: 85, image: 'milk.jpg' },
  { name: 'Cream Cheese', unit: 'kg', cost: 550, image: 'cream-cheese.jpg' },
  { name: 'Ube Halaya', unit: 'kg', cost: 280, image: 'ube-halaya.jpg' },
  { name: 'Chocolate Chips', unit: 'kg', cost: 380, image: 'chocolate-chips.jpg' },
  { name: 'Yeast', unit: 'pack', cost: 15, image: 'yeast.jpg' },
];

// Calendar events
const getDemoCalendarEvents = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();
  
  const formatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  
  return [
    { id: 'e1', date: formatDate(new Date(year, month, day - 30)), text: 'Bulk flour delivery - 50kg', hasReminder: false },
    { id: 'e2', date: formatDate(new Date(year, month, day - 25)), text: 'Equipment maintenance - oven check', hasReminder: false },
    { id: 'e3', date: formatDate(new Date(year, month, day - 20)), text: 'Catering order: 200 pandesal for office event', hasReminder: false },
    { id: 'e4', date: formatDate(new Date(year, month, day - 15)), text: 'New recipe testing - Matcha Crinkles', hasReminder: false },
    { id: 'e5', date: formatDate(new Date(year, month, day - 10)), text: 'Staff training - new hire orientation', hasReminder: false },
    { id: 'e6', date: formatDate(new Date(year, month, day - 7)), text: 'Monthly inventory audit completed', hasReminder: false },
    { id: 'e7', date: formatDate(new Date(year, month, day - 5)), text: 'Birthday cake order - Mrs. Santos', hasReminder: false },
    { id: 'e8', date: formatDate(new Date(year, month, day - 3)), text: 'Supplier meeting - negotiate flour prices', hasReminder: false },
    { id: 'e9', date: formatDate(new Date(year, month, day - 2)), text: 'Weekend prep - extra ensaymada batch', hasReminder: false },
    { id: 'e10', date: formatDate(new Date(year, month, day - 1)), text: 'Restock packaging materials', hasReminder: false },
    { id: 'e11', date: formatDate(today), text: 'Defense Day!!', hasReminder: true, reminderTime: '04:00 PM' },
    { id: 'e12', date: formatDate(new Date(year, month, day + 1)), text: 'Wedding cake consultation - Garcia couple', hasReminder: true, reminderTime: '10:00 AM' },
    { id: 'e13', date: formatDate(new Date(year, month, day + 3)), text: 'Restock butter and cream cheese', hasReminder: true, reminderTime: '08:00 AM' },
    { id: 'e14', date: formatDate(new Date(year, month, day + 5)), text: 'Fiesta order: 500 pcs assorted bread', hasReminder: true, reminderTime: '06:00 AM' },
    { id: 'e15', date: formatDate(new Date(year, month, day + 7)), text: 'Health inspection scheduled', hasReminder: true, reminderTime: '09:00 AM' },
    { id: 'e16', date: formatDate(new Date(year, month, day + 10)), text: 'New menu launch - seasonal items', hasReminder: false },
    { id: 'e17', date: formatDate(new Date(year, month, day + 14)), text: "Valentine's Day prep - heart-shaped cookies", hasReminder: true, reminderTime: '05:00 AM' },
    { id: 'e18', date: formatDate(new Date(year, month, day + 20)), text: 'Quarterly supplier review', hasReminder: false },
    { id: 'e19', date: formatDate(new Date(year, month, day + 30)), text: 'Monthly profit & loss review', hasReminder: true, reminderTime: '02:00 PM' },
  ];
};

// Seeded random number generator for consistent demo data
class SeededRandom {
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}

// Generate realistic sales with patterns - supports sporadic sales for low performers
// Uses seeded random for consistent, reproducible data
function generateDemoSalesData(avgDaily: number, variance: number, daysBack: number, isSporadic: boolean = false, productSeed: number = 1): Array<{ date: string; time: string; quantity: number }> {
  const sales: Array<{ date: string; time: string; quantity: number }> = [];
  const rng = new SeededRandom(productSeed * 12345);
  
  // Use fixed reference date for consistent data: January 9, 2026
  const today = new Date(2026, 0, 9); // Month is 0-indexed
  
  for (let i = daysBack; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    const dayOfMonth = date.getDate();
    
    // Consume one random for sporadic check
    const sporadicRoll = rng.next();
    if (isSporadic && sporadicRoll < 0.4) continue;
    
    // FIXED multipliers for current week (Jan 4-10, 2026) to create visible zigzag pattern
    // This ensures ALL products get the same day pattern for aggregate effect
    let dayMultiplier = 1;
    
    if (month === 0 && dayOfMonth === 4) dayMultiplier = 1.45; // Sun Jan 4 - HIGH
    else if (month === 0 && dayOfMonth === 5) dayMultiplier = 0.75; // Mon Jan 5 - DROP
    else if (month === 0 && dayOfMonth === 6) dayMultiplier = 1.1; // Tue Jan 6 - BOUNCE UP
    else if (month === 0 && dayOfMonth === 7) dayMultiplier = 0.6; // Wed Jan 7 - BIG DIP
    else if (month === 0 && dayOfMonth === 8) dayMultiplier = 1.25; // Thu Jan 8 - SPIKE UP
    else if (month === 0 && dayOfMonth === 9) dayMultiplier = 0.85; // Fri Jan 9 (today) - DOWN
    else if (month === 0 && dayOfMonth === 10) dayMultiplier = 1.5; // Sat Jan 10 - HIGH (future)
    else {
      // For all other dates, use day-of-week patterns with some randomness
      const randBoost = rng.next() * 0.2;
      if (dayOfWeek === 6) dayMultiplier = 1.35 + randBoost; // Saturday
      else if (dayOfWeek === 0) dayMultiplier = 1.2 + randBoost; // Sunday
      else if (dayOfWeek === 5) dayMultiplier = 1.0 + randBoost; // Friday
      else if (dayOfWeek === 2) dayMultiplier = 0.55 + randBoost; // Tuesday
      else if (dayOfWeek === 3) dayMultiplier = 0.65 + randBoost; // Wednesday
      else if (dayOfWeek === 1) dayMultiplier = 0.7 + randBoost; // Monday
      else if (dayOfWeek === 4) dayMultiplier = 0.85 + randBoost; // Thursday
    }
    
    // Seasonal patterns (mild for small bakery)
    if (month === 11) dayMultiplier *= 1.25; // December holiday boost
    if (month === 10) dayMultiplier *= 1.1; // November
    if (month === 3 || month === 4) dayMultiplier *= 0.9; // Summer slowdown
    
    const baseQuantity = avgDaily * dayMultiplier;
    // Add variance
    const randomVariance = (rng.next() - 0.5) * 2 * variance;
    let quantity = Math.round(baseQuantity + randomVariance);
    quantity = Math.max(1, quantity);
    
    // Split into 1-3 transactions
    const numTransactions = Math.min(3, Math.max(1, Math.ceil(quantity / Math.max(1, avgDaily / 2))));
    const quantityPerTransaction = Math.ceil(quantity / numTransactions);
    
    for (let t = 0; t < numTransactions; t++) {
      const transactionQty = t === numTransactions - 1 ? quantity - (quantityPerTransaction * t) : quantityPerTransaction;
      if (transactionQty <= 0) continue;
      
      const hour = 6 + Math.floor(rng.next() * 14);
      const minute = Math.floor(rng.next() * 60);
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      sales.push({ date: dateStr, time: timeStr, quantity: transactionQty });
    }
  }
  return sales;
}

export async function setupDemoData(): Promise<void> {
  const db = await getDatabase();
  console.log('Setting up Panmasa demo data...');
  
  try {
    // Clear existing demo data
    await db.runAsync('DELETE FROM sales WHERE user_id = ?', [DEMO_USER_ID]);
    await db.runAsync('DELETE FROM forecasts WHERE user_id = ?', [DEMO_USER_ID]);
    await db.runAsync('DELETE FROM inventory WHERE user_id = ?', [DEMO_USER_ID]);
    await db.runAsync('DELETE FROM product_ingredients WHERE product_id IN (SELECT id FROM products WHERE user_id = ?)', [DEMO_USER_ID]);
    await db.runAsync('DELETE FROM products WHERE user_id = ?', [DEMO_USER_ID]);
    await db.runAsync('DELETE FROM categories WHERE user_id = ?', [DEMO_USER_ID]);
    await db.runAsync('DELETE FROM profiles WHERE id = ?', [DEMO_USER_ID]);
    
    // Create profile with admin password "test123"
    const passwordHash = await hashPassword('test123');
    await db.runAsync(`
      INSERT INTO profiles (id, bakery_name, email, currency, timezone, avatar_url, admin_mode, role, current_role, admin_password_hash, admin_setup_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [DEMO_USER_ID, DEMO_BAKERY_NAME, DEMO_EMAIL, 'PHP', 'Asia/Manila', null, 0, 'admin', 'admin', passwordHash, 1]);
    console.log('✓ Profile created');
    
    // Create categories
    const categoryIds: Record<string, string> = {};
    for (const [key, cat] of Object.entries(DEMO_CATEGORIES)) {
      const catId = generateId();
      categoryIds[key] = catId;
      await db.runAsync('INSERT INTO categories (id, user_id, name, color) VALUES (?, ?, ?, ?)', [catId, DEMO_USER_ID, cat.name, cat.color]);
    }
    console.log('✓ Categories created');
    
    // Create products and inventory
    let salesCount = 0;
    let productIndex = 0;
    for (const product of DEMO_PRODUCTS) {
      productIndex++;
      const productId = generateId();
      await db.runAsync(`
        INSERT INTO products (id, user_id, category_id, name, description, unit, price, cost, is_active, product_type, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [productId, DEMO_USER_ID, categoryIds[product.category], product.name, '', product.unit, product.price, product.cost, 1, 'product', product.image || null]);
      
      await db.runAsync('INSERT INTO inventory (id, user_id, product_id, quantity, min_threshold) VALUES (?, ?, ?, ?, ?)',
        [generateId(), DEMO_USER_ID, productId, product.stock, product.minThreshold]);
      
      // Generate 180 days (6 months) of sales - sporadic products have inconsistent patterns
      // Use product index as seed for consistent, reproducible data
      const salesData = generateDemoSalesData(product.avgDaily, product.variance, 180, product.sporadic, productIndex);
      for (const sale of salesData) {
        await db.runAsync(`
          INSERT INTO sales (id, user_id, product_id, quantity, unit_price, total_amount, sale_date, sale_time, notes, created_by_role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [generateId(), DEMO_USER_ID, productId, sale.quantity, product.price, sale.quantity * product.price, sale.date, sale.time, '', 'admin']);
        salesCount++;
      }
    }
    console.log(`✓ Products created with ${salesCount} sales records`);
    
    // Create ingredients
    for (const ingredient of DEMO_INGREDIENTS) {
      const ingredientId = generateId();
      await db.runAsync(`
        INSERT INTO products (id, user_id, category_id, name, description, unit, price, cost, is_active, product_type, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [ingredientId, DEMO_USER_ID, null, ingredient.name, '', ingredient.unit, 0, ingredient.cost, 1, 'ingredient', ingredient.image || null]);
      
      await db.runAsync('INSERT INTO inventory (id, user_id, product_id, quantity, min_threshold) VALUES (?, ?, ?, ?, ?)',
        [generateId(), DEMO_USER_ID, ingredientId, Math.round(10 + Math.random() * 40), 5]);
    }
    console.log('✓ Ingredients created');
    
    // Add calendar events
    await AsyncStorage.setItem(`calendar_notes_${DEMO_USER_ID}`, JSON.stringify(getDemoCalendarEvents()));
    console.log('✓ Calendar events created');
    
    console.log('✓ Panmasa demo data setup complete!');
  } catch (error) {
    console.error('Error setting up demo data:', error);
    throw error;
  }
}

export async function isDemoDataReady(): Promise<boolean> {
  try {
    const db = await getDatabase();
    const result = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM profiles WHERE id = ?', [DEMO_USER_ID]);
    return (result?.count || 0) > 0;
  } catch {
    return false;
  }
}

// Update demo products with image URLs (for existing demo data)
export async function updateDemoProductImages(): Promise<void> {
  try {
    const db = await getDatabase();
    
    // Create a map of product names to image filenames
    const imageMap: Record<string, string> = {};
    for (const product of DEMO_PRODUCTS) {
      if (product.image) {
        imageMap[product.name] = product.image;
      }
    }
    
    // Update each demo product with its image
    for (const [name, image] of Object.entries(imageMap)) {
      await db.runAsync(
        'UPDATE products SET image_url = ? WHERE user_id = ? AND name = ? AND (image_url IS NULL OR image_url = "")',
        [image, DEMO_USER_ID, name]
      );
    }
    
    console.log('✓ Demo product images updated');
  } catch (error) {
    console.error('Error updating demo product images:', error);
  }
}

/**
 * Reset Demo to Base State
 * Clears ALL demo data and regenerates fresh base demo data
 * Works completely offline - instant reset
 */
export async function resetDemoToBaseState(): Promise<void> {
  try {
    console.log('🔄 Resetting demo to base state...');
    const db = await getDatabase();
    
    // Clear all demo user data from all tables
    // Order matters due to foreign key constraints
    // Use try-catch for each to handle tables that may not exist
    
    try { await db.runAsync('DELETE FROM forecasts WHERE user_id = ?', [DEMO_USER_ID]); } catch (e) { console.log('forecasts table skip'); }
    try { await db.runAsync('DELETE FROM sales WHERE user_id = ?', [DEMO_USER_ID]); } catch (e) { console.log('sales table skip'); }
    try { await db.runAsync('DELETE FROM product_ingredients WHERE product_id IN (SELECT id FROM products WHERE user_id = ?)', [DEMO_USER_ID]); } catch (e) { console.log('product_ingredients table skip'); }
    try { await db.runAsync('DELETE FROM inventory WHERE user_id = ?', [DEMO_USER_ID]); } catch (e) { console.log('inventory table skip'); }
    try { await db.runAsync('DELETE FROM products WHERE user_id = ?', [DEMO_USER_ID]); } catch (e) { console.log('products table skip'); }
    try { await db.runAsync('DELETE FROM categories WHERE user_id = ?', [DEMO_USER_ID]); } catch (e) { console.log('categories table skip'); }
    try { await db.runAsync('DELETE FROM sync_metadata WHERE user_id = ?', [DEMO_USER_ID]); } catch (e) { console.log('sync_metadata table skip'); }
    try { await db.runAsync('DELETE FROM profiles WHERE id = ?', [DEMO_USER_ID]); } catch (e) { console.log('profiles table skip'); }
    
    console.log('✓ Cleared all demo database tables');
    
    // Clear all AsyncStorage data related to demo
    const keysToRemove = [
      'dismissedAlerts',
      `calendar_notes_${DEMO_USER_ID}`,
      'onboarding_complete',
      'demo_initialized',
    ];
    
    for (const key of keysToRemove) {
      await AsyncStorage.removeItem(key);
    }
    
    console.log('✓ Cleared AsyncStorage demo data');
    
    // Regenerate fresh demo data
    await setupDemoData();
    
    console.log('✅ Demo reset complete - fresh base state restored!');
  } catch (error) {
    console.error('Error resetting demo:', error);
    throw error;
  }
}

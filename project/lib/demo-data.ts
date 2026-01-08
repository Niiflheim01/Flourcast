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

// 12 Products with realistic pricing (in PHP)
// Stock levels: Pandesal=overstock, Ube Cheesecake=critical, Chocolate Chip Cookies & Ham Croissant=low
const DEMO_PRODUCTS = [
  { name: 'Pandesal', unit: 'pcs', price: 5, cost: 2, category: 'breads', avgDaily: 80, variance: 30, stock: 250, minThreshold: 30 },
  { name: 'Ensaymada', unit: 'pcs', price: 35, cost: 15, category: 'breads', avgDaily: 25, variance: 10, stock: 45, minThreshold: 15 },
  { name: 'Spanish Bread', unit: 'pcs', price: 12, cost: 5, category: 'breads', avgDaily: 40, variance: 15, stock: 60, minThreshold: 20 },
  { name: 'Cheese Roll', unit: 'pcs', price: 25, cost: 10, category: 'pastries', avgDaily: 30, variance: 12, stock: 48, minThreshold: 15 },
  { name: 'Ham & Cheese Croissant', unit: 'pcs', price: 65, cost: 28, category: 'pastries', avgDaily: 15, variance: 8, stock: 3, minThreshold: 10 },
  { name: 'Chicken Empanada', unit: 'pcs', price: 35, cost: 14, category: 'pastries', avgDaily: 20, variance: 8, stock: 35, minThreshold: 12 },
  { name: 'Ube Cheesecake Slice', unit: 'slice', price: 120, cost: 45, category: 'cakes', avgDaily: 12, variance: 5, stock: 2, minThreshold: 10 },
  { name: 'Mango Graham Cake', unit: 'box', price: 450, cost: 180, category: 'cakes', avgDaily: 3, variance: 2, stock: 5, minThreshold: 3 },
  { name: 'Chocolate Cake Slice', unit: 'slice', price: 95, cost: 35, category: 'cakes', avgDaily: 15, variance: 6, stock: 22, minThreshold: 10 },
  { name: 'Chocolate Chip Cookies', unit: 'pcs', price: 30, cost: 12, category: 'cookies', avgDaily: 35, variance: 12, stock: 8, minThreshold: 15 },
  { name: 'Red Velvet Crinkles', unit: 'pcs', price: 25, cost: 10, category: 'cookies', avgDaily: 28, variance: 10, stock: 42, minThreshold: 15 },
  { name: 'Ube Crinkles', unit: 'pcs', price: 25, cost: 10, category: 'cookies', avgDaily: 30, variance: 10, stock: 38, minThreshold: 15 },
];

// 10 Ingredients
const DEMO_INGREDIENTS = [
  { name: 'All-Purpose Flour', unit: 'kg', cost: 55 },
  { name: 'Bread Flour', unit: 'kg', cost: 65 },
  { name: 'Sugar', unit: 'kg', cost: 70 },
  { name: 'Butter', unit: 'kg', cost: 450 },
  { name: 'Eggs', unit: 'tray', cost: 220 },
  { name: 'Milk', unit: 'liter', cost: 85 },
  { name: 'Cream Cheese', unit: 'kg', cost: 550 },
  { name: 'Ube Halaya', unit: 'kg', cost: 280 },
  { name: 'Chocolate Chips', unit: 'kg', cost: 380 },
  { name: 'Yeast', unit: 'pack', cost: 15 },
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

// Generate realistic sales with patterns
function generateDemoSalesData(avgDaily: number, variance: number, daysBack: number): Array<{ date: string; time: string; quantity: number }> {
  const sales: Array<{ date: string; time: string; quantity: number }> = [];
  const today = new Date();
  
  for (let i = daysBack; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    
    // Weekend boost
    let dayMultiplier = 1;
    if (dayOfWeek === 0 || dayOfWeek === 6) dayMultiplier = 1.2 + Math.random() * 0.2;
    
    // Seasonal patterns
    if (month === 11) dayMultiplier *= 1.4; // December
    if (month === 10) dayMultiplier *= 1.15; // November
    if (month === 3 || month === 4) dayMultiplier *= 0.85; // Summer
    
    const baseQuantity = avgDaily * dayMultiplier;
    const randomVariance = (Math.random() - 0.5) * 2 * variance;
    let quantity = Math.round(baseQuantity + randomVariance);
    quantity = Math.max(1, quantity);
    
    // Occasional slow day
    if (Math.random() < 0.05) quantity = Math.round(quantity * 0.3);
    
    // Split into 1-3 transactions
    const numTransactions = Math.min(3, Math.max(1, Math.ceil(quantity / (avgDaily / 2))));
    const quantityPerTransaction = Math.ceil(quantity / numTransactions);
    
    for (let t = 0; t < numTransactions; t++) {
      const transactionQty = t === numTransactions - 1 ? quantity - (quantityPerTransaction * t) : quantityPerTransaction;
      if (transactionQty <= 0) continue;
      
      const hour = 6 + Math.floor(Math.random() * 14);
      const minute = Math.floor(Math.random() * 60);
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
    for (const product of DEMO_PRODUCTS) {
      const productId = generateId();
      await db.runAsync(`
        INSERT INTO products (id, user_id, category_id, name, description, unit, price, cost, is_active, product_type, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [productId, DEMO_USER_ID, categoryIds[product.category], product.name, '', product.unit, product.price, product.cost, 1, 'product', null]);
      
      await db.runAsync('INSERT INTO inventory (id, user_id, product_id, quantity, min_threshold) VALUES (?, ?, ?, ?, ?)',
        [generateId(), DEMO_USER_ID, productId, product.stock, product.minThreshold]);
      
      // Generate 365 days of sales
      const salesData = generateDemoSalesData(product.avgDaily, product.variance, 365);
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
      `, [ingredientId, DEMO_USER_ID, null, ingredient.name, '', ingredient.unit, 0, ingredient.cost, 1, 'ingredient', null]);
      
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

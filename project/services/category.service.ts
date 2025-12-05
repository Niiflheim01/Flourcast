import { getDatabase, generateId } from '@/lib/database';
import { Category } from '@/types/database';

const DEFAULT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e'
];

export class CategoryService {
  static async getCategories(userId: string): Promise<Category[]> {
    const db = await getDatabase();

    const query = 'SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC';
    const results = await db.getAllAsync<Category>(query, [userId]);

    return results;
  }

  static async getCategory(id: string): Promise<Category | null> {
    const db = await getDatabase();

    const query = 'SELECT * FROM categories WHERE id = ? LIMIT 1';
    const result = await db.getFirstAsync<Category>(query, [id]);

    return result || null;
  }

  static async createCategory(userId: string, name: string, color?: string) {
    const db = await getDatabase();
    const id = generateId();
    const categoryColor = color || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)];

    const query = `
      INSERT INTO categories (id, user_id, name, color)
      VALUES (?, ?, ?, ?)
    `;

    await db.runAsync(query, [id, userId, name, categoryColor]);

    return this.getCategory(id);
  }

  static async updateCategory(id: string, name: string, color?: string) {
    const db = await getDatabase();

    const query = `
      UPDATE categories
      SET name = ?, color = COALESCE(?, color)
      WHERE id = ?
    `;

    await db.runAsync(query, [name, color || null, id]);

    return this.getCategory(id);
  }

  static async deleteCategory(id: string) {
    const db = await getDatabase();

    // First, update products to remove category reference
    await db.runAsync('UPDATE products SET category_id = NULL WHERE category_id = ?', [id]);

    // Then delete the category
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  }
}

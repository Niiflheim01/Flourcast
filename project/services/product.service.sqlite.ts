import { getDatabase, generateId } from '@/lib/database';
import { Product, ProductWithCategory } from '@/types/database';
import { ProductImageStorage } from '@/lib/image-storage';

export class ProductService {
  static async getProducts(userId: string): Promise<ProductWithCategory[]> {
    const db = await getDatabase();

    const query = `
      SELECT
        p.*,
        json_object(
          'id', c.id,
          'user_id', c.user_id,
          'name', c.name,
          'color', c.color,
          'created_at', c.created_at
        ) as category
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.user_id = ? AND p.is_active = 1
      ORDER BY p.created_at DESC
    `;

    const results = await db.getAllAsync<any>(query, [userId]);

    return results.map(row => ({
      ...row,
      category: row.category ? JSON.parse(row.category) : null,
      is_active: Boolean(row.is_active)
    }));
  }

  static async getProduct(id: string): Promise<Product | null> {
    const db = await getDatabase();

    const query = 'SELECT * FROM products WHERE id = ? LIMIT 1';
    const result = await db.getFirstAsync<Product>(query, [id]);

    if (result) {
      result.is_active = Boolean(result.is_active);
    }

    return result || null;
  }

  static async createProduct(userId: string, product: {
    name: string;
    description?: string;
    unit: string;
    price: number;
    cost: number;
    category_id?: string;
    product_type?: 'product' | 'ingredient';
    image_url?: string;
  }) {
    const db = await getDatabase();
    const id = generateId();

    const query = `
      INSERT INTO products (id, user_id, category_id, name, description, unit, price, cost, product_type, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.runAsync(query, [
      id,
      userId,
      product.category_id || null,
      product.name,
      product.description || '',
      product.unit,
      product.price,
      product.cost,
      product.product_type || 'product',
      product.image_url || null
    ]);

    // Create initial inventory entry
    const inventoryQuery = `
      INSERT INTO inventory (id, user_id, product_id, quantity, min_threshold)
      VALUES (?, ?, ?, 0, 10)
    `;

    await db.runAsync(inventoryQuery, [generateId(), userId, id]);

    return this.getProduct(id);
  }

  static async updateProduct(id: string, updates: Partial<Product>) {
    const db = await getDatabase();

    // If updating image, delete old one first
    if (updates.image_url !== undefined) {
      const currentProduct = await this.getProduct(id);
      if (currentProduct?.image_url && currentProduct.image_url !== updates.image_url) {
        await ProductImageStorage.deleteImage(currentProduct.image_url);
      }
    }

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.unit !== undefined) {
      fields.push('unit = ?');
      values.push(updates.unit);
    }
    if (updates.price !== undefined) {
      fields.push('price = ?');
      values.push(updates.price);
    }
    if (updates.cost !== undefined) {
      fields.push('cost = ?');
      values.push(updates.cost);
    }
    if (updates.category_id !== undefined) {
      fields.push('category_id = ?');
      values.push(updates.category_id);
    }
    if (updates.image_url !== undefined) {
      fields.push('image_url = ?');
      values.push(updates.image_url);
    }
    if (updates.product_type !== undefined) {
      fields.push('product_type = ?');
      values.push(updates.product_type);
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }

    if (fields.length === 0) return this.getProduct(id);

    fields.push("updated_at = datetime('now')");
    values.push(id);

    const query = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
    await db.runAsync(query, values);

    return this.getProduct(id);
  }

  static async deleteProduct(id: string) {
    const db = await getDatabase();

    // Delete product image if exists
    const product = await this.getProduct(id);
    if (product?.image_url) {
      await ProductImageStorage.deleteImage(product.image_url);
    }

    // Soft delete - mark as inactive
    await db.runAsync(
      "UPDATE products SET is_active = 0, updated_at = datetime('now') WHERE id = ?",
      [id]
    );
  }

  static async getProductsByCategory(userId: string, categoryId: string): Promise<Product[]> {
    const db = await getDatabase();

    const query = `
      SELECT * FROM products
      WHERE user_id = ? AND category_id = ? AND is_active = 1
      ORDER BY name ASC
    `;

    const results = await db.getAllAsync<Product>(query, [userId, categoryId]);

    return results.map(row => ({
      ...row,
      is_active: Boolean(row.is_active)
    }));
  }
}

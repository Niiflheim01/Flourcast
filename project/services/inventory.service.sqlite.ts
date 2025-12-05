import { getDatabase, generateId } from '@/lib/database';
import { Inventory, InventoryWithProduct } from '@/types/database';

export class InventoryService {
  static async getInventory(userId: string): Promise<InventoryWithProduct[]> {
    const db = await getDatabase();

    const query = `
      SELECT
        i.*,
        json_object(
          'id', p.id,
          'user_id', p.user_id,
          'category_id', p.category_id,
          'name', p.name,
          'description', p.description,
          'unit', p.unit,
          'price', p.price,
          'cost', p.cost,
          'is_active', p.is_active,
          'product_type', p.product_type,
          'image_url', p.image_url,
          'created_at', p.created_at,
          'updated_at', p.updated_at
        ) as product
      FROM inventory i
      INNER JOIN products p ON i.product_id = p.id
      WHERE i.user_id = ? AND p.is_active = 1
      ORDER BY i.last_updated DESC
    `;

    const results = await db.getAllAsync<any>(query, [userId]);

    return results.map(row => ({
      ...row,
      product: JSON.parse(row.product)
    }));
  }

  static async getInventoryByProduct(userId: string, productId: string): Promise<Inventory | null> {
    const db = await getDatabase();

    const query = 'SELECT * FROM inventory WHERE user_id = ? AND product_id = ? LIMIT 1';
    const result = await db.getFirstAsync<Inventory>(query, [userId, productId]);

    return result || null;
  }

  static async updateInventory(id: string, quantity: number) {
    const db = await getDatabase();

    const query = `
      UPDATE inventory
      SET quantity = ?,
          last_updated = datetime('now')
      WHERE id = ?
    `;

    await db.runAsync(query, [quantity, id]);

    const result = await db.getFirstAsync<Inventory>(
      'SELECT * FROM inventory WHERE id = ? LIMIT 1',
      [id]
    );

    return result;
  }

  static async adjustInventory(userId: string, productId: string, quantityChange: number) {
    const db = await getDatabase();

    const query = `
      UPDATE inventory
      SET quantity = MAX(0, quantity + ?),
          last_updated = datetime('now')
      WHERE user_id = ? AND product_id = ?
    `;

    await db.runAsync(query, [quantityChange, userId, productId]);

    return this.getInventoryByProduct(userId, productId);
  }

  static async updateThreshold(id: string, minThreshold: number) {
    const db = await getDatabase();

    const query = `
      UPDATE inventory
      SET min_threshold = ?,
          last_updated = datetime('now')
      WHERE id = ?
    `;

    await db.runAsync(query, [minThreshold, id]);

    const result = await db.getFirstAsync<Inventory>(
      'SELECT * FROM inventory WHERE id = ? LIMIT 1',
      [id]
    );

    return result;
  }

  static async getLowStockItems(userId: string): Promise<InventoryWithProduct[]> {
    const db = await getDatabase();

    const query = `
      SELECT
        i.*,
        json_object(
          'id', p.id,
          'user_id', p.user_id,
          'category_id', p.category_id,
          'name', p.name,
          'description', p.description,
          'unit', p.unit,
          'price', p.price,
          'cost', p.cost,
          'is_active', p.is_active,
          'product_type', p.product_type,
          'image_url', p.image_url,
          'created_at', p.created_at,
          'updated_at', p.updated_at
        ) as product
      FROM inventory i
      INNER JOIN products p ON i.product_id = p.id
      WHERE i.user_id = ? AND p.is_active = 1 AND i.quantity <= i.min_threshold
      ORDER BY (i.quantity / NULLIF(i.min_threshold, 0)) ASC
    `;

    const results = await db.getAllAsync<any>(query, [userId]);

    return results.map(row => ({
      ...row,
      product: JSON.parse(row.product)
    }));
  }

  static async createInventoryEntry(userId: string, productId: string, quantity: number = 0, minThreshold: number = 10) {
    const db = await getDatabase();
    const id = generateId();

    const query = `
      INSERT INTO inventory (id, user_id, product_id, quantity, min_threshold)
      VALUES (?, ?, ?, ?, ?)
    `;

    await db.runAsync(query, [id, userId, productId, quantity, minThreshold]);

    return this.getInventoryByProduct(userId, productId);
  }
}

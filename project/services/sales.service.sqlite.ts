import { getDatabase, generateId } from '@/lib/database';
import { Sale, SaleWithProduct } from '@/types/database';
import { InventoryService } from './inventory.service.sqlite';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

export class SalesService {
  static async getSales(userId: string, startDate?: string, endDate?: string): Promise<SaleWithProduct[]> {
    const db = await getDatabase();

    let query = `
      SELECT
        s.*,
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
          'image_url', p.image_url,
          'created_at', p.created_at,
          'updated_at', p.updated_at
        ) as product
      FROM sales s
      INNER JOIN products p ON s.product_id = p.id
      WHERE s.user_id = ?
    `;

    const params: any[] = [userId];

    if (startDate) {
      query += ' AND s.sale_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND s.sale_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY s.sale_date DESC, s.sale_time DESC';

    const results = await db.getAllAsync<any>(query, params);

    return results.map(row => ({
      ...row,
      product: JSON.parse(row.product)
    }));
  }

  static async getTodaysSales(userId: string): Promise<SaleWithProduct[]> {
    const today = formatDate(new Date());
    return this.getSales(userId, today, today);
  }

  static async createSale(userId: string, sale: {
    product_id: string;
    quantity: number;
    unit_price: number;
    sale_date?: string;
    sale_time?: string;
    notes?: string;
  }) {
    const db = await getDatabase();
    const id = generateId();
    const now = new Date();
    const saleDate = sale.sale_date || formatDate(now);
    const saleTime = sale.sale_time || formatTime(now);
    const totalAmount = sale.quantity * sale.unit_price;

    const query = `
      INSERT INTO sales (id, user_id, product_id, quantity, unit_price, total_amount, sale_date, sale_time, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await db.runAsync(query, [
      id,
      userId,
      sale.product_id,
      sale.quantity,
      sale.unit_price,
      totalAmount,
      saleDate,
      saleTime,
      sale.notes || ''
    ]);

    // Update inventory - reduce quantity
    await InventoryService.adjustInventory(userId, sale.product_id, -sale.quantity);

    const result = await db.getFirstAsync<Sale>(
      'SELECT * FROM sales WHERE id = ? LIMIT 1',
      [id]
    );

    return result;
  }

  static async updateSale(id: string, updates: Partial<Sale>) {
    const db = await getDatabase();

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.quantity !== undefined) {
      fields.push('quantity = ?');
      values.push(updates.quantity);
    }
    if (updates.unit_price !== undefined) {
      fields.push('unit_price = ?');
      values.push(updates.unit_price);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }
    if (updates.sale_date !== undefined) {
      fields.push('sale_date = ?');
      values.push(updates.sale_date);
    }
    if (updates.sale_time !== undefined) {
      fields.push('sale_time = ?');
      values.push(updates.sale_time);
    }

    // Recalculate total if quantity or price changed
    if (updates.quantity !== undefined || updates.unit_price !== undefined) {
      const currentSale = await db.getFirstAsync<Sale>(
        'SELECT * FROM sales WHERE id = ? LIMIT 1',
        [id]
      );

      if (currentSale) {
        const newQuantity = updates.quantity ?? currentSale.quantity;
        const newPrice = updates.unit_price ?? currentSale.unit_price;
        fields.push('total_amount = ?');
        values.push(newQuantity * newPrice);
      }
    }

    if (fields.length === 0) {
      return db.getFirstAsync<Sale>('SELECT * FROM sales WHERE id = ? LIMIT 1', [id]);
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    const query = `UPDATE sales SET ${fields.join(', ')} WHERE id = ?`;
    await db.runAsync(query, values);

    return db.getFirstAsync<Sale>('SELECT * FROM sales WHERE id = ? LIMIT 1', [id]);
  }

  static async deleteSale(id: string) {
    const db = await getDatabase();

    // Get sale info before deleting to restore inventory
    const sale = await db.getFirstAsync<Sale>(
      'SELECT * FROM sales WHERE id = ? LIMIT 1',
      [id]
    );

    if (sale) {
      // Restore inventory
      await InventoryService.adjustInventory(sale.user_id, sale.product_id, sale.quantity);
    }

    await db.runAsync('DELETE FROM sales WHERE id = ?', [id]);
  }

  static async getSalesStats(userId: string, startDate?: string, endDate?: string) {
    const sales = await this.getSales(userId, startDate, endDate);

    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
    const totalItems = sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const totalTransactions = sales.length;

    const productSales = sales.reduce((acc, sale) => {
      const productId = sale.product_id;
      if (!acc[productId]) {
        acc[productId] = {
          product: sale.product,
          quantity: 0,
          revenue: 0,
        };
      }
      acc[productId].quantity += sale.quantity;
      acc[productId].revenue += Number(sale.total_amount);
      return acc;
    }, {} as Record<string, any>);

    const topProducts = Object.values(productSales)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue,
      totalItems,
      totalTransactions,
      topProducts,
    };
  }

  static async getDailySalesForPeriod(userId: string, startDate: string, endDate: string) {
    const db = await getDatabase();

    const query = `
      SELECT
        sale_date,
        SUM(quantity) as total_quantity,
        SUM(total_amount) as total_revenue,
        COUNT(*) as transaction_count
      FROM sales
      WHERE user_id = ? AND sale_date >= ? AND sale_date <= ?
      GROUP BY sale_date
      ORDER BY sale_date ASC
    `;

    const results = await db.getAllAsync<any>(query, [userId, startDate, endDate]);
    return results;
  }

  static async getProductSalesForPeriod(userId: string, productId: string, startDate: string, endDate: string) {
    const db = await getDatabase();

    const query = `
      SELECT
        sale_date,
        SUM(quantity) as total_quantity,
        COUNT(*) as transaction_count
      FROM sales
      WHERE user_id = ? AND product_id = ? AND sale_date >= ? AND sale_date <= ?
      GROUP BY sale_date
      ORDER BY sale_date ASC
    `;

    const results = await db.getAllAsync<any>(query, [userId, productId, startDate, endDate]);
    return results;
  }

  static async getTopSellingProducts(userId: string, days: number = 7) {
    const db = await getDatabase();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = `
      SELECT
        p.id,
        p.name,
        p.unit,
        SUM(s.quantity) as total_quantity,
        SUM(s.total_amount) as total_revenue,
        COUNT(s.id) as transaction_count,
        AVG(s.quantity) as avg_quantity
      FROM sales s
      INNER JOIN products p ON s.product_id = p.id
      WHERE s.user_id = ? AND s.sale_date >= ? AND s.sale_date <= ?
      GROUP BY p.id, p.name, p.unit
      ORDER BY total_quantity DESC
      LIMIT 10
    `;

    const results = await db.getAllAsync<any>(query, [
      userId,
      this.formatDate(startDate),
      this.formatDate(endDate)
    ]);
    return results;
  }

  static async getSalesGrowthRate(userId: string, productId: string, days: number = 7) {
    const db = await getDatabase();
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days * 2)); // Get double the period for comparison

    const query = `
      SELECT
        sale_date,
        SUM(quantity) as total_quantity
      FROM sales
      WHERE user_id = ? AND product_id = ? AND sale_date >= ? AND sale_date <= ?
      GROUP BY sale_date
      ORDER BY sale_date ASC
    `;

    const results = await db.getAllAsync<any>(query, [
      userId,
      productId,
      this.formatDate(startDate),
      this.formatDate(endDate)
    ]);

    if (results.length < days) return null;

    const midPoint = Math.floor(results.length / 2);
    const firstPeriod = results.slice(0, midPoint);
    const secondPeriod = results.slice(midPoint);

    const firstAvg = firstPeriod.reduce((sum: number, r: any) => sum + r.total_quantity, 0) / firstPeriod.length;
    const secondAvg = secondPeriod.reduce((sum: number, r: any) => sum + r.total_quantity, 0) / secondPeriod.length;

    const growthRate = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

    return {
      growthRate: Number(growthRate.toFixed(1)),
      firstPeriodAvg: Math.round(firstAvg),
      secondPeriodAvg: Math.round(secondAvg)
    };
  }

  static async getLowStockAlerts(userId: string) {
    const db = await getDatabase();

    const query = `
      SELECT
        p.id,
        p.name,
        p.unit,
        i.quantity as current_stock,
        i.min_threshold,
        AVG(daily_sales.total_quantity) as avg_daily_sales
      FROM products p
      INNER JOIN inventory i ON p.id = i.product_id
      LEFT JOIN (
        SELECT
          product_id,
          SUM(quantity) as total_quantity
        FROM sales
        WHERE user_id = ? AND sale_date >= date('now', '-7 days')
        GROUP BY product_id, sale_date
      ) daily_sales ON p.id = daily_sales.product_id
      WHERE p.user_id = ? AND i.quantity <= i.min_threshold
      GROUP BY p.id, p.name, p.unit, i.quantity, i.min_threshold
    `;

    const results = await db.getAllAsync<any>(query, [userId, userId]);
    return results;
  }

  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

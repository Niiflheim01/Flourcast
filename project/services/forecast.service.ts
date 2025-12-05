import { getDatabase, generateId } from '@/lib/database';
import { Forecast, ForecastWithProduct } from '@/types/database';
import { SalesService } from './sales.service.sqlite';
import * as tf from '@tensorflow/tfjs';

const MODEL_VERSION = 'v1.0.0';

interface TrainingData {
  dates: Date[];
  quantities: number[];
}

export class ForecastService {
  static async getForecastsForDate(userId: string, forecastDate: string): Promise<ForecastWithProduct[]> {
    const db = await getDatabase();

    const query = `
      SELECT
        f.*,
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
      FROM forecasts f
      INNER JOIN products p ON f.product_id = p.id
      WHERE f.user_id = ? AND f.forecast_date = ?
      ORDER BY f.predicted_quantity DESC
    `;

    const results = await db.getAllAsync<any>(query, [userId, forecastDate]);

    return results.map(row => ({
      ...row,
      product: JSON.parse(row.product)
    }));
  }

  static async createForecast(forecast: {
    user_id: string;
    product_id: string;
    forecast_date: string;
    predicted_quantity: number;
    confidence_score: number;
  }) {
    const db = await getDatabase();
    const id = generateId();

    const query = `
      INSERT INTO forecasts (id, user_id, product_id, forecast_date, predicted_quantity, confidence_score, model_version)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await db.runAsync(query, [
      id,
      forecast.user_id,
      forecast.product_id,
      forecast.forecast_date,
      forecast.predicted_quantity,
      forecast.confidence_score,
      MODEL_VERSION
    ]);

    return db.getFirstAsync<Forecast>(
      'SELECT * FROM forecasts WHERE id = ? LIMIT 1',
      [id]
    );
  }

  static async updateForecastActual(userId: string, productId: string, forecastDate: string, actualQuantity: number) {
    const db = await getDatabase();

    const query = `
      UPDATE forecasts
      SET actual_quantity = ?
      WHERE user_id = ? AND product_id = ? AND forecast_date = ?
    `;

    await db.runAsync(query, [actualQuantity, userId, productId, forecastDate]);
  }

  static async generateForecastsForTomorrow(userId: string) {
    const db = await getDatabase();

    // Get all active products
    const products = await db.getAllAsync<any>(
      'SELECT id, name FROM products WHERE user_id = ? AND is_active = 1',
      [userId]
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = this.formatDate(tomorrow);

    // Check if forecasts already exist for tomorrow
    const existingForecasts = await db.getFirstAsync<any>(
      'SELECT COUNT(*) as count FROM forecasts WHERE user_id = ? AND forecast_date = ?',
      [userId, tomorrowStr]
    );

    if (existingForecasts && existingForecasts.count > 0) {
      return this.getForecastsForDate(userId, tomorrowStr);
    }

    const forecasts: any[] = [];

    for (const product of products) {
      try {
        const prediction = await this.predictDemand(userId, product.id);

        if (prediction) {
          const forecast = await this.createForecast({
            user_id: userId,
            product_id: product.id,
            forecast_date: tomorrowStr,
            predicted_quantity: prediction.quantity,
            confidence_score: prediction.confidence
          });

          forecasts.push(forecast);
        }
      } catch (error) {
        console.error(`Error forecasting for product ${product.name}:`, error);
      }
    }

    return this.getForecastsForDate(userId, tomorrowStr);
  }

  private static async predictDemand(userId: string, productId: string): Promise<{ quantity: number; confidence: number } | null> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days

    const salesData = await SalesService.getProductSalesForPeriod(
      userId,
      productId,
      this.formatDate(startDate),
      this.formatDate(endDate)
    );

    if (salesData.length < 7) {
      // Not enough data for prediction - need at least 7 days
      return null;
    }

    // Simple moving average and trend analysis
    const quantities = salesData.map((s: any) => s.total_quantity);

    // Calculate moving average (last 7 days)
    const recentDays = Math.min(7, quantities.length);
    const recentQuantities = quantities.slice(-recentDays);
    const movingAverage = recentQuantities.reduce((sum: number, q: number) => sum + q, 0) / recentDays;

    // Calculate trend (comparing first half vs second half)
    const midPoint = Math.floor(quantities.length / 2);
    const firstHalf = quantities.slice(0, midPoint);
    const secondHalf = quantities.slice(midPoint);

    const firstAvg = firstHalf.reduce((sum: number, q: number) => sum + q, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum: number, q: number) => sum + q, 0) / secondHalf.length;

    const trend = secondAvg - firstAvg;

    // Predict: moving average + trend adjustment
    let prediction = movingAverage + (trend * 0.3); // 30% trend weight

    // Check for day-of-week patterns (if today is same day as tomorrow will be)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayOfWeek = tomorrow.getDay();

    // Apply day-of-week adjustment based on historical data for that day
    const sameDaySales = salesData.filter((s: any) => {
      const saleDate = new Date(s.sale_date);
      return saleDate.getDay() === dayOfWeek;
    });

    if (sameDaySales.length > 0) {
      const sameDayAvg = sameDaySales.reduce((sum: number, s: any) => sum + s.total_quantity, 0) / sameDaySales.length;
      // Blend with same-day average
      prediction = (prediction * 0.7) + (sameDayAvg * 0.3);
    }

    // Ensure prediction is not negative and round to nearest integer
    prediction = Math.max(0, Math.round(prediction));

    // Calculate confidence score based on data consistency
    const variance = this.calculateVariance(quantities);
    const mean = quantities.reduce((sum: number, q: number) => sum + q, 0) / quantities.length;
    const coefficientOfVariation = mean > 0 ? Math.sqrt(variance) / mean : 1;

    // Lower CV = higher confidence (0.3 is arbitrary threshold)
    const confidence = Math.max(0.1, Math.min(1.0, 1 - (coefficientOfVariation / 0.5)));

    return {
      quantity: prediction,
      confidence: Number(confidence.toFixed(2))
    };
  }

  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static async getForecastAccuracy(userId: string, days: number = 7): Promise<number> {
    const db = await getDatabase();

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1); // Yesterday
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const query = `
      SELECT
        predicted_quantity,
        actual_quantity
      FROM forecasts
      WHERE user_id = ?
        AND forecast_date >= ?
        AND forecast_date <= ?
        AND actual_quantity IS NOT NULL
    `;

    const results = await db.getAllAsync<any>(query, [
      userId,
      this.formatDate(startDate),
      this.formatDate(endDate)
    ]);

    if (results.length === 0) return 0;

    // Calculate Mean Absolute Percentage Error (MAPE)
    let totalError = 0;
    let count = 0;

    for (const row of results) {
      if (row.actual_quantity > 0) {
        const error = Math.abs(row.predicted_quantity - row.actual_quantity) / row.actual_quantity;
        totalError += error;
        count++;
      }
    }

    if (count === 0) return 0;

    const mape = totalError / count;
    const accuracy = Math.max(0, 1 - mape);

    return Number((accuracy * 100).toFixed(1));
  }
}

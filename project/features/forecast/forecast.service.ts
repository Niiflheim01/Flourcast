/**
 * Forecast Service
 * Handles demand prediction using TensorFlow.js and bakery-specific algorithms
 */

import { getDatabase, generateId } from '@/features/shared/database';
import { Forecast, ForecastWithProduct } from '@/features/shared/types';
import { formatDate } from '@/features/shared/utils';

const MODEL_VERSION = 'v1.0.0';

// TensorFlow is optional - we'll use smart prediction as fallback
let tf: any = null;
let tfReady = false;
let tfInitAttempted = false;

// Lazy load TensorFlow to prevent crashes
async function ensureTfReady(): Promise<boolean> {
  if (tfReady) return true;
  if (tfInitAttempted) return false; // Don't retry if already failed
  
  tfInitAttempted = true;
  
  try {
    // Dynamically import TensorFlow to catch import errors
    const tfModule = await import('@tensorflow/tfjs');
    tf = tfModule;
    
    // Try to import React Native backend
    try {
      await import('@tensorflow/tfjs-react-native');
    } catch (rnError) {
      console.log('TensorFlow React Native backend not available, using default');
    }
    
    await tf.ready();
    tfReady = true;
    console.log('TensorFlow.js initialized successfully');
    return true;
  } catch (error) {
    console.log('TensorFlow.js not available, using smart prediction fallback');
    tfReady = false;
    return false;
  }
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

  static async deleteForecastsForDate(userId: string, forecastDate: string) {
    const db = await getDatabase();
    await db.runAsync(
      'DELETE FROM forecasts WHERE user_id = ? AND forecast_date = ?',
      [userId, forecastDate]
    );
  }

  static async regenerateForecastsForTomorrow(userId: string) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);

    await this.deleteForecastsForDate(userId, tomorrowStr);
    return this.generateForecastsForTomorrow(userId);
  }

  static async generateForecastsForTomorrow(userId: string) {
    const db = await getDatabase();
    const { SalesService } = await import('@/features/sales/sales.service');

    const products = await db.getAllAsync<any>(
      'SELECT id, name FROM products WHERE user_id = ? AND is_active = 1',
      [userId]
    );

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = formatDate(tomorrow);

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
        const prediction = await this.predictDemand(userId, product.id, SalesService);

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

  private static async predictDemand(
    userId: string, 
    productId: string,
    SalesService: any
  ): Promise<{ quantity: number; confidence: number } | null> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const salesData = await SalesService.getProductSalesForPeriod(
      userId,
      productId,
      formatDate(startDate),
      formatDate(endDate)
    );

    if (salesData.length < 7) {
      return null;
    }

    try {
      const timeSeriesData = this.prepareTimeSeriesData(salesData);

      if (timeSeriesData.length < 7) {
        return this.bakerySmartPrediction(salesData);
      }

      if (timeSeriesData.length >= 7) {
        const tfPrediction = await this.tensorFlowPrediction(timeSeriesData);
        if (tfPrediction) {
          return this.adjustForBakeryContext(tfPrediction, salesData);
        }
      }

      return this.bakerySmartPrediction(salesData);
    } catch (error) {
      console.error('Error in prediction:', error);
      return this.bakerySmartPrediction(salesData);
    }
  }

  private static async tensorFlowPrediction(
    timeSeriesData: { date: Date; quantity: number; dayOfWeek: number }[]
  ): Promise<{ quantity: number; confidence: number } | null> {
    try {
      // Ensure TensorFlow is ready before using it
      const isReady = await ensureTfReady();
      if (!isReady || !tf) {
        console.warn('TensorFlow not ready, falling back to bakery prediction');
        return null;
      }

      const quantities = timeSeriesData.map(d => d.quantity);
      const { normalized, min, max } = this.normalizeData(quantities);

      const sequenceLength = 7;
      const result = this.createSequences(normalized, sequenceLength);
      
      if (!result) {
        console.log('Failed to create sequences');
        return null;
      }
      
      const { xs, ys } = result;

      if (xs.shape[0] < 7) {
        xs.dispose();
        ys.dispose();
        return null;
      }

      const model = this.buildLSTMModel(sequenceLength);

      await model.fit(xs, ys, {
        epochs: 30,
        batchSize: 4,
        shuffle: true,
        verbose: 0,
      });

      const lastSequence = normalized.slice(-sequenceLength);
      const inputTensor = tf.tensor3d([lastSequence.map(v => [v])]);
      const predictionTensor = model.predict(inputTensor) as any;
      const normalizedPrediction = (await predictionTensor.data())[0];

      const prediction = this.denormalize(normalizedPrediction, min, max);

      const finalLoss = await model.evaluate(xs, ys) as any;
      const lossValue = (await finalLoss.data())[0];
      const confidence = Math.max(0.3, Math.min(0.95, 1 - Math.min(lossValue, 0.7)));

      xs.dispose();
      ys.dispose();
      inputTensor.dispose();
      predictionTensor.dispose();
      finalLoss.dispose();
      model.dispose();

      return {
        quantity: Math.max(0, Math.round(prediction)),
        confidence: Number(confidence.toFixed(2))
      };
    } catch (error) {
      console.error('TensorFlow prediction error:', error);
      return null;
    }
  }

  private static bakerySmartPrediction(salesData: any[]): { quantity: number; confidence: number } | null {
    if (salesData.length < 3) return null;

    const quantities = salesData.map((s: any) => s.total_quantity);

    const weights = quantities.map((_, i) => i + 1);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const weightedSum = quantities.reduce((sum, q, i) => sum + (q * weights[i]), 0);
    const weightedAvg = weightedSum / totalWeight;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDayOfWeek = tomorrow.getDay();

    const sameDaySales = salesData.filter((s: any) => {
      const [year, month, day] = s.sale_date.split('-').map(Number);
      const saleDate = new Date(year, month - 1, day);
      return saleDate.getDay() === tomorrowDayOfWeek;
    });

    let prediction = weightedAvg;

    if (sameDaySales.length > 0) {
      const sameDayAvg = sameDaySales.reduce((sum: number, s: any) => sum + s.total_quantity, 0) / sameDaySales.length;
      prediction = (sameDayAvg * 0.6) + (weightedAvg * 0.4);
    }

    const recent3 = quantities.slice(-3);
    const previous3 = quantities.slice(-6, -3);
    if (previous3.length === 3 && recent3.length === 3) {
      const recentAvg = recent3.reduce((sum, q) => sum + q, 0) / 3;
      const previousAvg = previous3.reduce((sum, q) => sum + q, 0) / 3;

      if (previousAvg > 0) {
        const trendMultiplier = recentAvg / previousAvg;
        if (trendMultiplier > 1.2 || trendMultiplier < 0.8) {
          prediction = prediction * (1 + ((trendMultiplier - 1) * 0.3));
        }
      }
    }

    const variance = this.calculateVariance(quantities);
    const mean = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;

    let confidence = Math.max(0.3, Math.min(0.85, 1 - (cv / 0.6)));

    if (sameDaySales.length >= 3) {
      confidence = Math.min(0.9, confidence + 0.1);
    }

    return {
      quantity: Math.max(0, Math.round(prediction)),
      confidence: Number(confidence.toFixed(2))
    };
  }

  private static adjustForBakeryContext(
    prediction: { quantity: number; confidence: number },
    salesData: any[]
  ): { quantity: number; confidence: number } {
    const quantities = salesData.map((s: any) => s.total_quantity);
    const avgQuantity = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;

    if (avgQuantity < 5 && prediction.quantity > 0) {
      prediction.quantity = Math.ceil(prediction.quantity * 1.1);
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isWeekend = tomorrow.getDay() === 0 || tomorrow.getDay() === 6;

    if (isWeekend) {
      const weekendSales = salesData.filter((s: any) => {
        const [year, month, day] = s.sale_date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getDay() === 0 || date.getDay() === 6;
      });
      const weekdaySales = salesData.filter((s: any) => {
        const [year, month, day] = s.sale_date.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.getDay() !== 0 && date.getDay() !== 6;
      });

      if (weekendSales.length > 0 && weekdaySales.length > 0) {
        const weekendAvg = weekendSales.reduce((sum: number, s: any) => sum + s.total_quantity, 0) / weekendSales.length;
        const weekdayAvg = weekdaySales.reduce((sum: number, s: any) => sum + s.total_quantity, 0) / weekdaySales.length;

        if (weekdayAvg > 0) {
          const weekendMultiplier = weekendAvg / weekdayAvg;
          if (weekendMultiplier > 1.2 || weekendMultiplier < 0.8) {
            prediction.quantity = Math.round(prediction.quantity * weekendMultiplier);
          }
        }
      }
    }

    return prediction;
  }

  private static prepareTimeSeriesData(salesData: any[]): { date: Date; quantity: number; dayOfWeek: number }[] {
    return salesData.map((s: any) => {
      const [year, month, day] = s.sale_date.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return {
        date,
        quantity: s.total_quantity,
        dayOfWeek: date.getDay()
      };
    });
  }

  private static normalizeData(data: number[]): { normalized: number[]; min: number; max: number } {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min;

    if (range === 0) {
      return { normalized: data.map(() => 0.5), min, max };
    }

    const normalized = data.map(val => (val - min) / range);
    return { normalized, min, max };
  }

  private static denormalize(value: number, min: number, max: number): number {
    const range = max - min;
    if (range === 0) return min;
    return value * range + min;
  }

  private static createSequences(data: number[], sequenceLength: number): { xs: any; ys: any } | null {
    const sequences: number[][] = [];
    const targets: number[] = [];

    for (let i = 0; i < data.length - sequenceLength; i++) {
      sequences.push(data.slice(i, i + sequenceLength));
      targets.push(data[i + sequenceLength]);
    }

    if (sequences.length === 0 || targets.length === 0 || !tf) {
      return null;
    }

    try {
      const xs = tf.tensor3d(sequences.map(seq => seq.map(val => [val])));
      const ys = tf.tensor2d(targets.map(val => [val]));
      return { xs, ys };
    } catch (error) {
      console.error('Error creating sequences:', error);
      return null;
    }
  }

  private static buildLSTMModel(sequenceLength: number): any {
    if (!tf) {
      throw new Error('TensorFlow not initialized');
    }
    
    const model = tf.sequential();

    model.add(tf.layers.lstm({
      units: 32,
      inputShape: [sequenceLength, 1],
      returnSequences: false
    }));

    model.add(tf.layers.dropout({ rate: 0.2 }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    return model;
  }

  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  static async getForecastAccuracy(userId: string, days: number = 7): Promise<number> {
    const db = await getDatabase();

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
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
      formatDate(startDate),
      formatDate(endDate)
    ]);

    if (results.length === 0) return 0;

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

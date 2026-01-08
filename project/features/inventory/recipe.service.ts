/**
 * Recipe Service
 * Handles product recipes and cost calculations
 */

import { getDatabase, generateId } from '@/features/shared/database';

export interface RecipeIngredient {
  id: string;
  product_id: string;
  ingredient_id: string;
  ingredient_name: string;
  ingredient_unit: string;
  ingredient_cost: number;
  quantity: number;
  batch_size: number;
  created_at: string;
}

export interface RecipeCostBreakdown {
  totalCost: number;
  perUnitCost: number;
  batchSize: number;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    cost: number;
    totalCost: number;
  }[];
}

export class RecipeService {
  static async addIngredient(
    productId: string,
    ingredientId: string,
    quantity: number,
    batchSize: number
  ): Promise<string> {
    const db = await getDatabase();
    const id = generateId();

    await db.runAsync(
      `INSERT INTO product_ingredients (id, product_id, ingredient_id, quantity, batch_size)
       VALUES (?, ?, ?, ?, ?)`,
      [id, productId, ingredientId, quantity, batchSize]
    );

    return id;
  }

  static async getRecipeIngredients(productId: string): Promise<RecipeIngredient[]> {
    const db = await getDatabase();

    const results = await db.getAllAsync<RecipeIngredient>(
      `SELECT
        pi.id,
        pi.product_id,
        pi.ingredient_id,
        p.name as ingredient_name,
        p.unit as ingredient_unit,
        p.cost as ingredient_cost,
        pi.quantity,
        pi.batch_size,
        pi.created_at
       FROM product_ingredients pi
       INNER JOIN products p ON pi.ingredient_id = p.id
       WHERE pi.product_id = ?
       ORDER BY p.name ASC`,
      [productId]
    );

    return results;
  }

  static async removeIngredient(recipeIngredientId: string): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      'DELETE FROM product_ingredients WHERE id = ?',
      [recipeIngredientId]
    );
  }

  static async updateIngredientQuantity(
    recipeIngredientId: string,
    quantity: number
  ): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      'UPDATE product_ingredients SET quantity = ? WHERE id = ?',
      [quantity, recipeIngredientId]
    );
  }

  static async updateBatchSize(productId: string, batchSize: number): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      'UPDATE product_ingredients SET batch_size = ? WHERE product_id = ?',
      [batchSize, productId]
    );
  }

  static async calculateRecipeCost(productId: string): Promise<RecipeCostBreakdown | null> {
    const ingredients = await this.getRecipeIngredients(productId);

    if (ingredients.length === 0) {
      return null;
    }

    const batchSize = ingredients[0]?.batch_size || 1;
    let totalCost = 0;

    const ingredientBreakdown = ingredients.map(ing => {
      const ingredientTotalCost = (ing.ingredient_cost || 0) * ing.quantity;
      totalCost += ingredientTotalCost;

      return {
        name: ing.ingredient_name,
        quantity: ing.quantity,
        unit: ing.ingredient_unit,
        cost: ing.ingredient_cost || 0,
        totalCost: ingredientTotalCost,
      };
    });

    const perUnitCost = totalCost / batchSize;

    return {
      totalCost,
      perUnitCost,
      batchSize,
      ingredients: ingredientBreakdown,
    };
  }

  static async getProductsWithRecipes(userId: string): Promise<string[]> {
    const db = await getDatabase();

    const results = await db.getAllAsync<{ product_id: string }>(
      `SELECT DISTINCT product_id FROM product_ingredients
       WHERE product_id IN (SELECT id FROM products WHERE user_id = ?)`,
      [userId]
    );

    return results.map(r => r.product_id);
  }
}

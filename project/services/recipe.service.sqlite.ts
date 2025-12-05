import { getDatabase, generateId } from '@/lib/database';

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
  /**
   * Add an ingredient to a product's recipe
   */
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

  /**
   * Get all ingredients for a product's recipe with full ingredient details
   */
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

  /**
   * Remove an ingredient from a recipe
   */
  static async removeIngredient(recipeIngredientId: string): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      'DELETE FROM product_ingredients WHERE id = ?',
      [recipeIngredientId]
    );
  }

  /**
   * Update ingredient quantity in a recipe
   */
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

  /**
   * Update batch size for a product's recipe
   */
  static async updateBatchSize(productId: string, batchSize: number): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      'UPDATE product_ingredients SET batch_size = ? WHERE product_id = ?',
      [batchSize, productId]
    );
  }

  /**
   * Calculate total cost from recipe ingredients
   */
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

  /**
   * Check if a product has a recipe defined
   */
  static async hasRecipe(productId: string): Promise<boolean> {
    const db = await getDatabase();

    const result = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM product_ingredients WHERE product_id = ?',
      [productId]
    );

    return (result?.count || 0) > 0;
  }

  /**
   * Delete entire recipe for a product
   */
  static async deleteRecipe(productId: string): Promise<void> {
    const db = await getDatabase();

    await db.runAsync(
      'DELETE FROM product_ingredients WHERE product_id = ?',
      [productId]
    );
  }

  /**
   * Check if there's enough ingredient stock to make a batch
   */
  static async checkIngredientAvailability(
    productId: string,
    batchesToMake: number = 1
  ): Promise<{ canMake: boolean; missingIngredients: string[] }> {
    const db = await getDatabase();
    const ingredients = await this.getRecipeIngredients(productId);

    const missingIngredients: string[] = [];

    for (const ingredient of ingredients) {
      const inventory = await db.getFirstAsync<{ quantity: number }>(
        'SELECT quantity FROM inventory WHERE product_id = ?',
        [ingredient.ingredient_id]
      );

      const availableQuantity = inventory?.quantity || 0;
      const requiredQuantity = ingredient.quantity * batchesToMake;

      if (availableQuantity < requiredQuantity) {
        missingIngredients.push(
          `${ingredient.ingredient_name} (need ${requiredQuantity} ${ingredient.ingredient_unit}, have ${availableQuantity})`
        );
      }
    }

    return {
      canMake: missingIngredients.length === 0,
      missingIngredients,
    };
  }

  /**
   * Deduct ingredients from inventory when making a batch of products
   */
  static async deductIngredientsForBatch(
    productId: string,
    batchesMade: number = 1
  ): Promise<void> {
    const db = await getDatabase();
    const ingredients = await this.getRecipeIngredients(productId);

    for (const ingredient of ingredients) {
      const quantityToDeduct = ingredient.quantity * batchesMade;

      await db.runAsync(
        `UPDATE inventory
         SET quantity = quantity - ?,
             last_updated = datetime('now')
         WHERE product_id = ?`,
        [quantityToDeduct, ingredient.ingredient_id]
      );
    }
  }
}

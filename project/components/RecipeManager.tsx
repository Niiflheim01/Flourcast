import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Plus, Trash2, ChefHat, X } from 'lucide-react-native';
import { RecipeService, RecipeIngredient } from '@/services/recipe.service.sqlite';
import { InventoryService } from '@/services/inventory.service.sqlite';
import type { InventoryItem } from '@/types/inventory';

interface RecipeManagerProps {
  productId: string;
  productName: string;
  onClose: () => void;
  onCostCalculated?: (cost: number) => void;
  currencySymbol?: string;
}

export default function RecipeManager({
  productId,
  productName,
  onClose,
  onCostCalculated,
  currencySymbol = '₱',
}: RecipeManagerProps) {
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [availableIngredients, setAvailableIngredients] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);
  const [batchSize, setBatchSize] = useState('1');
  const [editingQuantity, setEditingQuantity] = useState<{ id: string; value: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [recipeIngredients, allInventory] = await Promise.all([
        RecipeService.getRecipeIngredients(productId),
        InventoryService.getInventory(),
      ]);

      setIngredients(recipeIngredients);

      // Filter to only show ingredients that are not already in the recipe
      const ingredientProducts = allInventory.filter(
        item => item.product.product_type === 'ingredient'
      );
      setAvailableIngredients(ingredientProducts);

      // Set batch size from first ingredient if exists
      if (recipeIngredients.length > 0) {
        setBatchSize(recipeIngredients[0].batch_size.toString());
      }
    } catch (error) {
      console.error('Error loading recipe data:', error);
      Alert.alert('Error', 'Failed to load recipe data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddIngredient = async (ingredient: InventoryItem) => {
    try {
      const batch = parseFloat(batchSize) || 1;
      await RecipeService.addIngredient(productId, ingredient.product.id, 1, batch);
      await loadData();
      setShowIngredientPicker(false);
    } catch (error: any) {
      if (error.message?.includes('UNIQUE constraint')) {
        Alert.alert('Error', 'This ingredient is already in the recipe');
      } else {
        Alert.alert('Error', 'Failed to add ingredient');
      }
    }
  };

  const handleRemoveIngredient = (ingredientId: string, ingredientName: string) => {
    Alert.alert(
      'Remove Ingredient',
      `Remove ${ingredientName} from recipe?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await RecipeService.removeIngredient(ingredientId);
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove ingredient');
            }
          },
        },
      ]
    );
  };

  const handleUpdateQuantity = async (ingredientId: string, newQuantity: string) => {
    const quantity = parseFloat(newQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    try {
      await RecipeService.updateIngredientQuantity(ingredientId, quantity);
      await loadData();
      setEditingQuantity(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to update quantity');
    }
  };

  const handleUpdateBatchSize = async () => {
    const batch = parseFloat(batchSize);
    if (isNaN(batch) || batch <= 0) {
      Alert.alert('Error', 'Please enter a valid batch size');
      return;
    }

    try {
      await RecipeService.updateBatchSize(productId, batch);
      await loadData();
      Alert.alert('Success', 'Batch size updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update batch size');
    }
  };

  const calculateAndApplyCost = async () => {
    try {
      const costBreakdown = await RecipeService.calculateRecipeCost(productId);

      if (!costBreakdown) {
        Alert.alert('No Recipe', 'Add ingredients to calculate cost');
        return;
      }

      const ingredientList = costBreakdown.ingredients
        .map(ing => `• ${ing.name}: ${ing.quantity} ${ing.unit} × ${currencySymbol}${ing.cost.toFixed(2)} = ${currencySymbol}${ing.totalCost.toFixed(2)}`)
        .join('\n');

      Alert.alert(
        'Recipe Cost',
        `Total Batch Cost: ${currencySymbol}${costBreakdown.totalCost.toFixed(2)}\n` +
        `Batch Size: ${costBreakdown.batchSize} units\n` +
        `Cost Per Unit: ${currencySymbol}${costBreakdown.perUnitCost.toFixed(2)}\n\n` +
        `Ingredients:\n${ingredientList}`,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Apply Cost',
            onPress: () => {
              onCostCalculated?.(costBreakdown.perUnitCost);
              onClose();
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate cost');
    }
  };

  const getFilteredIngredients = () => {
    const usedIds = new Set(ingredients.map(i => i.ingredient_id));
    return availableIngredients.filter(item => !usedIds.has(item.product.id));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ChefHat size={20} color="#6366f1" />
          <Text style={styles.title}>Recipe: {productName}</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <X size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Batch Size */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Batch Size</Text>
          <Text style={styles.helperText}>How many units does this recipe make?</Text>
          <View style={styles.batchSizeRow}>
            <TextInput
              style={[styles.input, styles.batchSizeInput]}
              placeholder="1"
              value={batchSize}
              onChangeText={setBatchSize}
              keyboardType="number-pad"
            />
            <TouchableOpacity style={styles.updateButton} onPress={handleUpdateBatchSize}>
              <Text style={styles.updateButtonText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ingredients List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>

          {ingredients.length === 0 ? (
            <View style={styles.emptyState}>
              <ChefHat size={48} color="#cbd5e1" />
              <Text style={styles.emptyStateText}>No ingredients yet</Text>
              <Text style={styles.emptyStateSubtext}>Add ingredients to create a recipe</Text>
            </View>
          ) : (
            <View style={styles.ingredientsList}>
              {ingredients.map((ingredient) => (
                <View key={ingredient.id} style={styles.ingredientCard}>
                  <View style={styles.ingredientInfo}>
                    <Text style={styles.ingredientName}>{ingredient.ingredient_name}</Text>
                    <View style={styles.ingredientDetails}>
                      {editingQuantity?.id === ingredient.id ? (
                        <View style={styles.quantityEditRow}>
                          <TextInput
                            style={styles.quantityInput}
                            value={editingQuantity.value}
                            onChangeText={(text) => setEditingQuantity({ id: ingredient.id, value: text })}
                            keyboardType="decimal-pad"
                            autoFocus
                          />
                          <Text style={styles.ingredientUnit}>{ingredient.ingredient_unit}</Text>
                          <TouchableOpacity
                            style={styles.saveButton}
                            onPress={() => handleUpdateQuantity(ingredient.id, editingQuantity.value)}>
                            <Text style={styles.saveButtonText}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          onPress={() => setEditingQuantity({ id: ingredient.id, value: ingredient.quantity.toString() })}>
                          <Text style={styles.ingredientQuantity}>
                            {ingredient.quantity} {ingredient.ingredient_unit}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <Text style={styles.ingredientCost}>
                        {currencySymbol}{(ingredient.ingredient_cost * ingredient.quantity).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveIngredient(ingredient.id, ingredient.ingredient_name)}
                    style={styles.removeButton}>
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowIngredientPicker(true)}>
            <Plus size={16} color="#6366f1" />
            <Text style={styles.addButtonText}>Add Ingredient</Text>
          </TouchableOpacity>
        </View>

        {/* Calculate Button */}
        {ingredients.length > 0 && (
          <TouchableOpacity style={styles.calculateButton} onPress={calculateAndApplyCost}>
            <ChefHat size={20} color="#fff" />
            <Text style={styles.calculateButtonText}>Calculate & Apply Cost</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Ingredient Picker Modal */}
      <Modal
        visible={showIngredientPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIngredientPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Ingredient</Text>
              <TouchableOpacity onPress={() => setShowIngredientPicker(false)}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {getFilteredIngredients().length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No available ingredients</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Create ingredients in the Inventory tab first
                  </Text>
                </View>
              ) : (
                getFilteredIngredients().map((item) => (
                  <TouchableOpacity
                    key={item.product.id}
                    style={styles.ingredientOption}
                    onPress={() => handleAddIngredient(item)}>
                    <View>
                      <Text style={styles.ingredientOptionName}>{item.product.name}</Text>
                      <Text style={styles.ingredientOptionDetails}>
                        Stock: {item.quantity} {item.product.unit} • Cost: {currencySymbol}{item.product.cost.toFixed(2)}/{item.product.unit}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  batchSizeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  batchSizeInput: {
    flex: 1,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1e293b',
  },
  updateButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  ingredientsList: {
    gap: 12,
    marginBottom: 12,
  },
  ingredientCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  ingredientDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ingredientQuantity: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
  },
  ingredientUnit: {
    fontSize: 13,
    color: '#64748b',
  },
  ingredientCost: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '500',
  },
  quantityEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  quantityInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    padding: 6,
    fontSize: 13,
    width: 60,
  },
  saveButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderStyle: 'dashed',
    gap: 8,
  },
  addButtonText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '500',
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  ingredientOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ingredientOptionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  ingredientOptionDetails: {
    fontSize: 12,
    color: '#64748b',
  },
});

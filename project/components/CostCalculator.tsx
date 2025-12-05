import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
} from 'react-native';
import { Plus, Trash2, Calculator, X, Package } from 'lucide-react-native';

interface Ingredient {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  cost: string;
}

interface CostCalculatorProps {
  onCalculated: (perUnitCost: number) => void;
  onClose: () => void;
  currencySymbol?: string;
  userId?: string;
  availableIngredients?: Array<{ id: string; name: string; unit: string; cost: number }>;
}

export default function CostCalculator({ onCalculated, onClose, currencySymbol = '₱', userId, availableIngredients = [] }: CostCalculatorProps) {
  const [simpleMode, setSimpleMode] = useState(false);
  
  // Simple mode states
  const [simpleIngredientsCost, setSimpleIngredientsCost] = useState('');
  const [simpleLaborCost, setSimpleLaborCost] = useState('');
  const [simpleBatchSize, setSimpleBatchSize] = useState('');
  
  // Advanced mode states
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: '1', name: '', quantity: '', unit: 'kg', cost: '' },
  ]);
  const [batchSize, setBatchSize] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [utilityCost, setUtilityCost] = useState('');
  const [showIngredientPicker, setShowIngredientPicker] = useState<string | null>(null);
  const [showUnitPicker, setShowUnitPicker] = useState<string | null>(null);
  const [customUnitMode, setCustomUnitMode] = useState<{ [key: string]: boolean }>({});
  const [showHelp, setShowHelp] = useState(false);

  const unitOptions = ['piece', 'kg', 'g', 'lbs', 'oz', 'cup', 'tbsp', 'tsp', 'dozen', 'pack', 'custom'];

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      {
        id: Date.now().toString(),
        name: '',
        quantity: '',
        unit: 'kg',
        cost: '',
      },
    ]);
  };

  const removeIngredient = (id: string) => {
    if (ingredients.length === 1) {
      Alert.alert('Error', 'You need at least one ingredient');
      return;
    }
    setIngredients(ingredients.filter((ing) => ing.id !== id));
  };

  const updateIngredient = (id: string, field: keyof Ingredient, value: string) => {
    setIngredients(
      ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing))
    );
  };

  const calculateSimpleCost = () => {
    const ingredientsCost = parseFloat(simpleIngredientsCost) || 0;
    const labor = parseFloat(simpleLaborCost) || 0;
    const batch = parseFloat(simpleBatchSize) || 1;

    if (batch === 0) {
      Alert.alert('Error', 'Batch size must be greater than 0');
      return;
    }

    const totalCost = ingredientsCost + labor;
    const perUnitCost = totalCost / batch;

    Alert.alert(
      'Cost Calculation',
      `Total Batch Cost: ${currencySymbol}${totalCost.toFixed(2)}\n` +
        `Per Unit Cost: ${currencySymbol}${perUnitCost.toFixed(2)}\n\n` +
        `Formula: (Ingredients + Labor) ÷ Batch Size\n` +
        `(${currencySymbol}${ingredientsCost.toFixed(2)} + ${currencySymbol}${labor.toFixed(2)}) ÷ ${batch} = ${currencySymbol}${perUnitCost.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use This Cost',
          onPress: () => {
            onCalculated(perUnitCost);
            onClose();
          },
        },
      ]
    );
  };

  const calculateCost = () => {
    // Calculate total ingredient cost
    const ingredientTotal = ingredients.reduce((sum, ing) => {
      const cost = parseFloat(ing.cost) || 0;
      return sum + cost;
    }, 0);

    // Add labor and utility costs
    const labor = parseFloat(laborCost) || 0;
    const utility = parseFloat(utilityCost) || 0;
    const totalCost = ingredientTotal + labor + utility;

    // Calculate per-unit cost
    const batch = parseFloat(batchSize) || 1;
    const perUnitCost = totalCost / batch;

    if (batch === 0) {
      Alert.alert('Error', 'Batch size must be greater than 0');
      return;
    }

    Alert.alert(
      'Cost Calculation',
      `Total Batch Cost: ${currencySymbol}${totalCost.toFixed(2)}\n` +
        `Per Unit Cost: ${currencySymbol}${perUnitCost.toFixed(2)}\n\n` +
        `Breakdown:\n` +
        `• Ingredients: ${currencySymbol}${ingredientTotal.toFixed(2)}\n` +
        `• Labor: ${currencySymbol}${labor.toFixed(2)}\n` +
        `• Utilities: ${currencySymbol}${utility.toFixed(2)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Use This Cost',
          onPress: () => {
            onCalculated(perUnitCost);
            onClose();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior="padding"
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Calculator size={24} color="#8B6F47" />
            <Text style={styles.title}>Cost Calculator</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#8B6F47" />
          </TouchableOpacity>
        </View>

        <View style={styles.modeToggle}>
          <Text style={styles.modeLabel}>Simple Mode</Text>
          <Switch
            value={simpleMode}
            onValueChange={setSimpleMode}
            trackColor={{ false: '#D4BA9C', true: '#C89D5E' }}
            thumbColor={simpleMode ? '#8B6F47' : '#F5E6D3'}
          />
        </View>

        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {simpleMode ? (
          // Simple Mode UI
          <View style={styles.simpleMode}>
            <Text style={styles.simpleModeTitle}>Quick Cost Estimate</Text>
            <Text style={styles.formula}>Formula: (Ingredients + Labor) ÷ Batch Size</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Total Ingredients Cost ({currencySymbol})</Text>
              <TextInput
                style={styles.input}
                placeholder="Total cost of all ingredients"
                placeholderTextColor="#8B7355"
                value={simpleIngredientsCost}
                onChangeText={setSimpleIngredientsCost}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Labor Cost ({currencySymbol})</Text>
              <TextInput
                style={styles.input}
                placeholder="Total labor/overhead cost"
                placeholderTextColor="#8B7355"
                value={simpleLaborCost}
                onChangeText={setSimpleLaborCost}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Batch Size (units)</Text>
              <TextInput
                style={styles.input}
                placeholder="How many units does this make?"
                placeholderTextColor="#8B7355"
                value={simpleBatchSize}
                onChangeText={setSimpleBatchSize}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={styles.calculateButton} onPress={calculateSimpleCost}>
              <Calculator size={20} color="#FFFFFF" />
              <Text style={styles.calculateButtonText}>Calculate Cost</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // Advanced Mode UI
          <>
          <Text style={styles.sectionTitle}>Ingredients</Text>

        {ingredients.map((ingredient, index) => (
          <View key={ingredient.id} style={styles.ingredientRow}>
            <Text style={styles.ingredientNumber}>{index + 1}</Text>
            <View style={styles.ingredientInputs}>
              <View style={styles.ingredientNameRow}>
                <TextInput
                  style={[styles.input, styles.ingredientName]}
                  placeholder="Ingredient name"
                  placeholderTextColor="#94a3b8"
                  value={ingredient.name}
                  onChangeText={(text) => updateIngredient(ingredient.id, 'name', text)}
                />
                {availableIngredients.length > 0 && (
                  <TouchableOpacity
                    style={styles.fetchButton}
                    onPress={() => setShowIngredientPicker(showIngredientPicker === ingredient.id ? null : ingredient.id)}>
                    <Package size={20} color="#8B6F47" />
                  </TouchableOpacity>
                )}
              </View>
              {showIngredientPicker === ingredient.id && availableIngredients.length > 0 && (
                <View style={styles.ingredientPickerDropdown}>
                  <ScrollView style={styles.ingredientPickerScroll} nestedScrollEnabled>
                    {availableIngredients.map((ing) => (
                      <TouchableOpacity
                        key={ing.id}
                        style={styles.ingredientOption}
                        onPress={() => {
                          setIngredients(ingredients.map((i) => 
                            i.id === ingredient.id 
                              ? { ...i, name: ing.name, unit: ing.unit, cost: ing.cost.toString() }
                              : i
                          ));
                          setShowIngredientPicker(null);
                          setShowUnitPicker(null);
                        }}>
                        <Text style={styles.ingredientOptionText}>
                          {ing.name} ({ing.unit}) - {currencySymbol}{ing.cost.toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              <View style={styles.ingredientDetails}>
                <TextInput
                  style={[styles.input, styles.smallInput]}
                  placeholder="Qty"
                  placeholderTextColor="#94a3b8"
                  value={ingredient.quantity}
                  onChangeText={(text) => updateIngredient(ingredient.id, 'quantity', text)}
                  keyboardType="decimal-pad"
                />
                {customUnitMode[ingredient.id] ? (
                  <View style={styles.customUnitContainer}>
                    <TextInput
                      style={[styles.input, styles.smallInput, styles.customUnitInput]}
                      placeholder="Unit"
                      placeholderTextColor="#94a3b8"
                      value={ingredient.unit}
                      onChangeText={(text) => updateIngredient(ingredient.id, 'unit', text)}
                    />
                    <TouchableOpacity
                      style={styles.switchToDropdown}
                      onPress={() => {
                        setCustomUnitMode({ ...customUnitMode, [ingredient.id]: false });
                        setShowUnitPicker(ingredient.id);
                      }}>
                      <Text style={styles.switchText}>⌄</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.unitPickerContainer}>
                    <TouchableOpacity
                      style={[styles.input, styles.smallInput, styles.unitPickerButton]}
                      onPress={() => setShowUnitPicker(showUnitPicker === ingredient.id ? null : ingredient.id)}>
                      <Text style={[styles.unitPickerText, !ingredient.unit && styles.placeholderText]}>
                        {ingredient.unit || 'Unit'}
                      </Text>
                      <Text style={styles.dropdownArrow}>⌄</Text>
                    </TouchableOpacity>
                    {showUnitPicker === ingredient.id && (
                      <View style={styles.unitPickerDropdown}>
                        <ScrollView style={styles.unitPickerScroll} nestedScrollEnabled>
                          {unitOptions.map((unit) => (
                            <TouchableOpacity
                              key={unit}
                              style={styles.unitOption}
                              onPress={() => {
                                if (unit === 'custom') {
                                  setCustomUnitMode({ ...customUnitMode, [ingredient.id]: true });
                                  updateIngredient(ingredient.id, 'unit', '');
                                  setShowUnitPicker(null);
                                } else {
                                  updateIngredient(ingredient.id, 'unit', unit);
                                  setShowUnitPicker(null);
                                }
                              }}>
                              <Text style={styles.unitOptionText}>
                                {unit === 'custom' ? '✏️ Custom...' : unit}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}
                <View style={styles.currencyInputContainer}>
                  <Text style={styles.currencySymbol}>{currencySymbol}</Text>
                  <TextInput
                    style={[styles.input, styles.mediumInput, styles.currencyInput]}
                    placeholder="0"
                    placeholderTextColor="#94a3b8"
                    value={ingredient.cost}
                    onChangeText={(text) => updateIngredient(ingredient.id, 'cost', text)}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
            </View>
            {ingredients.length > 1 && (
              <TouchableOpacity
                onPress={() => removeIngredient(ingredient.id)}
                style={styles.deleteButton}>
                <Trash2 size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
          <Plus size={16} color="#2563eb" />
          <Text style={styles.addButtonText}>Add Ingredient</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Additional Costs (Optional)</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Labor Cost</Text>
          <TextInput
            style={styles.input}
            placeholder={`${currencySymbol}0`}
            placeholderTextColor="#94a3b8"
            value={laborCost}
            onChangeText={setLaborCost}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Utility Cost</Text>
          <TextInput
            style={styles.input}
            placeholder={`${currencySymbol}0`}
            placeholderTextColor="#94a3b8"
            value={utilityCost}
            onChangeText={setUtilityCost}
            keyboardType="decimal-pad"
          />
        </View>

        <Text style={styles.sectionTitle}>Batch Size *</Text>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Pieces Produced</Text>
          <TextInput
            style={styles.input}
            placeholder="100"
            placeholderTextColor="#94a3b8"
            value={batchSize}
            onChangeText={setBatchSize}
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity style={styles.calculateButton} onPress={calculateCost}>
          <Calculator size={20} color="#FFFFFF" />
          <Text style={styles.calculateButtonText}>Calculate Cost</Text>
        </TouchableOpacity>
          </>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Help Modal */}
      <Modal
        visible={showHelp}
        animationType="slide"
        transparent
        onRequestClose={() => setShowHelp(false)}>
        <View style={styles.helpModalOverlay}>
          <View style={styles.helpModalContent}>
            <View style={styles.helpHeader}>
              <Text style={styles.helpTitle}>Cost Calculator Guide</Text>
              <TouchableOpacity onPress={() => setShowHelp(false)}>
                <Text style={styles.helpCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.helpScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>What does this calculate?</Text>
                <Text style={styles.helpText}>
                  Calculates the cost to make one piece of your product.
                </Text>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>How to use:</Text>
                
                <View style={styles.helpStep}>
                  <Text style={styles.helpStepNumber}>1.</Text>
                  <View style={styles.helpStepContent}>
                    <Text style={styles.helpStepTitle}>Ingredients</Text>
                    <Text style={styles.helpText}>
                      Add all ingredients with their quantity and cost. Use the box icon to select from inventory.
                    </Text>
                  </View>
                </View>

                <View style={styles.helpStep}>
                  <Text style={styles.helpStepNumber}>2.</Text>
                  <View style={styles.helpStepContent}>
                    <Text style={styles.helpStepTitle}>Labor & Utilities</Text>
                    <Text style={styles.helpText}>
                      Add labor pay and electricity/gas costs (optional).
                    </Text>
                  </View>
                </View>

                <View style={styles.helpStep}>
                  <Text style={styles.helpStepNumber}>3.</Text>
                  <View style={styles.helpStepContent}>
                    <Text style={styles.helpStepTitle}>Batch Size</Text>
                    <Text style={styles.helpText}>
                      Enter how many pieces this recipe makes.
                    </Text>
                  </View>
                </View>

                <View style={styles.helpStep}>
                  <Text style={styles.helpStepNumber}>4.</Text>
                  <View style={styles.helpStepContent}>
                    <Text style={styles.helpStepTitle}>Calculate</Text>
                    <Text style={styles.helpText}>
                      Click the button to see your cost per piece.
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.helpSection}>
                <Text style={styles.helpSectionTitle}>Example:</Text>
                <Text style={styles.helpText}>
                  Flour: 2 kg = {currencySymbol}100{'\n'}
                  Sugar: 0.5 kg = {currencySymbol}30{'\n'}
                  Labor: {currencySymbol}50{'\n'}
                  Batch: 100 pieces{'\n\n'}
                  Result: {currencySymbol}1.80 per piece
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.helpGotItButton}
              onPress={() => setShowHelp(false)}>
              <Text style={styles.helpGotItButtonText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8DCC8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F5E6D3',
    borderBottomWidth: 1,
    borderBottomColor: '#D4BA9C',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B5439',
  },
  closeButton: {
    padding: 4,
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5E6D3',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#D4BA9C',
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5439',
  },
  scrollContent: {
    flex: 1,
    padding: 16,
  },
  simpleMode: {
    gap: 16,
  },
  simpleModeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B5439',
    textAlign: 'center',
  },
  formula: {
    fontSize: 14,
    color: '#8B7355',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5439',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5439',
    marginTop: 8,
    marginBottom: 8,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  ingredientNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  ingredientInputs: {
    flex: 1,
    gap: 8,
  },
  ingredientNameRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  ingredientName: {
    flex: 1,
  },
  fetchButton: {
    backgroundColor: '#eff6ff',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  fetchButtonText: {
    fontSize: 20,
  },
  ingredientPickerDropdown: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    maxHeight: 150,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ingredientPickerScroll: {
    maxHeight: 150,
  },
  ingredientOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ingredientOptionText: {
    fontSize: 14,
    color: '#1e293b',
  },
  ingredientDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4BA9C',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#6B5439',
  },
  smallInput: {
    flex: 1,
    minWidth: 50,
  },
  mediumInput: {
    flex: 1.5,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#F5E6D3',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4BA9C',
    borderStyle: 'dashed',
    gap: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: '#8B6F47',
    fontSize: 14,
    fontWeight: '500',
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  calculateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B6F47',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  calculateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  helpButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  helpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  helpModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '90%',
    padding: 20,
  },
  helpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  helpTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  helpCloseButton: {
    fontSize: 28,
    color: '#64748b',
    fontWeight: '300',
  },
  helpScrollView: {
    maxHeight: '75%',
  },
  helpSection: {
    marginBottom: 24,
  },
  helpSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  helpText: {
    fontSize: 15,
    color: '#475569',
    lineHeight: 22,
  },
  helpStep: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  helpStepNumber: {
    fontSize: 24,
    lineHeight: 28,
  },
  helpStepContent: {
    flex: 1,
  },
  helpStepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  helpGotItButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  helpGotItButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  customUnitContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customUnitInput: {
    flex: 1,
  },
  switchToDropdown: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
  },
  switchText: {
    fontSize: 16,
    color: '#64748b',
  },
  unitPickerContainer: {
    flex: 1,
    position: 'relative',
  },
  unitPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 8,
  },
  unitPickerText: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  placeholderText: {
    color: '#94a3b8',
  },
  dropdownArrow: {
    fontSize: 16,
    color: '#64748b',
    marginLeft: 4,
  },
  unitPickerDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    maxHeight: 200,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  unitPickerScroll: {
    maxHeight: 200,
  },
  unitOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  unitOptionText: {
    fontSize: 14,
    color: '#1e293b',
  },
  currencyInputContainer: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingLeft: 12,
    overflow: 'hidden',
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginRight: 4,
  },
  currencyInput: {
    borderWidth: 0,
    paddingLeft: 0,
    flex: 1,
  },
});

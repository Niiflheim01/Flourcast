import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ProductService } from '@/services/product.service.sqlite';
import { InventoryService } from '@/services/inventory.service.sqlite';
import { Product, InventoryWithProduct } from '@/types/database';
import { Plus, Package, AlertTriangle, Edit, Minus, LayoutGrid, List, Image as ImageIcon, Calculator, ChefHat } from 'lucide-react-native';
import ImagePickerButton from '@/components/ImagePickerButton';
import CostCalculator from '@/components/CostCalculator';
import RecipeManager from '@/components/RecipeManager';
import { Image } from 'react-native';
import { getCurrencySymbol } from '@/lib/currency';
import { searchProductImages, downloadImage } from '@/lib/auto-image';

export default function InventoryScreen() {
  const { user, profile } = useAuth();
  const currencySymbol = getCurrencySymbol(profile?.currency || 'PHP');
  const [inventory, setInventory] = useState<InventoryWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [editProductModalVisible, setEditProductModalVisible] = useState(false);
  const [updateStockModalVisible, setUpdateStockModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryWithProduct | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    cost: '',
    unit: 'piece',
    initialStock: '',
    productType: 'product' as 'product' | 'ingredient',
    imageUri: null as string | null,
  });
  const [editProduct, setEditProduct] = useState({
    id: '',
    name: '',
    price: '',
    cost: '',
    unit: 'piece',
    productType: 'product' as 'product' | 'ingredient',
    imageUri: null as string | null,
    currentStock: '',
    inventoryId: '',
  });
  const [stockUpdate, setStockUpdate] = useState({
    quantity: '',
    action: 'add' as 'add' | 'remove' | 'set',
  });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [costCalculatorVisible, setCostCalculatorVisible] = useState(false);
  const [recipeManagerVisible, setRecipeManagerVisible] = useState(false);
  const [recipeProductId, setRecipeProductId] = useState<string>('');
  const [recipeProductName, setRecipeProductName] = useState<string>('');
  const [showUnitPicker, setShowUnitPicker] = useState(false);
  const [showCustomUnit, setShowCustomUnit] = useState(false);
  const [showEditUnitPicker, setShowEditUnitPicker] = useState(false);
  const [showEditCustomUnit, setShowEditCustomUnit] = useState(false);
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'product' | 'ingredient'>('all');
  const [searchingImage, setSearchingImage] = useState(false);
  const [imageGalleryVisible, setImageGalleryVisible] = useState(false);
  const [galleryImages, setGalleryImages] = useState<Array<{url: string, photographer: string}>>([]);
  const [imageSearchKeyword, setImageSearchKeyword] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [actionSheetItem, setActionSheetItem] = useState<InventoryWithProduct | null>(null);

  const commonUnits = [
    'piece',
    'pcs',
    'dozen',
    'loaf',
    'pack',
    'kg',
    'gram',
    'liter',
    'ml',
    'box',
    'tray',
    'custom',
  ];

  useEffect(() => {
    loadInventory();
  }, [user]);

  const loadInventory = async () => {
    if (!user) return;
    try {
      const data = await InventoryService.getInventory(user.uid);
      setInventory(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInventory();
  }, [user]);

  const handleAddProduct = async () => {
    if (!user || !newProduct.name) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }

    try {
      setLoading(true);

      // Auto-fetch image for known products/ingredients if user didn't provide one
      let finalImageUri = newProduct.imageUri;
      try {
        const autoImageUri = await autoFetchProductImage(newProduct.name, newProduct.imageUri);
        if (autoImageUri) {
          finalImageUri = autoImageUri;
          const itemType = newProduct.productType === 'ingredient' ? 'ingredient' : 'product';
          console.log(`Auto-fetched image for ${itemType}:`, newProduct.name);
        }
      } catch (error) {
        // Don't fail product creation if image fetch fails
        console.warn('Failed to auto-fetch image:', error);
      }

      const product = await ProductService.createProduct(user.uid, {
        name: newProduct.name,
        price: parseFloat(newProduct.price) || 0,
        cost: parseFloat(newProduct.cost) || 0,
        unit: newProduct.unit,
        product_type: newProduct.productType,
        image_url: finalImageUri,
      });

      // Update initial stock if provided
      const initialStock = parseFloat(newProduct.initialStock);
      if (product && !isNaN(initialStock) && initialStock > 0) {
        const inventory = await InventoryService.getInventoryByProduct(user.uid, product.id);
        if (inventory) {
          await InventoryService.updateInventory(inventory.id, initialStock);
        }
      }

      Keyboard.dismiss();
      setAddProductModalVisible(false);
      setNewProduct({ name: '', price: '', cost: '', unit: 'piece', initialStock: '', productType: 'product', imageUri: null });
      await loadInventory();

      const itemType = newProduct.productType === 'ingredient' ? 'Ingredient' : 'Product';
      const successMessage = finalImageUri && !newProduct.imageUri
        ? `${itemType} added with auto-fetched image!`
        : `${itemType} added successfully`;
      Alert.alert('Success', successMessage);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditProduct = (item: InventoryWithProduct) => {
    setEditProduct({
      id: item.product.id,
      name: item.product.name || '',
      price: item.product.price?.toString() || '',
      cost: item.product.cost?.toString() || '',
      unit: item.product.unit || 'piece',
      productType: (item.product.product_type || 'product') as 'product' | 'ingredient',
      imageUri: item.product.image_url || null,
      currentStock: item.quantity?.toString() || '0',
      inventoryId: item.id,
    });
    setEditProductModalVisible(true);
  };

  const handleSearchImage = (productName: string, isEdit: boolean = false) => {
    if (!productName.trim()) {
      Alert.alert('Error', 'Please enter a product name first');
      return;
    }
    setImageSearchKeyword(productName);
    setIsEditMode(isEdit);
    setImageGalleryVisible(true);
  };

  const searchImages = async () => {
    if (!imageSearchKeyword.trim()) {
      Alert.alert('Error', 'Please enter a search keyword');
      return;
    }

    setSearchingImage(true);
    try {
      const images = await searchProductImages(imageSearchKeyword);
      if (images.length > 0) {
        setGalleryImages(images);
      } else {
        Alert.alert('No Images Found', 'Try a different search term');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to search for images');
    } finally {
      setSearchingImage(false);
    }
  };

  const selectImageFromGallery = async (imageUrl: string) => {
    setSearchingImage(true);
    try {
      const localUri = await downloadImage(imageUrl);
      if (localUri) {
        if (isEditMode) {
          setEditProduct({ ...editProduct, imageUri: localUri });
        } else {
          setNewProduct({ ...newProduct, imageUri: localUri });
        }
        setImageGalleryVisible(false);
        setGalleryImages([]);
        setImageSearchKeyword('');
        Alert.alert('Success', 'Image added!');
      } else {
        Alert.alert('Error', 'Failed to download image');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to download image');
    } finally {
      setSearchingImage(false);
    }
  };

  const handleDeleteProduct = async () => {
    Alert.alert(
      'Delete Product',
      `Are you sure you want to delete "${editProduct.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await ProductService.deleteProduct(editProduct.id);
              setEditProductModalVisible(false);
              loadInventory();
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const handleEditProduct = async () => {
    if (!editProduct.name) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }

    try {
      // Update product details
      await ProductService.updateProduct(editProduct.id, {
        name: editProduct.name,
        price: parseFloat(editProduct.price) || 0,
        cost: parseFloat(editProduct.cost) || 0,
        unit: editProduct.unit,
        product_type: editProduct.productType,
        image_url: editProduct.imageUri,
      });

      // Update inventory stock if changed
      if (editProduct.inventoryId && editProduct.currentStock !== undefined) {
        const newStock = parseFloat(editProduct.currentStock) || 0;
        await InventoryService.updateInventory(editProduct.inventoryId, newStock);
      }

      Keyboard.dismiss();
      setEditProductModalVisible(false);
      setEditProduct({ id: '', name: '', price: '', cost: '', unit: 'piece', productType: 'product', imageUri: null, currentStock: '', inventoryId: '' });
      await loadInventory();
      Alert.alert('Success', 'Product updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedItem || !stockUpdate.quantity) return;

    const quantity = parseInt(stockUpdate.quantity);
    let newQuantity = selectedItem.quantity;

    if (stockUpdate.action === 'add') {
      newQuantity += quantity;
    } else if (stockUpdate.action === 'remove') {
      newQuantity = Math.max(0, newQuantity - quantity);
    } else {
      newQuantity = quantity;
    }

    try {
      await InventoryService.updateInventory(selectedItem.id, newQuantity);
      setUpdateStockModalVisible(false);
      setStockUpdate({ quantity: '', action: 'add' });
      setSelectedItem(null);
      loadInventory();
      Alert.alert('Success', 'Stock updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const openUpdateStock = (item: InventoryWithProduct) => {
    setSelectedItem(item);
    setUpdateStockModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const lowStockItems = inventory.filter(item => item.quantity <= item.min_threshold);

  const filteredInventory = inventory.filter(item => {
    if (productTypeFilter === 'all') return true;
    return item.product.product_type === productTypeFilter;
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {lowStockItems.length > 0 && (
          <View style={styles.alertSection}>
            <View style={styles.alertHeader}>
              <AlertTriangle size={20} color="#dc2626" />
              <Text style={styles.alertTitle}>Low Stock Alert</Text>
            </View>
            <Text style={styles.alertText}>
              {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} running low
            </Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.title}>Products & Stock</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.viewToggle}
              onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}>
              {viewMode === 'list' ? (
                <LayoutGrid size={20} color="#6b7280" />
              ) : (
                <List size={20} color="#6b7280" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterTab, productTypeFilter === 'all' && styles.filterTabActive]}
            onPress={() => setProductTypeFilter('all')}>
            <Text style={[styles.filterTabText, productTypeFilter === 'all' && styles.filterTabTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, productTypeFilter === 'product' && styles.filterTabActive]}
            onPress={() => setProductTypeFilter('product')}>
            <Text style={[styles.filterTabText, productTypeFilter === 'product' && styles.filterTabTextActive]}>
              Products
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, productTypeFilter === 'ingredient' && styles.filterTabActive]}
            onPress={() => setProductTypeFilter('ingredient')}>
            <Text style={[styles.filterTabText, productTypeFilter === 'ingredient' && styles.filterTabTextActive]}>
              Ingredients
            </Text>
          </TouchableOpacity>
        </View>

        {filteredInventory.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No Products Yet</Text>
            <Text style={styles.emptyText}>Add your first product to start tracking inventory</Text>
          </View>
        ) : viewMode === 'grid' ? (
          <View style={styles.gridContainer}>
            {filteredInventory.map((item) => (
              <View key={item.id} style={styles.gridItem}>
                <TouchableOpacity
                  style={styles.gridItemTouchable}
                  onPress={() => {
                    setActionSheetItem(item);
                    setActionSheetVisible(true);
                  }}>
                  <View style={styles.gridImageContainer}>
                    {item.product?.image_url ? (
                      <Image
                        source={{ uri: item.product.image_url }}
                        style={styles.gridImage}
                      />
                    ) : (
                      <View style={styles.gridImagePlaceholder}>
                        <ImageIcon size={32} color="#d1d5db" />
                      </View>
                    )}
                    {item.quantity <= item.min_threshold && (
                      <View style={styles.lowStockBadge}>
                        <AlertTriangle size={12} color="#fff" />
                      </View>
                    )}
                  </View>
                  <View style={styles.gridInfo}>
                    <Text style={styles.gridProductName} numberOfLines={2}>
                      {item.product?.name}
                    </Text>
                    <Text style={styles.gridStock}>
                      {item.quantity} {item.product?.unit}
                    </Text>
                    <Text style={styles.gridPrice}>{currencySymbol}{Number(item.product?.price).toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.gridEditButton}
                  onPress={() => openEditProduct(item)}>
                  <Edit size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.productList}>
            {filteredInventory.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.productCard}
                onPress={() => {
                  setActionSheetItem(item);
                  setActionSheetVisible(true);
                }}>
                {item.product?.image_url && (
                  <Image
                    source={{ uri: item.product.image_url }}
                    style={styles.productImage}
                  />
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.product?.name}</Text>
                  <Text style={styles.productUnit}>{item.product?.unit}</Text>
                  <Text style={styles.productPrice}>{currencySymbol}{Number(item.product?.price).toFixed(2)}</Text>
                </View>
                <View style={styles.stockInfo}>
                  <Text
                    style={[
                      styles.stockQuantity,
                      item.quantity <= item.min_threshold && styles.stockLow,
                    ]}>
                    {item.quantity}
                  </Text>
                  <Text style={styles.stockLabel}>in stock</Text>
                  <Edit size={16} color="#6b7280" style={styles.editIcon} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setAddProductModalVisible(true)}
        activeOpacity={0.8}>
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <Modal
        visible={addProductModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddProductModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add New Product</Text>
                
                <ScrollView 
                  style={styles.modalScrollView}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
                  <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Product Image (Optional)</Text>
                  <View style={styles.imagePickerContainer}>
                    <ImagePickerButton
                      currentImageUri={newProduct.imageUri}
                      onImageSelected={(uri) => setNewProduct({ ...newProduct, imageUri: uri })}
                      type="product"
                      size={100}
                    />
                  </View>
                  <Text style={styles.helperText}>
                    Take a photo or upload from your gallery
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Type *</Text>
                  <View style={styles.typeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        newProduct.productType === 'product' && styles.typeButtonActive,
                      ]}
                      onPress={() => setNewProduct({ ...newProduct, productType: 'product' })}>
                      <Text
                        style={[
                          styles.typeButtonText,
                          newProduct.productType === 'product' && styles.typeButtonTextActive,
                        ]}>
                        Product
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        newProduct.productType === 'ingredient' && styles.typeButtonActive,
                      ]}
                      onPress={() => setNewProduct({ ...newProduct, productType: 'ingredient', price: '0' })}>
                      <Text
                        style={[
                          styles.typeButtonText,
                          newProduct.productType === 'ingredient' && styles.typeButtonTextActive,
                        ]}>
                        Ingredient
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.helperText}>
                    {newProduct.productType === 'product'
                      ? 'Products can be sold to customers'
                      : 'Ingredients are for tracking stock only (not sold directly)'}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={newProduct.productType === 'product' ? 'e.g., Pandesal, Ensaymada' : 'e.g., Flour, Sugar, Butter'}
                    placeholderTextColor="#94a3b8"
                    value={newProduct.name}
                    onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
                  />
                </View>

                {newProduct.productType === 'product' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Selling Price ({currencySymbol}) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={`e.g., ${currencySymbol}5.00`}
                      placeholderTextColor="#94a3b8"
                      value={newProduct.price}
                      onChangeText={(text) => setNewProduct({ ...newProduct, price: text })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <View style={styles.costHeaderRow}>
                    <Text style={styles.inputLabel}>
                      {newProduct.productType === 'product' ? 'Cost Per Unit' : 'Purchase Price'} ({currencySymbol}) - Optional
                    </Text>
                    {newProduct.productType === 'product' && (
                      <TouchableOpacity
                        style={styles.calculateCostButton}
                        onPress={() => {
                          setAddProductModalVisible(false);
                          setCostCalculatorVisible(true);
                        }}>
                        <Calculator size={14} color="#8B6F47" />
                        <Text style={styles.calculateCostButtonText}>Calculator</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder={`e.g., ${currencySymbol}3.00`}
                    placeholderTextColor="#94a3b8"
                    value={newProduct.cost}
                    onChangeText={(text) => setNewProduct({ ...newProduct, cost: text })}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.helperText}>
                    {newProduct.productType === 'product'
                      ? 'Optional: Enter if you know your cost. Use calculator if you need to add up ingredients, labor, etc.'
                      : 'Optional: How much you pay when buying this ingredient'}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Unit *</Text>
                  {showCustomUnit ? (
                    <View style={styles.customUnitContainer}>
                      <TextInput
                        style={[styles.input, styles.customUnitInput]}
                        placeholder="Enter custom unit"
                        placeholderTextColor="#94a3b8"
                        value={newProduct.unit}
                        onChangeText={(text) => setNewProduct({ ...newProduct, unit: text })}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={styles.backToPickerButton}
                        onPress={() => {
                          setShowCustomUnit(false);
                          setNewProduct({ ...newProduct, unit: 'piece' });
                        }}>
                        <Text style={styles.backToPickerText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.unitPickerButton}
                        onPress={() => setShowUnitPicker(!showUnitPicker)}>
                        <Text style={styles.unitPickerButtonText}>
                          {newProduct.unit || 'Select unit'}
                        </Text>
                        <Text style={styles.unitPickerArrow}>▼</Text>
                      </TouchableOpacity>
                      {showUnitPicker && (
                        <View style={styles.unitPickerDropdown}>
                          <ScrollView style={styles.unitPickerScroll} nestedScrollEnabled>
                            {commonUnits.map((unit) => (
                              <TouchableOpacity
                                key={unit}
                                style={[
                                  styles.unitOption,
                                  newProduct.unit === unit && styles.unitOptionSelected,
                                ]}
                                onPress={() => {
                                  if (unit === 'custom') {
                                    setShowCustomUnit(true);
                                    setShowUnitPicker(false);
                                    setNewProduct({ ...newProduct, unit: '' });
                                  } else {
                                    setNewProduct({ ...newProduct, unit: unit });
                                    setShowUnitPicker(false);
                                  }
                                }}>
                                <Text
                                  style={[
                                    styles.unitOptionText,
                                    newProduct.unit === unit && styles.unitOptionTextSelected,
                                    unit === 'custom' && styles.customOptionText,
                                  ]}>
                                  {unit === 'custom' ? 'Custom Unit...' : unit}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Initial Stock - Optional</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 50"
                    placeholderTextColor="#94a3b8"
                    value={newProduct.initialStock}
                    onChangeText={(text) => setNewProduct({ ...newProduct, initialStock: text })}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.helperText}>
                    Set the starting quantity in stock (you can update this later)
                  </Text>
                </View>
                </ScrollView>

                <View style={styles.modalButtonsFixed}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setAddProductModalVisible(false);
                      setNewProduct({ name: '', price: '', cost: '', unit: 'piece', initialStock: '', productType: 'product', imageUri: null });
                    }}
                    disabled={loading}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={handleAddProduct}
                    disabled={loading}>
                    {loading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.saveButtonText}>Add Product</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={editProductModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditProductModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Edit Product</Text>
                <Text style={styles.modalSubtitle}>Update all product details and stock</Text>
                
                <ScrollView 
                  style={styles.modalScrollView}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled">
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Product Image (Optional)</Text>
                  <View style={styles.imagePickerContainer}>
                    <ImagePickerButton
                      currentImageUri={editProduct.imageUri}
                      onImageSelected={(uri) => setEditProduct({ ...editProduct, imageUri: uri })}
                      type="product"
                      size={100}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Type *</Text>
                  <View style={styles.typeSelector}>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        editProduct.productType === 'product' && styles.typeButtonActive,
                      ]}
                      onPress={() => setEditProduct({ ...editProduct, productType: 'product' })}>
                      <Text
                        style={[
                          styles.typeButtonText,
                          editProduct.productType === 'product' && styles.typeButtonTextActive,
                        ]}>
                        Product
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.typeButton,
                        editProduct.productType === 'ingredient' && styles.typeButtonActive,
                      ]}
                      onPress={() => setEditProduct({ ...editProduct, productType: 'ingredient', price: '0' })}>
                      <Text
                        style={[
                          styles.typeButtonText,
                          editProduct.productType === 'ingredient' && styles.typeButtonTextActive,
                        ]}>
                        Ingredient
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.helperText}>
                    {editProduct.productType === 'product'
                      ? 'Products can be sold to customers'
                      : 'Ingredients are for tracking stock only (not sold directly)'}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={editProduct.productType === 'product' ? 'e.g., Pandesal, Ensaymada' : 'e.g., Flour, Sugar, Butter'}
                    placeholderTextColor="#94a3b8"
                    value={editProduct.name}
                    onChangeText={(text) => setEditProduct({ ...editProduct, name: text })}
                  />
                </View>

                {editProduct.productType === 'product' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Selling Price ({currencySymbol}) *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={`e.g., ${currencySymbol}5.00`}
                      placeholderTextColor="#94a3b8"
                      value={editProduct.price}
                      onChangeText={(text) => setEditProduct({ ...editProduct, price: text })}
                      keyboardType="decimal-pad"
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <View style={styles.labelWithAction}>
                    <Text style={styles.inputLabel}>
                      {editProduct.productType === 'product' ? 'Cost Per Unit' : 'Purchase Price'} ({currencySymbol}) - Optional
                    </Text>
                    {editProduct.productType === 'product' && (
                      <TouchableOpacity
                        style={styles.calculateCostButton}
                        onPress={() => {
                          setEditProductModalVisible(false);
                          setIsEditMode(true);
                          setCostCalculatorVisible(true);
                        }}>
                        <Calculator size={14} color="#8B6F47" />
                        <Text style={styles.calculateCostButtonText}>Calculator</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder={`e.g., ${currencySymbol}3.00`}
                    placeholderTextColor="#94a3b8"
                    value={editProduct.cost}
                    onChangeText={(text) => setEditProduct({ ...editProduct, cost: text })}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.helperText}>
                    {editProduct.productType === 'product'
                      ? 'Optional: Your cost to make this item. Use calculator if needed.'
                      : 'Optional: How much you pay when buying this ingredient'}
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Unit *</Text>
                  {showEditCustomUnit ? (
                    <View style={styles.customUnitContainer}>
                      <TextInput
                        style={[styles.input, styles.customUnitInput]}
                        placeholder="Enter custom unit"
                        placeholderTextColor="#94a3b8"
                        value={editProduct.unit}
                        onChangeText={(text) => setEditProduct({ ...editProduct, unit: text })}
                        autoFocus
                      />
                      <TouchableOpacity
                        style={styles.backToPickerButton}
                        onPress={() => {
                          setShowEditCustomUnit(false);
                          setEditProduct({ ...editProduct, unit: 'piece' });
                        }}>
                        <Text style={styles.backToPickerText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        style={styles.unitPickerButton}
                        onPress={() => setShowEditUnitPicker(!showEditUnitPicker)}>
                        <Text style={styles.unitPickerButtonText}>
                          {editProduct.unit || 'Select unit'}
                        </Text>
                        <Text style={styles.unitPickerArrow}>▼</Text>
                      </TouchableOpacity>
                      {showEditUnitPicker && (
                        <View style={styles.unitPickerDropdown}>
                          <ScrollView style={styles.unitPickerScroll} nestedScrollEnabled>
                            {commonUnits.map((unit) => (
                              <TouchableOpacity
                                key={unit}
                                style={[
                                  styles.unitOption,
                                  editProduct.unit === unit && styles.unitOptionSelected,
                                ]}
                                onPress={() => {
                                  if (unit === 'custom') {
                                    setShowEditCustomUnit(true);
                                    setShowEditUnitPicker(false);
                                    setEditProduct({ ...editProduct, unit: '' });
                                  } else {
                                    setEditProduct({ ...editProduct, unit: unit });
                                    setShowEditUnitPicker(false);
                                  }
                                }}>
                                <Text
                                  style={[
                                    styles.unitOptionText,
                                    editProduct.unit === unit && styles.unitOptionTextSelected,
                                    unit === 'custom' && styles.customOptionText,
                                  ]}>
                                  {unit === 'custom' ? 'Custom Unit...' : unit}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Stock</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 25"
                    placeholderTextColor="#94a3b8"
                    value={editProduct.currentStock}
                    onChangeText={(text) => setEditProduct({ ...editProduct, currentStock: text })}
                    keyboardType="numeric"
                  />
                  <Text style={styles.helperText}>
                    Update the quantity in stock
                  </Text>
                </View>
                </ScrollView>

                <View style={styles.modalButtonsFixed}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteProduct}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setEditProductModalVisible(false);
                      setEditProduct({ id: '', name: '', price: '', cost: '', unit: 'piece', productType: 'product', imageUri: null, currentStock: '', inventoryId: '' });
                    }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleEditProduct}>
                    <Text style={styles.saveButtonText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={updateStockModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setUpdateStockModalVisible(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Update Stock</Text>
                <Text style={styles.modalSubtitle}>{selectedItem?.product?.name}</Text>
                <Text style={styles.currentStock}>Current: {selectedItem?.quantity} {selectedItem?.product?.unit}</Text>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, stockUpdate.action === 'add' && styles.actionButtonActive]}
                    onPress={() => setStockUpdate({ ...stockUpdate, action: 'add' })}>
                    <Text style={[styles.actionButtonText, stockUpdate.action === 'add' && styles.actionButtonTextActive]}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, stockUpdate.action === 'remove' && styles.actionButtonActive]}
                    onPress={() => setStockUpdate({ ...stockUpdate, action: 'remove' })}>
                    <Text style={[styles.actionButtonText, stockUpdate.action === 'remove' && styles.actionButtonTextActive]}>Remove</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, stockUpdate.action === 'set' && styles.actionButtonActive]}
                    onPress={() => setStockUpdate({ ...stockUpdate, action: 'set' })}>
                    <Text style={[styles.actionButtonText, stockUpdate.action === 'set' && styles.actionButtonTextActive]}>Set</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quantity</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 10"
                    placeholderTextColor="#94a3b8"
                    value={stockUpdate.quantity}
                    onChangeText={(text) => setStockUpdate({ ...stockUpdate, quantity: text })}
                    keyboardType="number-pad"
                  />
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setUpdateStockModalVisible(false);
                      setStockUpdate({ quantity: '', action: 'add' });
                    }}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleUpdateStock}>
                    <Text style={styles.saveButtonText}>Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={costCalculatorVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setCostCalculatorVisible(false);
          setAddProductModalVisible(true);
        }}>
        <CostCalculator
          currencySymbol={currencySymbol}
          userId={user?.uid}
          availableIngredients={inventory
            .filter(item => item.product.product_type === 'ingredient')
            .map(item => ({
              id: item.product.id,
              name: item.product.name,
              unit: item.product.unit,
              cost: item.product.cost || 0,
            }))
          }
          onCalculated={(perUnitCost) => {
            if (isEditMode) {
              setEditProduct({ ...editProduct, cost: perUnitCost.toFixed(2) });
              setCostCalculatorVisible(false);
              setIsEditMode(false);
              setEditProductModalVisible(true);
            } else {
              setNewProduct({ ...newProduct, cost: perUnitCost.toFixed(2) });
              setCostCalculatorVisible(false);
              setAddProductModalVisible(true);
            }
          }}
          onClose={() => {
            setCostCalculatorVisible(false);
            if (isEditMode) {
              setIsEditMode(false);
              setEditProductModalVisible(true);
            } else {
              setAddProductModalVisible(true);
            }
          }}
        />
      </Modal>

      <Modal
        visible={recipeManagerVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setRecipeManagerVisible(false)}>
        <RecipeManager
          productId={recipeProductId}
          productName={recipeProductName}
          currencySymbol={currencySymbol}
          onCostCalculated={(cost) => {
            setEditProduct({ ...editProduct, cost: cost.toFixed(2) });
            setRecipeManagerVisible(false);
          }}
          onClose={() => setRecipeManagerVisible(false)}
        />
      </Modal>

      <Modal
        visible={imageGalleryVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setImageGalleryVisible(false);
          setGalleryImages([]);
          setImageSearchKeyword('');
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.galleryModalContent}>
            <View style={styles.galleryHeader}>
              <Text style={styles.modalTitle}>Search Images</Text>
              <TouchableOpacity
                onPress={() => {
                  setImageGalleryVisible(false);
                  setGalleryImages([]);
                  setImageSearchKeyword('');
                }}>
                <Text style={styles.closeButton}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Enter search keyword (e.g., pandesal, bread)"
                placeholderTextColor="#94a3b8"
                value={imageSearchKeyword}
                onChangeText={setImageSearchKeyword}
                autoFocus
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={searchImages}
                disabled={searchingImage}>
                {searchingImage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.searchButtonText}>Search</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.galleryScrollView}>
              {galleryImages.length > 0 ? (
                <View style={styles.galleryGrid}>
                  {galleryImages.map((img, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.galleryImageContainer}
                      onPress={() => selectImageFromGallery(img.url)}>
                      <Image
                        source={{ uri: img.url }}
                        style={styles.galleryImage}
                      />
                      <Text style={styles.photographerText} numberOfLines={1}>
                        {img.photographer}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyGallery}>
                  <ImageIcon size={48} color="#9ca3af" />
                  <Text style={styles.emptyGalleryText}>
                    Enter a keyword and tap Search to find images
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Action Sheet */}
      <Modal
        visible={actionSheetVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setActionSheetVisible(false);
          setActionSheetItem(null);
        }}>
        <TouchableWithoutFeedback onPress={() => {
          setActionSheetVisible(false);
          setActionSheetItem(null);
        }}>
          <View style={styles.actionSheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.actionSheetContainer}>
                <View style={styles.actionSheetHeader}>
                  <Text style={styles.actionSheetTitle}>
                    {actionSheetItem?.product?.name || 'Product'}
                  </Text>
                  <Text style={styles.actionSheetSubtitle}>
                    Choose an action
                  </Text>
                </View>
                
                <View style={styles.actionSheetButtons}>
                  <TouchableOpacity
                    style={styles.actionSheetButton}
                    onPress={() => {
                      if (actionSheetItem) {
                        openUpdateStock(actionSheetItem);
                        setActionSheetVisible(false);
                        setActionSheetItem(null);
                      }
                    }}>
                    <View style={styles.actionSheetIconContainer}>
                      <Package size={24} color="#8B6F47" />
                    </View>
                    <View style={styles.actionSheetButtonText}>
                      <Text style={styles.actionSheetButtonTitle}>Update Stock</Text>
                      <Text style={styles.actionSheetButtonDesc}>Add or remove inventory</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionSheetButton}
                    onPress={() => {
                      if (actionSheetItem) {
                        openEditProduct(actionSheetItem);
                        setActionSheetVisible(false);
                        setActionSheetItem(null);
                      }
                    }}>
                    <View style={styles.actionSheetIconContainer}>
                      <Edit size={24} color="#8B6F47" />
                    </View>
                    <View style={styles.actionSheetButtonText}>
                      <Text style={styles.actionSheetButtonTitle}>Edit Product</Text>
                      <Text style={styles.actionSheetButtonDesc}>Change name, price, or details</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionSheetButton, styles.actionSheetButtonCancel]}
                    onPress={() => {
                      setActionSheetVisible(false);
                      setActionSheetItem(null);
                    }}>
                    <Text style={styles.actionSheetCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8DCC8',
    position: 'relative',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8DCC8',
  },
  scrollView: {
    flex: 1,
  },
  alertSection: {
    backgroundColor: '#FFE8D6',
    padding: 16,
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFCBA4',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
  },
  alertText: {
    fontSize: 14,
    color: '#991b1b',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2a2a2a',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F5E6D3',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#8B6F47',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5439',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  viewToggle: {
    backgroundColor: '#FFFFFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B6F47',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2a2a2a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B5439',
    textAlign: 'center',
  },
  productList: {
    padding: 16,
    gap: 12,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    resizeMode: 'cover',
  },
  productInfo: {
    flex: 1,
  },
  gridContainer: {
    padding: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  gridImageContainer: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5E6D3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lowStockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#DC2626',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridInfo: {
    padding: 12,
  },
  gridProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2a2a2a',
    marginBottom: 4,
    minHeight: 36,
  },
  gridStock: {
    fontSize: 12,
    color: '#6B5439',
    marginBottom: 4,
  },
  gridPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#C89D5E',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2a2a2a',
    marginBottom: 4,
  },
  productUnit: {
    fontSize: 12,
    color: '#6B5439',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#C89D5E',
  },
  stockInfo: {
    alignItems: 'center',
    gap: 4,
  },
  stockQuantity: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  stockLow: {
    color: '#DC2626',
  },
  stockLabel: {
    fontSize: 12,
    color: '#6B5439',
  },
  editIcon: {
    marginTop: 8,
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2a2a2a',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B5439',
    marginBottom: 4,
  },
  currentStock: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  actionButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  actionButtonTextActive: {
    color: '#ffffff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  searchImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginTop: 12,
  },
  searchImageIcon: {
    fontSize: 16,
  },
  searchImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
  costHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  calculateCostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F5E6D3',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  calculateCostButtonText: {
    fontSize: 12,
    color: '#8B6F47',
    fontWeight: '500',
  },
  recipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F5E6D3',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4BA9C',
    marginBottom: 16,
  },
  recipeButtonText: {
    fontSize: 14,
    color: '#8B6F47',
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#2563eb',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  unitPickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  unitPickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  unitPickerArrow: {
    fontSize: 12,
    color: '#6b7280',
  },
  unitPickerDropdown: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    maxHeight: 200,
    marginBottom: 12,
  },
  unitPickerScroll: {
    maxHeight: 200,
  },
  unitOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  unitOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  unitOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  unitOptionTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
  customOptionText: {
    fontStyle: 'italic',
  },
  customUnitContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  customUnitInput: {
    flex: 1,
    marginBottom: 0,
  },
  backToPickerButton: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  backToPickerText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  modalScrollView: {
    maxHeight: '70%',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButtonsFixed: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 20,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  deleteButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    minWidth: 90,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5439',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#8B6F47',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#C4AA8C',
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  galleryModalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    width: '95%',
    maxHeight: '90%',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  galleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  closeButton: {
    fontSize: 28,
    color: '#6B5439',
    fontWeight: '300',
  },
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryScrollView: {
    maxHeight: '75%',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  galleryImageContainer: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
  },
  galleryImage: {
    width: '100%',
    height: '85%',
  },
  photographerText: {
    fontSize: 9,
    color: '#6b7280',
    padding: 4,
    textAlign: 'center',
  },
  emptyGallery: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyGalleryIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyGalleryText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetContainer: {
    backgroundColor: '#F5E6D3',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  actionSheetHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#D4BA9C',
  },
  actionSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6B5439',
    marginBottom: 4,
  },
  actionSheetSubtitle: {
    fontSize: 14,
    color: '#8B7355',
  },
  actionSheetButtons: {
    padding: 16,
    gap: 12,
  },
  actionSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D4BA9C',
    gap: 16,
  },
  actionSheetIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5E6D3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionSheetButtonText: {
    flex: 1,
  },
  actionSheetButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5439',
    marginBottom: 2,
  },
  actionSheetButtonDesc: {
    fontSize: 13,
    color: '#8B7355',
  },
  actionSheetButtonCancel: {
    backgroundColor: '#E8DCC8',
    justifyContent: 'center',
    borderColor: '#D4BA9C',
    marginTop: 8,
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B6F47',
    textAlign: 'center',
  },
});

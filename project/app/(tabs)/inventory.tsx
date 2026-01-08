import { useState, useEffect, useCallback, useRef } from 'react';
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
  SafeAreaView,
  Animated,
  PanResponder,
  Dimensions,
  Easing,
} from 'react-native';
import { useAuth } from '@/features/auth';
import { ProductService, InventoryService } from '@/features/inventory';
import { Product, InventoryWithProduct, getCurrencySymbol, getPermissions } from '@/features/shared';
import { Plus, Package, AlertTriangle, Edit, Minus, LayoutGrid, List, Image as ImageIcon, Calculator, ChefHat, AlertCircle, X } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import ImagePickerButton from '@/components/ImagePickerButton';
import CostCalculator from '@/components/CostCalculator';
import RecipeManager from '@/components/RecipeManager';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Swipeable Alert Component
const SwipeableAlert = ({ 
  type, 
  title, 
  message, 
  onDismiss, 
  onPress, 
  backgroundColor = '#FEF2F2', 
  borderColor = '#FCA5A5',
  iconColor = '#DC6B19',
  titleColor = '#DC6B19',
  messageColor = '#DC2626',
  icon: Icon = AlertCircle
}: {
  type: string;
  title: string;
  message: string;
  onDismiss: () => void;
  onPress: () => void;
  backgroundColor?: string;
  borderColor?: string;
  iconColor?: string;
  titleColor?: string;
  messageColor?: string;
  icon?: any;
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [dismissed, setDismissed] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes (more dx than dy)
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx > 5;
      },
      onMoveShouldSetPanResponderCapture: (_, gestureState) => {
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && gestureState.dx > 15;
      },
      onPanResponderGrant: () => {
        // Stop any ongoing animation
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow right swipe
        if (gestureState.dx > 0) {
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 80 || (gestureState.dx > 40 && gestureState.vx > 0.5)) {
          // Swipe threshold reached or fast swipe - dismiss
          setDismissed(true);
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: width + 50,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onDismiss();
          });
        } else {
          // Snap back smoothly
          Animated.spring(translateX, {
            toValue: 0,
            friction: 6,
            tension: 100,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // Snap back if gesture was interrupted
        Animated.spring(translateX, {
          toValue: 0,
          friction: 6,
          tension: 100,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  if (dismissed) return null;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.alertSection,
        { backgroundColor, borderColor, transform: [{ translateX }], opacity },
      ]}>
      <TouchableOpacity style={styles.alertContent} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.alertHeader}>
          <Icon size={20} color={iconColor} />
          <Text style={[styles.alertTitle, { color: titleColor }]}>{title}</Text>
        </View>
        <Text style={[styles.alertText, { color: messageColor }]}>{message}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDismiss} style={styles.alertDismissButton}>
        <Text style={styles.alertDismissText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function InventoryScreen() {
  const { user, profile } = useAuth();
  const currencySymbol = getCurrencySymbol(profile?.currency || 'PHP');
  const permissions = getPermissions(profile?.current_role || 'admin');
  const [inventory, setInventory] = useState<InventoryWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [wasRefreshing, setWasRefreshing] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pullProgress = useRef(new Animated.Value(0)).current;
  const spinningRef = useRef(false);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const [addProductModalVisible, setAddProductModalVisible] = useState(false);
  const [editProductModalVisible, setEditProductModalVisible] = useState(false);
  const [updateStockModalVisible, setUpdateStockModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryWithProduct | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    cost: '',
    unit: 'pcs',
    initialStock: '',
    productType: 'product' as 'product' | 'ingredient',
    imageUri: null as string | null,
  });
  const [editProduct, setEditProduct] = useState({
    id: '',
    name: '',
    price: '',
    cost: '',
    unit: 'pcs',
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [actionSheetItem, setActionSheetItem] = useState<InventoryWithProduct | null>(null);
  const [highlightLowStock, setHighlightLowStock] = useState(false);
  const [highlightOverstock, setHighlightOverstock] = useState(false);
  const [alertPopup, setAlertPopup] = useState<{visible: boolean; message: string; type: 'low' | 'overstock'}>({
    visible: false,
    message: '',
    type: 'low'
  });
  const scrollViewRef = useRef<ScrollView>(null);
  const scaleAnims = useRef<{[key: string]: Animated.Value}>({}).current;

  const commonUnits = [
    'pcs',
    'dozen',
    'loaves',
    'packs',
    'kg',
    'grams',
    'liters',
    'ml',
    'box',
    'tray',
    'custom',
  ];

  useEffect(() => {
    loadInventory();
    loadDismissedAlerts();
  }, [user]);

  const loadDismissedAlerts = async () => {
    try {
      const stored = await AsyncStorage.getItem('dismissedAlerts');
      if (stored) {
        setDismissedAlerts(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error('Error loading dismissed alerts:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadInventory();
      loadDismissedAlerts();
      checkLowStockTrigger();
    }, [user])
  );

  const checkLowStockTrigger = async () => {
    try {
      const trigger = await AsyncStorage.getItem('triggerLowStockHighlight');
      if (trigger === 'true') {
        await AsyncStorage.removeItem('triggerLowStockHighlight');
        // Wait a bit for the screen to render
        setTimeout(() => {
          setHighlightLowStock(true);
          scrollViewRef.current?.scrollTo({ y: 200, animated: true });
          
          // Animate items
          const lowStockIds = inventory
            .filter(item => item.quantity <= item.min_threshold)
            .map(item => item.id);
          
          lowStockIds.forEach((id, index) => {
            if (!scaleAnims[id]) {
              scaleAnims[id] = new Animated.Value(1);
            }
            
            Animated.sequence([
              Animated.delay(index * 50),
              Animated.spring(scaleAnims[id], {
                toValue: 1.05,
                friction: 3,
                tension: 40,
                useNativeDriver: true,
              }),
              Animated.delay(800),
              Animated.spring(scaleAnims[id], {
                toValue: 1,
                friction: 3,
                tension: 40,
                useNativeDriver: true,
              })
            ]).start();
          });
          
          setTimeout(() => setHighlightLowStock(false), 1500);
        }, 300);
      }
    } catch (error) {
      console.error('Error checking low stock trigger:', error);
    }
  };

  const loadInventory = async () => {
    if (!user) return;
    try {
      const data = await InventoryService.getInventory(user.uid);
      setInventory(data);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setWasRefreshing(true);
    Animated.spring(pullProgress, {
      toValue: 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();

    Promise.all([loadInventory()]).finally(() => {
      setTimeout(() => {
        setRefreshing(false);
        setWasRefreshing(true);
        setIsPulling(false);
        Animated.timing(pullProgress, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          setWasRefreshing(false);
        });
      }, 500);
    });
  }, [user]);

  // Chef hat spin animation - only when actively refreshing
  useEffect(() => {
    if (refreshing) {
      if (!spinningRef.current) {
        spinningRef.current = true;
        spinValue.setValue(0);
        Animated.loop(
          Animated.timing(spinValue, {
            toValue: 1,
            duration: 1200,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ).start();
      }
    } else {
      spinValue.stopAnimation();
      spinningRef.current = false;
    }
  }, [refreshing]);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    // Smoothly animate pull progress based on scroll position
    if (offsetY < 0 && !refreshing) {
      const progress = Math.min(Math.abs(offsetY) / 120, 1);
      Animated.timing(pullProgress, {
        toValue: progress,
        duration: 0,
        useNativeDriver: true,
      }).start();
      
      // Show indicator when pulling down past threshold with hysteresis
      if (progress > 0.3 && !isPulling) {
        setIsPulling(true);
      }
    } else if (!refreshing) {
      Animated.spring(pullProgress, {
        toValue: 0,
        friction: 10,
        tension: 60,
        useNativeDriver: true,
      }).start();
    }

    // Hide indicator when scroll position is back near top
    if (offsetY >= -20 && !refreshing && isPulling) {
      setIsPulling(false);
    }
  };

  // Handle scroll end to reset isPulling when not refreshing
  const handleScrollEnd = () => {
    if (!refreshing) {
      setIsPulling(false);
    }
  };

  const handleAddProduct = async () => {
    if (!user || !newProduct.name) {
      Alert.alert('Error', 'Please enter a product name');
      return;
    }

    try {
      setLoading(true);

      const product = await ProductService.createProduct(user.uid, {
        name: newProduct.name,
        price: parseFloat(newProduct.price) || 0,
        cost: parseFloat(newProduct.cost) || 0,
        unit: newProduct.unit,
        product_type: newProduct.productType,
        image_url: newProduct.imageUri || undefined,
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
      setNewProduct({ name: '', price: '', cost: '', unit: 'pcs', initialStock: '', productType: 'product', imageUri: null });
      await loadInventory();

      const itemType = newProduct.productType === 'ingredient' ? 'Ingredient' : 'Product';
      Alert.alert('Success', `${itemType} added successfully`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditProduct = (item: InventoryWithProduct) => {
    if (!item.product) return;
    setEditProduct({
      id: item.product.id,
      name: item.product.name || '',
      price: item.product.price?.toString() || '',
      cost: item.product.cost?.toString() || '',
      unit: item.product.unit || 'pcs',
      productType: (item.product.product_type || 'product') as 'product' | 'ingredient',
      imageUri: item.product.image_url || null,
      currentStock: item.quantity?.toString() || '0',
      inventoryId: item.id,
    });
    setEditProductModalVisible(true);
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
      // Build update object based on permissions
      const updates: any = {
        name: editProduct.name,
        unit: editProduct.unit,
        product_type: editProduct.productType,
        image_url: editProduct.imageUri,
      };

      // Update price and cost
      updates.price = parseFloat(editProduct.price) || 0;
      updates.cost = parseFloat(editProduct.cost) || 0;

      // Update product details
      await ProductService.updateProduct(editProduct.id, updates);

      // Update inventory stock if changed (admin only)
      if (permissions.canUpdateInventory && editProduct.inventoryId && editProduct.currentStock !== undefined) {
        const newStock = parseFloat(editProduct.currentStock) || 0;
        await InventoryService.updateInventory(editProduct.inventoryId, newStock);
      }

      Keyboard.dismiss();
      setEditProductModalVisible(false);
      setEditProduct({ id: '', name: '', price: '', cost: '', unit: 'pcs', productType: 'product', imageUri: null, currentStock: '', inventoryId: '' });
      await loadInventory();
      Alert.alert('Success', 'Product updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleUpdateStock = async () => {
    if (!permissions.canUpdateInventory) {
      Alert.alert('Permission Denied', 'Only admins can manually update inventory. Inventory is automatically updated when sales are recorded.');
      return;
    }

    if (!selectedItem || !stockUpdate.quantity) {
      Alert.alert('Error', 'Please enter a quantity');
      return;
    }

    const newQuantity = parseInt(stockUpdate.quantity);

    if (isNaN(newQuantity) || newQuantity < 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
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
    setStockUpdate({ quantity: item.quantity.toString(), action: 'add' });
    setUpdateStockModalVisible(true);
  };

  const dismissAlert = async (type: 'lowStock' | 'overstock') => {
    const updated = new Set([...dismissedAlerts, type]);
    setDismissedAlerts(updated);
    await AsyncStorage.setItem('dismissedAlerts', JSON.stringify(Array.from(updated)));
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
    if (!item.product) return false;
    if (productTypeFilter === 'all') return true;
    return item.product.product_type === productTypeFilter;
  }).sort((a, b) => {
    // Sort items with alerts first (low stock or overstock)
    const aIsLow = a.quantity <= a.min_threshold;
    const bIsLow = b.quantity <= b.min_threshold;
    const aIsOverstock = a.quantity > ((a as any).max_threshold ?? 100);
    const bIsOverstock = b.quantity > ((b as any).max_threshold ?? 100);
    
    const aHasAlert = aIsLow || aIsOverstock;
    const bHasAlert = bIsLow || bIsOverstock;
    
    if (aHasAlert && !bHasAlert) return -1;
    if (!aHasAlert && bHasAlert) return 1;
    
    // Within alert items, low stock takes priority
    if (aIsLow && !bIsLow) return -1;
    if (!aIsLow && bIsLow) return 1;
    
    return 0;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Chef Hat Refresh Indicator - Outside ScrollView for smooth animation */}
        <Animated.View
          style={[
            styles.chefHatRefreshOverlay,
            {
              opacity: pullProgress.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [0, 1, 1],
                extrapolate: 'clamp'
              }),
              transform: [
                {
                  translateY: pullProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-70, 0],
                    extrapolate: 'clamp'
                  })
                }
              ]
            }
          ]}
        >
          <Animated.View
            style={[
              styles.chefHatRefreshIcon,
              {
                transform: [
                  { 
                    rotate: refreshing 
                      ? spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] })
                      : pullProgress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] })
                  },
                  {
                    scale: pullProgress.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.7, 0.9, 1],
                      extrapolate: 'clamp'
                    })
                  }
                ]
              }
            ]}
          >
            <ChefHat size={24} color="#8B6F47" strokeWidth={2} />
          </Animated.View>
          <Text style={styles.chefHatRefreshText}>
            {(refreshing || wasRefreshing) ? 'Refreshing...' : 'Pull to refresh'}
          </Text>
        </Animated.View>
        
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          onScroll={handleScroll}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="transparent"
              colors={['transparent']}
              progressBackgroundColor="transparent"
              progressViewOffset={-1000}
            />
          }>
        
        {lowStockItems.length > 0 && !dismissedAlerts.has('lowStock') && (
          <SwipeableAlert
            type="lowStock"
            title="Low Stock Alert"
            message={`${lowStockItems.length} item${lowStockItems.length > 1 ? 's' : ''} running low`}
            onDismiss={() => dismissAlert('lowStock')}
            onPress={() => {
              setHighlightLowStock(true);
              scrollViewRef.current?.scrollTo({ y: 200, animated: true });
              
              const lowStockIds = inventory
                .filter(item => item.quantity <= item.min_threshold)
                .map(item => item.id);
              
              lowStockIds.forEach((id, index) => {
                if (!scaleAnims[id]) {
                  scaleAnims[id] = new Animated.Value(1);
                }
                
                Animated.sequence([
                  Animated.delay(index * 50),
                  Animated.spring(scaleAnims[id], {
                    toValue: 1.05,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true,
                  }),
                  Animated.delay(800),
                  Animated.spring(scaleAnims[id], {
                    toValue: 1,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true,
                  })
                ]).start();
              });
              
              setTimeout(() => setHighlightLowStock(false), 1500);
            }}
            iconColor="#dc2626"
            titleColor="#dc2626"
            messageColor="#dc2626"
            icon={AlertTriangle}
          />
        )}

        {inventory.filter(item => item.quantity > ((item as any).max_threshold ?? 100)).length > 0 && !dismissedAlerts.has('overstock') && (
          <SwipeableAlert
            type="overstock"
            title="Overstock Alert"
            message={`${inventory.filter(item => item.quantity > ((item as any).max_threshold ?? 100)).length} item${inventory.filter(item => item.quantity > ((item as any).max_threshold ?? 100)).length > 1 ? 's' : ''} overstocked`}
            onDismiss={() => dismissAlert('overstock')}
            onPress={() => {
              setHighlightOverstock(true);
              scrollViewRef.current?.scrollTo({ y: 380, animated: true });
              
              const overstockIds = inventory
                .filter(item => item.quantity > ((item as any).max_threshold ?? 100))
                .map(item => item.id);
              
              overstockIds.forEach((id, index) => {
                if (!scaleAnims[id]) {
                  scaleAnims[id] = new Animated.Value(1);
                }
                
                Animated.sequence([
                  Animated.delay(index * 50),
                  Animated.spring(scaleAnims[id], {
                    toValue: 1.05,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true,
                  }),
                  Animated.delay(800),
                  Animated.spring(scaleAnims[id], {
                    toValue: 1,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true,
                  })
                ]).start();
              });
              
              setTimeout(() => setHighlightOverstock(false), 1500);
            }}
            backgroundColor="#EFF6FF"
            borderColor="#BFDBFE"
            iconColor="#3b82f6"
            titleColor="#3b82f6"
            messageColor="#1e40af"
            icon={AlertTriangle}
          />
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
            {filteredInventory.map((item) => {
              const isLowStock = item.quantity <= item.min_threshold;
              const isOverstock = item.quantity > ((item as any).max_threshold ?? 100);
              return (
              <Animated.View 
                key={item.id} 
                style={[
                  styles.gridItem,
                  isLowStock && {
                    transform: [{ scale: scaleAnims[item.id] || 1 }],
                  },
                  isOverstock && {
                    transform: [{ scale: scaleAnims[item.id] || 1 }],
                  },
                  highlightLowStock && isLowStock && {
                    borderWidth: 2,
                    borderColor: '#ef4444',
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 8,
                    backgroundColor: '#fff',
                    zIndex: 10,
                  },
                  highlightOverstock && isOverstock && {
                    borderWidth: 2,
                    borderColor: '#3b82f6',
                    shadowColor: '#3b82f6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 8,
                    backgroundColor: '#fff',
                    zIndex: 10,
                  }
                ]}>
                <TouchableOpacity
                  style={styles.gridItemTouchable}
                  onPress={() => {
                    if (profile?.current_role === 'admin') {
                      setActionSheetItem(item);
                      setActionSheetVisible(true);
                    }
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
                      <TouchableOpacity 
                        style={styles.lowStockBadge}
                        onPress={(e) => {
                          e.stopPropagation();
                          setAlertPopup({
                            visible: true,
                            message: `"${item.product?.name}" is running low on stock!`,
                            type: 'low'
                          });
                        }}>
                        <AlertTriangle size={12} color="#fff" />
                      </TouchableOpacity>
                    )}
                    {isOverstock && (
                      <TouchableOpacity 
                        style={[styles.lowStockBadge, { backgroundColor: '#3b82f6' }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          setAlertPopup({
                            visible: true,
                            message: `"${item.product?.name}" is overstocked!`,
                            type: 'overstock'
                          });
                        }}>
                        <AlertTriangle size={12} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.gridInfo}>
                    <Text style={styles.gridProductName} numberOfLines={1} ellipsizeMode="tail">
                      {item.product?.name}
                    </Text>
                    <Text style={styles.gridStock}>
                      {item.quantity} {item.product?.unit}
                    </Text>
                    <Text style={styles.gridPrice}>{currencySymbol}{Number(item.product?.price).toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
              );
            })}
          </View>
        ) : (
          <View style={styles.productList}>
            {filteredInventory.map((item) => {
              const isLowStock = item.quantity <= item.min_threshold;
              const isOverstock = item.quantity > ((item as any).max_threshold ?? 100);
              return (
              <Animated.View
                key={item.id}
                style={[
                  isLowStock && {
                    transform: [{ scale: scaleAnims[item.id] || 1 }],
                  },
                  isOverstock && {
                    transform: [{ scale: scaleAnims[item.id] || 1 }],
                  },
                  highlightLowStock && isLowStock && {
                    borderWidth: 2,
                    borderColor: '#ef4444',
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 8,
                    zIndex: 10,
                  },
                  highlightOverstock && isOverstock && {
                    borderWidth: 2,
                    borderColor: '#3b82f6',
                    shadowColor: '#3b82f6',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 8,
                    zIndex: 10,
                  }
                ]}>
              <TouchableOpacity
                style={styles.productCard}
                onPress={() => {
                  if (profile?.current_role === 'admin') {
                    setActionSheetItem(item);
                    setActionSheetVisible(true);
                  }
                }}>
                {item.product?.image_url && (
                  <Image
                    source={{ uri: item.product.image_url }}
                    style={styles.productImage}
                  />
                )}
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1} ellipsizeMode="tail">{item.product?.name}</Text>
                  <Text style={styles.productUnit}>{item.product?.unit}</Text>
                  <Text style={styles.productPrice}>{currencySymbol}{Number(item.product?.price).toFixed(2)}</Text>
                </View>
                <View style={styles.stockInfo}>
                  {/* No alert icon for low stock or overstock in list view */}
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
              </Animated.View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button - Admin Only */}
      {permissions.canDeleteProducts && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setAddProductModalVisible(true)}
          activeOpacity={0.8}>
          <Plus size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Modal
        visible={addProductModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddProductModalVisible(false)}>
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -20}
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
                          setNewProduct({ ...newProduct, unit: 'pcs' });
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
                      setNewProduct({ name: '', price: '', cost: '', unit: 'pcs', initialStock: '', productType: 'product', imageUri: null });
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
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -20}
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
                  <Text style={styles.inputLabel}>Type {permissions.canDeleteProducts ? '*' : '(View Only)'}</Text>
                  {permissions.canDeleteProducts ? (
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
                  ) : (
                    <View style={[styles.input, { backgroundColor: '#f3f4f6' }]}>
                      <Text style={{ fontSize: 16, color: '#6b7280' }}>
                        {editProduct.productType === 'product' ? 'Product' : 'Ingredient'}
                      </Text>
                    </View>
                  )}
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
                    <Text style={styles.inputLabel}>
                      Selling Price ({currencySymbol}) *
                    </Text>
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
                  <Text style={styles.inputLabel}>Unit {permissions.canDeleteProducts ? '*' : '(View Only)'}</Text>
                  {permissions.canDeleteProducts ? (
                    showEditCustomUnit ? (
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
                            setEditProduct({ ...editProduct, unit: 'pcs' });
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
                    )
                  ) : (
                    <View style={[styles.input, { backgroundColor: '#f3f4f6' }]}>
                      <Text style={{ fontSize: 16, color: '#6b7280' }}>
                        {editProduct.unit || 'pcs'}
                      </Text>
                    </View>
                  )}
                </View>

                {permissions.canUpdateInventory ? (
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
                ) : (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Current Stock (View Only)</Text>
                    <View style={[styles.input, { backgroundColor: '#f3f4f6' }]}>
                      <Text style={{ fontSize: 16, color: '#6b7280' }}>
                        {editProduct.currentStock || '0'}
                      </Text>
                    </View>
                    <Text style={styles.helperText}>
                      Staff cannot manually update inventory. Stock is automatically updated when sales are recorded.
                    </Text>
                  </View>
                )}
                </ScrollView>

                <View style={styles.modalButtonsFixed}>
                  {permissions.canDeleteProducts && (
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={handleDeleteProduct}>
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setEditProductModalVisible(false);
                      setEditProduct({ id: '', name: '', price: '', cost: '', unit: 'pcs', productType: 'product', imageUri: null, currentStock: '', inventoryId: '' });
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

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Quantity</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        const currentQty = parseInt(stockUpdate.quantity) || 0;
                        if (currentQty > 0) {
                          setStockUpdate({ ...stockUpdate, quantity: (currentQty - 1).toString() });
                        }
                      }}>
                      <Minus size={20} color="#374151" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantityInput}
                      placeholder="0"
                      placeholderTextColor="#94a3b8"
                      value={stockUpdate.quantity}
                      onChangeText={(text) => setStockUpdate({ ...stockUpdate, quantity: text })}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        const currentQty = parseInt(stockUpdate.quantity) || 0;
                        setStockUpdate({ ...stockUpdate, quantity: (currentQty + 1).toString() });
                      }}>
                      <Plus size={20} color="#374151" />
                    </TouchableOpacity>
                  </View>
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
            .filter(item => item.product && item.product.product_type === 'ingredient')
            .map(item => ({
              id: item.product!.id,
              name: item.product!.name,
              unit: item.product!.unit,
              cost: item.product!.cost || 0,
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
                  {permissions.canUpdateInventory && (
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
                  )}

                  {permissions.canEditPrices && (
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
                  )}

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

      {/* Alert Popup Modal */}
      <Modal
        visible={alertPopup.visible}
        animationType="fade"
        transparent
        onRequestClose={() => setAlertPopup({ ...alertPopup, visible: false })}>
        <TouchableWithoutFeedback onPress={() => setAlertPopup({ ...alertPopup, visible: false })}>
          <View style={styles.alertPopupOverlay}>
            <TouchableWithoutFeedback>
              <View style={[
                styles.alertPopupContainer,
                alertPopup.type === 'low' ? styles.alertPopupLow : styles.alertPopupOverstock
              ]}>
                <View style={styles.alertPopupHeader}>
                  <View style={[
                    styles.alertPopupIconContainer,
                    alertPopup.type === 'low' ? styles.alertPopupIconLow : styles.alertPopupIconOverstock
                  ]}>
                    <AlertTriangle size={20} color="#fff" />
                  </View>
                </View>
                <Text style={[
                  styles.alertPopupTitle,
                  alertPopup.type === 'low' ? styles.alertPopupTitleLow : styles.alertPopupTitleOverstock
                ]}>
                  {alertPopup.type === 'low' ? 'Low Stock Alert' : 'Overstock Alert'}
                </Text>
                <Text style={styles.alertPopupMessage}>{alertPopup.message}</Text>
                <TouchableOpacity 
                  style={[
                    styles.alertPopupCloseButton,
                    alertPopup.type === 'low' ? styles.alertPopupCloseButtonLow : styles.alertPopupCloseButtonOverstock
                  ]}
                  onPress={() => setAlertPopup({ ...alertPopup, visible: false })}>
                  <Text style={styles.alertPopupCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5EDE4',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5EDE4',
    position: 'relative',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5EDE4',
  },
  scrollView: {
    flex: 1,
  },
  // Chef Hat Refresh Indicator - Fixed position overlay
  chefHatRefreshOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    zIndex: 1000,
    backgroundColor: 'transparent',
  },
  chefHatRefreshContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#F5EDE4',
    gap: 8,
  },
  chefHatRefreshIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF8F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E8DDD4',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  chefHatRefreshText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B6F47',
  },
  alertSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    margin: 16,
    marginBottom: 4, // reduced from 8 or 16 to bring alerts closer
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  alertContent: {
    flex: 1,
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
  alertDismissButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  alertDismissText: {
    fontSize: 28,
    fontWeight: '300',
    color: '#666',
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
    color: '#1F2937',
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
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#F5EDE4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#C4A07A',
  },
  filterTabActive: {
    backgroundColor: '#8B5A2B',
    borderColor: '#8B5A2B',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    flexWrap: 'nowrap',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  viewToggle: {
    backgroundColor: '#F5EDE4',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B5A2B',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B5A2B',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
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
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
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
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#C4A07A',
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
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#C4A07A',
  },
  gridItemTouchable: {
    flex: 1,
  },
  gridEditButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
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
    backgroundColor: '#E5E7EB',
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
    color: '#111827',
    marginBottom: 4,
    minHeight: 18,
  },
  gridStock: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  gridPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productUnit: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#059669',
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
    color: '#6B7280',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#C4A07A',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  currentStock: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
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
  labelWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
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
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  calculateCostButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  recipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  recipeButtonText: {
    fontSize: 14,
    color: '#374151',
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
    backgroundColor: '#F5EDE4',
    borderWidth: 2,
    borderColor: '#C4A07A',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#8B5A2B',
    borderColor: '#8B5A2B',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#8B5A2B',
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
    backgroundColor: '#F5E6D3',
  },
  unitOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  unitOptionTextSelected: {
    color: '#8B5A2B',
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
    borderWidth: 2,
    borderColor: '#C4A07A',
    alignItems: 'center',
    backgroundColor: '#F5EDE4',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#8B5A2B',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
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
    color: '#6B7280',
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
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  actionSheetHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionSheetSubtitle: {
    fontSize: 14,
    color: '#6B7280',
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
    borderWidth: 2,
    borderColor: '#C4A07A',
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
    color: '#1F2937',
    marginBottom: 2,
  },
  actionSheetButtonDesc: {
    fontSize: 13,
    color: '#6B7280',
  },
  actionSheetButtonCancel: {
    backgroundColor: '#F5EDE4',
    justifyContent: 'center',
    borderColor: '#C4A07A',
    marginTop: 8,
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    backgroundColor: '#F3F4F6',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
       borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quantityInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1F2937',
   },
  alertPopupOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertPopupContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 2,
  },
  alertPopupLow: {
    borderColor: '#FECACA',
  },
  alertPopupOverstock: {
    borderColor: '#BFDBFE',
  },
  alertPopupHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertPopupIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertPopupIconLow: {
    backgroundColor: '#DC2626',
  },
  alertPopupIconOverstock: {
    backgroundColor: '#3b82f6',
  },
  alertPopupClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertPopupCloseText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  alertPopupTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  alertPopupTitleLow: {
    color: '#DC2626',
  },
  alertPopupTitleOverstock: {
    color: '#3b82f6',
  },
  alertPopupMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  alertPopupCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  alertPopupCloseButtonLow: {
    backgroundColor: '#DC2626',
  },
  alertPopupCloseButtonOverstock: {
    backgroundColor: '#3b82f6',
  },
  alertPopupCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

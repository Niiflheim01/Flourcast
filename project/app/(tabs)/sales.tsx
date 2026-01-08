import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Switch,
  Easing,
  InteractionManager,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/features/auth';
import { SalesService } from '@/features/sales';
import { ProductService, InventoryService } from '@/features/inventory';
import { SaleWithProduct, Product, InventoryWithProduct, getCurrencySymbol } from '@/features/shared';
import { Plus, ShoppingBag, Calendar, Trash2, Check, Minus, ChevronLeft, ChevronRight, Edit3, ChefHat } from 'lucide-react-native';

// Cache for calendar dots - persists across renders
const calendarCache = new Map<string, {[day: number]: number}>();

function formatLongDate(date: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Parse YYYY-MM-DD date string to local Date object (avoids UTC timezone issues)
function parseDateToLocal(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatTime12Hour(timeString: string): string {
  const [hours, minutes] = timeString.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getDaysInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days: (number | null)[] = [];
  // Add empty slots for days before the month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  // Add actual days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  return days;
}

export default function SalesScreen() {
  const { user, profile } = useAuth();
  const currencySymbol = getCurrencySymbol(profile?.currency || 'PHP');
  const [sales, setSales] = useState<SaleWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wasRefreshing, setWasRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const pullProgress = useRef(new Animated.Value(0)).current;
  const spinningRef = useRef(false);
  const [filterMode, setFilterMode] = useState<'today' | 'month' | 'year'>('today');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [addSaleModalVisible, setAddSaleModalVisible] = useState(false);
  const [editSaleModalVisible, setEditSaleModalVisible] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithProduct | null>(null);
  const [longPressedSale, setLongPressedSale] = useState<string | null>(null);
  const [saleActionSheetVisible, setSaleActionSheetVisible] = useState(false);
  const [actionSheetSale, setActionSheetSale] = useState<SaleWithProduct | null>(null);
  const [newSale, setNewSale] = useState({
    product_id: '',
    quantity: '',
    notes: '',
  });
  const [editSale, setEditSale] = useState({
    id: '',
    product_id: '',
    quantity: '',
    notes: '',
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editSelectedProduct, setEditSelectedProduct] = useState<Product | null>(null);
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('');
  const [showCustomDateInput, setShowCustomDateInput] = useState(false);
  const [salesCountByDay, setSalesCountByDay] = useState<{[key: number]: number}>({});
  const [showMonthYearPicker, setShowMonthYearPicker] = useState(false);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Preload calendar dots for current and adjacent months
  const preloadCalendarData = useCallback(async (year: number, month: number) => {
    if (!user) return;
    
    const cacheKey = `${user.uid}-${year}-${month}`;
    
    // Return cached data if available
    if (calendarCache.has(cacheKey)) {
      return calendarCache.get(cacheKey);
    }
    
    // Use optimized query for just counts
    const countByDay = await SalesService.getSalesCountByDay(user.uid, year, month);
    calendarCache.set(cacheKey, countByDay);
    
    return countByDay;
  }, [user]);

  // Preload adjacent months in background
  const preloadAdjacentMonths = useCallback(async () => {
    if (!user) return;
    
    // Calculate previous and next months
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
    const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;
    
    // Preload in background without blocking UI
    InteractionManager.runAfterInteractions(() => {
      preloadCalendarData(prevYear, prevMonth);
      
      // Only preload next month if not in future
      const today = new Date();
      if (nextYear < today.getFullYear() || 
          (nextYear === today.getFullYear() && nextMonth <= today.getMonth())) {
        preloadCalendarData(nextYear, nextMonth);
      }
    });
  }, [user, selectedMonth, selectedYear, preloadCalendarData]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      let salesData;
      
      // Helper to format date as YYYY-MM-DD without timezone issues
      const formatDateStr = (year: number, month: number, day: number) => 
        `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      if (filterMode === 'today') {
        salesData = await SalesService.getTodaysSales(user.uid);
      } else if (filterMode === 'month') {
        if (selectedDay !== null) {
          // Show specific day - use same date for start and end
          const dayStr = formatDateStr(selectedYear, selectedMonth, selectedDay);
          salesData = await SalesService.getSales(user.uid, dayStr, dayStr);
        } else {
          // Show entire month - use paginated query for better performance
          const lastDayOfMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
          const startStr = formatDateStr(selectedYear, selectedMonth, 1);
          const endStr = formatDateStr(selectedYear, selectedMonth, lastDayOfMonth);
          salesData = await SalesService.getSales(user.uid, startStr, endStr);
        }
      } else {
        const startStr = formatDateStr(selectedYear, 0, 1);
        const endStr = formatDateStr(selectedYear, 11, 31);
        salesData = await SalesService.getSales(user.uid, startStr, endStr);
      }

      const [productsData, inventoryData] = await Promise.all([
        ProductService.getProducts(user.uid),
        InventoryService.getInventory(user.uid),
      ]);
      
      setSales(salesData);
      setProducts(productsData.filter(p => p.is_active && p.product_type === 'product'));
      setInventory(inventoryData);

      // Load calendar dots using optimized cached query
      if (filterMode === 'month') {
        setCalendarLoading(true);
        const countByDay = await preloadCalendarData(selectedYear, selectedMonth);
        setSalesCountByDay(countByDay || {});
        setCalendarLoading(false);
        
        // Preload adjacent months in background
        preloadAdjacentMonths();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }, [user, filterMode, selectedMonth, selectedYear, selectedDay, preloadCalendarData, preloadAdjacentMonths]);

  // Invalidate cache for a specific month when sales are modified
  const invalidateCache = useCallback((date?: string) => {
    if (!user) return;
    
    if (date) {
      // Parse the date and invalidate that month's cache
      const [year, month] = date.split('-').map(Number);
      const cacheKey = `${user.uid}-${year}-${month - 1}`;
      calendarCache.delete(cacheKey);
    } else {
      // Invalidate current month
      const cacheKey = `${user.uid}-${selectedYear}-${selectedMonth}`;
      calendarCache.delete(cacheKey);
    }
  }, [user, selectedYear, selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setWasRefreshing(true);
    Animated.spring(pullProgress, {
      toValue: 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
    
    loadData().finally(() => {
      setTimeout(() => {
        setRefreshing(false);
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
  }, [loadData]);

  // Chef hat spin animation - only when refreshing
  useEffect(() => {
    if (refreshing) {
      if (!spinningRef.current) {
        spinningRef.current = true;
        spinValue.setValue(0);
        Animated.loop(
          Animated.timing(spinValue, {
            toValue: 1,
            duration: 1000,
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

  // Track scroll position for interactive pull
  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    
    if (offsetY < 0 && !refreshing) {
      const progress = Math.min(Math.abs(offsetY) / 100, 1);
      pullProgress.setValue(progress);
      
      if (!isPulling && progress > 0.1) {
        setIsPulling(true);
      }
    }
  };

  // Handle scroll end - hide indicator if not refreshing
  const handleScrollEnd = () => {
    if (!refreshing && isPulling) {
      setIsPulling(false);
      Animated.timing(pullProgress, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  };

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    const today = new Date();
    const nextMonth = selectedMonth === 11 ? 0 : selectedMonth + 1;
    const nextYear = selectedMonth === 11 ? selectedYear + 1 : selectedYear;

    // Don't allow navigating to future months
    if (nextYear > today.getFullYear() ||
        (nextYear === today.getFullYear() && nextMonth > today.getMonth())) {
      return;
    }

    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
    setSelectedDay(null);
  };

  const goToCurrentMonth = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
    setSelectedDay(null);
  };

  const handleAddSale = async () => {
    if (!user || !newSale.product_id || !newSale.quantity) {
      Alert.alert('Error', 'Please select a product and enter quantity');
      return;
    }

    const product = products.find(p => p.id === newSale.product_id);
    if (!product) return;

    const inventoryItem = inventory.find(i => i.product_id === newSale.product_id);
    const availableStock = inventoryItem?.quantity || 0;
    const requestedQty = parseInt(newSale.quantity);

    if (requestedQty > availableStock) {
      Alert.alert(
        'Insufficient Stock',
        `Only ${availableStock} ${product.unit} available in stock. Cannot sell ${requestedQty} ${product.unit}.`
      );
      return;
    }

    try {
      const saleData: any = {
        product_id: newSale.product_id,
        quantity: parseInt(newSale.quantity),
        unit_price: product.price,
        notes: newSale.notes,
      };

      // If admin mode: use custom date if provided, OR use selected day from calendar
      if (profile?.current_role === 'admin') {
        if (customDate) {
          saleData.sale_date = customDate;
          if (customTime) {
            saleData.sale_time = customTime;
          }
        } else if (filterMode === 'month' && selectedDay !== null) {
          // Use the selected day from the calendar - format without timezone issues
          saleData.sale_date = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;
        }
      }

      await SalesService.createSale(user.uid, saleData);

      setAddSaleModalVisible(false);
      setNewSale({ product_id: '', quantity: '', notes: '' });
      setSelectedProduct(null);
      setCustomDate('');
      setCustomTime('');
      setShowCustomDateInput(false);
      invalidateCache(saleData.sale_date);
      loadData();
      Alert.alert('Success', 'Sale recorded successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleEditSale = (sale: SaleWithProduct) => {
    // Check if sale is from today or admin mode is enabled
    const saleDate = parseDateToLocal(sale.sale_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    saleDate.setHours(0, 0, 0, 0);
    
    const isToday = saleDate.getTime() === today.getTime();

    if (!isToday && profile?.current_role !== 'admin') {
      Alert.alert(
        'Admin Access Required',
        'Only admins can edit sales from previous dates',
        [{ text: 'OK' }]
      );
      return;
    }

    setSelectedSale(sale);
    setEditSale({
      id: sale.id,
      product_id: sale.product_id,
      quantity: sale.quantity.toString(),
      notes: sale.notes || '',
    });
    const product = products.find(p => p.id === sale.product_id);
    setEditSelectedProduct(product || null);
    setEditSaleModalVisible(true);
  };

  const handleUpdateSale = async () => {
    if (!user || !editSale.product_id || !editSale.quantity) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const product = products.find(p => p.id === editSale.product_id);
    if (!product) return;

    if (!selectedSale) return;

    // Check if quantity changed and validate stock
    const oldQuantity = selectedSale.quantity;
    const newQuantity = parseInt(editSale.quantity);
    const quantityDiff = newQuantity - oldQuantity;

    if (quantityDiff > 0) {
      // Need more stock - check availability
      const inventoryItem = inventory.find(i => i.product_id === editSale.product_id);
      const availableStock = inventoryItem?.quantity || 0;
      
      if (quantityDiff > availableStock) {
        Alert.alert(
          'Insufficient Stock',
          `Only ${availableStock} ${product.unit} available. Cannot increase quantity by ${quantityDiff}.`
        );
        return;
      }
    }

    try {
      // Restore old quantity to inventory first
      await InventoryService.adjustInventory(user.uid, selectedSale.product_id, oldQuantity);
      
      // Then deduct new quantity
      await InventoryService.adjustInventory(user.uid, editSale.product_id, -newQuantity);
      
      // Update sale
      await SalesService.updateSale(editSale.id, {
        product_id: editSale.product_id,
        quantity: newQuantity,
        unit_price: product.price,
        notes: editSale.notes,
      });

      setEditSaleModalVisible(false);
      setEditSale({ id: '', product_id: '', quantity: '', notes: '' });
      setEditSelectedProduct(null);
      // Invalidate cache for the sale's month
      if (selectedSale) {
        invalidateCache(selectedSale.sale_date);
      }
      setSelectedSale(null);
      loadData();
      Alert.alert('Success', 'Sale updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteSale = (sale: SaleWithProduct) => {
    // Check if sale is from today or admin mode is enabled
    const saleDate = parseDateToLocal(sale.sale_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    saleDate.setHours(0, 0, 0, 0);
    
    const isToday = saleDate.getTime() === today.getTime();

    if (!isToday && profile?.current_role !== 'admin') {
      Alert.alert(
        'Admin Access Required',
        'Only admins can delete sales from previous dates',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Sale',
      'Are you sure you want to delete this sale? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await SalesService.deleteSale(sale.id);
              setEditSaleModalVisible(false);
              invalidateCache(sale.sale_date);
              loadData();
              Alert.alert('Success', 'Sale deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const selectProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    setSelectedProduct(product || null);
    setNewSale({ ...newSale, product_id: productId });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  const todayRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const todayItems = sales.reduce((sum, sale) => sum + sale.quantity, 0);

  // Check if we're viewing today's data
  const isViewingToday = filterMode === 'today' ||
    (filterMode === 'month' && selectedDay !== null &&
     new Date(selectedYear, selectedMonth, selectedDay).toDateString() === new Date().toDateString());

  // Can add/edit if viewing today OR user is admin (can edit old sales)
  // Admins can add/edit historical sales from any view
  const canAddOrEdit = isViewingToday || (profile?.current_role === 'admin');

  return (
    <SafeAreaView style={styles.safeArea}>
      <GestureHandlerRootView style={styles.container}>
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
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.title}>Sales Records</Text>
              <Text style={styles.date}>
                {filterMode === 'today' && formatLongDate(new Date())}
                {filterMode === 'month' && selectedDay !== null && formatLongDate(new Date(selectedYear, selectedMonth, selectedDay))}
                {filterMode === 'month' && selectedDay === null && `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth]} ${selectedYear}`}
                {filterMode === 'year' && `Year ${selectedYear}`}
              </Text>
            </View>
          </View>

          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, filterMode === 'today' && styles.filterTabActive]}
              onPress={() => {
                setFilterMode('today');
                setSelectedDay(null);
              }}>
              <Text style={[styles.filterTabText, filterMode === 'today' && styles.filterTabTextActive]}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filterMode === 'month' && styles.filterTabActive]}
              onPress={() => {
                setFilterMode('month');
                setSelectedDay(null);
              }}>
              <Calendar size={16} color={filterMode === 'month' ? '#FFFFFF' : '#6B5439'} />
              <Text style={[styles.filterTabText, filterMode === 'month' && styles.filterTabTextActive]}>
                Month
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterTab, filterMode === 'year' && styles.filterTabActive]}
              onPress={() => {
                setFilterMode('year');
                setSelectedDay(null);
                setShowDatePicker(true);
              }}>
              <Text style={[styles.filterTabText, filterMode === 'year' && styles.filterTabTextActive]}>Year</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Month Calendar View */}
        {filterMode === 'month' && (
          <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.monthNavButton} onPress={goToPreviousMonth}>
                <ChevronLeft size={24} color="#8B6F47" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowMonthYearPicker(true)}>
                <Text style={styles.calendarMonthTitle}>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth]} {selectedYear}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.monthNavButton}
                onPress={goToNextMonth}
                disabled={selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth()}>
                <ChevronRight
                  size={24}
                  color={selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth() ? '#D4BA9C' : '#8B6F47'}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.weekDaysRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={styles.weekDayText}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {getDaysInMonth(selectedYear, selectedMonth).map((day, index) => {
                if (day === null) {
                  return <View key={`empty-${index}`} style={styles.calendarDay} />;
                }

                const date = new Date(selectedYear, selectedMonth, day);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isToday = date.toDateString() === today.toDateString();
                const isFuture = date > today;
                const hasSales = salesCountByDay[day] > 0;
                const isSelected = selectedDay === day;

                return (
                  <TouchableOpacity
                    key={`day-${index}`}
                    style={[
                      styles.calendarDay,
                      isToday && styles.calendarDayToday,
                      isFuture && styles.calendarDayDisabled,
                      isSelected && styles.calendarDaySelected,
                    ]}
                    onPress={() => {
                      if (!isFuture) {
                        setSelectedDay(selectedDay === day ? null : day);
                      }
                    }}
                    disabled={isFuture}>
                    <Text style={[
                      styles.calendarDayText,
                      isToday && styles.calendarDayTextToday,
                      isFuture && styles.calendarDayTextDisabled,
                      isSelected && styles.calendarDayTextSelected,
                    ]}>
                      {day}
                    </Text>
                    {hasSales && !isFuture && (
                      <View style={styles.salesDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedDay === null ? (
              <Text style={styles.calendarHint}>Tap on a day to view sales details</Text>
            ) : (
              <TouchableOpacity
                style={styles.clearSelectionButton}
                onPress={() => setSelectedDay(null)}>
                <Text style={styles.clearSelectionText}>Clear selection - View all month</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{currencySymbol}{todayRevenue.toFixed(2)}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>Total Revenue</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{todayItems}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>Items Sold</Text>
          </View>
        </View>

        {sales.length === 0 ? (
          <View style={styles.emptyState}>
            <ShoppingBag size={48} color="#9ca3af" />
            <Text style={styles.emptyTitle}>
              {filterMode === 'today' && 'No Sales Today'}
              {filterMode === 'month' && selectedDay !== null && `No Sales on ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth]} ${selectedDay}`}
              {filterMode === 'month' && selectedDay === null && 'No Sales This Month'}
              {filterMode === 'year' && 'No Sales This Year'}
            </Text>
            <Text style={styles.emptyText}>
              {filterMode === 'today' && 'Record your first sale to start tracking'}
              {filterMode === 'month' && selectedDay !== null && 'No sales recorded for this day'}
              {filterMode === 'month' && selectedDay === null && 'No sales recorded for this month'}
              {filterMode === 'year' && 'No sales recorded for this year'}
            </Text>
          </View>
        ) : (
          <View style={styles.salesList}>
            <Text style={styles.sectionTitle}>
              {filterMode === 'month' && selectedDay !== null
                ? `Sales on ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth]} ${selectedDay}, ${selectedYear}`
                : 'Recent Transactions'}
            </Text>
            {sales.map((sale) => {
              // Check if this specific sale can be edited
              const saleDate = parseDateToLocal(sale.sale_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              saleDate.setHours(0, 0, 0, 0);
              const isToday = saleDate.getTime() === today.getTime();
              const canEdit = isToday || (profile?.current_role === 'admin');
              const isLongPressed = longPressedSale === sale.id;

              return (
                <TouchableOpacity
                  key={sale.id}
                  style={[styles.saleCard, isLongPressed && styles.saleCardEditMode]}
                  onLongPress={() => {
                    if (canEdit) {
                      setLongPressedSale(sale.id);
                      setActionSheetSale(sale);
                      setSaleActionSheetVisible(true);
                    }
                  }}
                  delayLongPress={400}
                  activeOpacity={0.7}>
                  <View style={styles.saleInfo}>
                    <Text style={styles.saleName}>{sale.product?.name}</Text>
                    <Text style={styles.saleDetails}>
                      {`${sale.quantity} × ${currencySymbol}${Number(sale.unit_price).toFixed(2)}`}
                    </Text>
                    <Text style={styles.saleTime}>
                      {formatTime12Hour(sale.sale_time)}
                    </Text>
                    {sale.notes && (
                      <Text style={styles.saleNotes} numberOfLines={1}>{sale.notes}</Text>
                    )}
                  </View>
                  <View style={styles.saleRight}>
                    <Text style={styles.saleAmount} numberOfLines={1} adjustsFontSizeToFit>{currencySymbol}{Number(sale.total_amount).toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button - Only show if viewing today or admin mode enabled */}
      {canAddOrEdit && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setAddSaleModalVisible(true)}
          activeOpacity={0.8}>
          <Plus size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Month/Year Picker Modal for Calendar */}
      <Modal
        visible={showMonthYearPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMonthYearPicker(false)}>
        <TouchableWithoutFeedback onPress={() => setShowMonthYearPicker(false)}>
          <View style={styles.datePickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.datePickerContent}>
                <Text style={styles.datePickerTitle}>Select Month & Year</Text>

                <View style={styles.monthYearPickerContainer}>
                  <Text style={styles.pickerSectionTitle}>Year</Text>
                  <ScrollView style={styles.yearListCompact} horizontal showsHorizontalScrollIndicator={false}>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[styles.yearChip, selectedYear === year && styles.yearChipActive]}
                        onPress={() => setSelectedYear(year)}>
                        <Text style={[styles.yearChipText, selectedYear === year && styles.yearChipTextActive]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <Text style={styles.pickerSectionTitle}>Month</Text>
                  <View style={styles.monthGrid}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
                      const isFutureMonth = selectedYear === new Date().getFullYear() && index > new Date().getMonth();
                      return (
                        <TouchableOpacity
                          key={index}
                          style={[
                            styles.monthButton,
                            selectedMonth === index && styles.monthButtonActive,
                            isFutureMonth && styles.monthButtonDisabled,
                          ]}
                          onPress={() => {
                            if (!isFutureMonth) {
                              setSelectedMonth(index);
                              setSelectedDay(null);
                              setShowMonthYearPicker(false);
                            }
                          }}
                          disabled={isFutureMonth}>
                          <Text style={[
                            styles.monthButtonText,
                            selectedMonth === index && styles.monthButtonTextActive,
                            isFutureMonth && styles.monthButtonTextDisabled,
                          ]}>
                            {month}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.pickerActions}>
                  <TouchableOpacity
                    style={[styles.pickerActionButton, styles.pickerActionButtonPrimary]}
                    onPress={() => setShowMonthYearPicker(false)}>
                    <Text style={[styles.pickerActionText, styles.pickerActionTextPrimary]}>Done</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDatePicker(false)}>
        <TouchableWithoutFeedback onPress={() => setShowDatePicker(false)}>
          <View style={styles.datePickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.datePickerContent}>
                <Text style={styles.datePickerTitle}>Select Year</Text>

                {filterMode === 'year' && (
                  <ScrollView style={styles.yearList}>
                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[styles.yearButton, selectedYear === year && styles.yearButtonActive]}
                        onPress={() => {
                          setSelectedYear(year);
                          setShowDatePicker(false);
                        }}>
                        <Text style={[styles.yearButtonText, selectedYear === year && styles.yearButtonTextActive]}>
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                <TouchableOpacity
                  style={styles.datePickerClose}
                  onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.datePickerCloseText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={addSaleModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddSaleModalVisible(false)}>
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -20}
          style={{ flex: 1 }}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Record Sale</Text>
              
              {/* Show which date the sale will be recorded for */}
              {profile?.current_role === 'admin' && filterMode === 'month' && selectedDay !== null && !showCustomDateInput && (
                <View style={styles.saleDateInfo}>
                  <Text style={styles.saleDateInfoText}>
                    {`Sale will be recorded for: ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth]} ${selectedDay}, ${selectedYear}`}
                  </Text>
                </View>
              )}
              
              <ScrollView 
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Select Product *</Text>
                  {products.length === 0 ? (
                    <View style={styles.emptyProducts}>
                      <Text style={styles.emptyProductsText}>
                        No products found. Add products in Inventory tab first.
                      </Text>
                    </View>
                  ) : (
                    <ScrollView style={styles.productPicker} nestedScrollEnabled>
                      {products.map((product) => (
                        <TouchableOpacity
                          key={product.id}
                          style={[
                            styles.productOption,
                            newSale.product_id === product.id && styles.productOptionSelected,
                          ]}
                          onPress={() => selectProduct(product.id)}>
                          <View style={styles.productOptionContent}>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.productOptionName,
                                  newSale.product_id === product.id && styles.productOptionNameSelected,
                                ]}>
                                {product.name || 'Unnamed Product'}
                              </Text>
                              <Text style={styles.productOptionPrice}>
                                {`${currencySymbol}${Number(product.price || 0).toFixed(2)} per ${product.unit || 'unit'}`}
                              </Text>
                              <Text style={styles.productStockInfo}>
                                {`Stock: ${inventory.find(i => i.product_id === product.id)?.quantity || 0} ${product.unit || 'unit'}`}
                              </Text>
                            </View>
                            {newSale.product_id === product.id && (
                              <Check size={20} color="#2563eb" />
                            )}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}
                </View>

                {selectedProduct && (
                  <View style={styles.selectedProductCard}>
                    <View>
                      <Text style={styles.selectedProductLabel}>Selected:</Text>
                      <Text style={styles.selectedProductText}>
                        {`${selectedProduct.name || 'Product'} - ${currencySymbol}${Number(selectedProduct.price || 0).toFixed(2)}`}
                      </Text>
                    </View>
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockBadgeText}>
                        {`${inventory.find(i => i.product_id === selectedProduct.id)?.quantity || 0} in stock`}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        const currentQty = parseInt(newSale.quantity) || 0;
                        if (currentQty > 0) {
                          setNewSale({ ...newSale, quantity: (currentQty - 1).toString() });
                        }
                      }}>
                      <Minus size={20} color="#374151" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantityInput}
                      placeholder="Qty"
                      placeholderTextColor="#94a3b8"
                      value={newSale.quantity}
                      onChangeText={(text) => setNewSale({ ...newSale, quantity: text })}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        const currentQty = parseInt(newSale.quantity) || 0;
                        const maxStock = inventory.find(i => i.product_id === newSale.product_id)?.quantity || 0;
                        if (currentQty < maxStock) {
                          setNewSale({ ...newSale, quantity: (currentQty + 1).toString() });
                        } else {
                          Alert.alert('Stock Limit', `Maximum available: ${maxStock}`);
                        }
                      }}>
                      <Plus size={20} color="#374151" />
                    </TouchableOpacity>
                  </View>
                  {selectedProduct && (
                    <Text style={styles.quantityHelperText}>
                      {`Max: ${inventory.find(i => i.product_id === selectedProduct.id)?.quantity || 0} ${selectedProduct.unit || 'unit'}`}
                    </Text>
                  )}
                </View>

                {selectedProduct && newSale.quantity && parseInt(newSale.quantity) > 0 && (
                  <View style={styles.totalPreview}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={styles.totalValue}>
                      {currencySymbol}{(parseInt(newSale.quantity) * (selectedProduct.price || 0)).toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add notes about this sale"
                    placeholderTextColor="#94a3b8"
                    value={newSale.notes}
                    onChangeText={(text) => setNewSale({ ...newSale, notes: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalButtonsFixed}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setAddSaleModalVisible(false);
                    setNewSale({ product_id: '', quantity: '', notes: '' });
                    setSelectedProduct(null);
                  }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!newSale.product_id || !newSale.quantity) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleAddSale}
                  disabled={!newSale.product_id || !newSale.quantity}>
                  <Text style={styles.saveButtonText}>Record Sale</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Sale Action Sheet Modal */}
      <Modal
        visible={saleActionSheetVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setSaleActionSheetVisible(false);
          setLongPressedSale(null);
          setActionSheetSale(null);
        }}>
        <TouchableWithoutFeedback onPress={() => {
          setSaleActionSheetVisible(false);
          setLongPressedSale(null);
          setActionSheetSale(null);
        }}>
          <View style={styles.actionSheetOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.actionSheetContent}>
                <View style={styles.actionSheetHeader}>
                  <Text style={styles.actionSheetTitle}>{actionSheetSale?.product?.name}</Text>
                  <Text style={styles.actionSheetSubtitle}>
                    {actionSheetSale ? `${actionSheetSale.quantity} × ${currencySymbol}${Number(actionSheetSale.unit_price).toFixed(2)}` : ''}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.actionSheetButton}
                  onPress={() => {
                    setSaleActionSheetVisible(false);
                    setLongPressedSale(null);
                    if (actionSheetSale) {
                      handleEditSale(actionSheetSale);
                    }
                  }}>
                  <Edit3 size={20} color="#8B5A2B" />
                  <Text style={styles.actionSheetButtonText}>Edit Sale</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionSheetButton, styles.actionSheetButtonDanger]}
                  onPress={() => {
                    setSaleActionSheetVisible(false);
                    setLongPressedSale(null);
                    if (actionSheetSale) {
                      handleDeleteSale(actionSheetSale);
                    }
                  }}>
                  <Trash2 size={20} color="#DC2626" />
                  <Text style={[styles.actionSheetButtonText, styles.actionSheetButtonTextDanger]}>Delete Sale</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.actionSheetCancelButton}
                  onPress={() => {
                    setSaleActionSheetVisible(false);
                    setLongPressedSale(null);
                    setActionSheetSale(null);
                  }}>
                  <Text style={styles.actionSheetCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Sale Modal */}
      <Modal
        visible={editSaleModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditSaleModalVisible(false)}>
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -20}
          style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Sale</Text>
              
              <ScrollView 
                style={styles.modalScrollEdit}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Select Product *</Text>
                  <ScrollView style={styles.productPicker} nestedScrollEnabled>
                    {products.map((product) => (
                      <TouchableOpacity
                        key={product.id}
                        style={[
                          styles.productOption,
                          editSale.product_id === product.id && styles.productOptionSelected,
                        ]}
                        onPress={() => {
                          const prod = products.find(p => p.id === product.id);
                          setEditSelectedProduct(prod || null);
                          setEditSale({ ...editSale, product_id: product.id });
                        }}>
                        <View style={styles.productOptionContent}>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.productOptionName,
                                editSale.product_id === product.id && styles.productOptionNameSelected,
                              ]}>
                              {product.name}
                            </Text>
                            <Text style={styles.productOptionPrice}>
                              {`${currencySymbol}${Number(product.price).toFixed(2)} per ${product.unit}`}
                            </Text>
                            <Text style={styles.productStockInfo}>
                              {`Stock: ${inventory.find(i => i.product_id === product.id)?.quantity || 0} ${product.unit}`}
                            </Text>
                          </View>
                          {editSale.product_id === product.id && (
                            <Check size={20} color="#2563eb" />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {editSelectedProduct && (
                  <View style={styles.selectedProductCard}>
                    <View>
                      <Text style={styles.selectedProductLabel}>Selected:</Text>
                      <Text style={styles.selectedProductText}>
                        {`${editSelectedProduct.name} - ${currencySymbol}${Number(editSelectedProduct.price).toFixed(2)}`}
                      </Text>
                    </View>
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockBadgeText}>
                        {`${inventory.find(i => i.product_id === editSelectedProduct.id)?.quantity || 0} in stock`}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Quantity *</Text>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        const currentQty = parseInt(editSale.quantity) || 0;
                        if (currentQty > 0) {
                          setEditSale({ ...editSale, quantity: (currentQty - 1).toString() });
                        }
                      }}>
                      <Minus size={20} color="#374151" />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.quantityInput}
                      placeholder="Qty"
                      placeholderTextColor="#94a3b8"
                      value={editSale.quantity}
                      onChangeText={(text) => setEditSale({ ...editSale, quantity: text })}
                      keyboardType="number-pad"
                    />
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        const currentQty = parseInt(editSale.quantity) || 0;
                        setEditSale({ ...editSale, quantity: (currentQty + 1).toString() });
                      }}>
                      <Plus size={20} color="#374151" />
                    </TouchableOpacity>
                  </View>
                </View>

                {editSelectedProduct && editSale.quantity && parseInt(editSale.quantity) > 0 && (
                  <View style={styles.totalPreview}>
                    <Text style={styles.totalLabel}>Total Amount:</Text>
                    <Text style={styles.totalValue}>
                      {currencySymbol}{(parseInt(editSale.quantity) * editSelectedProduct.price).toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes (Optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Add notes about this sale"
                    placeholderTextColor="#94a3b8"
                    value={editSale.notes}
                    onChangeText={(text) => setEditSale({ ...editSale, notes: text })}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <TouchableOpacity
                  style={styles.deleteButtonLarge}
                  onPress={() => selectedSale && handleDeleteSale(selectedSale)}>
                  <Trash2 size={20} color="#ffffff" />
                  <Text style={styles.deleteButtonLargeText}>Delete Sale</Text>
                </TouchableOpacity>
              </ScrollView>

              <View style={styles.modalButtonsFixed}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditSaleModalVisible(false);
                    setEditSale({ id: '', product_id: '', quantity: '', notes: '' });
                    setEditSelectedProduct(null);
                    setSelectedSale(null);
                  }}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    (!editSale.product_id || !editSale.quantity) && styles.saveButtonDisabled,
                  ]}
                  onPress={handleUpdateSale}
                  disabled={!editSale.product_id || !editSale.quantity}>
                  <Text style={styles.saveButtonText}>Update Sale</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
        </KeyboardAvoidingView>
      </Modal>
      </GestureHandlerRootView>
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
    paddingVertical: 16,
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
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  date: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: '#F5EDE4',
    borderRadius: 12,
    padding: 4,
    gap: 4,
    borderWidth: 2,
    borderColor: '#C4A07A',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 2,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#8B5A2B',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
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
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  datePickerContent: {
    backgroundColor: '#FDF8F3',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#E8D5C4',
  },
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2a2a2a',
    marginBottom: 20,
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  monthButton: {
    width: '30%',
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
  },
  monthButtonActive: {
    backgroundColor: '#8B5A2B',
  },
  monthButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  monthButtonTextActive: {
    color: '#FFFFFF',
  },
  yearList: {
    maxHeight: 300,
    marginBottom: 20,
  },
  yearButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  yearButtonActive: {
    backgroundColor: '#8B5A2B',
  },
  yearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  yearButtonTextActive: {
    color: '#FFFFFF',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  dayButton: {
    width: '13%',
    aspectRatio: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: '#8B5A2B',
  },
  dayButtonDisabled: {
    backgroundColor: '#E8E8E8',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayButtonTextActive: {
    color: '#FFFFFF',
  },
  dayButtonTextToday: {
    color: '#8B5A2B',
    fontWeight: '700',
  },
  dayButtonTextDisabled: {
    color: '#C0C0C0',
  },
  datePickerClose: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePickerCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#C4A07A',
    borderLeftWidth: 4,
    borderLeftColor: '#8B5A2B',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
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
  salesList: {
    padding: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  saleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#C4A07A',
  },
  saleInfo: {
    flex: 1,
  },
  saleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2a2a2a',
    marginBottom: 4,
  },
  saleDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  saleTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  saleRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  saleAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  deleteButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    maxHeight: '90%',
    borderWidth: 2,
    borderColor: '#C4A87A',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  saleDateInfo: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  saleDateInfoText: {
    fontSize: 14,
    color: '#92400E',
    fontWeight: '500',
  },
  modalScroll: {
    flexGrow: 0,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  adminModeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  adminModeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  productPicker: {
    maxHeight: 200,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#C4A87A',
    borderRadius: 8,
  },
  productOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  productOptionSelected: {
    backgroundColor: '#F5E6D3',
  },
  productOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  productOptionNameSelected: {
    color: '#8B6F47',
    fontWeight: '600',
  },
  productOptionPrice: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  productStockInfo: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 2,
    fontWeight: '500',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
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
  quantityHelperText: {
    fontSize: 12,
    color: '#6B7280',
  },
  stockBadge: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stockBadgeText: {
    fontSize: 12,
    color: '#065f46',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  emptyProducts: {
    padding: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  emptyProductsText: {
    fontSize: 14,
    color: '#991b1b',
    textAlign: 'center',
  },
  selectedProductCard: {
    backgroundColor: '#F5E6D3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D4BA9C',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedProductLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  selectedProductText: {
    fontSize: 16,
    color: '#8B6F47',
    fontWeight: '600',
  },
  selectedProduct: {
    backgroundColor: '#F5E6D3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  totalPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2a2a2a',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButtonsFixed: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#8B5A2B',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  editButtonActive: {
    backgroundColor: '#A67B5B',
    borderColor: '#A67B5B',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  editButtonTextActive: {
    color: '#ffffff',
  },
  saleNotes: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginTop: 2,
  },
  deleteButtonLarge: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 16,
  },
  deleteButtonLargeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  saleCardEditMode: {
    shadowColor: '#8B5A2B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    borderColor: '#8B5A2B',
    transform: [{ translateY: -4 }],
  },
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  actionSheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 34,
    paddingHorizontal: 20,
  },
  actionSheetHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  actionSheetSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionSheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F5EDE4',
    marginTop: 8,
    gap: 12,
  },
  actionSheetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5D3A1A',
  },
  actionSheetButtonDanger: {
    backgroundColor: '#FEF2F2',
  },
  actionSheetButtonTextDanger: {
    color: '#DC2626',
  },
  actionSheetCancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 12,
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  swipeDeleteContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  swipeDeleteButton: {
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    height: '100%',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 20,
  },
  swipeDeleteText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  modalScrollEdit: {
    maxHeight: '70%',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  monthNavButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  calendarMonthTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  calendarDayToday: {
    backgroundColor: '#F5E6D3',
    borderRadius: 12,
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  calendarDayTextToday: {
    color: '#8B6F47',
    fontWeight: '700',
  },
  calendarDayTextDisabled: {
    color: '#D1D5DB',
  },
  salesDot: {
    position: 'absolute',
    bottom: 4,
    backgroundColor: '#C89D5E',
    borderRadius: 4,
    width: 8,
    height: 8,
  },
  calendarHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 12,
    fontStyle: 'italic',
  },
  calendarDaySelected: {
    backgroundColor: '#8B6F47',
    borderRadius: 12,
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  clearSelectionButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  clearSelectionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  monthYearPickerContainer: {
    width: '100%',
    marginBottom: 20,
  },
  pickerSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  yearListCompact: {
    maxHeight: 50,
    marginBottom: 8,
  },
  yearChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  yearChipActive: {
    backgroundColor: '#8B6F47',
    borderColor: '#8B6F47',
  },
  yearChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  yearChipTextActive: {
    color: '#FFFFFF',
  },
  monthButtonDisabled: {
    opacity: 0.3,
  },
  monthButtonTextDisabled: {
    color: '#D1D5DB',
  },
  pickerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  pickerActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pickerActionButtonPrimary: {
    backgroundColor: '#8B6F47',
    borderColor: '#8B6F47',
  },
  pickerActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  pickerActionTextPrimary: {
    color: '#FFFFFF',
  },
});

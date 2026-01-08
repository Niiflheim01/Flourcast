import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions, Platform, TouchableOpacity, FlatList, SafeAreaView, Animated, Modal, Easing, PanResponder } from 'react-native';
import { useAuth } from '@/features/auth';
import { SalesService } from '@/features/sales';
import { ProductService, InventoryService } from '@/features/inventory';
import { formatDate, getCurrencySymbol } from '@/features/shared';
import { TrendingUp, TrendingDown, AlertCircle, AlertTriangle, RefreshCw, FileText, ChevronDown, ChevronUp, Bell, X, Calendar, CalendarDays, Package, CheckCircle, ShoppingBag, Award, ChefHat } from 'lucide-react-native';
import { useFocusEffect, router } from 'expo-router';
import { CalendarModal } from '@/components/CalendarModal';
import { WeekPickerModal } from '@/components/WeekPickerModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from '@/lib/notifications';

const { width } = Dimensions.get('window');

// Helper function for number formatting with commas
function formatNumber(num: number, decimals: number = 2): string {
  return num.toLocaleString('en-US', { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}

function formatWholeNumber(num: number): string {
  return num.toLocaleString('en-US');
}

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
        styles.alertCard,
        { backgroundColor, borderColor, transform: [{ translateX }], opacity },
      ]}>
      <TouchableOpacity style={styles.alertContent} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.alertHeader}>
          <Icon size={18} color={iconColor} />
          <Text style={[styles.alertTitle, { color: titleColor }]}>{title}</Text>
        </View>
        <Text style={[styles.alertDescription, { color: messageColor }]}>{message}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDismiss} style={styles.alertDismissButton}>
        <Text style={styles.alertDismissText}>×</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function DashboardScreen() {
  const { profile, user } = useAuth();
  const currencySymbol = getCurrencySymbol(profile?.currency || 'PHP');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wasRefreshing, setWasRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const reportHeightAnim = useRef(new Animated.Value(0)).current;
  const spinValue = useRef(new Animated.Value(0)).current;
  const pullProgress = useRef(new Animated.Value(0)).current;
  const spinningRef = useRef(false);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayItems: 0,
    totalProducts: 0,
    lowStockCount: 0,
    overstockCount: 0,
    topProducts: [] as any[],
    weeklyData: [] as { day: string; revenue: number; date: string }[],
  });
  const [inventory, setInventory] = useState<any[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showWeekPicker, setShowWeekPicker] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
    // Default to current week (starting Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  });
  const [dailyReport, setDailyReport] = useState<{ icon?: string; text: string; color?: string }[]>([]);
  const [reportExpanded, setReportExpanded] = useState(false);
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const notificationsTranslate = useRef(new Animated.Value(-500)).current;

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      loadUpcomingReminders();
      loadDismissedAlerts();
    }, [user, selectedWeekStart])
  );

  const openNotifications = () => {
    notificationsTranslate.setValue(-500);
    setNotificationsVisible(true);
    Animated.timing(notificationsTranslate, {
      toValue: 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeNotifications = () => {
    Animated.timing(notificationsTranslate, {
      toValue: -500,
      duration: 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setNotificationsVisible(false));
  };

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

  // Auto-refresh every minute to keep time accurate
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update displayed time
      setRefreshing(false);
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  // Regenerate daily report when reminders, inventory, or stats changes
  useEffect(() => {
    if (stats.totalProducts > 0 || inventory.length > 0 || upcomingReminders.length > 0) {
      const report = generateDailyReport(stats, inventory, [], upcomingReminders);
      setDailyReport(report);
    }
  }, [upcomingReminders, inventory, stats]);

  // Animate report expansion
  useEffect(() => {
    Animated.timing(reportHeightAnim, {
      toValue: reportExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [reportExpanded, reportHeightAnim]);

  const loadUpcomingReminders = async () => {
    if (!user) return;

    try {
      const storedNotes = await AsyncStorage.getItem(`calendar_notes_${user.uid}`);
      if (storedNotes) {
        const notes = JSON.parse(storedNotes);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const twoDaysFromNow = new Date(today);
        twoDaysFromNow.setDate(today.getDate() + 2);
        
        const todayStr = formatDate(today);
        const twoDaysStr = formatDate(twoDaysFromNow);

        // Filter notes for today and next 2 days
        const upcoming = notes.filter((note: any) => {
          const noteDate = note.date;
          return noteDate >= todayStr && noteDate <= twoDaysStr;
        }).map((note: any) => {
          // Parse date string in local timezone to avoid UTC offset issues
          const [year, month, day] = note.date.split('-').map(Number);
          const noteDateObj = new Date(year, month - 1, day);
          const daysFromToday = Math.round((noteDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          let dateLabel = 'Today';
          if (daysFromToday === 1) dateLabel = 'Tomorrow';
          else if (daysFromToday === 2) {
            const dayAfterTomorrow = new Date(today);
            dayAfterTomorrow.setDate(today.getDate() + 2);
            dateLabel = dayAfterTomorrow.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          }
          
          return {
            ...note,
            isToday: daysFromToday === 0,
            dateLabel
          };
        });

        setUpcomingReminders(upcoming);
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const dismissReminder = async (reminderId: string) => {
    if (user) {
      await NotificationService.dismissNotification(user.uid, `reminder_${reminderId}`);
    }
    setUpcomingReminders(prev => prev.filter(r => r.id !== reminderId));
  };

  const dismissAlert = async (type: 'lowStock' | 'overstock') => {
    if (user) {
      await NotificationService.dismissNotification(user.uid, `alert_${type}`);
    }
    const updated = new Set([...dismissedAlerts, type]);
    setDismissedAlerts(updated);
    await AsyncStorage.setItem('dismissedAlerts', JSON.stringify(Array.from(updated)));
  };

  // Send push notifications for stock alerts (only once per session)
  const sendStockAlertNotifications = async (lowStockCount: number, overstockCount: number, lowStockNames: string, overstockNames: string) => {
    const notificationsEnabled = await NotificationService.getNotificationsEnabled();
    if (!notificationsEnabled) return;

    // Check if we already sent alerts today
    const today = formatDate(new Date());
    const lastAlertDate = await AsyncStorage.getItem('lastAlertNotificationDate');
    if (lastAlertDate === today) return; // Already sent today

    let sentAny = false;

    if (lowStockCount > 0 && !dismissedAlerts.has('lowStock')) {
      await NotificationService.sendImmediateNotification(
        '⚠️ Low Stock Alert',
        `${lowStockCount} product${lowStockCount > 1 ? 's' : ''} running low: ${lowStockNames}`,
        { type: 'lowStock' }
      );
      sentAny = true;
    }

    if (overstockCount > 0 && !dismissedAlerts.has('overstock')) {
      await NotificationService.sendImmediateNotification(
        '📦 Overstock Alert',
        `${overstockCount} product${overstockCount > 1 ? 's are' : ' is'} overstocked: ${overstockNames}`,
        { type: 'overstock' }
      );
      sentAny = true;
    }

    if (sentAny) {
      await AsyncStorage.setItem('lastAlertNotificationDate', today);
    }
  };

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Calculate date range for weekly data (only fetch what we need)
      const weekEnd = new Date(selectedWeekStart);
      weekEnd.setDate(selectedWeekStart.getDate() + 6);
      const weekStartStr = formatDate(selectedWeekStart);
      const weekEndStr = formatDate(weekEnd);
      
      const [sales, products, inventory, weekSales] = await Promise.all([
        SalesService.getTodaysSales(user.uid),
        ProductService.getProducts(user.uid),
        InventoryService.getInventory(user.uid),
        // Only fetch sales for the selected week instead of ALL sales
        SalesService.getSales(user.uid, weekStartStr, weekEndStr),
      ]);

      const todayRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
      const todayItems = sales.reduce((sum, sale) => sum + sale.quantity, 0);
      const lowStockCount = inventory.filter(item => item.quantity <= item.min_threshold).length;
      const overstockCount = inventory.filter(item => item.quantity > ((item as any).max_threshold ?? 100)).length;

      const productSales = sales.reduce((acc, sale) => {
        if (!acc[sale.product_id]) {
          acc[sale.product_id] = {
            product: sale.product,
            quantity: 0,
            revenue: 0,
          };
        }
        acc[sale.product_id].quantity += sale.quantity;
        acc[sale.product_id].revenue += Number(sale.total_amount);
        return acc;
      }, {} as Record<string, any>);

      const topProducts = Object.values(productSales)
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 3);

      // Calculate weekly data based on selected week (Sunday to Saturday)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyData = [];
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(selectedWeekStart);
        date.setDate(selectedWeekStart.getDate() + i);
        const dateStr = formatDate(date);
        
        const dayRevenue = weekSales
          .filter(sale => sale.sale_date && sale.sale_date.startsWith(dateStr))
          .reduce((sum, sale) => sum + Number(sale.total_amount), 0);
        
        weeklyData.push({
          day: days[date.getDay()],
          revenue: dayRevenue,
          date: dateStr,
        });
      }

      setStats({
        todayRevenue,
        todayItems,
        totalProducts: products.length,
        lowStockCount,
        overstockCount,
        topProducts,
        weeklyData,
      });
      setInventory(inventory);
      
      // Send push notifications for stock alerts
      const lowStockItems = inventory.filter(item => item.quantity <= item.min_threshold);
      const overstockItems = inventory.filter(item => item.quantity > ((item as any).max_threshold ?? 100));
      const lowStockNames = lowStockItems.map(item => item.product?.name).filter(Boolean).join(', ');
      const overstockNames = overstockItems.map(item => item.product?.name).filter(Boolean).join(', ');
      
      if (lowStockCount > 0 || overstockCount > 0) {
        sendStockAlertNotifications(lowStockCount, overstockCount, lowStockNames, overstockNames);
      }
      
      // Generate daily report
      const report = generateDailyReport({
        todayRevenue,
        todayItems,
        totalProducts: products.length,
        lowStockCount,
        topProducts,
        weeklyData,
      }, inventory, products);
      setDailyReport(report);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateDailyReport = (stats: any, inventory: any[], products: any[], reminders: any[] = []) => {
    const totalBaked = stats.todayItems;
    const inStock = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const topProduct = stats.topProducts[0];
    const lowStockItems = inventory.filter(item => item.quantity <= item.min_threshold);
    const lowStockNames = lowStockItems.map(item => item.product?.name).filter(Boolean).join(', ');
    const overstockItems = inventory.filter(item => item.quantity > ((item as any).max_threshold ?? 100));
    const overstockNames = overstockItems.map(item => item.product?.name).filter(Boolean).join(', ');
    
    const points: { icon?: string; text: string; color?: string }[] = [];
    
    // Today's events/reminders first (priority info) - with calendar icon
    const todayReminders = reminders.filter(r => r.isToday);
    if (todayReminders.length > 0) {
      const reminderTexts = todayReminders.map(r => r.text).slice(0, 3);
      points.push({ icon: 'calendar', text: `Today's events: ${reminderTexts.join(', ')}${todayReminders.length > 3 ? ` (+${todayReminders.length - 3} more)` : ''}`, color: '#8B6F47' });
    }
    
    // Upcoming reminders (tomorrow and day after) - with calendar icon
    const upcomingRemindersFiltered = reminders.filter(r => !r.isToday);
    if (upcomingRemindersFiltered.length > 0) {
      points.push({ icon: 'calendar', text: `${upcomingRemindersFiltered.length} upcoming event${upcomingRemindersFiltered.length > 1 ? 's' : ''} in the next 2 days`, color: '#8B6F47' });
    }
    
    // Regular bullet points (no icons)
    if (totalBaked > 0) {
      points.push({ text: `${totalBaked} items sold today, ${inStock} pieces remaining in stock` });
    } else {
      points.push({ text: 'No sales recorded today' });
    }
    
    if (topProduct) {
      points.push({ text: `Best seller: ${topProduct.product?.name} (${topProduct.quantity} pcs)` });
    }
    
    // Stock alerts section - with icons
    if (lowStockItems.length > 0) {
      points.push({ icon: 'lowStock', text: `Low stock alert: ${lowStockNames} (${lowStockItems.length} item${lowStockItems.length > 1 ? 's' : ''})`, color: '#DC2626' });
    }
    
    if (overstockItems.length > 0) {
      points.push({ icon: 'overstock', text: `Overstock alert: ${overstockNames} (${overstockItems.length} item${overstockItems.length > 1 ? 's' : ''})`, color: '#2563EB' });
    }
    
    if (lowStockItems.length === 0 && overstockItems.length === 0) {
      points.push({ text: 'All inventory levels are healthy' });
    }
    
    points.push({ text: `Total revenue: ${currencySymbol}${formatNumber(stats.todayRevenue)}` });
    
    return points;
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setWasRefreshing(true);
    // Animate to full position when refreshing starts
    Animated.spring(pullProgress, {
      toValue: 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
    
    Promise.all([loadDashboardData(), loadUpcomingReminders()]).finally(() => {
      // Keep visible briefly after load completes
      setTimeout(() => {
        setRefreshing(false);
        setIsPulling(false);
        // Smoothly animate back up
        Animated.timing(pullProgress, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }).start(() => {
          // Only clear wasRefreshing after animation is complete
          setWasRefreshing(false);
        });
      }, 500);
    });
  }, [user]);

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
      // Calculate progress from 0 to 1 based on pull distance
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B6F47" />
      </View>
    );
  }

  const maxRevenue = Math.max(...stats.weeklyData.map(d => d.revenue), 1);
  const now = new Date();
  const getToday = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  // Calculate date range for chart subtitle based on selected week
  const weekEnd = new Date(selectedWeekStart);
  weekEnd.setDate(selectedWeekStart.getDate() + 6);
  const weekStartStr = selectedWeekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEndStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekRange = `${weekStartStr} - ${weekEndStr}`;

  // Check if viewing current week
  const todayWeekStart = new Date();
  todayWeekStart.setDate(todayWeekStart.getDate() - todayWeekStart.getDay());
  todayWeekStart.setHours(0, 0, 0, 0);
  const isCurrentWeek = selectedWeekStart.getTime() === todayWeekStart.getTime();

  return (
    <SafeAreaView style={styles.container}>
      {/* Chef Hat Refresh Indicator - Follows pull progress */}
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
        pointerEvents="none"
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
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="transparent"
            colors={['transparent']}
            progressBackgroundColor="transparent"
            progressViewOffset={0}
          />
        }>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Hello, {profile?.bakery_name || 'Admin'}</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity 
                onPress={openNotifications}
                style={styles.notifButton}>
                <Bell size={22} color="#5D3A1A" />
                {(stats.lowStockCount + stats.overstockCount + upcomingReminders.length) > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{Math.min(99, stats.lowStockCount + stats.overstockCount + upcomingReminders.length)}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setShowCalendar(true)}
                style={styles.dateButton}>
                <Text style={styles.date}>{getToday}</Text>
              </TouchableOpacity>
            </View>
          </View>

        {/* Upcoming Reminders */}
        {upcomingReminders.length > 0 && (
          <View style={styles.remindersSection}>
            {upcomingReminders.map((reminder) => (
              <View key={reminder.id} style={styles.reminderCard}>
                <View style={styles.reminderHeader}>
                  <View style={styles.reminderIconContainer}>
                    <Bell size={16} color="#8B6F47" />
                  </View>
                  <View style={styles.reminderContent}>
                    <View style={styles.reminderTitleRow}>
                      <Text style={styles.reminderDateLabel}>{reminder.dateLabel}</Text>
                      {reminder.hasReminder && reminder.reminderTime && (
                        <Text style={styles.reminderTime}>{reminder.reminderTime}</Text>
                      )}
                    </View>
                    <Text style={styles.reminderText}>{reminder.text}</Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => dismissReminder(reminder.id)}
                    style={styles.dismissButton}>
                    <X size={18} color="#8B7355" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {stats.lowStockCount > 0 && !dismissedAlerts.has('lowStock') && (
          <SwipeableAlert
            type="lowStock"
            title="Low Stock Alert"
            message={`${stats.lowStockCount} product${stats.lowStockCount > 1 ? 's' : ''} running low`}
            onDismiss={() => dismissAlert('lowStock')}
            onPress={async () => {
              await AsyncStorage.setItem('triggerLowStockHighlight', 'true');
              router.push('/(tabs)/inventory');
            }}
            icon={AlertCircle}
          />
        )}

        {stats.overstockCount > 0 && !dismissedAlerts.has('overstock') && (
          <SwipeableAlert
            type="overstock"
            title="Overstock Alert"
            message={`${stats.overstockCount} product${stats.overstockCount > 1 ? 's' : ''} overstocked`}
            onDismiss={() => dismissAlert('overstock')}
            onPress={() => router.push('/(tabs)/inventory')}
            backgroundColor="#EFF6FF"
            borderColor="#BFDBFE"
            iconColor="#3b82f6"
            titleColor="#3b82f6"
            messageColor="#1e40af"
            icon={AlertTriangle}
          />
        )}

        {/* Notifications Drawer */}
        <Modal
          visible={notificationsVisible}
          transparent
          animationType="none"
          onRequestClose={closeNotifications}>
          <View style={[styles.modalOverlay, { justifyContent: 'flex-start' }]}>
            <Animated.View style={[styles.modalContent, { marginTop: 32, transform: [{ translateY: notificationsTranslate }] }] }>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notifications</Text>
                <TouchableOpacity onPress={closeNotifications}>
                  <Text style={styles.alertDismissText}>×</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                {stats.lowStockCount === 0 && stats.overstockCount === 0 && upcomingReminders.length === 0 && (
                  <Text style={styles.emptyText}>No notifications</Text>
                )}

                {stats.lowStockCount > 0 && (
                  <View style={styles.notifCard}>
                    <View style={styles.notifIconCircle}>
                      <AlertCircle size={18} color="#DC6B19" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.alertText, { marginLeft: 0 }]}>Low Stock Alert</Text>
                      <Text style={styles.notifSubtext}>{stats.lowStockCount} product{stats.lowStockCount > 1 ? 's' : ''} running low</Text>
                    </View>
                  </View>
                )}

                {stats.overstockCount > 0 && (
                  <View style={styles.notifCard}> 
                    <View style={[styles.notifIconCircle, { backgroundColor: '#EFF6FF' }] }>
                      <AlertTriangle size={18} color="#3b82f6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.alertText, { color: '#1e40af', marginLeft: 0 }]}>Overstock Alert</Text>
                      <Text style={styles.notifSubtext}>{stats.overstockCount} product{stats.overstockCount > 1 ? 's' : ''} overstocked</Text>
                    </View>
                  </View>
                )}

                {upcomingReminders.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    {upcomingReminders.map((reminder) => (
                      <View key={reminder.id} style={styles.notifCard}>
                        <View style={[styles.notifIconCircle, { backgroundColor: '#FFF7ED' }] }>
                          <Bell size={16} color="#8B6F47" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.reminderTitleRow}>
                            <Text style={[styles.reminderDateLabel, { marginBottom: 0 }]}>{reminder.dateLabel}</Text>
                            {reminder.hasReminder && reminder.reminderTime && (
                              <Text style={styles.reminderTime}>{reminder.reminderTime}</Text>
                            )}
                          </View>
                          <Text style={styles.reminderText}>{reminder.text}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        {dailyReport && dailyReport.length > 0 && (
          <View style={styles.reportCard}>
            <TouchableOpacity 
              style={styles.reportHeader}
              onPress={() => setReportExpanded(!reportExpanded)}
              activeOpacity={0.7}>
              <FileText size={18} color="#8B6F47" />
              <Text style={styles.reportTitle}>Daily Report</Text>
              <Animated.View style={{ transform: [{ rotate: reportHeightAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg'],
              }) }] }}>
                <ChevronDown size={18} color="#8B6F47" />
              </Animated.View>
            </TouchableOpacity>
            <Animated.View style={[styles.reportContent, { 
              opacity: reportHeightAnim,
              maxHeight: reportHeightAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 500],
              })
            }]}>
              {dailyReport.map((point, index: number) => {
                const renderIcon = () => {
                  if (point.icon === 'calendar') {
                    return <Calendar size={12} color={point.color || '#8B6F47'} />;
                  } else if (point.icon === 'lowStock') {
                    return <AlertTriangle size={12} color={point.color || '#DC2626'} />;
                  } else if (point.icon === 'overstock') {
                    return <Package size={12} color={point.color || '#2563EB'} />;
                  }
                  return null;
                };
                const icon = renderIcon();
                return (
                  <View key={index} style={styles.reportBullet}>
                    <View style={styles.reportRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      {icon && <View style={styles.reportIconWrapper}>{icon}</View>}
                      <Text style={[styles.reportText, { flex: 1 }]}>{point.text}</Text>
                    </View>
                  </View>
                );
              })}
            </Animated.View>
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{currencySymbol}{formatNumber(stats.todayRevenue)}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>Total Sales</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{formatWholeNumber(stats.todayItems)} pc/s</Text>
            <Text style={styles.statLabel} numberOfLines={2}>Products Sold Today</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <TouchableOpacity 
            style={styles.chartHeaderTouchable}
            onPress={() => setShowWeekPicker(true)}
            activeOpacity={0.7}>
            <Text style={styles.chartTitle}>Weekly Sales Chart</Text>
            <Text style={styles.chartSubtitle}>
              {weekRange} {isCurrentWeek ? '(This Week)' : ''}
            </Text>
          </TouchableOpacity>
          <View style={styles.chart}>
            {stats.weeklyData.map((data, index) => {
              const barHeight = maxRevenue > 0 ? (data.revenue / maxRevenue) * 120 : 0;
              const displayHeight = data.revenue > 0 ? Math.max(barHeight, 20) : 4;
              // Check if this bar is for today
              const today = new Date();
              const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const isToday = data.date === todayStr;
              // Calculate highlight height to encompass bar + value text + padding
              const highlightHeight = displayHeight + (data.revenue > 0 ? 28 : 12); // bar + text space + padding
              return (
                <View key={index} style={styles.barContainer}>
                  <View style={styles.barWrapper}>
                    {/* Today's highlight background - responsive to bar height */}
                    {isToday && (
                      <View style={[styles.todayHighlight, { height: highlightHeight }]} />
                    )}
                    <View style={[styles.bar, { height: displayHeight }, isToday && styles.barToday]} />
                    {data.revenue > 0 && (
                      <Text style={[styles.barValue, isToday && styles.barValueToday]} numberOfLines={1} adjustsFontSizeToFit>{currencySymbol}{formatWholeNumber(Math.round(data.revenue))}</Text>
                    )}
                  </View>
                  <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>{data.day.slice(0, 3)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.stockCard}>
          <View style={styles.stockHeader}>
            <Text style={styles.stockTitle}>Stocks/Inventory</Text>
          </View>
          
          <ScrollView 
            style={styles.inventoryScroll}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}>
            {inventory.length > 0 ? (
              // Sort inventory: Low stock (red) first, then Medium (yellow), then Good (green)
              [...inventory].sort((a: any, b: any) => {
                const getStockPriority = (item: any) => {
                  const stockLevel = item.quantity || 0;
                  const minThreshold = item.min_threshold || 10;
                  if (stockLevel <= minThreshold) return 0; // Low - highest priority
                  if (stockLevel <= minThreshold * 2.5) return 1; // Medium
                  return 2; // Good - lowest priority
                };
                return getStockPriority(a) - getStockPriority(b);
              }).map((item: any, index: number) => {
                const stockLevel = item.quantity || 0;
                const minThreshold = item.min_threshold || 10;
                // Calculate stock status based on relationship to min_threshold
                // Low: at or below min_threshold (red)
                // Medium: between min_threshold and 2x min_threshold (yellow)
                // Good: above 2x min_threshold (green)
                const isLowStock = stockLevel <= minThreshold;
                const isMediumStock = !isLowStock && stockLevel <= minThreshold * 2.5;
                const isGoodStock = !isLowStock && !isMediumStock;
                
                // Calculate percentage for progress bar (based on a reasonable max of 3x threshold)
                const reasonableMax = minThreshold * 4;
                const stockPercentage = Math.min(100, Math.round((stockLevel / reasonableMax) * 100));
                
                return (
                <View key={index} style={styles.inventoryItem}>
                  <View style={styles.inventoryItemHeader}>
                    <Text style={styles.inventoryProductName} numberOfLines={1}>
                      {item.product?.name || 'Unknown'}
                    </Text>
                    <View style={[
                      styles.stockBadge,
                      isLowStock && styles.stockBadgeLow,
                      isMediumStock && styles.stockBadgeMedium,
                      isGoodStock && styles.stockBadgeHigh
                    ]}>
                      <Text style={styles.stockBadgeText}>
                        {isLowStock ? 'Low Stock' : isMediumStock ? 'Medium' : 'Good'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.inventoryItemDetails}>
                    <Text style={styles.inventoryDetailText} numberOfLines={1} adjustsFontSizeToFit>Available: {stockLevel} {item.product?.unit || 'pcs'}</Text>
                    <Text style={styles.inventoryDetailText} numberOfLines={1} adjustsFontSizeToFit>Min: {minThreshold} {item.product?.unit || 'pcs'}</Text>
                  </View>
                  <View style={styles.stockProgressBar}>
                    <View style={[
                      styles.stockProgressFill,
                      { width: `${stockPercentage}%` },
                      isLowStock && styles.progressLow,
                      isMediumStock && styles.progressMedium,
                      isGoodStock && styles.progressHigh
                    ]} />
                  </View>
                </View>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No sales data yet</Text>
                <Text style={styles.emptySubtext}>Start recording sales to see your inventory</Text>
              </View>
            )}
          </ScrollView>
        </View>

        </View>
      </ScrollView>
      
      {user && (
        <CalendarModal
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
          userId={user.uid}
          onNotesChange={loadUpcomingReminders}
        />
      )}

      <WeekPickerModal
        visible={showWeekPicker}
        onClose={() => setShowWeekPicker(false)}
        onSelectWeek={(weekStart) => setSelectedWeekStart(weekStart)}
        selectedWeekStart={selectedWeekStart}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5EDE4',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingTop: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5EDE4',
  },
  // Chef Hat Refresh Indicator - Absolute Overlay
  chefHatRefreshOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingTop: 16,
    zIndex: 1000,
    backgroundColor: 'rgba(245, 237, 228, 0.95)',
    gap: 6,
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
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3a3a3a',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  refreshButton: {
    padding: 6,
    backgroundColor: '#F5EDE4',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#8B5A2B',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  date: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#2a2a2a',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#C4A07A',
  },
  chartHeaderTouchable: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2a2a2a',
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingHorizontal: 4,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    width: '65%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 110,
    position: 'relative',
  },
  todayHighlight: {
    position: 'absolute',
    bottom: 0,
    left: -8,
    right: -8,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
  },
  bar: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 8,
    minHeight: 4,
    zIndex: 1,
  },
  barToday: {
    backgroundColor: '#059669',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  barValue: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    zIndex: 1,
  },
  barValueToday: {
    color: '#059669',
    fontWeight: '700',
  },
  barLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
    fontWeight: '500',
  },
  barLabelToday: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 12,
  },
  stockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#C4A07A',
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stockTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2a2a2a',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  remindersSection: {
    gap: 12,
    marginBottom: 16,
  },
  reminderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C4A07A',
    overflow: 'hidden',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  reminderIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reminderDateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    textTransform: 'uppercase',
  },
  reminderTime: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  reminderText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  dismissButton: {
    padding: 4,
  },
  alertBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#FCA5A5',
    marginBottom: 16,
    marginHorizontal: 16,
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  alertCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#FCA5A5',
    overflow: 'hidden',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 12,
  },
  notifButton: {
    padding: 8,
    marginRight: 8,
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 4,
    minWidth: 16,
    alignItems: 'center',
  },
  notifBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
    gap: 10,
  },
  notifIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifSubtext: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC6B19',
  },
  alertDescription: {
    fontSize: 13,
    color: '#DC2626',
    lineHeight: 18,
  },
  alertText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
    marginLeft: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
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
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#C4A07A',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2a2a2a',
    flex: 1,
  },
  reportContent: {
    paddingTop: 12,
    paddingLeft: 4,
  },
  reportBullet: {
    marginBottom: 8,
    paddingRight: 8,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  bulletDot: {
    fontSize: 16,
    color: '#8B5A2B',
    lineHeight: 20,
  },
  reportIconWrapper: {
    width: 14,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4B5563',
  },
  inventoryItem: {
    backgroundColor: '#FAF6F1',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#D4B896',
    borderLeftWidth: 4,
    borderLeftColor: '#8B5A2B',
  },
  dateButton: {
    backgroundColor: '#8B5A2B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  inventoryScroll: {
    maxHeight: 400,
  },
  inventoryList: {
    gap: 12,
  },
  inventoryItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inventoryProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5D3A1A',
    flex: 1,
    marginRight: 10,
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stockBadgeLow: {
    backgroundColor: '#FECACA',
  },
  stockBadgeOverstock: {
    backgroundColor: '#BFDBFE',
  },
  stockBadgeMedium: {
    backgroundColor: '#FED7AA',
  },
  stockBadgeHigh: {
    backgroundColor: '#BBF7D0',
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3D2914',
  },
  inventoryItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inventoryDetailText: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '500',
  },
  stockProgressBar: {
    height: 6,
    backgroundColor: '#E8DDD0',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 2,
  },
  stockProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLow: {
    backgroundColor: '#DC2626',
  },
  progressMedium: {
    backgroundColor: '#F59E0B',
  },
  progressHigh: {
    backgroundColor: '#10B981',
  },
});

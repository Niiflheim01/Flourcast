import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions, Platform, TouchableOpacity, FlatList } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { SalesService } from '@/services/sales.service.sqlite';
import { ProductService } from '@/services/product.service.sqlite';
import { InventoryService } from '@/services/inventory.service.sqlite';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, FileText, ChevronDown, ChevronUp, Bell, X } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { CalendarModal } from '@/components/CalendarModal';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { profile, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayItems: 0,
    totalProducts: 0,
    lowStockCount: 0,
    topProducts: [] as any[],
    weeklyData: [] as { day: string; revenue: number }[],
  });
  const [inventory, setInventory] = useState<any[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [dailyReport, setDailyReport] = useState('');
  const [reportExpanded, setReportExpanded] = useState(false);
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
      loadUpcomingReminders();
    }, [user])
  );

  // Auto-refresh every minute to keep time accurate
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update displayed time
      setRefreshing(false);
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

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
        
        const todayStr = today.toISOString().split('T')[0];
        const twoDaysStr = twoDaysFromNow.toISOString().split('T')[0];

        // Filter notes for today and next 2 days
        const upcoming = notes.filter((note: any) => {
          const noteDate = note.date;
          return noteDate >= todayStr && noteDate <= twoDaysStr;
        }).map((note: any) => {
          const daysFromToday = Math.round((new Date(note.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
    setUpcomingReminders(prev => prev.filter(r => r.id !== reminderId));
  };

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const [sales, products, inventory, allSales] = await Promise.all([
        SalesService.getTodaysSales(user.uid),
        ProductService.getProducts(user.uid),
        InventoryService.getInventory(user.uid),
        SalesService.getSales(user.uid),
      ]);

      const todayRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
      const todayItems = sales.reduce((sum, sale) => sum + sale.quantity, 0);
      const lowStockCount = inventory.filter(item => item.quantity <= item.min_threshold).length;

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

      // Calculate weekly data (last 7 days)
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const today = new Date();
      const weeklyData = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayRevenue = allSales
          .filter(sale => sale.sale_date && sale.sale_date.startsWith(dateStr))
          .reduce((sum, sale) => sum + Number(sale.total_amount), 0);
        
        weeklyData.push({
          day: days[date.getDay()],
          revenue: dayRevenue,
        });
      }

      setStats({
        todayRevenue,
        todayItems,
        totalProducts: products.length,
        lowStockCount,
        topProducts,
        weeklyData,
      });
      setInventory(inventory);
      
      // Generate daily report
      const report = generateDailyReport({
        todayRevenue,
        todayItems,
        totalProducts: products.length,
        lowStockCount,
        topProducts,
        weeklyData,
      }, inventory, products);
      setDailyReport(report as any);
    } catch (error: any) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateDailyReport = (stats: any, inventory: any[], products: any[]) => {
    const totalBaked = stats.todayItems;
    const inStock = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const topProduct = stats.topProducts[0];
    const lowStockItems = inventory.filter(item => item.quantity <= item.min_threshold);
    const lowStockNames = lowStockItems.map(item => item.product?.name).filter(Boolean).join(', ');
    
    const points = [];
    
    if (totalBaked > 0) {
      points.push(`${totalBaked} items prepared and sold today, ${inStock} pieces remaining in stock`);
    } else {
      points.push('No production or sales recorded today');
    }
    
    if (topProduct) {
      points.push(`Best seller: ${topProduct.product?.name} (${topProduct.quantity} pcs)`);
    }
    
    if (lowStockItems.length > 0) {
      points.push(`${lowStockItems.length} low stock items: ${lowStockNames}`);
    } else {
      points.push('All inventory levels are healthy');
    }
    
    points.push(`Total revenue: ₱${stats.todayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`);
    
    return points;
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDashboardData();
    loadUpcomingReminders();
  }, [user]);

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
  
  // Calculate date range for chart subtitle
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - 6);
  const weekStartStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekEndStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekRange = `${weekStartStr} - ${weekEndStr}`;

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>Hello, {profile?.bakery_name || 'Admin'}</Text>
              <TouchableOpacity 
                onPress={() => {
                  setRefreshing(true);
                  loadDashboardData();
                }}
                style={styles.refreshButton}>
                <RefreshCw size={16} color="#8B6F47" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              onPress={() => setShowCalendar(true)}
              style={styles.dateButton}>
              <Text style={styles.date}>{getToday}</Text>
            </TouchableOpacity>
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

        {stats.lowStockCount > 0 && (
          <View style={styles.alertBanner}>
            <AlertCircle size={18} color="#DC6B19" />
            <Text style={styles.alertText}>
              {stats.lowStockCount} product{stats.lowStockCount > 1 ? 's' : ''} running low
            </Text>
          </View>
        )}

        {dailyReport && dailyReport.length > 0 && (
          <View style={styles.reportCard}>
            <TouchableOpacity 
              style={styles.reportHeader}
              onPress={() => setReportExpanded(!reportExpanded)}
              activeOpacity={0.7}>
              <FileText size={18} color="#8B6F47" />
              <Text style={styles.reportTitle}>Daily Report</Text>
              {reportExpanded ? (
                <ChevronUp size={18} color="#8B6F47" />
              ) : (
                <ChevronDown size={18} color="#8B6F47" />
              )}
            </TouchableOpacity>
            {reportExpanded && (
              <View style={styles.reportContent}>
                {dailyReport.map((point: string, index: number) => (
                  <View key={index} style={styles.reportBullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.reportText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>₱{stats.todayRevenue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</Text>
            <Text style={styles.statLabel} numberOfLines={1}>Total Sales</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{stats.todayItems} pc/s</Text>
            <Text style={styles.statLabel} numberOfLines={2}>Product Prepared Today</Text>
          </View>
        </View>

        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Weekly Sales Chart</Text>
            <Text style={styles.chartSubtitle}>{weekRange}</Text>
          </View>
          <View style={styles.chart}>
            {stats.weeklyData.map((data, index) => {
              const barHeight = maxRevenue > 0 ? (data.revenue / maxRevenue) * 140 : 0;
              const displayHeight = data.revenue > 0 ? Math.max(barHeight, 20) : 4;
              return (
                <View key={index} style={styles.barContainer}>
                  <View style={styles.barWrapper}>
                    <View style={[styles.bar, { height: displayHeight }]} />
                    {data.revenue > 0 && (
                      <Text style={styles.barValue} numberOfLines={1} adjustsFontSizeToFit>₱{data.revenue.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</Text>
                    )}
                  </View>
                  <Text style={styles.barLabel}>{data.day.slice(0, 3)}</Text>
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
              inventory.map((item: any, index: number) => {
                const stockLevel = item.quantity || 0;
                const maxStock = item.max_threshold || 100;
                const stockPercentage = maxStock > 0 ? Math.min(100, Math.round((stockLevel / maxStock) * 100)) : 0;
                const isLowStock = stockLevel <= item.min_threshold;
                const isMediumStock = !isLowStock && stockPercentage < 70;
                
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
                      !isLowStock && !isMediumStock && styles.stockBadgeHigh
                    ]}>
                      <Text style={styles.stockBadgeText}>
                        {isLowStock ? 'Low Stock' : isMediumStock ? 'Medium' : 'In Stock'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.inventoryItemDetails}>
                    <Text style={styles.inventoryDetailText} numberOfLines={1} adjustsFontSizeToFit>Available: {stockLevel} pcs</Text>
                    <Text style={styles.inventoryDetailText} numberOfLines={1} adjustsFontSizeToFit>Stock Level: {stockPercentage}%</Text>
                  </View>
                  <View style={styles.stockProgressBar}>
                    <View style={[
                      styles.stockProgressFill,
                      { width: `${stockPercentage}%` },
                      isLowStock && styles.progressLow,
                      isMediumStock && styles.progressMedium,
                      !isLowStock && !isMediumStock && styles.progressHigh
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8DCC8',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8DCC8',
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
    backgroundColor: '#D4BA9C',
    borderRadius: 12,
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
    backgroundColor: '#D4BA9C',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2a2a2a',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B5439',
    textAlign: 'center',
    fontWeight: '500',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  chartHeader: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2a2a2a',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#6B5439',
  },
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 160,
    paddingHorizontal: 8,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barWrapper: {
    width: '70%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: 140,
  },
  bar: {
    width: '100%',
    backgroundColor: '#10B981',
    borderRadius: 8,
    minHeight: 4,
  },
  barValue: {
    fontSize: 9,
    color: '#6B5439',
    marginTop: 4,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  barLabel: {
    fontSize: 11,
    color: '#6B5439',
    marginTop: 8,
    fontWeight: '500',
  },
  stockCard: {
    backgroundColor: '#D4BA9C',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
    color: '#6B5439',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#8B7355',
  },
  remindersSection: {
    gap: 12,
    marginBottom: 16,
  },
  reminderCard: {
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    overflow: 'hidden',
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
    backgroundColor: '#FFE0B2',
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
    color: '#8B6F47',
    textTransform: 'uppercase',
  },
  reminderTime: {
    fontSize: 11,
    color: '#8B7355',
    fontWeight: '600',
  },
  reminderText: {
    fontSize: 14,
    color: '#6B5439',
    lineHeight: 20,
  },
  dismissButton: {
    padding: 4,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE8D6',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFCBA4',
    marginBottom: 16,
  },
  alertText: {
    fontSize: 13,
    color: '#DC6B19',
    fontWeight: '600',
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
    flexDirection: 'row',
    marginBottom: 8,
    paddingRight: 8,
  },
  bulletDot: {
    fontSize: 16,
    color: '#8B6F47',
    marginRight: 8,
    lineHeight: 20,
  },
  reportText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#4a4a4a',
    flex: 1,
  },
  inventoryItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  dateButton: {
    backgroundColor: '#8B6F47',
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
    color: '#2a2a2a',
    flex: 1,
    marginRight: 10,
  },
  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockBadgeLow: {
    backgroundColor: '#FEE2E2',
  },
  stockBadgeMedium: {
    backgroundColor: '#FFF4E5',
  },
  stockBadgeHigh: {
    backgroundColor: '#E8F5E9',
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2a2a2a',
  },
  inventoryItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inventoryDetailText: {
    fontSize: 12,
    color: '#6B5439',
    fontWeight: '500',
  },
  stockProgressBar: {
    height: 6,
    backgroundColor: '#F5E6D3',
    borderRadius: 3,
    overflow: 'hidden',
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

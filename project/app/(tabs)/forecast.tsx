import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Dimensions,
  LayoutAnimation,
  Platform,
  UIManager,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Easing,
} from 'react-native';
import { useAuth } from '@/features/auth';
import { ForecastService } from '@/features/forecast';
import { ForecastWithProduct, getPermissions, getCurrencySymbol } from '@/features/shared';
import { TrendingUp, RefreshCw, Sparkles, Package, ChefHat, AlertCircle, TrendingDown, Minus, BarChart3, ChevronDown, ChevronUp, CheckCircle, Trophy, Activity, Lightbulb } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { SalesService } from '@/features/sales';
import { InventoryService, ProductService } from '@/features/inventory';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

function formatDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

interface BakingPlan {
  productId: string;
  productName: string;
  unit: string;
  expectedSales: number;
  currentStock: number;
  needToBake: number;
  priority: 'urgent' | 'bake' | 'enough';
  reliability: number;
}

interface ProductInsight {
  productId: string;
  productName: string;
  unit: string;
  trend: 'rising' | 'falling' | 'steady';
  trendPercentage: number;
  avgDailySales: number;
  last7DaysSales: number;
  performanceScore: number;
  stockStatus: 'good' | 'low' | 'critical' | 'overstocked';
  currentStock: number;
  consistency: number; // 0-1 value representing sales consistency
  expanded?: boolean;
}

interface TopProduct {
  id: string;
  name: string;
  total_quantity: number;
  unit: string;
}

export default function ForecastScreen() {
  const { user, profile } = useAuth();
  const permissions = getPermissions(profile?.current_role || 'admin');
  const currencySymbol = getCurrencySymbol(profile?.currency || 'PHP');
  const [activeTab, setActiveTab] = useState<'baking' | 'analysis'>('baking');
  const [forecastDateRange, setForecastDateRange] = useState<7 | 30 | 180 | 90 | 365>(7);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [forecasts, setForecasts] = useState<ForecastWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wasRefreshing, setWasRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [generating, setGenerating] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const pullProgress = useRef(new Animated.Value(0)).current;
  const spinningRef = useRef(false);
  const [bakingPlans, setBakingPlans] = useState<BakingPlan[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [productInsights, setProductInsights] = useState<ProductInsight[]>([]);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);
  const [salesStats, setSalesStats] = useState({ totalRevenue: 0, totalItems: 0, totalTransactions: 0 });

  const toggleInsightExpand = (productId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedInsight(expandedInsight === productId ? null : productId);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user, forecastDateRange])
  );

  const loadData = async () => {
    if (!user) return;

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = formatDateStr(tomorrow);

      // Calculate date range for sales stats
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - forecastDateRange);
      const startDateStr = formatDateStr(startDate);
      const endDateStr = formatDateStr(endDate);

      const [forecastsData, topProductsData, statsData] = await Promise.all([
        ForecastService.getForecastsForDate(user.uid, tomorrowStr),
        SalesService.getTopSellingProducts(user.uid, forecastDateRange),
        SalesService.getSalesStats(user.uid, startDateStr, endDateStr)
      ]);

      setForecasts(forecastsData);
      setTopProducts(topProductsData.slice(0, 5));
      setSalesStats(statsData);

      await generateBakingPlans(forecastsData);
      await generateProductInsights();

    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateBakingPlans = async (forecastsData: ForecastWithProduct[]) => {
    if (!user) return;

    try {
      // Get ALL active products and inventory
      const [allProductsRaw, inventory] = await Promise.all([
        ProductService.getProducts(user.uid),
        InventoryService.getInventory(user.uid)
      ]);

      const allProducts = allProductsRaw.filter(p => p.is_active && p.product_type === 'product');
      const plans: BakingPlan[] = [];

      for (const product of allProducts) {
        // Check if there's a forecast for this product
        const forecast = forecastsData.find(f => f.product_id === product.id);
        const productInventory = inventory.find(i => i.product_id === product.id);

        const currentStock = productInventory?.quantity || 0;
        const expectedSales = forecast ? Math.round(forecast.predicted_quantity) : 0;
        const needToBake = Math.max(0, expectedSales - currentStock);
        const reliability = forecast ? Math.round(forecast.confidence_score * 100) : 0;

        let priority: 'urgent' | 'bake' | 'enough' = 'enough';
        
        if (!forecast) {
          // No forecast data - default to enough (will show NO DATA badge)
          priority = 'enough';
        } else if (needToBake > 0) {
          if (currentStock < expectedSales * 0.3) {
            priority = 'urgent';
          } else {
            priority = 'bake';
          }
        }

        plans.push({
          productId: product.id,
          productName: product.name,
          unit: product.unit || 'pcs',
          expectedSales,
          currentStock,
          needToBake,
          priority,
          reliability
        });
      }

      const priorityOrder = { urgent: 0, bake: 1, enough: 2 };
      plans.sort((a, b) => {
        if (a.priority !== b.priority) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.expectedSales - a.expectedSales;
      });

      setBakingPlans(plans);
    } catch (error) {
      console.error('Error generating baking plans:', error);
    }
  };

  const generateProductInsights = async () => {
    if (!user) return;

    try {
      const [allProductsRaw, inventory, salesProducts7Days, salesProducts14Days] = await Promise.all([
        ProductService.getProducts(user.uid),
        InventoryService.getInventory(user.uid),
        SalesService.getTopSellingProducts(user.uid, 7),
        SalesService.getTopSellingProducts(user.uid, 14)
      ]);

      const allProducts = allProductsRaw.filter(p => p.is_active && p.product_type === 'product');
      const insights: ProductInsight[] = [];

      for (const product of allProducts) {
        try {
          const last7Days = salesProducts7Days.find(p => p.id === product.id)?.total_quantity || 0;
          const last14Days = salesProducts14Days.find(p => p.id === product.id)?.total_quantity || 0;

          const first7DaysSales = last14Days - last7Days;
          const trendChange = first7DaysSales > 0 ? ((last7Days - first7DaysSales) / first7DaysSales) * 100 : 0;

          let trend: 'rising' | 'falling' | 'steady' = 'steady';
          if (trendChange > 15) trend = 'rising';
          else if (trendChange < -15) trend = 'falling';

          const avgDailySales = last7Days / 7;

          // Get consistency from growth rate variance
          // Get consistency from growth rate variance (0-1, higher is more consistent)
          const cv = Math.abs(trendChange) / 100;
          const consistency = Math.max(0, Math.min(1, 1 - cv)); // Convert to 0-1 where 1 is very consistent

          // Check stock status
          const productInventory = inventory.find(i => i.product_id === product.id);
          const currentStock = productInventory?.quantity || 0;
          const daysOfStock = avgDailySales > 0 ? currentStock / avgDailySales : 999;

          let stockStatus: 'good' | 'low' | 'critical' | 'overstocked' = 'good';
          if (daysOfStock < 1) stockStatus = 'critical';
          else if (daysOfStock < 2) stockStatus = 'low';
          else if (daysOfStock > 7) stockStatus = 'overstocked';

          let performanceScore = 0;
          if (last7Days === 0) {
            performanceScore = 10;
          } else {
            performanceScore = 50;
            performanceScore += Math.min(30, (last7Days / 50) * 30);
            if (trend === 'rising') performanceScore += 20;
            else if (trend === 'steady') performanceScore += 10;
          }
          performanceScore = Math.min(100, Math.max(0, performanceScore));

          insights.push({
            productId: product.id,
            productName: product.name,
            unit: product.unit,
            trend,
            trendPercentage: Math.round(trendChange),
            avgDailySales: Math.round(avgDailySales * 10) / 10,
            last7DaysSales: last7Days,
            performanceScore: Math.round(performanceScore),
            stockStatus,
            currentStock,
            consistency
          });
        } catch (error) {
          console.error('Error generating insight:', error);
        }
      }

      insights.sort((a, b) => b.performanceScore - a.performanceScore);
      setProductInsights(insights);

    } catch (error) {
      console.error('Error generating insights:', error);
    }
  };

  const generateForecasts = async () => {
    if (!user) return;

    Alert.alert(
      'Create Baking Plan',
      'Analyze your sales history to suggest what to bake tomorrow.\n\nNote: Needs at least 7 days of sales per product.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Create Plan',
          onPress: async () => {
            setGenerating(true);
            try {
              const results = await ForecastService.regenerateForecastsForTomorrow(user.uid);
              if (results && results.length > 0) {
                await loadData();
                Alert.alert('Success', `Created plan for ${results.length} products!`);
              } else {
                Alert.alert('Need More Data', 'Add more sales records (7+ days per product).');
              }
            } catch (error: any) {
              Alert.alert('Error', 'Could not create plan. Try adding more sales.');
            } finally {
              setGenerating(false);
            }
          }
        }
      ]
    );
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
  }, [user, forecastDateRange]);

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

  const formatDateStr = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#DC2626'; // Red
      case 'bake': return '#FBBF24'; // Yellow
      case 'enough': return '#10B981'; // Green
      default: return '#6B7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'URGENT';
      case 'bake': return 'BAKE';
      case 'enough': return 'ENOUGH';
      default: return '';
    }
  };

  const toggleInsightExpanded = (productId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setProductInsights(prev => prev.map(insight => 
      insight.productId === productId 
        ? { ...insight, expanded: !insight.expanded }
        : insight
    ));
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#DC2626';
      case 'low': return '#F59E0B';
      case 'overstocked': return '#3B82F6';
      default: return '#10B981';
    }
  };

  const getStockStatusLabel = (status: string) => {
    switch (status) {
      case 'critical': return 'Critical Stock';
      case 'low': return 'Low Stock';
      case 'overstocked': return 'Overstocked';
      default: return 'Good Stock';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8B6F47" />
      </View>
    );
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const urgentCount = bakingPlans.filter(p => p.priority === 'urgent').length;
  const bakeCount = bakingPlans.filter(p => p.priority === 'bake').length;

  // Calculate max for the chart
  const maxQuantity = topProducts.length > 0 ? Math.max(...topProducts.map(p => p.total_quantity)) : 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'baking' && styles.tabActive]}
          onPress={() => setActiveTab('baking')}>
          <ChefHat size={20} color={activeTab === 'baking' ? '#FFFFFF' : '#8B6F47'} />
          <Text style={[styles.tabText, activeTab === 'baking' && styles.tabTextActive]}>
            Baking Plan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'analysis' && styles.tabActive]}
          onPress={() => setActiveTab('analysis')}>
          <BarChart3 size={20} color={activeTab === 'analysis' ? '#FFFFFF' : '#8B6F47'} />
          <Text style={[styles.tabText, activeTab === 'analysis' && styles.tabTextActive]}>
            Sales Analysis
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chef Hat Refresh Indicator - Follows pull progress */}
      <Animated.View
        style={[
          styles.chefHatRefreshOverlayForecast,
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
        style={styles.container}
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
            progressViewOffset={0}
          />
        }>
        <View style={styles.content}>

          {/* BAKING PLAN TAB */}
          {activeTab === 'baking' && (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>What to Bake Tomorrow</Text>
                <Text style={styles.subtitle}>{formatDate(tomorrow)}</Text>
              </View>

              {forecasts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Package size={64} color="#9ca3af" />
                  <Text style={styles.emptyTitle}>No Baking Plan Yet</Text>
                  <Text style={styles.emptyText}>
                    Create a smart baking plan based on your sales history.
                  </Text>

                  {permissions.canGenerateForecasts && (
                    <TouchableOpacity
                      style={[styles.generateButton, generating && styles.buttonDisabled]}
                      onPress={generateForecasts}
                      disabled={generating}>
                      {generating ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Sparkles size={20} color="#ffffff" />
                          <Text style={styles.generateButtonText}>Create Baking Plan</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>How It Works</Text>
                    <Text style={styles.infoText}>
                      • Looks at your past month's sales{'\n'}
                      • Finds patterns (weekends vs weekdays){'\n'}
                      • Suggests exactly what to bake
                    </Text>
                  </View>
                </View>
              ) : (
                <>
                  {permissions.canGenerateForecasts && (
                    <TouchableOpacity
                      style={[styles.refreshButton, generating && styles.buttonDisabled]}
                      onPress={generateForecasts}
                      disabled={generating}>
                      {generating ? (
                        <ActivityIndicator size="small" color="#8B6F47" />
                      ) : (
                        <RefreshCw size={18} color="#8B6F47" />
                      )}
                      <Text style={styles.refreshButtonText}>Update Plan</Text>
                    </TouchableOpacity>
                  )}

                  {/* Quick Summary */}
                  {(urgentCount > 0 || bakeCount > 0) && (
                    <View style={styles.summaryRow}>
                      {urgentCount > 0 && (
                        <View style={styles.summaryBadgeUrgent}>
                          <AlertCircle size={16} color="#DC2626" />
                          <Text style={styles.summaryBadgeText}>{urgentCount} Urgent</Text>
                        </View>
                      )}
                      {bakeCount > 0 && (
                        <View style={styles.summaryBadgeBake}>
                          <ChefHat size={16} color="#92400E" />
                          <Text style={styles.summaryBadgeTextBake}>{bakeCount} To Bake</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Baking List */}
                  <Text style={styles.sectionTitleSmall}>All Products ({bakingPlans.length})</Text>
                  <View style={styles.bakingList}>
                    {bakingPlans.map((plan, index) => (
                      <View 
                        key={index} 
                        style={[
                          styles.bakingItem,
                          plan.priority === 'urgent' && styles.bakingItemUrgent,
                          plan.priority === 'bake' && styles.bakingItemBake,
                          plan.priority === 'enough' && styles.bakingItemEnough,
                        ]}>
                        <View style={styles.bakingItemHeader}>
                          <Text style={styles.bakingItemName} numberOfLines={1}>
                            {plan.productName}
                          </Text>
                          <View style={[styles.priorityBadge, { backgroundColor: plan.reliability === 0 ? '#DC2626' : getPriorityColor(plan.priority) }]}>
                            <Text style={styles.priorityBadgeText}>
                              {plan.reliability === 0 ? 'NO DATA' : getPriorityLabel(plan.priority)}
                            </Text>
                          </View>
                        </View>

                        {plan.reliability > 0 ? (
                          <>
                            <View style={styles.bakingItemBody}>
                              <View style={styles.bakingMetric}>
                                <Text style={styles.bakingMetricLabel}>Stock</Text>
                                <Text style={styles.bakingMetricValue}>{plan.currentStock}</Text>
                              </View>
                              <View style={styles.bakingMetric}>
                                <Text style={styles.bakingMetricLabel}>Expected</Text>
                                <Text style={styles.bakingMetricValue}>{plan.expectedSales}</Text>
                              </View>
                              <View style={[
                                styles.bakingMetricHighlight,
                                plan.priority === 'enough' && styles.bakingMetricEnough,
                                plan.priority === 'bake' && styles.bakingMetricBake,
                                plan.priority === 'urgent' && styles.bakingMetricUrgent,
                              ]}>
                                <Text style={styles.bakingMetricLabelHighlight}>
                                  {plan.needToBake > 0 ? 'Bake' : 'Ready'}
                                </Text>
                                <Text style={styles.bakingMetricValueHighlight}>
                                  {plan.needToBake > 0 ? plan.needToBake : '✓'}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.reliabilityRow}>
                              <Text style={styles.reliabilityLabel}>Reliability</Text>
                              <View style={styles.reliabilityBar}>
                                <View style={[
                                  styles.reliabilityFill, 
                                  { width: `${plan.reliability}%` },
                                  plan.reliability < 40 && styles.reliabilityLow,
                                  plan.reliability >= 40 && plan.reliability < 70 && styles.reliabilityMedium,
                                  plan.reliability >= 70 && styles.reliabilityHigh,
                                ]} />
                              </View>
                              <Text style={styles.reliabilityValue}>{plan.reliability}%</Text>
                            </View>
                          </>
                        ) : (
                          <View style={styles.noDataRow}>
                            <Text style={styles.noDataText}>
                              Stock: {plan.currentStock} {plan.unit} • Need 7+ days of sales to forecast
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>

                  <View style={styles.tipCard}>
                    <View style={styles.tipHeader}>
                      <Lightbulb size={18} color="#8B6F47" />
                      <Text style={styles.tipTitle}>Tip</Text>
                    </View>
                    <Text style={styles.tipText}>
                      Higher reliability = more consistent sales pattern. Low reliability items may need extra buffer stock.
                    </Text>
                  </View>
                </>
              )}
            </>
          )}

          {/* SALES ANALYSIS TAB */}
          {activeTab === 'analysis' && (
            <>
              <View style={styles.header}>
                <Text style={styles.title}>Sales Analysis</Text>
                {permissions.canAccessSettings && (
                  <TouchableOpacity onPress={() => setShowDateRangeModal(true)}>
                    <Text style={styles.subtitle}>
                      {forecastDateRange === 7 ? 'Last 7 Days' : forecastDateRange === 30 ? 'Last 1 Month' : forecastDateRange === 180 ? 'Last 6 Months' : forecastDateRange === 90 ? 'Last 3 Months' : 'Last 1 Year'}
                    </Text>
                  </TouchableOpacity>
                )}
                {!permissions.canAccessSettings && (
                  <Text style={styles.subtitle}>Last 7 Days</Text>
                )}
              </View>

              {/* Sales Stats Cards */}
              <View style={styles.analysisStatsContainer}>
                <View style={styles.analysisStatCard}>
                  <Text style={styles.analysisStatValue} numberOfLines={1} adjustsFontSizeToFit>
                    {currencySymbol}{formatNumber(salesStats.totalRevenue)}
                  </Text>
                  <Text style={styles.analysisStatLabel}>Total Revenue</Text>
                </View>
                <View style={styles.analysisStatCard}>
                  <Text style={styles.analysisStatValue} numberOfLines={1} adjustsFontSizeToFit>
                    {formatWholeNumber(salesStats.totalItems)}
                  </Text>
                  <Text style={styles.analysisStatLabel}>Items Sold</Text>
                </View>
              </View>

              {/* Bestsellers Chart - Simplified Horizontal Bars */}
              {topProducts.length > 0 && (
                <View style={styles.chartSection}>
                  <View style={styles.sectionTitleRow}>
                    <Trophy size={20} color="#A67B5B" />
                    <Text style={styles.sectionTitle}>Top Sellers</Text>
                  </View>
                  <View style={styles.horizontalChart}>
                    {topProducts.map((product, index) => (
                      <View key={index} style={styles.chartRow}>
                        <View style={styles.chartRank}>
                          <Text style={styles.chartRankText}>{index + 1}</Text>
                        </View>
                        <View style={styles.chartNameContainer}>
                          <Text style={styles.chartName} numberOfLines={1}>
                            {product.name}
                          </Text>
                        </View>
                        <View style={styles.chartBarContainer}>
                          <View 
                            style={[
                              styles.chartBar, 
                              { width: `${(product.total_quantity / maxQuantity) * 100}%` }
                            ]} 
                          />
                        </View>
                        <View style={styles.chartValueContainer}>
                          <Text style={styles.chartValue}>{product.total_quantity}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Product Performance */}
              <View style={styles.sectionTitleRow}>
                <BarChart3 size={20} color="#A67B5B" />
                <Text style={styles.sectionTitle}>Product Performance</Text>
              </View>
              <Text style={styles.sectionHint}>Tap any product for more details</Text>
              
              {productInsights.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyCardText}>No product data available yet.</Text>
                </View>
              ) : (
                <View style={styles.insightsList}>
                  {productInsights.map((insight, index) => (
                    <TouchableOpacity 
                      key={index} 
                      style={[
                        styles.insightItem, 
                        insight.expanded && styles.insightItemExpanded,
                        insight.expanded && {
                          borderLeftColor: insight.performanceScore >= 75 ? '#10B981' : insight.performanceScore >= 50 ? '#F59E0B' : '#DC2626'
                        }
                      ]}
                      onPress={() => toggleInsightExpanded(insight.productId)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.insightItemMain}>
                        <View style={styles.insightItemLeft}>
                          <Text style={styles.insightItemName} numberOfLines={1}>
                            {insight.productName}
                          </Text>
                          <View style={styles.insightItemMeta}>
                            {insight.trend === 'rising' && (
                              <View style={styles.trendBadgeUp}>
                                <TrendingUp size={12} color="#10B981" />
                                <Text style={styles.trendTextUp}>+{insight.trendPercentage}%</Text>
                              </View>
                            )}
                            {insight.trend === 'falling' && (
                              <View style={styles.trendBadgeDown}>
                                <TrendingDown size={12} color="#DC2626" />
                                <Text style={styles.trendTextDown}>{insight.trendPercentage}%</Text>
                              </View>
                            )}
                            {insight.trend === 'steady' && (
                              <View style={styles.trendBadgeSteady}>
                                <Minus size={12} color="#6B7280" />
                                <Text style={styles.trendTextSteady}>Stable</Text>
                              </View>
                            )}
                            <Text style={styles.insightSalesText}>
                              {insight.last7DaysSales} {insight.unit}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.insightItemRight}>
                          <View style={[
                            styles.scoreBadge,
                            { backgroundColor: insight.performanceScore >= 75 ? '#D1FAE5' : insight.performanceScore >= 50 ? '#FEF3C7' : '#FEE2E2' }
                          ]}>
                            <Text style={[
                              styles.scoreText,
                              { color: insight.performanceScore >= 75 ? '#10B981' : insight.performanceScore >= 50 ? '#F59E0B' : '#DC2626' }
                            ]}>
                              {insight.performanceScore}
                            </Text>
                          </View>
                          <ChevronDown 
                            size={16} 
                            color="#6B7280" 
                            style={{ transform: [{ rotate: insight.expanded ? '180deg' : '0deg' }] }}
                          />
                        </View>
                      </View>

                      {/* Expanded Details */}
                      {insight.expanded && (
                        <View style={styles.insightExpanded}>
                          {/* Score Explanation */}
                          <View style={[
                            styles.scoreExplanation,
                            { backgroundColor: insight.performanceScore >= 75 ? '#D1FAE520' : insight.performanceScore >= 50 ? '#FEF3C720' : '#FEE2E220' }
                          ]}>
                            <View style={styles.scoreExplanationHeader}>
                              <Text style={[
                                styles.scoreExplanationScore,
                                { color: insight.performanceScore >= 75 ? '#10B981' : insight.performanceScore >= 50 ? '#F59E0B' : '#DC2626' }
                              ]}>
                                Score: {insight.performanceScore}
                              </Text>
                              <Text style={[
                                styles.scoreExplanationRating,
                                { color: insight.performanceScore >= 75 ? '#10B981' : insight.performanceScore >= 50 ? '#F59E0B' : '#DC2626' }
                              ]}>
                                {insight.performanceScore >= 75 ? 'Excellent' : insight.performanceScore >= 50 ? 'Average' : 'Needs Attention'}
                              </Text>
                            </View>
                            <Text style={styles.scoreExplanationText}>
                              {insight.performanceScore >= 75 
                                ? 'This product is performing exceptionally well with strong, consistent sales. Keep stock levels optimal to meet demand.'
                                : insight.performanceScore >= 50 
                                ? 'This product has moderate performance. Consider promotions or adjusting stock levels to improve sales.'
                                : 'This product needs attention. Low sales or inconsistent patterns detected. Review pricing, visibility, or consider reducing stock.'}
                            </Text>
                          </View>

                          <View style={styles.insightExpandedRow}>
                            <View style={styles.insightExpandedItem}>
                              <Text style={styles.insightExpandedLabel}>Avg Daily Sales</Text>
                              <Text style={styles.insightExpandedValue}>{insight.avgDailySales} {insight.unit}</Text>
                            </View>
                            <View style={styles.insightExpandedItem}>
                              <Text style={styles.insightExpandedLabel}>Current Stock</Text>
                              <Text style={styles.insightExpandedValue}>{insight.currentStock} {insight.unit}</Text>
                            </View>
                          </View>
                          <View style={styles.insightExpandedRow}>
                            <View style={styles.insightExpandedItem}>
                              <Text style={styles.insightExpandedLabel}>Stock Status</Text>
                              <View style={[styles.stockStatusBadge, { backgroundColor: getStockStatusColor(insight.stockStatus || 'good') + '20' }]}>
                                <Text style={[styles.stockStatusText, { color: getStockStatusColor(insight.stockStatus || 'good') }]}>
                                  {getStockStatusLabel(insight.stockStatus || 'good')}
                                </Text>
                              </View>
                            </View>
                            <View style={styles.insightExpandedItem}>
                              <Text style={styles.insightExpandedLabel}>Sales Consistency</Text>
                              <View style={styles.consistencyBar}>
                                <View style={[styles.consistencyFill, { 
                                  width: `${(insight.consistency || 0) * 100}%`,
                                  backgroundColor: (insight.consistency || 0) >= 0.7 ? '#10B981' : (insight.consistency || 0) >= 0.4 ? '#FBBF24' : '#DC2626'
                                }]} />
                              </View>
                              <Text style={[styles.consistencyText, {
                                color: (insight.consistency || 0) >= 0.7 ? '#10B981' : (insight.consistency || 0) >= 0.4 ? '#D97706' : '#DC2626'
                              }]}>{Math.round((insight.consistency || 0) * 100)}%</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Products with No Sales - Modern Design */}
              {productInsights.filter(p => p.last7DaysSales === 0).length > 0 && (
                <View style={styles.notSellingCard}>
                  <View style={styles.notSellingHeader}>
                    <View style={styles.notSellingIconContainer}>
                      <AlertCircle size={18} color="#DC2626" strokeWidth={2.5} />
                    </View>
                    <View style={styles.notSellingHeaderText}>
                      <Text style={styles.notSellingTitle}>Not Selling</Text>
                      <Text style={styles.notSellingSubtitle}>No sales in the last 7 days</Text>
                    </View>
                  </View>
                  <View style={styles.notSellingProductsContainer}>
                    {productInsights.filter(p => p.last7DaysSales === 0).map((p, index) => (
                      <View key={index} style={styles.notSellingProductBadge}>
                        <Text style={styles.notSellingProductText}>{p.productName}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Score Guide - Modern Legend Design */}
              <View style={styles.scoreGuideCard}>
                <View style={styles.scoreGuideHeader}>
                  <BarChart3 size={16} color="#8B6F47" strokeWidth={2} />
                  <Text style={styles.scoreGuideTitle}>Score Guide</Text>
                </View>
                <View style={styles.scoreGuideContent}>
                  <View style={styles.scoreGuideItem}>
                    <View style={[styles.scoreIndicator, styles.scoreIndicatorExcellent]} />
                    <Text style={styles.scoreRange}>75-100</Text>
                    <View style={styles.scoreLabelContainer}>
                      <TrendingUp size={12} color="#10B981" strokeWidth={2.5} />
                      <Text style={[styles.scoreLabel, styles.scoreLabelExcellent]}>Excellent</Text>
                    </View>
                  </View>
                  <View style={styles.scoreGuideItem}>
                    <View style={[styles.scoreIndicator, styles.scoreIndicatorAverage]} />
                    <Text style={styles.scoreRange}>50-74</Text>
                    <View style={styles.scoreLabelContainer}>
                      <Minus size={12} color="#F59E0B" strokeWidth={2.5} />
                      <Text style={[styles.scoreLabel, styles.scoreLabelAverage]}>Average</Text>
                    </View>
                  </View>
                  <View style={styles.scoreGuideItem}>
                    <View style={[styles.scoreIndicator, styles.scoreIndicatorPoor]} />
                    <Text style={styles.scoreRange}>0-49</Text>
                    <View style={styles.scoreLabelContainer}>
                      <TrendingDown size={12} color="#DC2626" strokeWidth={2.5} />
                      <Text style={[styles.scoreLabel, styles.scoreLabelPoor]}>Needs Attention</Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}

        </View>
      </ScrollView>

      {/* Date Range Selector Modal */}
      <Modal
        visible={showDateRangeModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDateRangeModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowDateRangeModal(false)}>
          <View style={styles.dateModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.dateModalContent}>
                <Text style={styles.dateModalTitle}>Select Date Range</Text>
                
                {([
                  { days: 7, label: 'Last 7 Days' },
                  { days: 30, label: 'Last 1 Month' },
                  { days: 180, label: 'Last 6 Months' },
                  { days: 90, label: 'Last 3 Months' },
                  { days: 365, label: 'Last 1 Year' }
                ] as const).map((option) => (
                  <TouchableOpacity
                    key={option.days}
                    style={[
                      styles.dateModalOption,
                      forecastDateRange === option.days && styles.dateModalOptionActive
                    ]}
                    onPress={() => {
                      setForecastDateRange(option.days);
                      setShowDateRangeModal(false);
                    }}>
                    <Text style={[
                      styles.dateModalOptionText,
                      forecastDateRange === option.days && styles.dateModalOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={styles.dateModalCloseButton}
                  onPress={() => setShowDateRangeModal(false)}>
                  <Text style={styles.dateModalCloseButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
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
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5EDE4',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  // Chef Hat Refresh Indicator
  chefHatRefreshOverlayForecast: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    zIndex: 1000,
    gap: 8,
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

  // Tab Switcher
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5EDE4',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#C4A07A',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 3,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#8B5A2B',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '500',
  },

  // Analysis Stats Cards
  analysisStatsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  analysisStatCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1.5,
    borderColor: '#C4A07A',
  },
  analysisStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5D3A1A',
    marginBottom: 4,
    textAlign: 'center',
  },
  analysisStatLabel: {
    fontSize: 11,
    color: '#8B7355',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  generateButton: {
    backgroundColor: '#8B5A2B',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  refreshButton: {
    backgroundColor: '#F5EDE4',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#8B5A2B',
  },
  refreshButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    borderWidth: 2,
    borderColor: '#C4A07A',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryBadgeUrgent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  summaryBadgeBake: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7', // Light yellow background
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  summaryBadgeText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryBadgeTextBake: {
    color: '#92400E', // Darker yellow/amber for text
    fontSize: 13,
    fontWeight: '600',
  },

  // Baking List
  bakingList: {
    gap: 12,
  },
  bakingItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 5,
  },
  bakingItemUrgent: {
    // No border highlight
  },
  bakingItemBake: {
    // No border highlight
  },
  bakingItemEnough: {
    // No border highlight
  },
  bakingItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bakingItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 8,
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  priorityBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  bakingItemBody: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  bakingMetric: {
    flex: 1,
    backgroundColor: '#EDE4D9',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  bakingMetricLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  bakingMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  bakingMetricHighlight: {
    flex: 1,
    backgroundColor: '#8B5A2B',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  bakingMetricEnough: {
    backgroundColor: '#10B981', // Green - matches ENOUGH badge
  },
  bakingMetricBake: {
    backgroundColor: '#FBBF24', // Yellow - matches BAKE badge
  },
  bakingMetricUrgent: {
    backgroundColor: '#DC2626', // Red - matches URGENT badge
  },
  bakingMetricLabelHighlight: {
    fontSize: 11,
    color: '#F5EDE4',
    marginBottom: 2,
  },
  bakingMetricValueHighlight: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reliabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reliabilityLabel: {
    fontSize: 12,
    color: '#8B7355',
    fontWeight: '500',
  },
  reliabilityBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E8DDD0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  reliabilityFill: {
    height: '100%',
    borderRadius: 3,
  },
  reliabilityLow: {
    backgroundColor: '#DC2626',
  },
  reliabilityMedium: {
    backgroundColor: '#F59E0B',
  },
  reliabilityHigh: {
    backgroundColor: '#10B981',
  },
  reliabilityValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5D3A1A',
    width: 35,
    textAlign: 'right',
  },
  noDataRow: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
  },
  noDataText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  sectionTitleSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },

  // Tip Card
  tipCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6F47',
  },
  tipText: {
    fontSize: 13,
    color: '#6B5439',
    lineHeight: 20,
  },

  // Not Selling Card - Modern Design
  notSellingCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  notSellingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  notSellingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notSellingHeaderText: {
    flex: 1,
  },
  notSellingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 2,
  },
  notSellingSubtitle: {
    fontSize: 12,
    color: '#B91C1C',
    opacity: 0.8,
  },
  notSellingProductsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  notSellingProductBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  notSellingProductText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#DC2626',
  },

  // Score Guide Card - Modern Legend Design
  scoreGuideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E5E1DB',
    shadowColor: '#5D3A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreGuideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F0EB',
  },
  scoreGuideTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6F47',
  },
  scoreGuideContent: {
    gap: 10,
  },
  scoreGuideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scoreIndicatorExcellent: {
    backgroundColor: '#10B981',
  },
  scoreIndicatorAverage: {
    backgroundColor: '#F59E0B',
  },
  scoreIndicatorPoor: {
    backgroundColor: '#DC2626',
  },
  scoreRange: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    width: 50,
  },
  scoreLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  scoreLabelExcellent: {
    color: '#10B981',
  },
  scoreLabelAverage: {
    color: '#F59E0B',
  },
  scoreLabelPoor: {
    color: '#DC2626',
  },

  // Section Title with Icon
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    marginTop: 8,
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    margin: 0,
  },
  sectionHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },

  // Chart Section
  chartSection: {
    marginBottom: 24,
  },
  horizontalChart: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
  },
  chartRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#A67B5B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chartRankText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  chartNameContainer: {
    width: 90,
    marginRight: 8,
  },
  chartName: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  chartBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#E8D4C1',
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  chartValueContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  chartValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },

  // Insights List
  insightsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  insightItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  insightItemExpanded: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    paddingLeft: 10,
  },
  insightItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  insightItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  insightItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  insightItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  insightExpanded: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  scoreExplanation: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  scoreExplanationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreExplanationScore: {
    fontSize: 16,
    fontWeight: '700',
  },
  scoreExplanationRating: {
    fontSize: 13,
    fontWeight: '600',
  },
  scoreExplanationText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  insightExpandedRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  insightExpandedItem: {
    flex: 1,
  },
  insightExpandedLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  insightExpandedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  stockStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  stockStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  consistencyBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 2,
  },
  consistencyFill: {
    height: '100%',
    backgroundColor: '#8B6F47',
    borderRadius: 3,
  },
  consistencyText: {
    fontSize: 11,
    color: '#6B7280',
  },
  trendBadgeUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendTextUp: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  trendBadgeDown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendTextDown: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
  },
  trendBadgeSteady: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  trendTextSteady: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  insightSalesText: {
    fontSize: 12,
    color: '#6B7280',
  },
  scoreBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Warning Section
  warningSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
  },
  warningSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 6,
  },
  warningSectionText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },

  // Empty Card
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyCardText: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Date Modal
  dateModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dateModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 300,
    borderWidth: 2,
    borderColor: '#C4A07A',
  },
  dateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  dateModalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F5EDE4',
    borderWidth: 1,
    borderColor: '#C4A07A',
  },
  dateModalOptionActive: {
    backgroundColor: '#8B5A2B',
    borderColor: '#8B5A2B',
  },
  dateModalOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5439',
    textAlign: 'center',
  },
  dateModalOptionTextActive: {
    color: '#FFFFFF',
  },
  dateModalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateModalCloseButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});


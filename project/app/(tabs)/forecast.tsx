import { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useAuth } from '@/features/auth';
import { ForecastService } from '@/features/forecast';
import { ForecastWithProduct, getPermissions } from '@/features/shared';
import { TrendingUp, RefreshCw, Sparkles, Package, ChefHat, AlertCircle, TrendingDown, Minus, BarChart3, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { SalesService } from '@/features/sales';
import { InventoryService, ProductService } from '@/features/inventory';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

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
  priority: 'urgent' | 'needed' | 'optional' | 'skip';
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
  const [activeTab, setActiveTab] = useState<'baking' | 'analysis'>('baking');
  const [forecasts, setForecasts] = useState<ForecastWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [bakingPlans, setBakingPlans] = useState<BakingPlan[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [productInsights, setProductInsights] = useState<ProductInsight[]>([]);
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null);

  const toggleInsightExpand = (productId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedInsight(expandedInsight === productId ? null : productId);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user])
  );

  const loadData = async () => {
    if (!user) return;

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = formatDateStr(tomorrow);

      const [forecastsData, topProductsData] = await Promise.all([
        ForecastService.getForecastsForDate(user.uid, tomorrowStr),
        SalesService.getTopSellingProducts(user.uid, 7)
      ]);

      setForecasts(forecastsData);
      setTopProducts(topProductsData.slice(0, 5));

      await generateBakingPlans(forecastsData);
      await generateProductInsights();

    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

        let priority: 'urgent' | 'needed' | 'optional' | 'skip' = 'skip';
        
        if (!forecast) {
          // No forecast data - show as "no data" with skip priority
          priority = 'skip';
        } else if (needToBake > 0) {
          if (currentStock < expectedSales * 0.2) {
            priority = 'urgent';
          } else if (currentStock < expectedSales * 0.7) {
            priority = 'needed';
          } else {
            priority = 'optional';
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

      const priorityOrder = { urgent: 0, needed: 1, optional: 2, skip: 3 };
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
    loadData();
  }, [user]);

  const formatDateStr = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#DC2626';
      case 'needed': return '#F59E0B';
      case 'optional': return '#3B82F6';
      case 'skip': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'URGENT';
      case 'needed': return 'BAKE';
      case 'optional': return 'OPTIONAL';
      case 'skip': return 'ENOUGH';
      default: return '';
    }
  };

  const toggleInsightExpanded = (productId: string) => {
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
  const neededCount = bakingPlans.filter(p => p.priority === 'needed').length;

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

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
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
                  {(urgentCount > 0 || neededCount > 0) && (
                    <View style={styles.summaryRow}>
                      {urgentCount > 0 && (
                        <View style={styles.summaryBadgeUrgent}>
                          <AlertCircle size={16} color="#DC2626" />
                          <Text style={styles.summaryBadgeText}>{urgentCount} Urgent</Text>
                        </View>
                      )}
                      {neededCount > 0 && (
                        <View style={styles.summaryBadgeNeeded}>
                          <ChefHat size={16} color="#F59E0B" />
                          <Text style={styles.summaryBadgeTextNeeded}>{neededCount} To Bake</Text>
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
                          plan.priority === 'needed' && styles.bakingItemNeeded,
                        ]}>
                        <View style={styles.bakingItemHeader}>
                          <Text style={styles.bakingItemName} numberOfLines={1}>
                            {plan.productName}
                          </Text>
                          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(plan.priority) }]}>
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
                              <View style={styles.bakingMetricHighlight}>
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
                                <View style={[styles.reliabilityFill, { width: `${plan.reliability}%` }]} />
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
                    <Text style={styles.tipTitle}>💡 Tip</Text>
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
                <Text style={styles.subtitle}>Last 7 Days</Text>
              </View>

              {/* Bestsellers Chart - Simplified Horizontal Bars */}
              {topProducts.length > 0 && (
                <View style={styles.chartSection}>
                  <Text style={styles.sectionTitle}>🏆 Top Sellers</Text>
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
              <Text style={styles.sectionTitle}>📊 Product Performance</Text>
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
                      style={[styles.insightItem, insight.expanded && styles.insightItemExpanded]}
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
                                <View style={[styles.consistencyFill, { width: `${(insight.consistency || 0) * 100}%` }]} />
                              </View>
                              <Text style={styles.consistencyText}>{Math.round((insight.consistency || 0) * 100)}%</Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Products with No Sales */}
              {productInsights.filter(p => p.last7DaysSales === 0).length > 0 && (
                <View style={styles.warningSection}>
                  <Text style={styles.warningSectionTitle}>⚠️ Not Selling</Text>
                  <Text style={styles.warningSectionText}>
                    {productInsights.filter(p => p.last7DaysSales === 0).map(p => p.productName).join(', ')}
                  </Text>
                </View>
              )}

              <View style={styles.tipCard}>
                <Text style={styles.tipTitle}>📊 Score Guide</Text>
                <Text style={styles.tipText}>
                  <Text style={{ color: '#10B981', fontWeight: '600' }}>75-100</Text> Excellent{'\n'}
                  <Text style={{ color: '#F59E0B', fontWeight: '600' }}>50-74</Text> Average{'\n'}
                  <Text style={{ color: '#DC2626', fontWeight: '600' }}>0-49</Text> Needs attention
                </Text>
              </View>
            </>
          )}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8DCC8',
  },
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
    paddingBottom: 40,
  },

  // Tab Switcher
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5E6D3',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
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
    backgroundColor: '#8B6F47',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6F47',
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
    color: '#6B5439',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: '#8B7355',
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
    color: '#6B5439',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8B7355',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  generateButton: {
    backgroundColor: '#8B6F47',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
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
    backgroundColor: '#F5E6D3',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  refreshButtonText: {
    color: '#8B6F47',
    fontSize: 14,
    fontWeight: '600',
  },

  // Info Card
  infoCard: {
    backgroundColor: '#F5E6D3',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5439',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#8B7355',
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
  summaryBadgeNeeded: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  summaryBadgeText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryBadgeTextNeeded: {
    color: '#F59E0B',
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bakingItemUrgent: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  bakingItemNeeded: {
    borderColor: '#F59E0B',
    borderWidth: 2,
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
    color: '#6B5439',
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
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  bakingMetricLabel: {
    fontSize: 11,
    color: '#8B7355',
    marginBottom: 2,
  },
  bakingMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B5439',
  },
  bakingMetricHighlight: {
    flex: 1,
    backgroundColor: '#8B6F47',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  bakingMetricLabelHighlight: {
    fontSize: 11,
    color: '#E8DCC8',
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
  },
  reliabilityBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  reliabilityFill: {
    height: '100%',
    backgroundColor: '#8B6F47',
    borderRadius: 3,
  },
  reliabilityValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B5439',
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
    color: '#8B7355',
    textAlign: 'center',
  },
  sectionTitleSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B7355',
    marginBottom: 12,
  },

  // Tip Card
  tipCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    marginTop: 20,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6F47',
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: '#8B7355',
    lineHeight: 20,
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B5439',
    marginBottom: 4,
    marginTop: 8,
  },
  sectionHint: {
    fontSize: 12,
    color: '#8B7355',
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
    backgroundColor: '#8B6F47',
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
    color: '#6B5439',
    fontWeight: '500',
  },
  chartBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#F5E6D3',
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    backgroundColor: '#8B6F47',
    borderRadius: 4,
  },
  chartValueContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  chartValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B5439',
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
    backgroundColor: '#FAFAFA',
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
    color: '#6B5439',
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
    color: '#8B7355',
    marginBottom: 4,
  },
  insightExpandedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5439',
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
    color: '#8B7355',
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
    color: '#8B7355',
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
    backgroundColor: '#F5E6D3',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: 14,
    color: '#8B7355',
  },
});

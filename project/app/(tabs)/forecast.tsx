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
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ForecastService } from '@/services/forecast.service';
import { ForecastWithProduct } from '@/types/database';
import { TrendingUp, Calendar, BarChart, RefreshCw, Sparkles, Package, AlertTriangle, TrendingDown, Zap } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { SalesService } from '@/services/sales.service.sqlite';
import { InventoryService } from '@/services/inventory.service.sqlite';
import { getCurrencySymbol } from '@/lib/currency';

function formatDate(date: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

interface ProductionPlan {
  productId: string;
  productName: string;
  unit: string;
  predictedDemand: number;
  currentStock: number;
  recommendedProduction: number;
  priority: 'high' | 'medium' | 'low';
}

interface TopInsight {
  type: 'growth' | 'decline' | 'spike' | 'low_stock' | 'top_seller';
  title: string;
  description: string;
  metric: string;
}

export default function ForecastScreen() {
  const { user, profile } = useAuth();
  const [forecasts, setForecasts] = useState<ForecastWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [productionPlan, setProductionPlan] = useState<ProductionPlan[]>([]);
  const [analysisReport, setAnalysisReport] = useState<string>('');
  const [topInsights, setTopInsights] = useState<TopInsight[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadForecasts();
    }, [user])
  );

  const loadForecasts = async () => {
    if (!user) return;

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = formatDateStr(tomorrow);

      const [forecastsData, accuracyData, topProducts, lowStock] = await Promise.all([
        ForecastService.getForecastsForDate(user.uid, tomorrowStr),
        ForecastService.getForecastAccuracy(user.uid, 7),
        SalesService.getTopSellingProducts(user.uid, 7),
        SalesService.getLowStockAlerts(user.uid)
      ]);

      setForecasts(forecastsData);
      setAccuracy(accuracyData);

      // Generate production plan
      await generateProductionPlan(forecastsData);

      // Generate insights
      await generateInsights(topProducts, lowStock, forecastsData);

      // Generate analysis report
      await generateAnalysisReport(forecastsData, topProducts, lowStock);

    } catch (error: any) {
      console.error('Error loading forecasts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateProductionPlan = async (forecastsData: ForecastWithProduct[]) => {
    if (!user) return;

    const plans: ProductionPlan[] = [];

    for (const forecast of forecastsData) {
      try {
        const inventory = await InventoryService.getInventory(user.uid);
        const productInventory = inventory.find(i => i.product_id === forecast.product_id);

        const currentStock = productInventory?.quantity || 0;
        const predictedDemand = Math.round(forecast.predicted_quantity);
        const recommendedProduction = Math.max(0, predictedDemand - currentStock);

        let priority: 'high' | 'medium' | 'low' = 'medium';
        if (currentStock < predictedDemand * 0.3) priority = 'high';
        else if (currentStock >= predictedDemand) priority = 'low';

        plans.push({
          productId: forecast.product_id,
          productName: forecast.product?.name || 'Unknown',
          unit: forecast.product?.unit || 'units',
          predictedDemand,
          currentStock,
          recommendedProduction,
          priority
        });
      } catch (error) {
        console.error('Error generating production plan:', error);
      }
    }

    plans.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    setProductionPlan(plans);
  };

  const generateInsights = async (topProducts: any[], lowStock: any[], forecastsData: ForecastWithProduct[]) => {
    if (!user) return;

    const insights: TopInsight[] = [];

    // Top seller insight
    if (topProducts.length > 0) {
      const topProduct = topProducts[0];
      insights.push({
        type: 'top_seller',
        title: `${topProduct.name} is your top seller`,
        description: `Sold ${topProduct.total_quantity} ${topProduct.unit} in the last 7 days with ${topProduct.transaction_count} transactions`,
        metric: `${topProduct.total_quantity} ${topProduct.unit}`
      });
    }

    // Growth/decline insights
    for (const product of topProducts.slice(0, 3)) {
      try {
        const growth = await SalesService.getSalesGrowthRate(user.uid, product.id, 7);
        if (growth && Math.abs(growth.growthRate) > 20) {
          if (growth.growthRate > 0) {
            insights.push({
              type: 'growth',
              title: `${product.name} sales are surging`,
              description: `Up ${growth.growthRate.toFixed(0)}% from ${growth.firstPeriodAvg} to ${growth.secondPeriodAvg} ${product.unit} daily average`,
              metric: `+${growth.growthRate.toFixed(0)}%`
            });
          } else {
            insights.push({
              type: 'decline',
              title: `${product.name} sales declining`,
              description: `Down ${Math.abs(growth.growthRate).toFixed(0)}% from ${growth.firstPeriodAvg} to ${growth.secondPeriodAvg} ${product.unit} daily average`,
              metric: `${growth.growthRate.toFixed(0)}%`
            });
          }
        }
      } catch (error) {
        console.error('Error calculating growth:', error);
      }
    }

    // Low stock alerts
    if (lowStock.length > 0) {
      const criticalStock = lowStock[0];
      insights.push({
        type: 'low_stock',
        title: `Low stock alert: ${criticalStock.name}`,
        description: `Only ${criticalStock.current_stock} ${criticalStock.unit} remaining (minimum: ${criticalStock.min_threshold})`,
        metric: `${criticalStock.current_stock} ${criticalStock.unit}`
      });
    }

    // High demand forecast insight
    const highDemandForecast = forecastsData.sort((a, b) => b.predicted_quantity - a.predicted_quantity)[0];
    if (highDemandForecast && highDemandForecast.confidence_score > 0.7) {
      insights.push({
        type: 'spike',
        title: `High demand expected for ${highDemandForecast.product?.name}`,
        description: `Forecasting ${Math.round(highDemandForecast.predicted_quantity)} ${highDemandForecast.product?.unit} with ${Math.round(highDemandForecast.confidence_score * 100)}% confidence`,
        metric: `${Math.round(highDemandForecast.predicted_quantity)} ${highDemandForecast.product?.unit}`
      });
    }

    setTopInsights(insights.slice(0, 5));
  };

  const generateAnalysisReport = async (forecastsData: ForecastWithProduct[], topProducts: any[], lowStock: any[]) => {
    const totalPredictedDemand = forecastsData.reduce((sum, f) => sum + f.predicted_quantity, 0);
    const avgConfidence = forecastsData.reduce((sum, f) => sum + f.confidence_score, 0) / forecastsData.length;

    let report = `Based on your sales data from the past 30 days, our AI forecasting system has analyzed ${forecastsData.length} products for tomorrow's production planning. `;

    report += `The total predicted demand across all products is approximately ${Math.round(totalPredictedDemand)} units, with an average confidence score of ${Math.round(avgConfidence * 100)}%. `;

    if (avgConfidence > 0.7) {
      report += `The high confidence scores indicate consistent sales patterns, making these forecasts highly reliable for production planning. `;
    } else {
      report += `The moderate confidence scores suggest some variability in sales patterns. Consider maintaining buffer stock for high-priority items. `;
    }

    if (topProducts.length > 0) {
      const top = topProducts[0];
      report += `Your bestseller, ${top.name}, has been performing exceptionally well with ${top.transaction_count} transactions in the past week. `;
    }

    if (lowStock.length > 0) {
      report += `However, ${lowStock.length} product${lowStock.length > 1 ? 's are' : ' is'} currently below minimum stock levels and require immediate attention. `;
    }

    const highPriorityProducts = forecastsData.filter(f => {
      const forecast = forecasts.find(fc => fc.product_id === f.product_id);
      return forecast && forecast.confidence_score > 0.7 && forecast.predicted_quantity > 10;
    }).length;

    if (highPriorityProducts > 0) {
      report += `Focus your production efforts on the ${highPriorityProducts} high-priority items identified in the automated production planner to optimize your resources and meet expected demand.`;
    }

    setAnalysisReport(report);
  };

  const generateForecasts = async () => {
    if (!user) return;

    Alert.alert(
      'Generate Forecasts',
      '⚠️ Minimum 7 days of sales data required for accurate forecasts. The system will analyze your sales history to predict tomorrow\'s demand.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setGenerating(true);
            try {
              const results = await ForecastService.generateForecastsForTomorrow(user.uid);
              if (results && results.length > 0) {
                await loadForecasts();
                Alert.alert('Success', `Generated forecasts for ${results.length} products based on your sales history!`);
              } else {
                Alert.alert('Insufficient Data', 'Not enough sales data to generate forecasts. Please ensure you have at least 7 days of sales records for your products.');
              }
            } catch (error: any) {
              console.error('Error generating forecasts:', error);
              Alert.alert('Error', 'Failed to generate forecasts. Make sure you have at least 7 days of sales data for your products.');
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
    loadForecasts();
  }, [user]);

  const formatDateStr = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Production Forecast</Text>
          <Text style={styles.subtitle}>For {formatDate(tomorrow)}</Text>
        </View>

        {accuracy !== null && accuracy > 0 && (
          <View style={styles.accuracyCard}>
            <View style={styles.accuracyHeader}>
              <BarChart size={20} color="#059669" />
              <Text style={styles.accuracyTitle}>Forecast Accuracy</Text>
            </View>
            <Text style={styles.accuracyValue}>{accuracy}%</Text>
            <Text style={styles.accuracySubtext}>Based on last 7 days</Text>
          </View>
        )}

        {forecasts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.iconContainer}>
              <TrendingUp size={64} color="#9ca3af" />
            </View>

            <Text style={styles.emptyTitle}>No Forecasts Yet</Text>
            <Text style={styles.emptyText}>
              Generate AI-powered production forecasts based on your sales history. You need at least 7 days of sales data to generate accurate predictions.
            </Text>

            <TouchableOpacity
              style={[styles.generateButton, generating && styles.generateButtonDisabled]}
              onPress={generateForecasts}
              disabled={generating}>
              {generating ? (
                <>
                  <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.generateButtonText}>Generating...</Text>
                </>
              ) : (
                <>
                  <Sparkles size={20} color="#ffffff" />
                  <Text style={styles.generateButtonText}>Generate Forecasts</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>How It Works</Text>
              <Text style={styles.infoText}>
                • Analyzes your historical sales patterns{'\n'}
                • Identifies trends and seasonal variations{'\n'}
                • Predicts tomorrow's demand for each product{'\n'}
                • Improves accuracy over time with more data
              </Text>
            </View>
          </View>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.refreshButton, generating && styles.generateButtonDisabled]}
              onPress={generateForecasts}
              disabled={generating}>
              {generating ? (
                <ActivityIndicator size="small" color="#8B6F47" />
              ) : (
                <RefreshCw size={20} color="#8B6F47" />
              )}
              <Text style={styles.refreshButtonText}>
                {generating ? 'Regenerating...' : 'Regenerate Forecasts'}
              </Text>
            </TouchableOpacity>

            {/* Top Insights */}
            {topInsights.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Top Insights</Text>
                <View style={styles.insightsContainer}>
                  {topInsights.map((insight, index) => (
                    <View key={index} style={styles.insightCard}>
                      <View style={styles.insightHeader}>
                        {insight.type === 'growth' && <TrendingUp size={20} color="#10B981" />}
                        {insight.type === 'decline' && <TrendingDown size={20} color="#DC2626" />}
                        {insight.type === 'spike' && <Zap size={20} color="#F59E0B" />}
                        {insight.type === 'low_stock' && <AlertTriangle size={20} color="#DC2626" />}
                        {insight.type === 'top_seller' && <Sparkles size={20} color="#C89D5E" />}
                        <Text style={styles.insightTitle} numberOfLines={1}>{insight.title}</Text>
                      </View>
                      <Text style={styles.insightDescription} numberOfLines={2}>{insight.description}</Text>
                      <View style={styles.insightMetricBadge}>
                        <Text style={styles.insightMetric} numberOfLines={1} adjustsFontSizeToFit>{insight.metric}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Analysis Report */}
            {analysisReport && (
              <>
                <Text style={styles.sectionTitle}>Analysis Report</Text>
                <View style={styles.reportCard}>
                  <Text style={styles.reportText}>{analysisReport}</Text>
                </View>
              </>
            )}

            {/* Automated Production Planner */}
            {productionPlan.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Automated Production Planner</Text>
                <View style={styles.plannerCard}>
                  {productionPlan.map((plan, index) => (
                    <View key={index} style={styles.planItem}>
                      <View style={styles.planHeader}>
                        <View style={styles.planTitleRow}>
                          <Text style={styles.planProductName}>{plan.productName}</Text>
                          <View style={[
                            styles.priorityBadge,
                            plan.priority === 'high' && styles.priorityHigh,
                            plan.priority === 'medium' && styles.priorityMedium,
                            plan.priority === 'low' && styles.priorityLow
                          ]}>
                            <Text style={styles.priorityText}>
                              {plan.priority.toUpperCase()}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.planMetrics}>
                        <View style={styles.planMetric}>
                          <Package size={16} color="#8B7355" />
                          <Text style={styles.planMetricLabel}>Current Stock</Text>
                          <Text style={styles.planMetricValue} numberOfLines={1} adjustsFontSizeToFit>{plan.currentStock} {plan.unit}</Text>
                        </View>
                        <View style={styles.planMetric}>
                          <TrendingUp size={16} color="#8B7355" />
                          <Text style={styles.planMetricLabel}>Predicted Demand</Text>
                          <Text style={styles.planMetricValue} numberOfLines={1} adjustsFontSizeToFit>{plan.predictedDemand} {plan.unit}</Text>
                        </View>
                        <View style={styles.planMetric}>
                          <Sparkles size={16} color="#8B6F47" />
                          <Text style={styles.planMetricLabel}>Produce</Text>
                          <Text style={[styles.planMetricValue, styles.planMetricHighlight]} numberOfLines={1} adjustsFontSizeToFit>
                            {plan.recommendedProduction} {plan.unit}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Forecast Details */}
            <Text style={styles.sectionTitle}>Forecast Details</Text>
            {forecasts.map((forecast) => (
              <View key={forecast.id} style={styles.forecastCard}>
                <View style={styles.forecastHeader}>
                  <Text style={styles.productName}>{forecast.product?.name}</Text>
                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {Math.round(forecast.confidence_score * 100)}%
                    </Text>
                  </View>
                </View>

                <View style={styles.forecastBody}>
                  <View style={styles.quantityContainer}>
                    <Text style={styles.quantityLabel}>Predicted Demand</Text>
                    <Text style={styles.quantityValue} numberOfLines={1} adjustsFontSizeToFit>
                      {Math.round(forecast.predicted_quantity)} {forecast.product?.unit || 'units'}
                    </Text>
                  </View>

                  <View style={styles.confidenceBar}>
                    <View
                      style={[
                        styles.confidenceFill,
                        { width: `${forecast.confidence_score * 100}%` }
                      ]}
                    />
                  </View>
                </View>
              </View>
            ))}

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Pro Tip</Text>
              <Text style={styles.tipText}>
                The confidence score indicates how reliable the prediction is based on your sales data consistency. Higher scores mean more reliable forecasts.
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6B5439',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8B7355',
  },
  accuracyCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#A5D6A7',
    alignItems: 'center',
  },
  accuracyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  accuracyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  accuracyValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#059669',
  },
  accuracySubtext: {
    fontSize: 14,
    color: '#047857',
  },
  emptyState: {
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#6B5439',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8B7355',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  generateButton: {
    backgroundColor: '#8B6F47',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: '#F5E6D3',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  refreshButtonText: {
    color: '#8B6F47',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6B5439',
    marginBottom: 16,
  },
  forecastCard: {
    backgroundColor: '#F5E6D3',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4BA9C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  forecastHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B5439',
    flex: 1,
  },
  confidenceBadge: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  confidenceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B6F47',
  },
  forecastBody: {
    gap: 12,
  },
  quantityContainer: {
    gap: 4,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#8B7355',
  },
  quantityValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B6F47',
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#D4BA9C',
    borderRadius: 4,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#8B6F47',
  },
  infoCard: {
    backgroundColor: '#F5E6D3',
    borderRadius: 12,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B5439',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#8B7355',
    lineHeight: 22,
  },
  tipCard: {
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  tipTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B6F47',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#8B7355',
    lineHeight: 20,
  },
  insightsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  insightCard: {
    backgroundColor: '#F5E6D3',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5439',
    flex: 1,
  },
  insightDescription: {
    fontSize: 14,
    color: '#8B7355',
    lineHeight: 20,
    marginBottom: 8,
  },
  insightMetricBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  insightMetric: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B6F47',
  },
  reportCard: {
    backgroundColor: '#F5E6D3',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  reportText: {
    fontSize: 15,
    color: '#6B5439',
    lineHeight: 24,
    textAlign: 'justify',
  },
  plannerCard: {
    gap: 12,
    marginBottom: 24,
  },
  planItem: {
    backgroundColor: '#F5E6D3',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#D4BA9C',
  },
  planHeader: {
    marginBottom: 16,
  },
  planTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planProductName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B5439',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityHigh: {
    backgroundColor: '#FEE2E2',
  },
  priorityMedium: {
    backgroundColor: '#FFF4E5',
  },
  priorityLow: {
    backgroundColor: '#E8F5E9',
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B5439',
  },
  planMetrics: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  planMetric: {
    flex: 1,
    minWidth: '30%',
    gap: 4,
  },
  planMetricLabel: {
    fontSize: 12,
    color: '#8B7355',
  },
  planMetricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B5439',
  },
  planMetricHighlight: {
    color: '#8B6F47',
    fontWeight: '700',
  },
});

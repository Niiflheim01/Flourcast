// File: app/(onboarding)/sales.js 

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// --- IMAGE IMPORT ---
import logoImage from '../../assets/images/logo.png';


// --- 1. SALES SCREEN COMPONENTS ---

const SalesActivityMetrics = () => (
    <View style={styles.metricsContainer}>
        {/* Date Range Picker (Placeholder for Calendar/DB Query) */}
        <View style={styles.dateRangeRow}>
            <Text style={styles.dateRangeText}>Apr 1, 2024 - Apr 30, 2024</Text>
            <Ionicons name="calendar-outline" size={16} color="#666" />
        </View>

        {/* Metrics Cards */}
        <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Sales</Text>
                <Text style={styles.metricValue}>₱15,000.00</Text>
            </View>
            <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Revenue</Text>
                <Text style={styles.metricValue}>₱20,000.00</Text>
            </View>
            <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Total Profit</Text>
                <Text style={[styles.metricValue, { color: '#059669' }]}>₱5,000.00</Text>
            </View>
        </View>
    </View>
);

const SalesChartSection = () => (
    <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Sales Chart</Text>
        <View style={styles.chartOptions}>
            <TouchableOpacity style={styles.chartButtonActive}><Text style={styles.chartButtonTextActive}>Line</Text></TouchableOpacity>
            <TouchableOpacity style={styles.chartButton}><Text style={styles.chartButtonText}>Bar</Text></TouchableOpacity>
            <TouchableOpacity style={styles.chartButton}><Text style={styles.chartButtonText}>Pie</Text></TouchableOpacity>
        </View>
        
        {/* Placeholder for the line chart graphic */}
        <View style={styles.lineChartDummy}>
            <Text style={{ color: '#999' }}>Sales Line Chart Placeholder</Text>
        </View>
    </View>
);

const SalesOfProductTable = () => {
    // Data Placeholder: Dito ilalagay ang galing sa Sales Database
    const productSalesData = [
        { product: 'Cookies', produced: 180, sold: 200, revenue: '₱9,900', profit: '₱2,475' },
        { product: 'Muffin', produced: 120, sold: 90, revenue: '₱4,650', profit: '₱930' },
        { product: 'Brownies', produced: 160, sold: 100, revenue: '₱4,600', profit: '₱460' },
        { product: 'Cheese Bread', produced: 180, sold: 150, revenue: '₱5,200', profit: '₱400' },
        { product: 'Chip Cookie', produced: 110, sold: 160, revenue: '₱0,100', profit: '₱2,000' },
        { product: 'Cheese Roll', produced: 130, sold: 130, revenue: '₱1,800', profit: '₱1,720' },
    ];

    const tableHeaders = [
        { title: 'Product', flex: 2 },
        { title: 'Produced', flex: 1.5 },
        { title: 'Sold', flex: 1.5 },
        { title: 'Revenue', flex: 2 },
        { title: 'Profit', flex: 1.5 },
    ];

    // --- Database Ready Function ---
    const handleProductSelect = (product) => {
        // Future: Mag-navigate sa detailed product sales report
        alert(`FUTURE FEATURE: Viewing detailed sales report for ${product}`);
    };

    return (
        <View style={styles.productSalesContainer}>
            <Text style={styles.sectionTitle}>Sales of Product</Text>
            
            <View style={styles.productTable}>
                {/* Table Header Row */}
                <View style={[styles.productRow, styles.productHeaderRow]}>
                    {tableHeaders.map((header, index) => (
                        <Text 
                            key={index} 
                            style={[styles.productCell, styles.productHeaderText, { flex: header.flex }]}
                        >
                            {header.title}
                        </Text>
                    ))}
                </View>

                {/* Data Rows (Tiyakin na lahat ay naka-Text) */}
                {productSalesData.map((item, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={[styles.productRow, index % 2 === 0 && styles.productRowEven]}
                        onPress={() => handleProductSelect(item.product)}
                    >
                        <Text style={[styles.productCell, { flex: 2, textAlign: 'left' }]}>{item.product}</Text>
                        <Text style={[styles.productCell, { flex: 1.5 }]}>{item.produced}</Text>
                        <Text style={[styles.productCell, { flex: 1.5 }]}>{item.sold}</Text>
                        <Text style={[styles.productCell, styles.revenueCell, { flex: 2 }]}>{item.revenue}</Text>
                        <Text style={[styles.productCell, styles.profitCell, { flex: 1.5 }]}>{item.profit}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

const ProductComparisonChart = () => (
    <View style={styles.comparisonContainer}>
        <Text style={styles.sectionTitle}>Product Comparison</Text>
        <View style={styles.comparisonChartDummy}>
            <Text style={{ color: '#999', fontSize: 12 }}>Pie Chart Comparison Placeholder</Text>
        </View>
        
        {/* Summary Insights - AI Ready */}
        <View style={styles.summaryInsightsRow}>
            <View style={styles.summaryCard}>
                <Ionicons name="stats-chart-outline" size={18} color="#D97706" />
                <Text style={styles.summaryText}>Best Seller: Cookies</Text>
            </View>
            <View style={styles.summaryCard}>
                <Ionicons name="trending-down-outline" size={18} color="#EF4444" />
                <Text style={styles.summaryText}>Least Sold: Chip Cookie</Text>
            </View>
        </View>
    </View>
);

const DetailedAnalysisReport = () => (
    <View style={styles.detailedReportContainer}>
        <Text style={styles.sectionTitle}>Detailed Analysis Report</Text>
        <Text style={styles.reportText}>
            This week's sales showed a steady increase in performance, with a noticeable 
            peak on September 6 and 7 due to higher demand for cheese bread and soft 
            cookies. Overall, bread sales remained low for the entire week. Total sales 
            rose by 12% compared to the previous week, achieving an outstanding single 
            day's sales of ₱3,900.00 on September 6. 
            It's recommended to maintain production for best-selling items like soft cookies 
            and cheese bread while minimizing slow-moving products to avoid overproduction.
        </Text>
    </View>
);


// --- 2. BOTTOM NAVIGATION COMPONENT (Re-used) ---

const BottomNavBar = ({ activeRoute }) => {
    const navItems = [
        { name: 'Home', icon: 'home', route: 'home' }, 
        { name: 'Stocks', icon: 'document-text', route: 'stocks' }, 
        { name: 'Planner', icon: 'settings', route: 'planner' }, 
        { name: 'Sales', icon: 'stats-chart', route: 'sales' }, 
        { name: 'Profile', icon: 'person', route: 'profile' }, 
    ];

    const handleNavigation = (route) => {
        const fullPath = route === 'home' ? '(onboarding)/home' : `(onboarding)/${route}`;
        router.replace(fullPath); 
    };

    return (
        <View style={styles.bottomNav}>
            {navItems.map((item) => (
                <TouchableOpacity 
                    key={item.name} 
                    style={styles.bottomNavItem} 
                    onPress={() => handleNavigation(item.route)}
                >
                    <Ionicons 
                        name={item.icon} 
                        size={24} 
                        color={item.route === activeRoute ? '#D97706' : '#666'} 
                    />
                    <Text style={[styles.navText, item.route === activeRoute && styles.navTextActive]}>
                        {item.name}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );
};


// --- 3. MAIN SALES COMPONENT ---

export default function Sales() {
    
    const handleProfilePress = () => {
        router.replace('(onboarding)/profile');
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            
            {/* --- APP HEADER --- */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image 
                        source={logoImage} 
                        style={styles.mainLogo} 
                        resizeMode="contain"
                    />
                    <Text style={styles.dashboardTitle}>SALES ACTIVITY</Text>
                </View>

                <View style={styles.headerRight}>
                    <View style={styles.headerUserDetails}>
                        <Text style={styles.headerUserText}>Hello, Admin</Text>
                        <Text style={styles.headerUserText}>09/07/2025</Text>
                    </View>
                    
                    <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
                        <Ionicons name="person-circle-outline" size={30} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- SALES OPTIONS --- */}
            <View style={styles.salesOptions}>
                <TouchableOpacity style={styles.optionButton}><Text style={styles.optionButtonText}>Day</Text></TouchableOpacity>
                <TouchableOpacity style={styles.optionButtonActive}><Text style={styles.optionButtonTextActive}>Week</Text></TouchableOpacity>
                <TouchableOpacity style={styles.optionButton}><Text style={styles.optionButtonText}>Month</Text></TouchableOpacity>
                <TouchableOpacity style={styles.optionButton}><Text style={styles.optionButtonText}>Year</Text></TouchableOpacity>
            </View>

            {/* --- MAIN SCROLLABLE CONTENT --- */}
            <ScrollView contentContainerStyle={styles.mainContent}> 
                
                {/* 1. Sales Activity Metrics */}
                <SalesActivityMetrics />

                {/* 2. Sales Chart (Line Chart Placeholder) */}
                <SalesChartSection />

                {/* 3. Sales of Product Table */}
                <SalesOfProductTable /> 

                {/* 4. Product Comparison Chart (Pie Chart Placeholder) */}
                <ProductComparisonChart />

                {/* 5. Detailed Analysis Report (AI Summary) */}
                <DetailedAnalysisReport />

                {/* Spacer View to account for the fixed Bottom Nav Bar */}
                <View style={{ height: 90 }} /> 
            </ScrollView>
            
            {/* --- BOTTOM NAVIGATION BAR --- */}
            <BottomNavBar activeRoute="sales" />

        </SafeAreaView>
    );
}


// --- 4. STYLES ---

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
    mainContent: {
        paddingHorizontal: 15, 
        paddingBottom: 20,
    }, 
    sectionTitle: { // Re-used for different sections
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    
    // --- APP HEADER (Re-used) ---
    header: {
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 15, 
        paddingTop: Platform.OS === 'android' ? 10 : 0, 
        paddingBottom: 10,
        backgroundColor: '#FFFFFF', 
        borderBottomWidth: 1, 
        borderBottomColor: '#EEEEEE',
    },
    headerLeft: { alignItems: 'flex-start' },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    headerUserDetails: { alignItems: 'flex-end', marginRight: 8 },
    headerUserText: { fontSize: 12, color: '#666', textAlign: 'right' },
    profileButton: { padding: 0, backgroundColor: '#D9D9D9', borderRadius: 20 },
    mainLogo: { width: 120, height: 35 },
    dashboardTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 5 },

    // --- SALES OPTIONS (Day/Week/Month/Year) ---
    salesOptions: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        paddingHorizontal: 15,
        paddingTop: 10,
        marginBottom: 10,
    },
    optionButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 5,
        borderRadius: 5,
        backgroundColor: '#F0F0F0',
    },
    optionButtonActive: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 5,
        borderRadius: 5,
        backgroundColor: '#D97706',
    },
    optionButtonText: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    optionButtonTextActive: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },

    // --- 1. Sales Activity Metrics ---
    metricsContainer: {
        marginBottom: 20,
    },
    dateRangeRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 10,
    },
    dateRangeText: {
        fontSize: 12,
        color: '#666',
        marginRight: 5,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metricCard: {
        width: '32%',
        backgroundColor: '#FCF3E8', 
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#F1E7DA', 
        height: 80,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metricLabel: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
        fontWeight: '600',
    },
    metricValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#D97706',
    },

    // --- 2. Sales Chart ---
    chartContainer: { 
        marginBottom: 20, 
        backgroundColor: '#FFFFFF', 
        padding: 10, 
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    chartOptions: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    chartButton: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#CCC',
    },
    chartButtonActive: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginRight: 5,
        borderRadius: 5,
        backgroundColor: '#D97706',
    },
    chartButtonText: {
        fontSize: 12,
        color: '#666',
    },
    chartButtonTextActive: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    lineChartDummy: {
        height: 180,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 5,
    },

    // --- 3. Sales of Product Table ---
    productSalesContainer: {
        marginBottom: 20,
    },
    productTable: {
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 5,
        overflow: 'hidden',
    },
    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingVertical: 10,
        paddingHorizontal: 5,
        backgroundColor: '#FFFFFF',
    },
    productHeaderRow: {
        backgroundColor: '#EFEFEF',
        borderBottomWidth: 2,
        borderColor: '#D97706',
    },
    productRowEven: {
        backgroundColor: '#F9F9F9',
    },
    productCell: {
        flex: 1,
        fontSize: 11,
        color: '#333',
        textAlign: 'center',
    },
    productHeaderText: {
        fontWeight: 'bold',
        fontSize: 11,
        color: '#333',
    },
    revenueCell: {
        fontWeight: 'bold',
        color: '#D97706',
    },
    profitCell: {
        color: '#059669',
    },

    // --- 4. Product Comparison Chart ---
    comparisonContainer: {
        marginBottom: 20,
        padding: 10, 
        backgroundColor: '#FFFFFF', 
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    comparisonChartDummy: {
        height: 200,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 5,
        marginBottom: 10,
    },
    summaryInsightsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
        flexWrap: 'wrap',
    },
    summaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6FFEE',
        padding: 8,
        borderRadius: 5,
        margin: 4,
    },
    summaryText: {
        marginLeft: 5,
        fontSize: 10,
        color: '#333',
        fontWeight: '600',
    },

    // --- 5. Detailed Analysis Report ---
    detailedReportContainer: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#FCF3E8', // Light background for the report
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#F1E7DA',
    },
    reportText: {
        fontSize: 12,
        color: '#333',
        lineHeight: 18,
        marginTop: 5,
    },

    // --- BOTTOM NAVIGATION BAR STYLES (Re-used) ---
    bottomNav: {
        position: 'absolute', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        height: 70, 
        backgroundColor: '#FFFFFF', 
        flexDirection: 'row', 
        justifyContent: 'space-around',
        alignItems: 'center', 
        paddingHorizontal: 10,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        paddingBottom: Platform.OS === 'ios' ? 10 : 0, 
    },
    bottomNavItem: { 
        alignItems: 'center',
        justifyContent: 'center',
        padding: 5,
    },
    navText: {
        fontSize: 10,
        color: '#666',
        marginTop: 2,
    },
    navTextActive: {
        color: '#D97706', 
        fontWeight: 'bold',
    },
});
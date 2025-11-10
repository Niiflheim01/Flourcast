// File: app/(onboarding)/planner.js 

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
import { SafeAreaView } from 'react-native-safe-area-context'; // ✅ Fixed import

// --- IMAGE IMPORT ---
import logoImage from '../../assets/images/logo.png';


// --- 1. PLANNER COMPONENTS ---

const AnalysisReport = () => (
    <View style={styles.reportContainer}>
        <Text style={styles.sectionTitle}>Analysis Report</Text>
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

const ProductionPlannerTable = () => {
    const plannerData = [
        { product: 'Bread', sales: '230', stock: '10', suggested: '240' },
        { product: 'Cookies', sales: '230', stock: '10', suggested: '240' },
        { product: 'Muffin', sales: '230', stock: '10', suggested: '240' },
        { product: 'Brownies', sales: '230', stock: '10', suggested: '240' },
        { product: 'Banana Bread', sales: '230', stock: '10', suggested: '240' },
        { product: 'Chip Cookies', sales: '230', stock: '10', suggested: '240' },
        { product: 'Cheese Bread', sales: '230', stock: '10', suggested: '240' },
    ];

    const tableHeaders = [
        { title: 'Product', flex: 2.5 },
        { title: "Yesterday's Sales", flex: 1.5 },
        { title: 'Current Stock', flex: 1.5 },
        { title: 'Suggested Production', flex: 2 },
    ];
    
    // --- AI/Database Ready Functions ---
    const handleEditPress = (product) => {
        alert(`FUTURE FEATURE: Editing suggested production for ${product}.`);
    };

    const handleApprovePlan = () => {
        alert('FUTURE FEATURE: Approving and syncing final production plan...');
    };

    const handleViewForecast = () => {
        alert('FUTURE FEATURE: Viewing AI Sales Forecast...');
    };

    const handleDownloadPlanner = () => {
        alert('FUTURE FEATURE: Generating and downloading planner report...');
    };

    return (
        <View style={styles.plannerContainer}>
            <View style={styles.plannerHeaderRow}>
                <Text style={styles.sectionTitle}>Automated Production Planner</Text>
                <TouchableOpacity style={styles.datePicker}>
                    <Text style={styles.datePickerText}>Apr 1, 2024</Text>
                    <Ionicons name="calendar-outline" size={16} color="#666" style={{marginLeft: 5}}/>
                </TouchableOpacity>
            </View>
            
            <View style={styles.tableBody}>
                {/* ✅ Table Header Row (No stray text or comments) */}
                <View style={[styles.plannerRow, styles.plannerHeaderRowStyles]}>
                    {tableHeaders.map((header, index) => (
                        <Text 
                            key={index} 
                            style={[styles.plannerCell, styles.plannerHeaderText, { flex: header.flex }]}
                        >
                            {header.title}
                        </Text>
                    ))}
                    <View style={{ width: 30 }} />
                </View>

                {/* ✅ Data Rows */}
                {plannerData.map((item, index) => (
                    <View key={index} style={[styles.plannerRow, index % 2 === 0 && styles.plannerRowEven]}>
                        <Text style={[styles.plannerCell, { flex: 2.5, textAlign: 'left' }]}>{item.product}</Text>
                        <Text style={[styles.plannerCell, { flex: 1.5 }]}>{item.sales}pcs/s</Text>
                        <Text style={[styles.plannerCell, { flex: 1.5 }]}>{item.stock}pcs/s</Text>
                        <Text style={[styles.plannerCell, styles.suggestedText, { flex: 2 }]}>{item.suggested}pcs/s</Text>
                        <TouchableOpacity 
                            style={styles.editButton} 
                            onPress={() => handleEditPress(item.product)}
                        >
                            <Ionicons name="create-outline" size={16} color="#D97706" />
                        </TouchableOpacity>
                    </View>
                ))}
            </View>

            {/* ✅ Action Buttons */}
            <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={[styles.actionButton, styles.primaryButton]} onPress={handleApprovePlan}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
                    <Text style={[styles.actionButtonText, styles.primaryButtonText]}>Approve Plan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleViewForecast}>
                    <Ionicons name="eye-outline" size={16} color="#D97706" />
                    <Text style={styles.actionButtonText}>View Forecast</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleDownloadPlanner}>
                    <Ionicons name="download-outline" size={16} color="#D97706" />
                    <Text style={styles.actionButtonText}>Download Planner</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};


// --- Top Insights Components ---
const TopInsightCard = ({ icon, text, isAlert = false }) => (
    <View style={[styles.insightCard, isAlert && styles.alertCard]}>
        <Ionicons name={icon} size={24} color={isAlert ? '#EF4444' : '#059669'} />
        <Text style={styles.insightText}>{text}</Text>
    </View>
);

const TopInsightsSection = () => (
    <View style={styles.insightsContainer}>
        <Text style={styles.sectionTitle}>Top Insights - September 1, 2025</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insightsScroll}>
            <TopInsightCard 
                icon="alert-circle-outline" 
                text="Low stock alert: Milk is running low, only 15 packs left. Consider restocking." 
                isAlert={true}
            />
            <TopInsightCard 
                icon="trending-up-outline" 
                text="Soft Cookies and Cheese Bread saw a 10% spike this week, contributing to 20% of total sales." 
            />
            <TopInsightCard 
                icon="trending-down-outline" 
                text="Low demand in sales - consider reducing production." 
                isAlert={true}
            />
            <TopInsightCard 
                icon="stats-chart-outline" 
                text="Overall sales increased by 8% compared to the last week." 
            />
            <TopInsightCard 
                icon="bulb-outline" 
                text="Recommendation based on trends: Boost Bread demand next week by 15% tomorrow." 
            />
        </ScrollView>
    </View>
);


// --- 2. BOTTOM NAVIGATION COMPONENT ---
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


// --- 3. MAIN PLANNER COMPONENT ---
export default function Planner() {
    
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
                    <Text style={styles.dashboardTitle}>Analysis</Text>
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

            {/* --- MAIN SCROLLABLE CONTENT --- */}
            <ScrollView contentContainerStyle={styles.mainContent}> 
                
                {/* Dummy Chart */}
                <View style={styles.chartPlaceholder}>
                    <Text style={styles.chartTitle}>Product Sales</Text>
                    <View style={styles.chartOptions}>
                        <TouchableOpacity style={styles.chartButtonActive}><Text style={styles.chartButtonTextActive}>Line</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.chartButton}><Text style={styles.chartButtonText}>Bar</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.chartButton}><Text style={styles.chartButtonText}>Pie</Text></TouchableOpacity>
                    </View>
                    <View style={styles.lineChartDummy}>
                        <Text style={{color: '#999'}}>Line Chart Placeholder</Text>
                    </View>
                </View>

                {/* Business Sales Bar Chart */}
                 <View style={styles.businessSalesChart}>
                    <Text style={styles.chartTitle}>Business Sales</Text>
                    <View style={styles.barChartDummy}>
                        <Text style={{color: '#999'}}>Bar Chart Placeholder</Text>
                    </View>
                </View>

                <AnalysisReport />
                <ProductionPlannerTable /> 
                <TopInsightsSection />

                <View style={{ height: 90 }} /> 
            </ScrollView>
            
            <BottomNavBar activeRoute="planner" />

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

    chartPlaceholder: { marginTop: 15, marginBottom: 20, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#EEEEEE' },
    chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    chartOptions: { flexDirection: 'row', marginBottom: 10 },
    chartButton: { paddingHorizontal: 10, paddingVertical: 5, marginRight: 5, borderRadius: 5, borderWidth: 1, borderColor: '#CCC' },
    chartButtonActive: { paddingHorizontal: 10, paddingVertical: 5, marginRight: 5, borderRadius: 5, backgroundColor: '#D97706' },
    chartButtonText: { fontSize: 12, color: '#666' },
    chartButtonTextActive: { fontSize: 12, color: '#FFFFFF', fontWeight: 'bold' },
    lineChartDummy: { height: 150, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    businessSalesChart: { marginBottom: 20, backgroundColor: '#FFFFFF', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#EEEEEE' },
    barChartDummy: { height: 180, backgroundColor: '#F0F0F0', justifyContent: 'center', alignItems: 'center' },

    reportContainer: { marginBottom: 20, padding: 10, backgroundColor: '#FCF3E8', borderRadius: 10, borderWidth: 1, borderColor: '#F1E7DA' },
    reportText: { fontSize: 12, color: '#333', lineHeight: 18, marginTop: 5 },

    plannerContainer: { marginBottom: 20, padding: 10, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#EEEEEE' },
    plannerHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    datePicker: { flexDirection: 'row', alignItems: 'center', padding: 5, borderWidth: 1, borderColor: '#DDD', borderRadius: 5, backgroundColor: '#F9F9F9' },
    datePickerText: { fontSize: 12, color: '#666' },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    tableBody: { borderWidth: 1, borderColor: '#DDD', borderRadius: 5, overflow: 'hidden' },
    plannerRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#EEE', paddingVertical: 10, paddingHorizontal: 5, backgroundColor: '#FFFFFF' },
    plannerHeaderRowStyles: { backgroundColor: '#EFEFEF', borderBottomWidth: 2, borderColor: '#D97706' },
    plannerRowEven: { backgroundColor: '#F9F9F9' },
    plannerCell: { fontSize: 11, color: '#333', textAlign: 'center' },
    plannerHeaderText: { fontWeight: 'bold', fontSize: 11, color: '#333' },
    suggestedText: { fontWeight: 'bold', color: '#059669' },
    editButton: { width: 30, justifyContent: 'center', alignItems: 'center' },

    actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 15 },
    actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 5, borderWidth: 1, borderColor: '#D97706', marginHorizontal: 3, backgroundColor: '#FFFFFF' },
    primaryButton: { backgroundColor: '#D97706' },
    actionButtonText: { marginLeft: 5, fontSize: 10, color: '#D97706', fontWeight: 'bold' },
    primaryButtonText: { color: '#FFFFFF' },

    insightsContainer: { marginBottom: 20 },
    insightsScroll: { paddingVertical: 10 },
    insightCard: { width: 180, height: 100, backgroundColor: '#E6FFEE', borderRadius: 10, padding: 10, marginRight: 10, justifyContent: 'space-between', borderWidth: 1, borderColor: '#D1FAE5' },
    alertCard: { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
    insightText: { fontSize: 10, color: '#333' },

    bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingBottom: Platform.OS === 'ios' ? 10 : 0 },
    bottomNavItem: { alignItems: 'center', justifyContent: 'center', padding: 5 },
    navText: { fontSize: 10, color: '#666', marginTop: 2 },
    navTextActive: { color: '#D97706', fontWeight: 'bold' },
});

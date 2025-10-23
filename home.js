// File: app/(onboarding)/home.js (FINAL COMPLETE CODE)

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// --- IMAGE IMPORT ---
// 🚨 IMPORTANT: ADJUST THIS PATH to where your logo.png file is located!
import logoImage from '../../assets/images/logo.png';


// --- 1. HELPER FUNCTION ---
const getFormattedDateTime = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return time;
};


// --- 2. CUSTOM CONFIRMATION ALERT COMPONENT ---
const CustomConfirmationAlert = ({ isVisible, onCancel, onConfirm, styles }) => {
    if (!isVisible) return null;

    return (
        <Modal 
            animationType="fade"
            transparent={true}
            visible={isVisible}
            onRequestClose={onCancel} 
        >
            <View style={styles.modalOverlay}>
                <View style={styles.alertBox}>
                    <Text style={styles.alertTitle}>Confirm Sign Out</Text>
                    <Text style={styles.alertMessage}>Are you sure you want to sign out and return to the login screen?</Text>
                    <View style={styles.alertButtonContainer}>
                        <TouchableOpacity style={[styles.alertButton, styles.cancelButton]} onPress={onCancel}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.alertButton, styles.confirmButton]} onPress={onConfirm}>
                            <Text style={styles.confirmButtonText}>Sign Out</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};


// --- 3. DAHBOARD COMPONENTS ---

const SalesSummaryCard = ({ amount, description, unit }) => (
    <View style={styles.card}>
        <Text style={styles.cardAmount}>{amount}</Text>
        <Text style={styles.cardUnit}>{unit}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
    </View>
);

const WeeklySalesChart = () => (
    <View style={styles.chartContainer}>
        <Text style={styles.sectionTitle}>Weekly Sales Chart</Text>
        <Text style={styles.chartDateRange}>September 1 - September 7</Text>
        <View style={styles.chartLegend}>
            <Text style={styles.legendText}>₱3000</Text>
            <Text style={styles.legendText}>₱2000</Text>
            <Text style={styles.legendText}>₱1000</Text>
            <Text style={styles.legendText}>₱500</Text>
            <Text style={styles.legendText}>₱100</Text>
        </View>
        <View style={styles.barChartRow}>
            {[
                { day: '9/1', total: 30, sold: 25 },
                { day: '9/2', total: 30, sold: 15 },
                { day: '9/3', total: 30, sold: 28 },
                { day: '9/4', total: 30, sold: 22 },
                { day: '9/5', total: 30, sold: 29 },
                { day: '9/6', total: 30, sold: 18 },
                { day: '9/7', total: 30, sold: 26 },
            ].map((data, index) => (
                <View key={index} style={styles.barWrapper}>
                    <View style={styles.barColumn}>
                        <View style={[styles.barTotal, { height: '100%' }]} /> 
                        <View style={[styles.barSold, { height: `${(data.sold / data.total) * 100}%` }]} />
                    </View>
                    <Text style={styles.barLabel}>{data.day}</Text>
                </View>
            ))}
        </View>
    </View>
);

const StocksInventory = () => {
    // Combined Data from both images (Products and Ingredients)
    const stockData = [
        // Products
        { product: 'Chocolate Chip Cookies', produced: '05/02/2025', total: '100pcs/gr', stocks: '50pcs/gr' },
        { product: 'Banana Bread', produced: '05/02/2025', total: '100pcs/gr', stocks: '50pcs/gr' },
        { product: 'Muffin', produced: '05/02/2025', total: '100pcs/gr', stocks: '50pcs/gr' },
        { product: 'Bread', produced: '05/02/2025', total: '100pcs/gr', stocks: '50pcs/gr' },
        // Ingredients
        { product: 'Flour', produced: '05/01/2025', total: '1kg', stocks: '3kg' },
        { product: 'Egg', produced: '05/01/2025', total: '12pcs/s', stocks: '6pcs/s' },
        { product: 'Baking Powder', produced: '05/01/2025', total: '1kg', stocks: '3kg' },
        { product: 'Milk', produced: '05/01/2025', total: '1kg', stocks: '3kg' },
        { product: 'Sugar', produced: '05/01/2025', total: '1kg', stocks: '3kg' },
        { product: 'Salt', produced: '05/01/2025', total: '1kg', stocks: '3kg' },
        { product: 'Yeast', produced: '05/01/2025', total: '1kg', stocks: '3kg' },
    ];

    const renderHeader = (isStocks) => (
        <View style={styles.stocksHeader}>
            {/* Stocks Tab - Always Active in this dashboard view */}
            <TouchableOpacity style={[styles.stocksTab, isStocks && styles.stocksTabActive]}>
                <Text style={[styles.stocksTabText, isStocks && styles.stocksTabTextActive]}>Stocks</Text>
            </TouchableOpacity>
            {/* Orders Tab */}
            <TouchableOpacity style={[styles.stocksTab, !isStocks && styles.stocksTabActive]}>
                <Text style={[styles.stocksTabText, !isStocks && styles.stocksTabTextActive]}>Orders</Text>
            </TouchableOpacity>
        </View>
    );
    
    // Headers combining "Produced" and "Restocked" as well as "Total" and "Used"
    const tableHeaders = [
        { title: 'Product', flex: 2 },
        { title: 'Restocked/Produced on', flex: 1.5 },
        { title: 'Total/Used', flex: 1 },
        { title: 'Stocks', flex: 1 },
    ];

    return (
        <View style={styles.stocksContainer}>
            <Text style={styles.sectionTitle}>Stocks/Inventory</Text>
            {renderHeader(true)} 
            
            <View style={styles.stockTable}>
                {/* Table Header */}
                <View style={[styles.stockRow, styles.stockHeaderRow]}>
                    {tableHeaders.map((header, index) => (
                        <Text 
                            key={index} 
                            style={[styles.stockCell, styles.stockHeaderText, { flex: header.flex }]}
                        >
                            {header.title}
                        </Text>
                    ))}
                </View>
                {/* Table Rows: String() wrapper added to prevent "Text strings must be rendered..." error */}
                {stockData.map((item, index) => (
                    <View key={index} style={[styles.stockRow, index % 2 === 0 && styles.stockRowEven]}>
                        <Text style={[styles.stockCell, { flex: 2 }]}>{String(item.product)}</Text>
                        <Text style={[styles.stockCell, { flex: 1.5 }]}>{String(item.produced)}</Text>
                        <Text style={[styles.stockCell, { flex: 1 }]}>{String(item.total)}</Text>
                        <Text style={[styles.stockCell, { flex: 1 }]}>{String(item.stocks)}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

const DailyReportSection = () => (
    <View style={styles.reportContainer}>
        <Text style={styles.sectionTitle}>Daily Report - September 1, 2025</Text>
        <View style={styles.reportContent}>
            <Text style={styles.reportBullet}>• Today's bakery performance shows steady sales and balanced production. A total of 320 breads were baked, with 265 sold throughout the day, leaving 55 pieces in stock. The best-selling item was Cookies, with 48 pieces sold, while Bread registered the lowest sales of only 8 pieces.</Text>
            <Text style={styles.reportBullet}>• In terms of <Text style={{fontWeight: 'bold'}}>Inventory</Text>, there are currently <Text style={{fontWeight: 'bold'}}>385 items in stock</Text>, with 3 products marked up-to-date in inventory - Cookies, Brownies, and Muffin. Fortunately, there were almost no stock-outs today.</Text>
            <Text style={styles.reportBullet}>• Overall, the bakery earned <Text style={{fontWeight: 'bold'}}>₱4,250.00</Text> in total sales. This report provides a quick overview of today's production, sales, and stock levels to help the management make better production and stocking decisions for the next baking day.</Text>
        </View>
    </View>
);

// --- 4. BOTTOM NAVIGATION COMPONENT (Uses (onboarding) path) ---

const BottomNavBar = ({ activeRoute }) => {
    const navItems = [
        { name: 'Home', icon: 'home', route: 'home' }, 
        { name: 'Stocks', icon: 'document-text', route: 'stocks' }, 
        { name: 'Planner', icon: 'settings', route: 'planner' }, 
        { name: 'Sales', icon: 'stats-chart', route: 'sales' }, 
        { name: 'Profile', icon: 'person', route: 'profile' }, 
    ];

    const handleNavigation = (route) => {
        // Construct the correct expo-router path
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


// --- 5. MAIN HOME COMPONENT ---

export default function Home() {
    const [statusTime, setStatusTime] = useState(getFormattedDateTime());
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false); 

    useEffect(() => {
        const timerId = setInterval(() => { setStatusTime(getFormattedDateTime()); }, 1000);
        return () => clearInterval(timerId);
    }, []);

    const handleSignOut = () => {
        setTimeout(() => {
            router.replace('/'); 
        }, 100);
    };

    const handleSignOutPress = () => {
        setIsMenuOpen(false); 
        setShowConfirmation(true); 
    }

    const handleProfilePress = () => {
        setIsMenuOpen(prev => !prev);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            
            {/* --- CUSTOM CONFIRMATION MODAL --- */}
            <CustomConfirmationAlert 
                isVisible={showConfirmation}
                onCancel={() => setShowConfirmation(false)} 
                onConfirm={() => {
                    setShowConfirmation(false);
                    handleSignOut();
                }}
                styles={styles}
            />

            {/* --- HEADER --- */}
            <View style={styles.header}>
                <Text style={styles.headerTime}>{statusTime}</Text> 
                <View style={styles.headerRight}>
                    <Text style={styles.headerUser}>Hello, Admin</Text>
                    <Text style={styles.headerDate}>09/02/2005</Text>
                    
                    <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
                        <Ionicons name="person-circle-outline" size={30} color="#333" />
                    </TouchableOpacity>
                    
                    {isMenuOpen && (
                        <View style={styles.signOutMenu}>
                             <TouchableOpacity style={styles.menuItem} onPress={handleSignOutPress}>
                                 <Text style={styles.menuItemText}>Sign Out</Text>
                             </TouchableOpacity>
                         </View>
                    )}
                </View>
            </View>

            {/* --- LOGO BAR (Image Logo Only) --- */}
            <View style={styles.logoBar}>
                <Image 
                    source={logoImage} 
                    style={styles.mainLogo} 
                    resizeMode="contain"
                />
            </View>

            {/* --- MAIN SCROLLABLE CONTENT --- */}
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* 3 Summary Cards */}
                <View style={styles.summaryRow}>
                    <SalesSummaryCard amount="₱5000.00" unit="Daily Sales" description="Sales Today" />
                    <SalesSummaryCard amount="200 pcs/s" unit="Product Produced Today" description="" />
                    <SalesSummaryCard amount="100 pcs/s" unit="Product Sold" description="" />
                </View>

                {/* Weekly Sales Chart */}
                <WeeklySalesChart />

                {/* Stocks/Inventory Table */}
                <StocksInventory />

                {/* Daily Report */}
                <DailyReportSection />

                {/* Spacer so content isn't hidden by nav bar */}
                <View style={{ height: 90 }} /> 
            </ScrollView>
            
            {/* --- BOTTOM NAVIGATION BAR --- */}
            <BottomNavBar activeRoute="home" />

        </SafeAreaView>
    );
}


// --- 6. STYLES ---

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF', },
    
    // --- TOP STATUS/HEADER BAR ---
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 10 : 0, 
        paddingBottom: 5, backgroundColor: '#FFFFFF', zIndex: 10,
    },
    headerTime: { fontSize: 14, color: '#000', fontWeight: 'bold', },
    headerRight: { 
        flexDirection: 'row', alignItems: 'center', 
        position: 'relative', zIndex: 10, 
    },
    headerUser: { fontSize: 12, color: '#666', marginRight: 10, textAlign: 'right' },
    headerDate: { fontSize: 12, color: '#333', marginRight: 10, fontWeight: 'bold', textAlign: 'right' },
    profileButton: { 
        padding: 0, 
        backgroundColor: '#D9D9D9',
        borderRadius: 20,
    },
    signOutMenu: {
        position: 'absolute', top: 35, right: 0, backgroundColor: '#FFFFFF',
        borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5,
        elevation: 5, width: 100, paddingVertical: 5, zIndex: 20, 
    },
    menuItem: { paddingHorizontal: 15, paddingVertical: 10, },
    menuItemText: { fontSize: 14, color: '#333', textAlign: 'center' },

    // --- LOGO BAR (Adjusted for Image) ---
    logoBar: {
        paddingHorizontal: 15,
        paddingBottom: 10,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
        justifyContent: 'center',
    },
    mainLogo: { // New style for the Image component
        width: 150, // Adjust size as needed for your logo
        height: 50, // Adjust size as needed for your logo
    },
    // logoContainer, logoName, logoSlogan, dashboardTitle styles are no longer needed

    // --- SCROLLABLE CONTENT STYLES ---
    scrollContent: { padding: 15, paddingBottom: 100 }, 

    // Summary Cards
    summaryRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginBottom: 20 
    },
    card: {
        width: '32%', 
        backgroundColor: '#F7F7F7',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        height: 100,
        justifyContent: 'space-between',
    },
    cardAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    cardUnit: {
        fontSize: 10, 
        fontWeight: '600',
        color: '#666',
        marginTop: -5,
    },
    cardDescription: {
        fontSize: 10,
        color: '#999',
    },

    // Weekly Sales Chart
    chartContainer: { 
        marginBottom: 20, 
        backgroundColor: '#FFFFFF', 
        padding: 10, 
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    chartDateRange: {
        fontSize: 12,
        color: '#666',
        marginBottom: 10,
        textAlign: 'right',
    },
    chartLegend: {
        position: 'absolute',
        left: 10,
        top: 60,
        height: 180, 
        justifyContent: 'space-between',
        zIndex: 5,
    },
    legendText: {
        fontSize: 10,
        color: '#999',
    },
    barChartRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 180, 
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingLeft: 40,
    },
    barWrapper: {
        alignItems: 'center',
        width: 30, 
    },
    barColumn: {
        width: '80%', 
        height: '100%', 
        backgroundColor: '#E5E5E5', 
        borderRadius: 5,
        overflow: 'hidden', 
        justifyContent: 'flex-end',
    },
    barTotal: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#E5E5E5', 
        zIndex: 1,
    },
    barSold: {
        width: '100%',
        backgroundColor: '#D97706', 
        borderRadius: 5,
        zIndex: 2,
    },
    barLabel: {
        fontSize: 10,
        marginTop: 5,
        color: '#666',
    },
    
    // Stocks/Inventory Table
    stocksContainer: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    stocksHeader: {
        flexDirection: 'row',
        marginBottom: 10,
        backgroundColor: '#F0F0F0',
        borderRadius: 5,
        padding: 3,
    },
    stocksTab: {
        flex: 1,
        paddingVertical: 5,
        alignItems: 'center',
        borderRadius: 3,
    },
    stocksTabActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    stocksTabText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    stocksTabTextActive: {
        color: '#D97706',
    },
    stockTable: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 5,
        overflow: 'hidden',
    },
    stockRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingVertical: 8,
        paddingHorizontal: 5,
        backgroundColor: '#FFFFFF',
    },
    stockRowEven: {
        backgroundColor: '#F9F9F9',
    },
    stockHeaderRow: {
        backgroundColor: '#EFEFEF',
    },
    stockCell: {
        flex: 1,
        fontSize: 10,
        color: '#333',
        textAlign: 'center',
    },
    stockHeaderText: {
        fontWeight: 'bold',
        fontSize: 11,
    },

    // Daily Report
    reportContainer: {
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#F7F7F7',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    reportContent: {
        marginTop: 5,
    },
    reportBullet: {
        fontSize: 12,
        color: '#333',
        marginBottom: 5,
        lineHeight: 18,
    },

    // --- BOTTOM NAVIGATION BAR STYLES ---
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

    // --- CUSTOM ALERT STYLES ---
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)', 
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertBox: {
        width: '80%',
        maxWidth: 300,
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        padding: 20,
        alignItems: 'center',
    },
    alertTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    alertMessage: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        color: '#666',
    },
    alertButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    alertButton: {
        paddingVertical: 10,
        borderRadius: 5,
        width: '48%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#D9D9D9',
    },
    cancelButtonText: {
        color: '#000',
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: '#FF6347', 
    },
    confirmButtonText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
});
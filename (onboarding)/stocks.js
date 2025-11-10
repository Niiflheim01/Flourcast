// File: app/(onboarding)/stocks.js 📦

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// --- IMAGE IMPORT ---
import logoImage from '../../assets/images/logo.png';


// --- 1. SHARED COMPONENTS (Header and Navigation) ---

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
        // Use replace to ensure the bottom nav doesn't fill up the navigation history
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

// --- 2. STOCK SPECIFIC COMPONENTS ---

const StockCard = ({ productName, price, available, status, type }) => {
    // Determine status colors/width for the status bar
    const isLow = status === 'Low Stock';
    const statusBarWidth = isLow ? '30%' : '80%';
    const statusStyle = isLow ? styles.statusBarLow : styles.statusBarFull;
    const statusTextStyle = isLow ? styles.statusTextLow : styles.statusTextIn;
    
    // Placeholder function for quantity control
    const updateQuantity = (change) => {
        console.log(`Updating quantity for ${productName} by ${change}`);
        // In the future: connect this to state/database
    };

    return (
        <View style={styles.stockCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardType}>{type}</Text>
                <TouchableOpacity onPress={() => console.log(`Options for ${productName}`)}><Ionicons name="ellipsis-vertical" size={16} color="#333" /></TouchableOpacity>
            </View>

            <Text style={styles.cardProductName}>{productName}</Text>
            <Text style={styles.cardPrice}>₱{price}</Text>

            <Text style={styles.cardAvailability}>Available: {available}</Text>

            {/* Status Bar */}
            <View style={styles.statusBarContainer}>
                <View style={[styles.statusBar, statusStyle, { width: statusBarWidth }]} />
            </View>

            <View style={styles.statusRow}>
                <Text style={[styles.statusText, statusTextStyle]}>
                    Status: {status}
                </Text>
            </View>

            {/* Quantity Controls - Ready for functionality */}
            <View style={styles.quantityControl}>
                <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(-1)}><Text style={styles.qtyButtonText}>-</Text></TouchableOpacity>
                <Text style={styles.qtyValue}>50</Text> 
                <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(1)}><Text style={styles.qtyButtonText}>+</Text></TouchableOpacity>
            </View>
        </View>
    );
};

const InventoryTable = () => {
    const inventoryData = [
        { item: 'Flour', price: '₱50.00/kg', available: '3kg', used: '1kg', lastRestock: '08/01/2025' },
        { item: 'Egg', price: '₱10.00/s', available: '24s', used: '1s', lastRestock: '08/01/2025' },
        { item: 'Sugar', price: '₱50.00/kg', available: '2kg', used: '1kg', lastRestock: '08/01/2025' },
        { item: 'Yeast', price: '₱50.00/kg', available: '3kg', used: '1kg', lastRestock: 'N/A' },
        { item: 'Baking Powder', price: '₱50.00/kg', available: '2kg', used: '1kg', lastRestock: '08/01/2025' },
        { item: 'Milk', price: '₱50.00/kg', available: '3kg', used: '1kg', lastRestock: '08/01/2025' },
    ];

    // Added flex properties for better column width control
    const tableHeaders = [
        { title: 'Item', flex: 1.5 },
        { title: 'Price', flex: 1 },
        { title: 'Available', flex: 1 },
        { title: 'Used', flex: 1 },
        { title: 'Last Restocked', flex: 1 },
        { title: '', flex: 0.8 }, // Space for Edit button
    ];

    // Placeholder function for editing an inventory item
    const handleEditItem = (item) => {
        console.log(`Editing inventory item: ${item.item}`);
        // In the future: navigate to an edit form
    };

    return (
        <View style={styles.inventoryContainer}>
            <Text style={styles.inventoryTitle}>Inventory (Raw Materials)</Text>
            
            <View style={styles.inventoryTable}>
                {/* Header */}
                <View style={[styles.inventoryRow, styles.inventoryHeaderRow]}>
                    {tableHeaders.map((header, index) => (
                        <Text 
                            key={index} 
                            style={[
                                styles.inventoryCell, 
                                styles.inventoryHeaderText, 
                                { flex: header.flex }
                            ]}
                        >
                            {header.title}
                        </Text>
                    ))}
                </View>
                
                {/* Data Rows */}
                {inventoryData.map((item, index) => (
                    <View key={index} style={[styles.inventoryRow, index % 2 === 0 && styles.inventoryRowEven]}>
                        <Text style={[styles.inventoryCell, { flex: 1.5, textAlign: 'left' }]}>{item.item}</Text>
                        <Text style={[styles.inventoryCell, { flex: 1 }]}>{item.price}</Text>
                        <Text style={[styles.inventoryCell, { flex: 1 }]}>{item.available}</Text>
                        <Text style={[styles.inventoryCell, { flex: 1 }]}>{item.used}</Text>
                        <Text style={[styles.inventoryCell, { flex: 1 }]}>{item.lastRestock}</Text>
                        <TouchableOpacity 
                            style={[styles.inventoryCell, { flex: 0.8 }]}
                            onPress={() => handleEditItem(item)}
                        >
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                ))}
            </View>
        </View>
    );
};

// --- 3. MAIN STOCKS COMPONENT ---

export default function Stocks() {
    
    // Profile navigation logic
    const handleProfilePress = () => {
        router.replace('(onboarding)/profile');
    };

    // Placeholder function for Add New Stock
    const handleAddNewStock = () => {
        console.log('Navigating to Add New Stock screen/modal');
        // In the future: router.push('(onboarding)/add-stock')
    };
    
    // Placeholder function for Search/Filter
    const handleSearch = () => {
        console.log('Opening search or submitting search query');
    };
    
    // Placeholder function for Tab change (Stocks/Orders)
    const handleTabChange = (tab) => {
        console.log(`Changing tab to: ${tab}`);
        // In the future: use state to manage active tab and render different content
    };


    return (
        <SafeAreaView style={styles.safeArea}>
            
            {/* --- APP HEADER (Same as Home) --- */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image 
                        source={logoImage} 
                        style={styles.mainLogo} 
                        resizeMode="contain"
                    />
                    <Text style={styles.dashboardTitle}>Stocks and Inventory</Text>
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
            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                {/* Search Bar and Tabs (Functionality-Ready Placeholders) */}
                <View style={styles.controlBar}>
                    <View style={styles.tabContainer}>
                        <TouchableOpacity onPress={() => handleTabChange('Stocks')}>
                            <Text style={styles.tabTextActive}>Stocks</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleTabChange('Orders')}>
                            <Text style={styles.tabTextInactive}>Orders</Text>
                        </TouchableOpacity>
                    </View>
                    <TouchableOpacity style={styles.searchBox} onPress={handleSearch}>
                        <Ionicons name="search" size={16} color="#999" style={{ marginRight: 5 }} />
                        <Text style={styles.searchText}>Search</Text>
                    </TouchableOpacity>
                </View>

                {/* Stock Cards Grid (Finished Goods) */}
                <View style={styles.cardGrid}>
                    <StockCard productName="Chocolate Chip Cookies" price="10.00" available="50 pcs" status="In Stock" type="Bread" />
                    <StockCard productName="Banana Bread" price="80.00" available="15 pcs" status="Low Stock" type="Pastries" />
                    <StockCard productName="Muffin" price="25.00" available="30 pcs" status="In Stock" type="Bread" />
                    <StockCard productName="Cream Puff" price="35.00" available="8 pcs" status="Low Stock" type="Pastries" />
                    <StockCard productName="Croissant" price="60.00" available="40 pcs" status="In Stock" type="Bread" />
                    <StockCard productName="Doughnut" price="20.00" available="12 pcs" status="Low Stock" type="Pastries" />
                </View>

                {/* Add New Stock Button (Functionality-Ready) */}
                <TouchableOpacity style={styles.addStockButton} onPress={handleAddNewStock}>
                    <Ionicons name="add" size={20} color="#333" />
                    <Text style={styles.addStockText}>Add new stock</Text>
                </TouchableOpacity>

                {/* Inventory Table (Raw Materials) */}
                <InventoryTable />


                {/* Spacer so content isn't hidden by nav bar */}
                <View style={{ height: 90 }} /> 
            </ScrollView>
            
            {/* --- BOTTOM NAVIGATION BAR --- */}
            <BottomNavBar activeRoute="stocks" />

        </SafeAreaView>
    );
}


// --- 4. STYLES (Includes new styles for Stocks page) ---

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#FFFFFF', },
    scrollContent: { 
        paddingHorizontal: 15, 
        paddingBottom: 100 
    }, 
    
    // --- Shared Header Styles ---
    header: {
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        paddingHorizontal: 15, 
        paddingTop: 10, 
        paddingBottom: 10,
        backgroundColor: '#FFFFFF', 
        borderBottomWidth: 1, 
        borderBottomColor: '#EEEEEE',
    },
    headerLeft: {
        alignItems: 'flex-start',
    },
    headerRight: { 
        flexDirection: 'row', 
        alignItems: 'center',
        paddingTop: 10, 
    },
    headerUserDetails: {
        alignItems: 'flex-end',
        marginRight: 8,
    },
    headerUserText: { 
        fontSize: 12, 
        color: '#666', 
        textAlign: 'right' 
    },
    profileButton: { 
        padding: 0, 
        backgroundColor: '#D9D9D9',
        borderRadius: 20,
    },
    mainLogo: { 
        width: 120, 
        height: 30, 
    },
    dashboardTitle: { 
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 5,
    },
    
    // --- Control Bar (Search/Tabs) ---
    controlBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 15,
    },
    tabContainer: {
        flexDirection: 'row',
    },
    tabTextActive: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginRight: 15,
        borderBottomWidth: 2,
        borderBottomColor: '#D97706',
        paddingBottom: 2,
    },
    tabTextInactive: {
        fontSize: 14,
        color: '#999',
        paddingBottom: 2,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
    },
    searchText: {
        fontSize: 14,
        color: '#999',
    },

    // --- Stock Cards Grid ---
    cardGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    stockCard: {
        width: '48.5%', // Slightly less than half to allow spacing
        backgroundColor: '#FCF3E8', 
        borderRadius: 10,
        padding: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#F1E7DA',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 5,
    },
    cardType: {
        fontSize: 12,
        color: '#D97706',
        fontWeight: 'bold',
    },
    cardProductName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    cardPrice: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    cardAvailability: {
        fontSize: 10,
        color: '#666',
        marginBottom: 8,
    },
    statusBarContainer: {
        height: 5,
        backgroundColor: '#E5E5E5',
        borderRadius: 2,
        marginBottom: 5,
    },
    statusBar: {
        height: '100%',
        borderRadius: 2,
    },
    statusBarFull: {
        backgroundColor: '#4CAF50', // Green (In Stock)
    },
    statusBarLow: {
        backgroundColor: '#FF9800', // Orange (Low Stock)
    },
    statusRow: {
        marginBottom: 10,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusTextIn: {
        color: '#4CAF50',
    },
    statusTextLow: {
        color: '#FF9800',
    },
    quantityControl: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
    },
    qtyButton: {
        backgroundColor: '#D9D9D9',
        borderRadius: 5,
        paddingHorizontal: 10,
        paddingVertical: 2,
        marginHorizontal: 5,
    },
    qtyButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    qtyValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        width: 40,
        textAlign: 'center',
    },

    // --- Add New Stock Button ---
    addStockButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        borderWidth: 1,
        borderColor: '#D9D9D9',
        borderRadius: 5,
        marginBottom: 20,
        backgroundColor: '#F9F9F9'
    },
    addStockText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginLeft: 5,
    },

    // --- Inventory Table (Bottom Section) ---
    inventoryContainer: {
        backgroundColor: '#F7F7F7',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E5E5E5',
    },
    inventoryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    inventoryTable: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 5,
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
    },
    inventoryRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingVertical: 8,
        paddingHorizontal: 5,
    },
    inventoryRowEven: {
        backgroundColor: '#F9F9F9',
    },
    inventoryHeaderRow: {
        backgroundColor: '#EFEFEF',
    },
    inventoryCell: {
        fontSize: 10,
        color: '#333',
        textAlign: 'center',
        alignSelf: 'center',
        paddingHorizontal: 2,
    },
    inventoryHeaderText: {
        fontWeight: 'bold',
        fontSize: 11,
    },
    editButtonText: {
        color: '#D97706',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    
    // --- Bottom Navigation Styles (Shared) ---
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
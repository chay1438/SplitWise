import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Colors, AppConfig } from '../../theme';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { groupService } from '../../services/groupService';
import { balanceService } from '../../services/balanceService';
import { Group } from '../../lib/types';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export default function HomeScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth();
    const [refreshing, setRefreshing] = useState(false);

    // State for data
    const [netBalance, setNetBalance] = useState(0);
    const [youOwe, setYouOwe] = useState(567.58);
    const [owesYou, setOwesYou] = useState(826.43);

    const [pendingBills, setPendingBills] = useState([
        { id: '1', title: 'Birthday House', date: 'Mar 24, 2025', amount: 4508.32, type: 'owe', icon: 'birthday-cake' },
        { id: '2', title: 'You and Wade', date: 'Mar 22, 2025', amount: 3005.54, type: 'owed', icon: 'people' },
        { id: '3', title: 'Shopping', date: 'Mar 24, 2025', amount: 505.00, type: 'owe', icon: 'cart' },
    ]);

    const onRefresh = async () => {
        setRefreshing(true);
        // Refresh logic here
        await new Promise(r => setTimeout(r, 1000));
        setRefreshing(false);
    }

    const renderHeader = () => (
        <View>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.appName}>💰 Splitty</Text>
                </View>
                <TouchableOpacity style={styles.notificationButton}>
                    <Ionicons name="notifications-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Balance Cards */}
            <View style={styles.balanceContainer}>
                <View style={[styles.balanceCard, styles.oweCard]}>
                    <Text style={styles.balanceAmount}>${youOwe.toFixed(2)}</Text>
                    <Text style={styles.balanceLabel}>You Owe</Text>
                </View>
                <View style={[styles.balanceCard, styles.owedCard]}>
                    <Text style={styles.balanceAmount}>${owesYou.toFixed(2)}</Text>
                    <Text style={styles.balanceLabel}>Owes you</Text>
                </View>
            </View>

            {/* Dashboard Start */}
            <View style={styles.dashboardContainer}>
                <View style={styles.dashboard}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Pending Bills</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAll}>View All</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderFooter = () => (
        <View style={styles.dashboardBottom}>
            {/* Quick Actions */}
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionsContainer}>
                <ActionButton
                    icon="add"
                    label="Add Expense"
                    color={Colors.primary}
                    onPress={() => navigation.navigate('AddExpense' as any)}
                />
                <ActionButton
                    icon="checkmark"
                    label="Settle Up"
                    color={Colors.success}
                    onPress={() => { }}
                />
                <ActionButton
                    icon="people"
                    label="New Group"
                    color={Colors.info}
                    onPress={() => navigation.navigate('MakeGroup')}
                />
            </View>
        </View>
    );

    return (
        <ScreenWrapper
            gradient={[Colors.primary, Colors.primaryDark]}
            edges={['top']}
            statusBarStyle="light-content"
        >
            <FlatList
                data={pendingBills}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.dashContent}>
                        <BillItem
                            title={item.title}
                            date={item.date}
                            amount={item.amount}
                            type={item.type}
                            icon={item.icon}
                        />
                    </View>
                )}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
                showsVerticalScrollIndicator={false}
            />
        </ScreenWrapper>
    );
}

const BillItem = ({ title, date, amount, type, icon }: any) => {
    const isFontAwesome = icon === 'birthday-cake';
    return (
        <View style={styles.billItem}>
            <View style={styles.billIcon}>
                {isFontAwesome ? (
                    <FontAwesome name={icon} size={20} color="#555" />
                ) : (
                    <Ionicons name={icon} size={24} color="#555" />
                )}
            </View>
            <View style={styles.billInfo}>
                <Text style={styles.billTitle}>{title}</Text>
                <Text style={styles.billDate}>{date}</Text>
            </View>
            <View style={styles.billAmountContainer}>
                <Text style={[styles.billStatus, type === 'owe' ? { color: '#FF5A5F' } : { color: '#4CAF50' }]}>
                    {type === 'owe' ? 'You Owe' : 'You are owed'}
                </Text>
                <Text style={[styles.billAmount, type === 'owe' ? { color: '#FF5A5F' } : { color: '#4CAF50' }]}>
                    ${amount.toFixed(2)}
                </Text>
            </View>
        </View>
    );
};

const ActionButton = ({ icon, label, color, onPress }: any) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
        <View style={[styles.actionIconCircle, { backgroundColor: color }]}>
            {/* Re-checking image: White squares/cards with colored circles inside containing the icon. */}
            <Ionicons name={icon} size={24} color="#fff" />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);

// Actually ActionButton design in image:
// White Request: White Card. Inside: Red Circle with Plus Icon. Text below: Add Expense.
const ActionButtonUpdated = ({ icon, label, color, onPress }: any) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
        <View style={[styles.actionIconCircle, { backgroundColor: color }]}>
            <Ionicons name={icon} size={22} color="#fff" />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FF5A5F', // Primary Red Color for Header
    },
    header: {
        paddingTop: 10,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    appName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 8,
    },
    notificationButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    scrollContent: {
        // Remove flexGrow: 1 if it interferes with FlatList scrolling
    },
    balanceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    balanceCard: {
        width: '48%',
        padding: 20,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.1)',
        height: 100,
        justifyContent: 'center',
    },
    oweCard: {
        backgroundColor: '#A93236',
    },
    owedCard: {
        backgroundColor: '#FF8A8E',
    },
    balanceAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    balanceLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
    },
    dashboardContainer: {
        backgroundColor: '#FF5A5F', // Match container
    },
    dashboard: {
        backgroundColor: '#f8f9fa',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    dashContent: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 20,
    },
    dashboardBottom: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 100, // Space for bottom tabs
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    seeAll: {
        color: '#FF5A5F',
        fontSize: 14,
        fontWeight: '600',
    },
    billItem: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    billIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    billInfo: {
        flex: 1,
    },
    billTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    billDate: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    billAmountContainer: {
        alignItems: 'flex-end',
    },
    billStatus: {
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 2,
    },
    billAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 16,
    },
    actionCard: {
        backgroundColor: '#fff',
        width: '31%',
        paddingVertical: 20,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    actionIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    actionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
});

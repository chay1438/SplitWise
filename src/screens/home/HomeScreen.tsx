import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image, RefreshControl } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Colors, AppConfig } from '../../constants';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
// Redux
import { useAppDispatch } from '../../store/hooks';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useGetGroupsQuery } from '../../store/api/groupsApi';
import { useGetExpensesQuery } from '../../store/api/expensesApi';
import { useGetUserBalanceSummaryQuery, useGetBalancesQuery } from '../../store/api/balanceApi';
import { useGetFriendsQuery } from '../../store/api/friendsApi';
import { GroupListItem } from '../../components/common/GroupListItem';

import { Group } from '../../types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export default function HomeScreen() {
    const dispatch = useAppDispatch();
    const navigation = useNavigation<NavigationProp>();

    // Selectors & Auth
    const currentUser = useCurrentUser();

    // RTK Query Hooks
    // Note: We pass 'skip' if user.id is undefined to avoid firing early
    const {
        data: groups = [],
        isLoading: groupsLoading,
        refetch: refetchGroups
    } = useGetGroupsQuery(currentUser.id || '', { skip: !currentUser.id });

    const {
        data: expenses = [],
        isLoading: expensesLoading,
        refetch: refetchExpenses
    } = useGetExpensesQuery({ userId: currentUser.id }, { skip: !currentUser.id });

    const {
        data: balanceSummary,
        isLoading: balanceLoading,
        refetch: refetchBalance
    } = useGetUserBalanceSummaryQuery(currentUser.id || '', { skip: !currentUser.id });

    // State
    const [refreshing, setRefreshing] = useState(false);

    // Derived Balance State (using backend data now!)
    const netBalance = balanceSummary?.netBalance || 0;
    const youOwe = balanceSummary?.totalOwing || 0;
    const owesYou = balanceSummary?.totalOwed || 0;

    const onRefresh = async () => {
        setRefreshing(true);
        // Parallel Refetch
        await Promise.all([
            refetchGroups(),
            refetchExpenses(),
            refetchBalance()
        ]);
        setRefreshing(false);
    }

    const renderHeader = () => (
        <View>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.appName}>💰 Splitty</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity style={[styles.notificationButton, { marginRight: 8 }]} onPress={() => navigation.navigate('Search' as any)}>
                        <Ionicons name="search" size={24} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.notificationButton} onPress={() => navigation.navigate('Notifications' as any)}>
                        <Ionicons name="notifications-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
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
                        <Text style={styles.sectionTitle}>My Groups</Text>
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
                    onPress={() => navigation.navigate('SettleUp' as any)}
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

    // Balances Query (Group Level)
    const { data: balanceData = [] } = useGetBalancesQuery(currentUser.id || '', { skip: !currentUser.id });

    // Merge Groups with Balances
    const groupsWithBalances = React.useMemo(() => {
        return groups.map((group, index) => {
            const balRecord = balanceData.find((b: any) => b.group_id === group.id);
            const rawAmount = balRecord ? parseFloat(balRecord.net_balance) : 0;

            // Use consistent group color
            const color = '#FF8A8E';

            return {
                ...group,
                balance: rawAmount,
                color
            };
        });
    }, [groups, balanceData]);

    return (
        <ScreenWrapper
            gradient={[Colors.primary, Colors.primaryDark]}
            edges={['top']}
            statusBarStyle="light-content"
        >
            <FlatList
                data={groupsWithBalances}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View style={styles.dashContent}>
                        <GroupListItem
                            title={item.name}
                            amount={item.balance}
                            color={item.color}
                            members={item.members}
                            imageUrl={item.avatar_url}
                            onPress={() => navigation.navigate('GroupDetails', { groupId: item.id, groupName: item.name })}
                        />
                    </View>
                )}
                ListHeaderComponent={renderHeader}
                ListFooterComponent={renderFooter}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={() => (
                    <View style={[styles.dashContent, { padding: 40, alignItems: 'center' }]}>
                        <Text style={{ color: '#999' }}>No Groups yet. Create one!</Text>
                    </View>
                )}
            />
        </ScreenWrapper>
    );
}

const BillItem = ({ title, date, amount, type, icon }: any) => {
    return (
        <View style={styles.billItem}>
            <View style={styles.billIcon}>
                <Ionicons name={icon} size={24} color="#555" />
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
        backgroundColor: '#4CAF50', // Green for positive balance
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

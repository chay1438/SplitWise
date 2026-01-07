import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { Colors } from '../../constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../hooks/useAuth';
import { useGetExpensesQuery } from '../../store/api/expensesApi';
import { useGetFriendsQuery } from '../../store/api/friendsApi';
import { useGetGroupsQuery } from '../../store/api/groupsApi';

type Props = NativeStackScreenProps<AppStackParamList, 'FriendDetail'>;

type FilterType = 'ALL' | 'UNSETTLED' | 'SETTLED';

export default function FriendDetailScreen({ route, navigation }: Props) {
    const { friendId } = route.params;
    const { user } = useAuth();

    // Fetch Data
    const { data: friends } = useGetFriendsQuery(user?.id || '');
    const friend = friends?.find(f => f.id === friendId);

    const { data: expenses = [], isLoading: loadingExpenses } = useGetExpensesQuery({ userId: user?.id });
    const { data: groups = [] } = useGetGroupsQuery(user?.id || '');

    const [filter, setFilter] = useState<FilterType>('UNSETTLED');
    const [showOptions, setShowOptions] = useState(false);

    // Filter Expenses involving this friend
    const sharedExpenses = useMemo(() => {
        if (!expenses || !user) return [];
        let filtered = expenses.filter(exp => {
            // Check if friend is in splits OR is payer
            const friendInvolved = exp.payer_id === friendId || exp.splits?.some((s: any) => s.user_id === friendId);
            return friendInvolved;
        });

        // Apply Filter
        if (filter === 'UNSETTLED') {
            // Show normal expenses (debts created)
            filtered = filtered.filter(e => e.category !== 'payment');
        } else if (filter === 'SETTLED') {
            // Show payments
            filtered = filtered.filter(e => e.category === 'payment');
        }

        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [expenses, friendId, user, filter]);

    // Calculate Balances (Breakdown)
    const { totalOwedToMe, totalIOwe, netBalance } = useMemo(() => {
        let toMe = 0;
        let iOwe = 0;
        if (!user || !expenses) return { totalOwedToMe: 0, totalIOwe: 0, netBalance: 0 };

        // We must iterate ALL shared expenses to get accurate balance, ignoring current filter
        expenses.filter(exp =>
            exp.payer_id === friendId || exp.splits?.some((s: any) => s.user_id === friendId)
        ).forEach(exp => {
            const payerId = exp.payer_id;
            const mySplit = exp.splits?.find((s: any) => s.user_id === user.id);
            const friendSplit = exp.splits?.find((s: any) => s.user_id === friendId);

            if (payerId === user.id && friendSplit) {
                // I paid, friend owes me
                toMe += parseFloat(friendSplit.amount as any);
            } else if (payerId === friendId && mySplit) {
                // Friend paid, I owe them
                iOwe += parseFloat(mySplit.amount as any);
            }
        });

        return { totalOwedToMe: toMe, totalIOwe: iOwe, netBalance: toMe - iOwe };
    }, [expenses, user, friendId]);

    // Common Groups
    const commonGroups = useMemo(() => {
        return groups.filter(g => g.members?.some((m: any) => m.id === friendId));
    }, [groups, friendId]);

    const renderExpenseItem = ({ item }: { item: any }) => {
        const isPayer = item.payer_id === user?.id;
        const month = new Date(item.date).toLocaleString('default', { month: 'short' });
        const day = new Date(item.date).getDate();
        const isPayment = item.category === 'payment';

        return (
            <TouchableOpacity
                style={styles.expenseItem}
                onPress={() => navigation.navigate('ExpenseDetail' as any, { expense: item })}
            >
                <View style={styles.dateBox}>
                    <Text style={styles.dateMonth}>{month}</Text>
                    <Text style={styles.dateDay}>{day}</Text>
                </View>
                <View style={[styles.iconBox, isPayment && { backgroundColor: Colors.success }]}>
                    <Ionicons name={isPayment ? "cash-outline" : "receipt-outline"} size={20} color={isPayment ? "#fff" : "#666"} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.desc}>{item.description}</Text>
                    <Text style={styles.subtext}>
                        {isPayer ? `You paid ₹${item.amount.toFixed(2)}` : `${friend?.full_name || 'Friend'} paid ₹${item.amount.toFixed(2)}`}
                    </Text>
                </View>
                <View>
                    <Text style={[styles.amount, { color: isPayer ? Colors.success : Colors.error }]}>
                        {isPayer ? 'you lent' : 'you borrowed'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View style={{ alignItems: 'center' }}>
                    <Text style={styles.headerTitle}>{friend?.full_name || 'Friend'}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowOptions(true)}>
                    <Ionicons name="ellipsis-vertical" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            {/* Balance Card */}
            <View style={styles.balanceCard}>
                <View style={styles.avatarLarge}>
                    <Text style={styles.avatarTextLarge}>{(friend?.full_name || '?').charAt(0)}</Text>
                </View>

                <Text style={[styles.balanceAmount, { color: netBalance >= 0 ? Colors.success : Colors.error }]}>
                    {netBalance >= 0 ? `Owes you ₹${netBalance.toFixed(2)}` : `You owe ₹${Math.abs(netBalance).toFixed(2)}`}
                </Text>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>You owe</Text>
                        <Text style={styles.statValue}>₹{totalIOwe.toFixed(2)}</Text>
                    </View>
                    <View style={styles.verticalLine} />
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Owes you</Text>
                        <Text style={styles.statValue}>₹{totalOwedToMe.toFixed(2)}</Text>
                    </View>
                </View>

                {netBalance !== 0 && (
                    <TouchableOpacity style={styles.settleButton} onPress={() => navigation.navigate('SettleUp', { userId: friendId })}>
                        <Text style={styles.settleButtonText}>Settle Up</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
                    <Text style={styles.actionLabel}>Add Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn}>
                    <Ionicons name="people-outline" size={24} color={Colors.primary} />
                    <Text style={styles.actionLabel}>Groups ({commonGroups.length})</Text>
                </TouchableOpacity>
            </View>

            {/* Filters */}
            <View style={styles.filterRow}>
                {['ALL', 'UNSETTLED', 'SETTLED'].map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterChip, filter === f && styles.activeFilter]}
                        onPress={() => setFilter(f as FilterType)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
                            {f === 'UNSETTLED' ? 'Expenses' : f === 'SETTLED' ? 'Payments' : 'All'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* List */}
            {loadingExpenses ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={sharedExpenses}
                    keyExtractor={item => item.id}
                    renderItem={renderExpenseItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        borderBottomColor: '#eee',
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    balanceCard: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    avatarLarge: {
        width: 60, height: 60, borderRadius: 30, backgroundColor: '#f0f0f0',
        justifyContent: 'center', alignItems: 'center', marginBottom: 12
    },
    avatarTextLarge: { fontSize: 24, fontWeight: 'bold', color: '#555' },
    balanceAmount: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    statsRow: {
        flexDirection: 'row', width: '100%', justifyContent: 'space-around', marginBottom: 20,
    },
    statItem: { alignItems: 'center' },
    statLabel: { fontSize: 12, color: '#999', textTransform: 'uppercase' },
    statValue: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 4 },
    verticalLine: { width: 1, height: '100%', backgroundColor: '#eee' },
    settleButton: {
        backgroundColor: Colors.success,
        paddingHorizontal: 32,
        paddingVertical: 12,
        borderRadius: 24,
        shadowColor: Colors.success,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
    },
    settleButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    actionsRow: {
        flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5',
    },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', marginRight: 24,
    },
    actionLabel: { marginLeft: 8, color: Colors.primary, fontWeight: '600' },

    filterRow: {
        flexDirection: 'row', padding: 16,
    },
    filterChip: {
        paddingVertical: 6, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#f0f0f0', marginRight: 8,
    },
    activeFilter: { backgroundColor: Colors.primary },
    filterText: { color: '#666', fontWeight: '500' },
    activeFilterText: { color: '#fff' },

    expenseItem: {
        flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9f9f9',
    },
    dateBox: { alignItems: 'center', marginRight: 12, width: 40 },
    dateMonth: { fontSize: 10, color: '#666', textTransform: 'uppercase' },
    dateDay: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
    desc: { fontSize: 16, fontWeight: '500', color: '#333' },
    subtext: { fontSize: 12, color: '#888' },
    amount: { fontSize: 12, fontWeight: 'bold' },
});

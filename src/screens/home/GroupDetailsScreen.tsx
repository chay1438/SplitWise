import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, SectionList, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { Profile, ExpenseWithDetails, GroupWithMembers } from '../../types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useGetExpensesQuery } from '../../store/api/expensesApi';
import { useGetGroupsQuery, useAddMemberMutation } from '../../store/api/groupsApi';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Colors } from '../../constants';

type Props = NativeStackScreenProps<AppStackParamList, 'GroupDetails'>;

export default function GroupDetailsScreen({ route, navigation }: Props) {
    const { groupId, groupName } = route.params;
    const currentUser = useCurrentUser();
    const currentUserId = currentUser.id;

    // --- INFINITE SCROLL STATE ---
    const [page, setPage] = useState(0);
    const [allExpenses, setAllExpenses] = useState<ExpenseWithDetails[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const limit = 20;

    // RTK Query
    // We fetch based on current 'page'.
    // When 'data' arrives, we verify if it's new and append it.
    const { data: expensesPage = [], isLoading: isLoadingExpenses, isFetching, refetch } = useGetExpensesQuery({
        groupId,
        page,
        limit
    });

    // Group Info
    const { data: groups = [] } = useGetGroupsQuery(currentUser.id || '', { skip: !currentUser.id });
    const group = groups.find(g => g.id === groupId);
    const members = group?.members || [];

    // --- DATA SYNC LOGIC ---
    useEffect(() => {
        if (expensesPage) {
            if (page === 0) {
                // Reset/Initial Load
                setAllExpenses(expensesPage);
            } else if (expensesPage.length > 0) {
                // Append (Filtering duplicates just in case)
                setAllExpenses(prev => {
                    const newIds = new Set(expensesPage.map(e => e.id));
                    return [...prev, ...expensesPage.filter(e => !newIds.has(e.id))]; // Simple dedup relies on caching, checking ID is safer
                    // Actually, simpler append is usually fine if pages are stable
                    // But to be safe against race conditions:
                    const existingIds = new Set(prev.map(e => e.id));
                    const uniqueNew = expensesPage.filter(e => !existingIds.has(e.id));
                    return [...prev, ...uniqueNew];
                });
            }
        }
    }, [expensesPage, page]);

    // Handle "Pull to Refresh" or "Focus" updates
    // If we add an expense, invalidation happens. 
    // We should probably reset to Page 0 to see the new item (date desc).
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            // Optional: Silent refresh or reset?
            // Let's rely on RTK Tags for hard data updates.
            // If user added expense, standard tag invalidation triggers.
            // We might want to reset pagination to 0 to ensure coherence.
            // setPage(0); // This would force reload top.
        });
        return unsubscribe;
    }, [navigation]);

    const handleLoadMore = () => {
        if (!isFetching && expensesPage.length === limit) {
            // If we got a full page, there might be more
            setPage(prev => prev + 1);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        setPage(0);
        await refetch();
        setIsRefreshing(false);
    };

    // Navigation Options
    useEffect(() => {
        navigation.setOptions({
            title: groupName,
            headerRight: () => (
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => navigation.navigate('AddGroupMember', { groupId })} style={{ marginRight: 15 }}>
                        <Ionicons name="person-add-outline" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => navigation.navigate('EditGroup', { groupId })} style={{ marginRight: 10 }}>
                        <Ionicons name="settings-outline" size={24} color={Colors.primary} />
                    </TouchableOpacity>
                </View>
            )
        });
    }, [groupId, groupName]);


    // --- LOGIC: Balance Calculation (Client Side on Loaded Data) ---
    // Note: This only calculates balance for LOADED items.
    const { myTotalBalance, debts } = useMemo(() => {
        if (!currentUserId) return { myTotalBalance: 0, debts: [] };

        let total = 0;
        const balanceMap: Record<string, number> = {};

        allExpenses.forEach((expense: any) => {
            const amount = parseFloat(expense.amount);
            const isPayer = expense.payer_id === currentUserId;

            if (expense.splits) {
                expense.splits.forEach((split: any) => {
                    const splitAmount = parseFloat(split.amount);
                    const isSplitter = split.user_id === currentUserId;

                    if (isPayer && split.user_id !== currentUserId) {
                        balanceMap[split.user_id] = (balanceMap[split.user_id] || 0) + splitAmount;
                        total += splitAmount;
                    } else if (!isPayer && isSplitter) {
                        if (expense.payer_id !== split.user_id) {
                            balanceMap[expense.payer_id] = (balanceMap[expense.payer_id] || 0) - splitAmount;
                            total -= splitAmount;
                        }
                    }
                });
            }
        });

        const debtList = Object.entries(balanceMap)
            .filter(([_, amt]) => Math.abs(amt) > 0.01)
            .map(([uid, amt]) => {
                const member = members.find(m => m.id === uid);
                return {
                    userId: uid,
                    name: member?.full_name || 'Unknown',
                    amount: amt
                };
            }).sort((a, b) => b.amount - a.amount);

        return { myTotalBalance: total, debts: debtList };
    }, [allExpenses, currentUserId, members]);


    // --- LOGIC: Section List by Month ---
    const sections = useMemo(() => {
        const grouped: Record<string, ExpenseWithDetails[]> = {};
        allExpenses.forEach((exp) => {
            const date = new Date(exp.date);
            const key = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(exp);
        });
        return Object.entries(grouped).map(([title, data]) => ({
            title,
            data: data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        }));
    }, [allExpenses]);


    // --- RENDER HELPERS ---
    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <View style={[styles.balanceCard, myTotalBalance >= 0 ? styles.bgGreen : styles.bgRed]}>
                <Text style={styles.balanceLabel}>
                    {myTotalBalance >= 0 ? "You are owed" : "You owe"}
                </Text>
                <Text style={styles.balanceAmount}>${Math.abs(myTotalBalance).toFixed(2)}</Text>
                {myTotalBalance < 0 && (
                    <TouchableOpacity style={styles.settleButton} onPress={() => navigation.navigate('SettleUp', { groupId })}>
                        <Text style={styles.settleButtonText}>Settle Up</Text>
                    </TouchableOpacity>
                )}
            </View>

            {debts.length > 0 && (
                <View style={styles.debtSection}>
                    <Text style={styles.sectionTitle}>Balances (From loaded Items)</Text>
                    {debts.map(debt => (
                        <View key={debt.userId} style={styles.debtRow}>
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarText}>{debt.name.charAt(0)}</Text>
                            </View>
                            <Text style={styles.debtText}>
                                {debt.amount > 0 ? `${debt.name} owes you` : `You owe ${debt.name}`}
                            </Text>
                            <Text style={[styles.debtAmount, debt.amount > 0 ? styles.textGreen : styles.textRed]}>
                                ${Math.abs(debt.amount).toFixed(2)}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );

    const renderExpenseItem = ({ item }: { item: ExpenseWithDetails }) => {
        const isPayer = item.payer_id === currentUserId;
        let statusLabel = "Not involved";
        let statusColor = Colors.textMuted;
        let amountDisplay = "";

        if (isPayer) {
            statusLabel = "You paid";
            statusColor = Colors.success;
            amountDisplay = `$${item.amount.toFixed(2)}`;
        } else {
            const mySplit = item.splits?.find((s: any) => s.user_id === currentUserId);
            if (mySplit) {
                statusLabel = "You owe";
                statusColor = Colors.error;
                amountDisplay = `$${mySplit.amount.toFixed(2)}`;
            }
        }

        return (
            <TouchableOpacity
                style={styles.expenseItem}
                onPress={() => navigation.navigate('EditExpense', { expenseId: item.id, groupId: groupId })}
            >
                <View style={styles.dateBox}>
                    <Text style={styles.dateMonth}>{new Date(item.date).toLocaleString('default', { month: 'short' })}</Text>
                    <Text style={styles.dateDay}>{new Date(item.date).getDate()}</Text>
                </View>
                <View style={styles.expenseIcon}>
                    <Ionicons name="receipt" size={20} color="#555" />
                </View>
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text style={styles.expenseTitle}>{item.description}</Text>
                    <Text style={[styles.expenseStatus, { color: statusColor }]}>{statusLabel}</Text>
                </View>
                <View>
                    <Text style={[styles.expenseAmount, { color: statusColor }]}>{amountDisplay}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    if (isLoadingExpenses && page === 0) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom']}>
            <SectionList
                sections={sections}
                keyExtractor={(item) => item.id}
                renderItem={renderExpenseItem}
                renderSectionHeader={({ section: { title } }) => (
                    <Text style={styles.monthHeader}>{title}</Text>
                )}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ paddingBottom: 80 }}
                stickySectionHeadersEnabled={false}
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                ListFooterComponent={isFetching && page > 0 ? <ActivityIndicator style={{ margin: 20 }} /> : null}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No expenses yet.</Text>
                        <Text style={styles.emptySubText}>Tap + to add one.</Text>
                    </View>
                }
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('AddExpense', { groupId, groupName })}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerContainer: { padding: 20 },
    balanceCard: { borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 24 },
    bgGreen: { backgroundColor: Colors.success + '20' },
    bgRed: { backgroundColor: Colors.error + '20' },
    balanceLabel: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 4, textTransform: 'uppercase' },
    balanceAmount: { fontSize: 32, fontWeight: 'bold', color: '#333' },
    settleButton: { marginTop: 12, backgroundColor: Colors.success, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
    settleButtonText: { color: '#fff', fontWeight: 'bold' },
    debtSection: { marginTop: 0, marginBottom: 10 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
    debtRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    avatarText: { fontSize: 14, fontWeight: 'bold', color: '#555' },
    debtText: { flex: 1, fontSize: 15, color: '#333' },
    debtAmount: { fontSize: 15, fontWeight: 'bold' },
    textGreen: { color: Colors.success },
    textRed: { color: Colors.error },
    monthHeader: { fontSize: 13, fontWeight: '600', color: '#888', backgroundColor: '#f9f9f9', paddingHorizontal: 20, paddingVertical: 8, textTransform: 'uppercase', letterSpacing: 1 },
    expenseItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    dateBox: { alignItems: 'center', marginRight: 14, width: 36 },
    dateMonth: { fontSize: 10, color: '#888', textTransform: 'uppercase' },
    dateDay: { fontSize: 18, fontWeight: 'bold', color: '#444' },
    expenseIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#f2f2f2', justifyContent: 'center', alignItems: 'center' },
    expenseTitle: { fontSize: 16, fontWeight: '500', color: '#333', marginBottom: 2 },
    expenseStatus: { fontSize: 12 },
    expenseAmount: { fontSize: 16, fontWeight: 'bold' },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { fontSize: 18, fontWeight: '600', color: '#ccc' },
    emptySubText: { fontSize: 14, color: '#ccc', marginTop: 8 },
    fab: { position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4 },
});

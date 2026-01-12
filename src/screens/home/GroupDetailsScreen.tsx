import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, SectionList, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Alert, Image } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { Profile, ExpenseWithDetails, GroupWithMembers } from '../../types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useGetExpensesQuery } from '../../store/api/expensesApi';
import { useGetGroupsQuery, useGetGroupMembersQuery, useAddMemberMutation, useLeaveGroupMutation, useDeleteGroupMutation, useUpdateMemberRoleMutation, useRemoveMemberMutation } from '../../store/api/groupsApi';
// ... (imports remain same)

import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Colors, Typography } from '../../constants';

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
    const { data: members = [] } = useGetGroupMembersQuery(groupId);

    // Helper to stabilize expenses dependency
    const expensesHash = useMemo(() => {
        return expensesPage.map(e => e.id + e.updated_at).join(',');
    }, [expensesPage]);

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
                })
            }
        }
    }, [expensesHash, page]);

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
    // Navigation Options - Handled via Custom Header now


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
                <Text style={styles.balanceAmount}>₹{Math.abs(myTotalBalance).toFixed(2)}</Text>
                {myTotalBalance < 0 && (
                    <TouchableOpacity style={styles.settleButton} onPress={() => navigation.navigate('GroupSettleUp', { groupId })}>
                        <Text style={styles.settleButtonText}>Settle Up</Text>
                    </TouchableOpacity>
                )}
            </View>

            {debts.length > 0 && (
                <View style={styles.debtSection}>
                    <Text style={styles.sectionTitle}>Balances</Text>
                    {debts.map(debt => (
                        <View key={debt.userId} style={styles.debtRow}>
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarText}>{debt.name.charAt(0)}</Text>
                            </View>
                            <Text style={styles.debtText}>
                                {debt.amount > 0 ? `${debt.name} owes you` : `You owe ${debt.name}`}
                            </Text>
                            <Text style={[styles.debtAmount, debt.amount > 0 ? styles.textGreen : styles.textRed]}>
                                ₹{Math.abs(debt.amount).toFixed(2)}
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
        let amountDisplay = "";

        // Find payer name
        const payerName = members.find(m => m.id === item.payer_id)?.full_name || 'Someone';

        if (isPayer) {
            statusLabel = `You paid ₹${item.amount.toFixed(2)}`;
        } else {
            const mySplit = item.splits?.find((s: any) => s.user_id === currentUserId);
            statusLabel = `${payerName} paid ₹${item.amount.toFixed(2)}`;
        }

        let rightSideText = "";
        let rightSideColor = "#333";
        let rightSideLabel = "";

        if (isPayer) {
            const myShare = item.splits?.find((s: any) => s.user_id === currentUserId)?.amount || 0;
            // The amount you "lent" is the total minus your share.
            const lent = item.amount - myShare;
            if (lent > 0.01) {
                rightSideLabel = "you lent";
                rightSideText = `₹${lent.toFixed(2)}`;
                rightSideColor = Colors.success;
            } else {
                rightSideLabel = "you paid";
                rightSideText = `₹${item.amount.toFixed(2)}`;
                rightSideColor = Colors.textMuted;
            }
        } else {
            const mySplit = item.splits?.find((s: any) => s.user_id === currentUserId);
            if (mySplit) {
                rightSideLabel = "you owe";
                rightSideText = `₹${mySplit.amount.toFixed(2)}`;
                rightSideColor = Colors.error;
            } else {
                rightSideLabel = "not details";
            }
        }

        return (
            <TouchableOpacity
                style={styles.expenseItem}
                onPress={() => navigation.navigate('ExpenseDetail', { expense: item })}
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
                    <Text style={[styles.expenseStatus, { color: Colors.textMuted }]}>{statusLabel}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10, color: rightSideColor, fontWeight: '600' }}>{rightSideLabel}</Text>
                    <Text style={[styles.expenseAmount, { color: rightSideColor }]}>{rightSideText}</Text>
                </View>
            </TouchableOpacity>
        );
    };


    return (
        <ScreenWrapper
            gradient={[Colors.primary, Colors.primaryDark]}
            style={styles.container}
            edges={['top']} // Updated to match GroupsScreen notch handling
            statusBarStyle="light-content"
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{groupName}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('GroupSettings', { groupId })} style={styles.headerBtn}>
                    <Ionicons name="settings-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.sheetContainer}>
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.id}
                    renderItem={renderExpenseItem}
                    renderSectionHeader={({ section: { title } }) => (
                        <Text style={styles.monthHeader}>{title}</Text>
                    )}
                    ListHeaderComponent={renderHeader}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    stickySectionHeadersEnabled={false}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    refreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    ListFooterComponent={() => (
                        <View style={{ padding: 20 }}>
                            {isFetching && page > 0 && <ActivityIndicator style={{ marginBottom: 20 }} />}
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No expenses yet.</Text>
                            <Text style={styles.emptySubText}>Tap + to add one.</Text>
                        </View>
                    }
                />

                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => navigation.navigate('GroupAddExpense', { groupId, groupName })}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                    <Text style={styles.fabText}>Add Expense</Text>
                </TouchableOpacity>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 }, // Removed bg white
    sheetContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 30, // Make it look like a sheet
        borderTopRightRadius: 30,
        overflow: 'hidden',
        marginTop: 10, // Give some space for gradient to show on top
    },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
    },
    headerBtn: {
        padding: 8,
    },
    headerContainer: { padding: 20 },
    balanceCard: { borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 24 },
    bgGreen: { backgroundColor: Colors.success + '20' },
    bgRed: { backgroundColor: Colors.error + '20' },
    balanceLabel: {
        ...Typography.label,
        color: '#555',
        marginBottom: 4
    },
    balanceAmount: {
        ...Typography.h1,
        color: '#333'
    },
    settleButton: { marginTop: 12, backgroundColor: Colors.success, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
    settleButtonText: { ...Typography.button, color: '#fff' },
    debtSection: { marginTop: 0, marginBottom: 10 },
    sectionTitle: { ...Typography.h3, color: '#333', marginBottom: 12 },
    debtRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatarCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    avatarText: { ...Typography.body2, fontWeight: 'bold', color: '#555' },
    debtText: { flex: 1, ...Typography.body1, color: '#333' },
    debtAmount: { ...Typography.body1, fontWeight: 'bold' },
    textGreen: { color: Colors.success },
    textRed: { color: Colors.error },
    monthHeader: { ...Typography.caption, color: '#888', backgroundColor: '#f9f9f9', paddingHorizontal: 20, paddingVertical: 8, letterSpacing: 1, textTransform: 'uppercase' },
    expenseItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    dateBox: { alignItems: 'center', marginRight: 14, width: 36 },
    dateMonth: { ...Typography.caption, color: '#888', textTransform: 'uppercase' },
    dateDay: { fontSize: 18, fontWeight: 'bold', color: '#444' }, // Keep custom as it's specific date UI
    expenseIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#f2f2f2', justifyContent: 'center', alignItems: 'center' },
    expenseTitle: { ...Typography.body1, fontWeight: '500', color: '#333', marginBottom: 2 },
    expenseStatus: { ...Typography.caption, fontSize: 12 },
    expenseAmount: { ...Typography.body1, fontWeight: 'bold' },
    emptyContainer: { padding: 40, alignItems: 'center' },
    emptyText: { ...Typography.h3, color: '#ccc' },
    emptySubText: { ...Typography.body1, color: '#ccc', marginTop: 8 },
    fab: { position: 'absolute', bottom: 30, right: 30, flexDirection: 'row', paddingHorizontal: 20, height: 50, borderRadius: 25, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4 },
    fabText: { ...Typography.button, color: '#fff', marginLeft: 8 },

    // Members Styles
    membersSection: { marginBottom: 20 },
    membersRow: { flexDirection: 'row', flexWrap: 'wrap' },
    memberChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10, marginRight: 8, marginBottom: 8 },
    addMemberChip: { backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.primary, borderStyle: 'dashed' },
    memberAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
    memberInitials: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
    memberName: { fontSize: 13, color: '#333', fontWeight: '500' },
    dangerButton: { backgroundColor: '#fee2e2', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    dangerButtonText: { color: Colors.error, fontWeight: 'bold', fontSize: 16 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'row', justifyContent: 'flex-end' },
    modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    sideDrawer: { width: '75%', backgroundColor: '#fff', height: '100%', paddingVertical: 20, shadowColor: "#000", shadowOffset: { width: -2, height: 0 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
    drawerHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    drawerTitle: { ...Typography.h3, marginLeft: 15, color: '#333' },
    drawerContent: { paddingTop: 10 },
    drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20 },
    drawerIcon: { marginRight: 15 },
    drawerText: { ...Typography.body1, color: '#333', fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
    dangerItem: { backgroundColor: '#fff', marginTop: 0 }, // Customized danger item
    drawerSectionTitle: { ...Typography.label, color: '#888', marginBottom: 5, marginTop: 15, paddingHorizontal: 20 },
    drawerMemberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20 }
});

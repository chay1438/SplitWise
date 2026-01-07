import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, SectionList, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Alert, Image } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { Profile, ExpenseWithDetails, GroupWithMembers } from '../../types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useGetExpensesQuery } from '../../store/api/expensesApi';
import { useGetGroupsQuery, useAddMemberMutation, useLeaveGroupMutation, useDeleteGroupMutation, useUpdateMemberRoleMutation, useRemoveMemberMutation } from '../../store/api/groupsApi';
// ... (imports remain same)

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
    const [isSettingsOpen, setIsSettingsOpen] = useState(false); // New State
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
    useEffect(() => {
        navigation.setOptions({
            title: groupName,
            headerRight: () => (
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => setIsSettingsOpen(true)} style={{ marginRight: 10 }}>
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
    const renderSettingsModal = () => (
        <Modal
            visible={isSettingsOpen}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setIsSettingsOpen(false)}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity
                    style={styles.modalBackdrop}
                    activeOpacity={1}
                    onPress={() => setIsSettingsOpen(false)}
                />
                <View style={styles.sideDrawer}>
                    <View style={styles.drawerHeader}>
                        <TouchableOpacity onPress={() => setIsSettingsOpen(false)}>
                            <Ionicons name="arrow-forward" size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.drawerTitle}>Group Settings</Text>
                    </View>

                    <View style={styles.drawerContent}>
                        {/* Actions Section */}
                        <Text style={styles.drawerSectionTitle}>Actions</Text>
                        <TouchableOpacity style={styles.drawerItem} onPress={() => { setIsSettingsOpen(false); navigation.navigate('AddGroupMember', { groupId }); }}>
                            <Ionicons name="person-add-outline" size={22} color="#444" style={styles.drawerIcon} />
                            <Text style={styles.drawerText}>Add People</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.drawerItem} onPress={() => { setIsSettingsOpen(false); navigation.navigate('EditGroup', { groupId }); }}>
                            <Ionicons name="create-outline" size={22} color="#444" style={styles.drawerIcon} />
                            <Text style={styles.drawerText}>Edit Group</Text>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        {/* Members Management Section */}
                        <Text style={styles.drawerSectionTitle}>Members ({members.length})</Text>
                        <FlatList
                            data={members}
                            keyExtractor={(item) => `drawer-member-${item.id}`}
                            style={{ maxHeight: 300 }}
                            renderItem={({ item: member }) => (
                                <TouchableOpacity
                                    style={styles.drawerMemberRow}
                                    activeOpacity={isAdmin && member.id !== currentUserId ? 0.6 : 1}
                                    onPress={() => isAdmin ? handleMemberPress(member) : null}
                                >
                                    <View style={[styles.memberAvatar, { width: 32, height: 32 }]}>
                                        <Text style={styles.memberInitials}>{member.full_name?.charAt(0)}</Text>
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={styles.drawerText}>{member.full_name}</Text>
                                        {(member as any).role === 'admin' && (
                                            <Text style={{ fontSize: 10, color: Colors.primary, fontWeight: 'bold' }}>Admin</Text>
                                        )}
                                    </View>
                                    {isAdmin && member.id !== currentUserId && (
                                        <Ionicons name="ellipsis-vertical" size={16} color="#999" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />

                        <View style={styles.divider} />

                        {/* Danger Zone */}
                        {group?.created_by === currentUserId && (
                            <TouchableOpacity style={[styles.drawerItem, styles.dangerItem]} onPress={() => { setIsSettingsOpen(false); handleLeaveOrDelete(); }}>
                                <Ionicons name="trash-outline" size={22} color={Colors.error} style={styles.drawerIcon} />
                                <Text style={[styles.drawerText, { color: Colors.error }]}>Delete Group</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity style={[styles.drawerItem, styles.dangerItem]} onPress={() => { setIsSettingsOpen(false); handleLeaveOrDelete(); }}>
                            <Ionicons name="log-out-outline" size={22} color={Colors.error} style={styles.drawerIcon} />
                            <Text style={[styles.drawerText, { color: Colors.error }]}>
                                {group?.created_by === currentUserId ? "Exit Group (Simulated)" : "Exit Group"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Members Section Removed - Moved to Settings Drawer */}


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
        let statusColor = Colors.textMuted;
        let amountDisplay = "";

        // Find payer name
        const payerName = members.find(m => m.id === item.payer_id)?.full_name || 'Someone';

        if (isPayer) {
            // YOU paid
            statusLabel = "You paid";
            statusColor = Colors.success;

            // Calculate how much you are owed (total - your share)
            // Or typically Splitwise shows the total amount you paid on the right
            // and below "you lent $X"
            amountDisplay = `₹${item.amount.toFixed(2)}`;

            // Refined subtext
            const lent = item.amount - (item.splits?.find((s: any) => s.user_id === currentUserId)?.amount || 0);
            statusLabel = `You paid ₹${item.amount.toFixed(2)}`;
            // statusLabel = `You lent ₹${lent.toFixed(2)}`; // Optional alternative
        } else {
            // SOMEONE ELSE paid
            const mySplit = item.splits?.find((s: any) => s.user_id === currentUserId);
            statusLabel = `${payerName} paid ₹${item.amount.toFixed(2)}`;
            statusColor = Colors.textMuted;

            if (mySplit) {
                amountDisplay = `₹${mySplit.amount.toFixed(2)}`;
                // statusLabel = `${payerName} paid`;
            }
        }

        // Display Logic for Right Side Text
        // If I paid: Show "You lent $X" in Green
        // If Someone paid: Show "You owe $Y" in Red (if I owe)

        let rightSideText = "";
        let rightSideColor = "#333";
        let rightSideLabel = "";

        if (isPayer) {
            const myShare = item.splits?.find((s: any) => s.user_id === currentUserId)?.amount || 0;
            const lent = item.amount - myShare;
            if (lent > 0.01) {
                rightSideLabel = "you lent";
                rightSideText = `₹${lent.toFixed(2)}`;
                rightSideColor = Colors.success;
            } else {
                rightSideLabel = "you paid"; // paid for yourself
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
                rightSideText = "";
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

    // --- MUTATIONS ---
    const [leaveGroup] = useLeaveGroupMutation();
    const [deleteGroup] = useDeleteGroupMutation();
    const [updateMemberRole] = useUpdateMemberRoleMutation();
    const [removeMember] = useRemoveMemberMutation();

    // Check if I am admin
    const myMemberInfo = members.find(m => m.id === currentUserId);
    const isAdmin = group?.created_by === currentUserId || (myMemberInfo as any)?.role === 'admin';

    const handleMemberPress = (member: Profile) => {
        if (!isAdmin) return;
        if (member.id === currentUserId) return;

        Alert.alert("Manage Member", `Options for ${member.full_name}`, [
            { text: "Cancel", style: "cancel" },
            {
                text: "Make Group Admin",
                onPress: () => {
                    Alert.alert("Confirm", `Make ${member.full_name} an Admin?`, [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Confirm", onPress: async () => {
                                try { await updateMemberRole({ groupId, userId: member.id, role: 'admin' }).unwrap(); }
                                catch (e: any) { Alert.alert("Error", e.message); }
                            }
                        }
                    ]);
                }
            },
            {
                text: "Remove",
                style: "destructive",
                onPress: () => {
                    Alert.alert("Remove", `Remove ${member.full_name}?`, [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Confirm", style: "destructive", onPress: async () => {
                                try { await removeMember({ groupId, userId: member.id }).unwrap(); }
                                catch (e: any) { Alert.alert("Error", e.message); }
                            }
                        }
                    ]);
                }
            }
        ]);
    };

    if (isLoadingExpenses && page === 0) {
        return <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /></View>;
    }

    const handleLeaveOrDelete = () => {
        const isAdmin = group?.created_by === currentUserId;
        const msg = isAdmin
            ? "Are you sure you want to DELETE this group? This action cannot be undone and will remove all members."
            : "Are you sure you want to leave this group?";

        Alert.alert(
            isAdmin ? "Delete Group" : "Leave Group",
            msg,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: isAdmin ? "Delete" : "Leave",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            if (isAdmin) {
                                await deleteGroup(groupId).unwrap();
                            } else {
                                // Optional: Check balance here before allowing leave
                                if (myTotalBalance !== 0) {
                                    Alert.alert("Cannot Leave", "You must settle your debts (owe or owed) before leaving the group.");
                                    return;
                                }
                                await leaveGroup({ groupId, userId: currentUserId! }).unwrap();
                            }
                            navigation.navigate('MainTabs');
                        } catch (err: any) {
                            Alert.alert("Error", err.message || "Failed to process request.");
                        }
                    }
                }
            ]
        );
    };

    return (
        <ScreenWrapper style={styles.container} edges={['bottom']}>
            {renderSettingsModal()}
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
                onPress={() => navigation.navigate('AddExpense', { groupId, groupName })}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>
        </ScreenWrapper>
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
    drawerTitle: { fontSize: 18, fontWeight: '600', marginLeft: 15, color: '#333' },
    drawerContent: { paddingTop: 10 },
    drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20 },
    drawerIcon: { marginRight: 15 },
    drawerText: { fontSize: 16, color: '#333', fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
    dangerItem: { backgroundColor: '#fff', marginTop: 0 }, // Customized danger item
    drawerSectionTitle: { fontSize: 13, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: 5, marginTop: 15, paddingHorizontal: 20 },
    drawerMemberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20 }
});

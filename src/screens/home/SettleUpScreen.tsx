import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { useGetGroupActionableBalancesQuery } from '../../store/api/balanceApi';
import { useGetSettlementsQuery, useCreateSettlementMutation } from '../../store/api/settlementsApi';
import { useGetGroupsQuery } from '../../store/api/groupsApi';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';

type Props = NativeStackScreenProps<AppStackParamList, 'SettleUp'>;

type PaymentMethod = 'Cash' | 'UPI' | 'PayPal' | 'Other';

export default function SettleUpScreen({ navigation, route }: Props) {
    const groupId = route.params?.groupId;
    const { user } = useAuth();
    const currentUserId = user?.id;

    if (!groupId || !currentUserId) {
        // Fallback or Error Case
        navigation.goBack();
        return null;
    }

    // --- 1. DATA FETCHING ---
    // A. Actionable Balances (Who owes whom in this group)
    const { data: groupBalances = [], isLoading: loadingBalances } = useGetGroupActionableBalancesQuery({
        groupId,
        currentUserId
    });

    // B. Settlements History
    const { data: history = [], isLoading: loadingHistory } = useGetSettlementsQuery({ groupId });

    // C. Group Info (for name fallback)
    const { data: groups = [] } = useGetGroupsQuery(currentUserId || '');
    const groupName = groups.find(g => g.id === groupId)?.name || "Group";

    // Mutation
    const [createSettlement, { isLoading: isSaving }] = useCreateSettlementMutation();

    // --- 2. STATE ---
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedPeer, setSelectedPeer] = useState<{ userId: string; name: string; amount: number; isOwe: boolean } | null>(null);

    // Form State
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [method, setMethod] = useState<PaymentMethod>('Cash');


    // --- 3. HANDLERS ---

    const handleSettlePress = (item: any) => {
        const isOwe = item.balance < 0; // I owe them
        setSelectedPeer({
            userId: item.userId,
            name: item.name,
            amount: Math.abs(item.balance),
            isOwe
        });
        setAmount(Math.abs(item.balance).toString());
        setModalVisible(true);
    };

    const handleConfirmSettle = async () => {
        if (!selectedPeer || !amount) return;
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) {
            Alert.alert("Error", "Please enter a valid amount");
            return;
        }

        try {
            const payerId = selectedPeer.isOwe ? currentUserId! : selectedPeer.userId;
            const payeeId = selectedPeer.isOwe ? selectedPeer.userId : currentUserId!;

            await createSettlement({
                payerId,
                payeeId,
                amount: val,
                groupId,
                date: new Date().toISOString()
            }).unwrap();

            setModalVisible(false);
            setAmount('');
            setNote('');
            Alert.alert("Success", "Settlement recorded!");
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to record.");
        }
    };


    // --- 4. RENDERERS ---

    const renderBalanceItem = ({ item }: { item: any }) => {
        const isOwe = item.balance < 0;
        const absAmount = Math.abs(item.balance);
        const color = isOwe ? Colors.error : Colors.success;
        const text = isOwe ? `You owe` : `Owes you`;

        return (
            <View style={styles.memberRow}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, paddingHorizontal: 12 }}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={[styles.balanceText, { color }]}>{text} ₹{absAmount.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.settleBtn, { borderColor: color }]}
                    onPress={() => handleSettlePress(item)}
                >
                    <Text style={[styles.settleBtnText, { color }]}>Settle Up</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderHistoryItem = ({ item }: { item: any }) => {
        const isPayer = item.payer_id === currentUserId;
        const isPayee = item.payee_id === currentUserId;

        // Date Formatting
        const dateObj = new Date(item.date || item.created_at);
        const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        return (
            <View style={styles.historyRow}>
                <Ionicons name="checkmark-circle-outline" size={24} color={Colors.success} />
                <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.historyText}>
                        {isPayer ? "You paid" : (isPayee ? "You received" : "Payment")} ₹{item.amount}
                    </Text>
                    <Text style={styles.historyDate}>{dateStr}, {timeStr}</Text>
                </View>
            </View>
        );
    };

    // My Group Summary
    const myTotal = groupBalances.reduce((acc, curr) => acc + curr.balance, 0);

    return (
        <ScreenWrapper style={styles.container} edges={['bottom']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settle Up: {groupName}</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Your Net Balance</Text>
                    <Text style={[styles.summaryAmount, { color: myTotal >= 0 ? Colors.success : Colors.error }]}>
                        {myTotal >= 0 ? "+" : "-"}₹{Math.abs(myTotal).toFixed(2)}
                    </Text>
                    <Text style={styles.summarySub}>
                        {myTotal >= 0 ? "You are owed in total" : "You owe in total"}
                    </Text>
                </View>

                {/* Balances List */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>Balances</Text>
                    {loadingBalances ? (
                        <ActivityIndicator />
                    ) : groupBalances.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Ionicons name="checkmark-done-circle" size={48} color="#ccc" />
                            <Text style={styles.emptyText}>All settled up!</Text>
                        </View>
                    ) : (
                        groupBalances.map(item => (
                            <View key={item.userId}>{renderBalanceItem({ item })}</View>
                        ))
                    )}
                </View>

                {/* History List */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>History</Text>
                    {loadingHistory ? (
                        <ActivityIndicator />
                    ) : history.length === 0 ? (
                        <Text style={styles.emptyText}>No recent payments.</Text>
                    ) : (
                        history.map((item, idx) => (
                            <View key={item.id || idx}>{renderHistoryItem({ item })}</View>
                        ))
                    )}
                </View>
            </ScrollView>

            {/* Settle Up Modal */}
            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Record Payment</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {selectedPeer && (
                            <View style={styles.modalBody}>
                                <Text style={styles.modalSubtitle}>
                                    {selectedPeer.isOwe ? "You are paying" : `${selectedPeer.name} is paying you`}
                                </Text>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.currency}>₹</Text>
                                    <TextInput
                                        style={styles.amountInput}
                                        value={amount}
                                        onChangeText={setAmount}
                                        keyboardType="numeric"
                                        placeholder="0.00"
                                    />
                                </View>

                                {/* Method Chips */}
                                <Text style={styles.label}>Payment Method</Text>
                                <View style={styles.chipRow}>
                                    {['Cash', 'UPI', 'PayPal'].map(m => (
                                        <TouchableOpacity
                                            key={m}
                                            style={[styles.chip, method === m && styles.chipActive]}
                                            onPress={() => setMethod(m as PaymentMethod)}
                                        >
                                            <Text style={[styles.chipText, method === m && styles.textWhite]}>{m}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Note */}
                                <Text style={styles.label}>Note (Optional)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={note}
                                    onChangeText={setNote}
                                    placeholder="Transaction ID, location, etc."
                                />

                                <TouchableOpacity
                                    style={styles.confirmBtn}
                                    onPress={handleConfirmSettle}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.confirmBtnText}>Confirm Payment</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, backgroundColor: '#fff', elevation: 2 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },

    summaryCard: { margin: 20, padding: 20, backgroundColor: '#fff', borderRadius: 12, alignItems: 'center', elevation: 2 },
    summaryLabel: { fontSize: 14, color: '#888', textTransform: 'uppercase', marginBottom: 5 },
    summaryAmount: { fontSize: 32, fontWeight: 'bold' },
    summarySub: { fontSize: 14, color: '#666', marginTop: 5 },

    section: { marginTop: 10, paddingHorizontal: 20 },
    sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },

    memberRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: '#555' },
    memberName: { fontSize: 16, fontWeight: '600', color: '#333' },
    balanceText: { fontSize: 14, fontWeight: '500' },
    settleBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
    settleBtnText: { fontSize: 12, fontWeight: 'bold' },

    historyRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 8 },
    historyText: { fontSize: 15, color: '#333', fontWeight: '500' },
    historyDate: { fontSize: 12, color: '#999' },

    emptyBox: { alignItems: 'center', padding: 20 },
    emptyText: { color: '#999', marginTop: 10 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: 'bold' },
    modalBody: {},
    modalSubtitle: { fontSize: 16, color: '#666', marginBottom: 20, textAlign: 'center' },

    inputContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
    currency: { fontSize: 24, fontWeight: 'bold', color: '#333', marginRight: 5 },
    amountInput: { fontSize: 32, fontWeight: 'bold', color: '#333', minWidth: 100, textAlign: 'center' },

    label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 10 },
    chipRow: { flexDirection: 'row', marginBottom: 20 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10 },
    chipActive: { backgroundColor: Colors.primary },
    chipText: { color: '#333', fontWeight: '500' },
    textWhite: { color: '#fff' },

    input: { backgroundColor: '#f9f9f9', padding: 15, borderRadius: 10, fontSize: 16, marginBottom: 20 },

    confirmBtn: { backgroundColor: Colors.success, padding: 16, borderRadius: 12, alignItems: 'center' },
    confirmBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

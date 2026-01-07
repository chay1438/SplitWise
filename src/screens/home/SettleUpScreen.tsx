import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator, Image, Modal, ScrollView } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { useGetBalancesQuery } from '../../store/api/balanceApi';
import { useCreateSettlementMutation } from '../../store/api/settlementsApi';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';

type OweItem = {
    userId: string;
    amount: number;
    profile?: Profile;
    groupId?: string;
};

type PaymentMethod = 'Cash' | 'UPI' | 'PayPal' | 'Other';

type Props = NativeStackScreenProps<AppStackParamList, 'SettleUp'>;

export default function SettleUpScreen({ navigation, route }: Props) {
    const { user } = useAuth();
    const currentUserId = user?.id;

    const { data: rawBalances, isLoading: isLoadingBalances } = useGetBalancesQuery(currentUserId || '', { skip: !currentUserId });
    const [createSettlement, { isLoading: isSaving }] = useCreateSettlementMutation();

    // Steps: 'select' (list debts) -> 'confirm' (amount/method) -> 'success'
    const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select');

    // State
    const [debts, setDebts] = useState<OweItem[]>([]);
    const [selectedUser, setSelectedUser] = useState<OweItem | null>(null);
    const [amount, setAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
    const [profileLoading, setProfileLoading] = useState(false);

    // Initial Load
    useEffect(() => {
        if (rawBalances) {
            processDebts(rawBalances);
        }
    }, [rawBalances]);

    // Params Handling (If coming from FriendDetail)
    /* 
       Note: If userId is passed in params, we might skip selection.
       However, we need 'groupId' to record debt accurately if it's group-based.
       For now, we'll stick to selection unless we implement direct-friend lookup logic.
    */

    const processDebts = async (balances: any[]) => {
        if (!currentUserId) return;
        setProfileLoading(true);
        try {
            const myDebts: OweItem[] = [];
            // Filter balances where net_balance < 0 (I owe)
            const oweBalances = balances.filter(b => parseFloat(b.net_balance) < 0);

            for (const b of oweBalances) {
                const oweAmount = Math.abs(parseFloat(b.net_balance));
                // Fetch potential payees in this group
                const { data: potentialPayees } = await supabase
                    .from('group_balances_view')
                    .select('*')
                    .eq('group_id', b.group_id)
                    .gt('net_balance', 0);

                if (potentialPayees && potentialPayees.length > 0) {
                    for (const payee of potentialPayees) {
                        // Simplify: Proportional suggestion or just list valid payees.
                        const { data: profile } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', payee.user_id)
                            .single();

                        if (profile) {
                            myDebts.push({
                                userId: payee.user_id,
                                amount: oweAmount, // Showing total debt context
                                groupId: b.group_id,
                                profile
                            });
                        }
                    }
                }
            }
            // Dedup by userId
            const uniqueDebts = Array.from(new Map(myDebts.map(item => [item.userId, item])).values());
            setDebts(uniqueDebts);

            // Auto-select if param passed
            if (route.params?.userId) {
                const target = uniqueDebts.find(d => d.userId === route.params?.userId);
                if (target) {
                    handleSelect(target);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setProfileLoading(false);
        }
    };

    const handleSelect = (item: OweItem) => {
        setSelectedUser(item);
        setAmount(item.amount.toString()); // Default to full amount
        setStep('confirm');
    };

    const handleConfirm = async () => {
        if (!selectedUser || !amount) return;
        const val = parseFloat(amount);
        if (isNaN(val) || val <= 0) {
            Alert.alert("Error", "Invalid amount");
            return;
        }

        try {
            await createSettlement({
                payerId: currentUserId!,
                payeeId: selectedUser.userId,
                amount: val,
                groupId: selectedUser.groupId,
                date: new Date().toISOString()
            }).unwrap();

            setStep('success');
        } catch (e: any) {
            Alert.alert("Error", e.data?.error || "Failed");
        }
    };

    // --- RENDERERS ---

    const renderSelectStep = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.header}>Who are you paying?</Text>
            {isLoadingBalances || profileLoading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={debts}
                    keyExtractor={item => item.userId}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => handleSelect(item)}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{item.profile?.full_name?.charAt(0)}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.userName}>{item.profile?.full_name}</Text>
                                <Text style={styles.subtext}>You owe ${item.amount.toFixed(2)}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#ccc" />
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="checkmark-circle-outline" size={60} color={Colors.success} />
                            <Text style={styles.emptyText}>You're all settled up!</Text>
                        </View>
                    }
                />
            )}
        </View>
    );

    const renderConfirmStep = () => (
        <View style={styles.stepContainer}>
            <View style={styles.confirmHeader}>
                <TouchableOpacity onPress={() => setStep('select')} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Confirm Payment</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
                <View style={styles.avatarLarge}>
                    <Text style={styles.avatarTextLarge}>{selectedUser?.profile?.full_name?.charAt(0)}</Text>
                </View>
                <Text style={styles.payingText}>Paying {selectedUser?.profile?.full_name}</Text>

                <View style={styles.inputWrapper}>
                    <Text style={styles.currency}>$</Text>
                    <TextInput
                        style={styles.amountInput}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        autoFocus
                    />
                </View>

                <Text style={styles.sectionLabel}>Date: Today</Text>

                <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Payment Method</Text>
                <View style={styles.methodRow}>
                    {['Cash', 'UPI', 'PayPal'].map((m) => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.methodChip, paymentMethod === m && styles.activeMethod]}
                            onPress={() => setPaymentMethod(m as PaymentMethod)}
                        >
                            <Text style={[styles.methodText, paymentMethod === m && styles.activeMethodText]}>{m}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm} disabled={isSaving}>
                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Confirm Payment</Text>}
                </TouchableOpacity>

            </ScrollView>
        </View>
    );

    const renderSuccessStep = () => (
        <View style={[styles.stepContainer, { justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
            <Text style={styles.successTitle}>Payment Recorded!</Text>
            <Text style={styles.successSub}>
                You paid {selectedUser?.profile?.full_name} ${parseFloat(amount).toFixed(2)}
            </Text>
            <TouchableOpacity style={styles.doneButton} onPress={() => navigation.goBack()}>
                <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <ScreenWrapper style={styles.container} edges={['top']}>
            {step === 'select' && renderSelectStep()}
            {step === 'confirm' && renderConfirmStep()}
            {step === 'success' && renderSuccessStep()}
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    stepContainer: { flex: 1 },
    header: { fontSize: 24, fontWeight: 'bold', margin: 20, color: '#333' },
    confirmHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingBottom: 10,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    backBtn: {},

    // Select List
    card: {
        flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
    },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    avatarText: { fontSize: 20, fontWeight: 'bold', color: '#555' },
    userName: { fontSize: 16, fontWeight: '600', color: '#333' },
    subtext: { color: Colors.error },
    emptyContainer: { alignItems: 'center', marginTop: 80 },
    emptyText: { marginTop: 16, fontSize: 18, color: '#666', fontWeight: '500' },

    // Confirm UI
    avatarLarge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    avatarTextLarge: { fontSize: 32, fontWeight: 'bold', color: '#555' },
    payingText: { fontSize: 18, color: '#666', marginBottom: 20 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: Colors.primary, marginBottom: 30 },
    currency: { fontSize: 32, fontWeight: 'bold', color: '#333' },
    amountInput: { fontSize: 40, fontWeight: 'bold', color: '#333', minWidth: 100, textAlign: 'center' },

    sectionLabel: { fontSize: 14, color: '#999', fontWeight: '600', alignSelf: 'flex-start', marginLeft: 20 },
    methodRow: { flexDirection: 'row', marginBottom: 40, marginTop: 10 },
    methodChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10 },
    activeMethod: { backgroundColor: Colors.primary },
    methodText: { color: '#666', fontWeight: '600' },
    activeMethodText: { color: '#fff' },

    confirmButton: { backgroundColor: Colors.success, paddingVertical: 16, width: '100%', borderRadius: 30, alignItems: 'center' },
    confirmButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    // Success
    successTitle: { fontSize: 24, fontWeight: 'bold', marginTop: 20, color: '#333' },
    successSub: { fontSize: 16, color: '#666', marginTop: 10, marginBottom: 40 },
    doneButton: { paddingVertical: 12, paddingHorizontal: 40, backgroundColor: '#f0f0f0', borderRadius: 24 },
    doneButtonText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
});

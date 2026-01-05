import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { Profile, SplitType, ExpenseWithDetails } from '../../types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/slices/authSlice';
import { useUpdateExpenseMutation, useDeleteExpenseMutation, useGetExpensesQuery } from '../../store/api/expensesApi';
import { useGetGroupsQuery } from '../../store/api/groupsApi';
import { Colors } from '../../constants';
// Reusing PayerModal/SplitModal logic would be ideal if they were components, but they are inline in AddExpense.
// For now, I will simplify and focus on Amount/Description edit, and basic split reset.
// Implementing full split editor again here is duplicative. 
// I will implement "Equal Split" default or "Keep existing" logic.

type Props = NativeStackScreenProps<AppStackParamList, 'EditExpense'>;

export default function EditExpenseScreen({ route, navigation }: Props) {
    const { expenseId, groupId } = route.params;
    const user = useAppSelector(selectUser);
    const userId = user?.id;

    // API Hooks
    const { data: groups } = useGetGroupsQuery(user?.id || '', { skip: !user?.id });
    const { data: expenses } = useGetExpensesQuery({ groupId }, { skip: !groupId });

    // Derived Data
    const expense = expenses?.find(e => e.id === expenseId);
    const selectedGroup = groups?.find(g => g.id === groupId);
    const members = selectedGroup?.members || [];

    const [updateExpense, { isLoading: isUpdating }] = useUpdateExpenseMutation();
    const [deleteExpense] = useDeleteExpenseMutation();

    // Form State
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [payerId, setPayerId] = useState('');
    const [category, setCategory] = useState('General');

    // Load Data
    useEffect(() => {
        if (expense) {
            setDescription(expense.description);
            setAmount(expense.amount.toString());
            setPayerId(expense.payer_id);
            setCategory(expense.category || 'General');
            // Advanced split loading skipped for MVP - keeping existing splits if not modified?
            // Actually API requires sending splits if updating? 
            // My service implementation: `const { splits, ...expenseUpdates } = updates;`
            // If splits IS PROVIDED, it replaces. If NOT provided, it keeps existing?
            // The logic: `if (splits) { delete... insert... }`
            // So if I don't send `splits` in the update payload, it preserves them!
            // This simplifies the form immensely: User can edit Amount/Desc without touching splits.
            // BUT if amount changes, splits MUST change.
        }
    }, [expense]);

    const handleUpdate = async () => {
        if (!expense) return;
        if (!description.trim() || !amount.trim()) {
            Alert.alert('Error', 'Please enter description and amount');
            return;
        }

        const newAmount = parseFloat(amount);
        if (isNaN(newAmount) || newAmount <= 0) return;

        // If amount changed, we force Equal Split re-calculation for simplicity in this Edit MVP.
        // Or we warn user "Splits will be reset to Equal".
        let updates: any = {
            description,
            amount: newAmount,
            category,
            payer_id: payerId
        };

        // Check if amount changed significantly
        if (Math.abs(newAmount - expense.amount) > 0.01) {
            Alert.alert(
                "Amount Changed",
                "Changing the amount will reset splits to equal among all group members. Continue?",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Confirm", onPress: () => performUpdate(updates, true) }
                ]
            );
        } else {
            performUpdate(updates, false);
        }
    };

    const performUpdate = async (updates: any, resetSplits: boolean) => {
        if (resetSplits && members.length > 0) {
            const share = updates.amount / members.length;
            updates.splits = members.map(m => ({
                userId: m.id,
                amount: parseFloat(share.toFixed(2))
            }));
        }

        try {
            await updateExpense({ id: expenseId, updates }).unwrap();
            Alert.alert("Success", "Expense updated");
            navigation.goBack();
        } catch (e: any) {
            Alert.alert("Error", e.data?.error || "Failed to update");
        }
    };

    const handleDelete = () => {
        Alert.alert("Delete", "Are you sure?", [
            { text: "Cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    await deleteExpense(expenseId).unwrap();
                    navigation.goBack();
                }
            }
        ]);
    };

    if (!expense) return <View style={styles.center}><ActivityIndicator /></View>;

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.cancelBtn}>Cancel</Text></TouchableOpacity>
                <Text style={styles.title}>Edit Expense</Text>
                <TouchableOpacity onPress={handleUpdate} disabled={isUpdating}>
                    <Text style={styles.saveBtn}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.inputRow}>
                    <Ionicons name="receipt-outline" size={24} color="#666" style={{ marginRight: 12 }} />
                    <TextInput
                        style={styles.inputLarge}
                        placeholder="Description"
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <View style={styles.inputRow}>
                    <Ionicons name="cash-outline" size={24} color="#666" style={{ marginRight: 12 }} />
                    <TextInput
                        style={styles.inputLarge}
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />
                </View>

                <TouchableOpacity style={styles.rowItem} onPress={() => navigation.navigate('CategorySelector', { onSelect: setCategory })}>
                    <View style={styles.labelRow}>
                        <View style={styles.iconBox}><Ionicons name="pricetag" size={20} color={Colors.primary} /></View>
                        <Text style={styles.labelText}>{category}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <View style={{ marginTop: 40 }}>
                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                        <Text style={styles.deleteText}>Delete Expense</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.note}>
                    Note: Changing the amount will currently reset splits to "Equal" for all group members.
                </Text>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginTop: 40
    },
    title: { fontSize: 18, fontWeight: 'bold' },
    cancelBtn: { fontSize: 16, color: '#666' },
    saveBtn: { fontSize: 16, color: Colors.primary, fontWeight: 'bold' },
    content: { padding: 20 },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
    inputLarge: { flex: 1, fontSize: 20, color: '#333' },
    rowItem: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
    },
    labelRow: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    labelText: { fontSize: 16, color: '#333' },
    deleteBtn: {
        backgroundColor: '#FFEBEE', padding: 16, borderRadius: 12, alignItems: 'center'
    },
    deleteText: { color: Colors.error, fontWeight: 'bold' },
    note: { marginTop: 20, color: '#999', fontSize: 12, textAlign: 'center' }
});

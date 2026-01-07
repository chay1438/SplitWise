import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList, Image } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { SplitType } from '../../types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useCreateExpenseMutation, useUpdateExpenseMutation, useDeleteExpenseMutation, useGetExpensesQuery } from '../../store/api/expensesApi';
import { useGetGroupsQuery } from '../../store/api/groupsApi';
import { Colors } from '../../constants';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToSupabase, deleteImageFromSupabase } from '../../services/imageUploadService';
import { handleError } from '../../lib/errorHandler';

type Props = NativeStackScreenProps<AppStackParamList, 'AddExpense' | 'EditExpense'>;

export default function AddExpenseScreen({ route, navigation }: Props) {
    const params = (route.params || {}) as any;
    const { groupId: initialGroupId, expenseId } = params;

    // Determine Mode
    const isEditing = !!expenseId;

    const currentUser = useCurrentUser();
    const userId = currentUser.id;

    // API Hooks
    const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();
    const [updateExpense, { isLoading: isUpdating }] = useUpdateExpenseMutation();
    const [deleteExpense] = useDeleteExpenseMutation();

    // Fetches for data
    const { data: groups } = useGetGroupsQuery(currentUser.id || '', { skip: !currentUser.id });

    // State for Selected Group (default to params or null)
    const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(initialGroupId);
    const [showGroupModal, setShowGroupModal] = useState(false);

    // Derived Group Data
    const selectedGroup = groups?.find(g => g.id === selectedGroupId);

    // MEMOIZED MEMBERS to prevent infinite loops
    const members = useMemo(() => selectedGroup?.members || [], [selectedGroup]);
    const memberIdsString = useMemo(() => members.map(m => m.id).sort().join(','), [members]);

    // Existing Expense (if editing)
    const { data: expenses } = useGetExpensesQuery(
        { groupId: selectedGroupId },
        { skip: !selectedGroupId || !isEditing }
    );

    const existingExpense = useMemo(() => {
        if (!isEditing || !expenses) return null;
        return expenses.find(e => e.id === expenseId);
    }, [expenses, expenseId, isEditing]);

    // Form State
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date());
    const [payerId, setPayerId] = useState(userId);
    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Edit Mode Specific State
    const [imageDeleted, setImageDeleted] = useState(false);

    // Split State
    const [splitType, setSplitType] = useState<SplitType>('EQUAL');
    const [involvedUserIds, setInvolvedUserIds] = useState<string[]>([]);
    // Exact Amounts
    const [splitValues, setSplitValues] = useState<Record<string, string>>({});
    // Percentage Values (0-100)
    const [splitPercentages, setSplitPercentages] = useState<Record<string, string>>({});

    // Modals
    const [showPayerModal, setShowPayerModal] = useState(false);
    const [showSplitModal, setShowSplitModal] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
        // Init Defaults when group members load and NOT editing
        if (!isEditing && members.length > 0) {
            const memberIds = members.map(m => m.id);
            const currentSet = new Set(memberIds);

            // Check if involvedUserIds match EXACTLY the current members
            const isExactMatch = involvedUserIds.length === memberIds.length && involvedUserIds.every(id => currentSet.has(id));

            if (!isExactMatch) {
                setInvolvedUserIds(memberIds);
                // Reset payer if invalid
                if (!payerId || !currentSet.has(payerId)) {
                    setPayerId(userId && currentSet.has(userId) ? userId : memberIds[0]);
                }
            }
        }
    }, [memberIdsString, userId, isEditing]);


    // Init from Existing Expense (EDIT MODE)
    useEffect(() => {
        if (isEditing && existingExpense && members.length > 0) {
            setDescription(existingExpense.description);
            setAmount(existingExpense.amount.toString());
            setPayerId(existingExpense.payer_id);
            setDate(new Date(existingExpense.date));
            setReceiptImage(existingExpense.receipt_url || null);
            setImageDeleted(false);

            // Split Initialization Logic
            const splits = existingExpense.splits || [];
            const hasSplitData = splits.length > 0;

            let detectedType: SplitType = 'EQUAL';
            const involved: string[] = splits.map(s => s.user_id);
            const values: Record<string, string> = {};

            if (hasSplitData) {
                const firstAmount = splits[0].amount;
                const isUnequal = splits.some(s => Math.abs(s.amount - firstAmount) > 0.02);
                if (isUnequal) {
                    detectedType = 'INDIVIDUAL';
                    splits.forEach(s => values[s.user_id] = s.amount.toString());
                } else {
                    detectedType = 'EQUAL';
                }
            }

            setSplitType(detectedType);
            setInvolvedUserIds(involved.length > 0 ? involved : members.map(m => m.id));
            setSplitValues(values);
            // We don't restore Percentages from DB as DB only has amounts. defaulting to Individual is safer.
        }
    }, [existingExpense, members, isEditing]);


    // --- HELPERS ---
    const payerName = useMemo(() => {
        if (payerId === userId) return 'you';
        return members.find(m => m.id === payerId)?.full_name || 'Unknown';
    }, [payerId, userId, members]);

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "Permission to access camera roll is required!");
            return;
        }
        const pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.8,
        });
        if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
            setReceiptImage(pickerResult.assets[0].uri);
            setImageDeleted(false);
        }
    };

    const handleRemoveImage = () => {
        if (receiptImage && receiptImage.startsWith('http')) {
            setImageDeleted(true);
        }
        setReceiptImage(null);
    };

    const handleDelete = () => {
        Alert.alert("Delete Expense", "Are you sure you want to delete this expense permanently?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    if (expenseId) {
                        try {
                            if (existingExpense?.receipt_url) {
                                await deleteImageFromSupabase(existingExpense.receipt_url, 'receipts');
                            }
                            await deleteExpense(expenseId).unwrap();
                            navigation.goBack();
                        } catch (e: any) {
                            handleError(e, "Failed to delete");
                        }
                    }
                }
            }
        ]);
    };

    const handleSave = async () => {
        if (!selectedGroupId) {
            Alert.alert('Error', 'Please select a group first');
            return;
        }
        if (!description.trim() || !amount.trim()) {
            Alert.alert('Error', 'Please enter description and amount');
            return;
        }

        const totalAmount = parseFloat(amount);
        if (isNaN(totalAmount) || totalAmount <= 0) {
            Alert.alert('Error', 'Invalid amount');
            return;
        }

        // --- Calculate Splits ---
        let finalSplits: { userId: string; amount: number }[] = [];

        if (splitType === 'EQUAL') {
            const count = involvedUserIds.length;
            if (count === 0) { Alert.alert("Error", "Select at least one person to split with"); return; }
            const share = totalAmount / count;
            finalSplits = involvedUserIds.map(uid => ({
                userId: uid,
                amount: parseFloat(share.toFixed(2))
            }));
        } else if (splitType === 'INDIVIDUAL') {
            let sum = 0;
            const splits = members.map(m => {
                const val = parseFloat(splitValues[m.id] || '0');
                sum += val;
                return { userId: m.id, amount: val };
            }).filter(s => s.amount > 0);

            if (Math.abs(sum - totalAmount) > 0.05) {
                Alert.alert("Error", `Detail amounts ($${sum.toFixed(2)}) do not match total ($${totalAmount.toFixed(2)})`);
                return;
            }
            finalSplits = splits;
        } else if (splitType === 'PERCENTAGE') {
            let totalPercent = 0;
            const splits = members.map(m => {
                const pct = parseFloat(splitPercentages[m.id] || '0');
                totalPercent += pct;
                const val = (totalAmount * pct) / 100;
                return { userId: m.id, amount: parseFloat(val.toFixed(2)) };
            }).filter(s => s.amount > 0);

            if (Math.abs(totalPercent - 100) > 0.1) {
                Alert.alert("Error", `Percentages (${totalPercent}%) must add up to 100%`);
                return;
            }

            // Re-verify sum of amounts due to rounding
            const sumAmounts = splits.reduce((acc, curr) => acc + curr.amount, 0);
            if (Math.abs(sumAmounts - totalAmount) > 0.05) {
                // Adjust last remaining cent to match perfectly
                if (splits.length > 0) {
                    const diff = totalAmount - sumAmounts;
                    splits[0].amount += diff;
                    splits[0].amount = parseFloat(splits[0].amount.toFixed(2));
                }
            }
            finalSplits = splits;
        }

        setUploadingImage(true);
        try {
            // --- Image Upload Logic ---
            let finalReceiptUrl: string | undefined | null = undefined;

            if (isEditing) {
                // EDIT LOGIC
                if (imageDeleted) {
                    finalReceiptUrl = null;
                    if (existingExpense?.receipt_url) {
                        deleteImageFromSupabase(existingExpense.receipt_url, 'receipts');
                    }
                } else if (receiptImage && !receiptImage.startsWith('http')) {
                    finalReceiptUrl = await uploadImageToSupabase(receiptImage, 'receipts');
                    if (existingExpense?.receipt_url) {
                        deleteImageFromSupabase(existingExpense.receipt_url, 'receipts');
                    }
                }
            } else {
                // CREATE LOGIC
                if (receiptImage) {
                    finalReceiptUrl = await uploadImageToSupabase(receiptImage, 'receipts');
                }
            }

            if (isEditing) {
                const updates: any = {
                    description,
                    amount: totalAmount,
                    payer_id: payerId,
                    date: date.toISOString(),
                    splits: finalSplits
                };

                if (imageDeleted) updates.receipt_url = null;
                else if (typeof finalReceiptUrl === 'string') updates.receipt_url = finalReceiptUrl;

                await updateExpense({ id: expenseId!, updates }).unwrap();
                Alert.alert('Success', 'Expense updated!');
            } else {
                await createExpense({
                    groupId: selectedGroupId,
                    description,
                    amount: totalAmount,
                    date: date.toISOString(),
                    paidBy: payerId!,
                    userId: userId!,
                    splits: finalSplits,
                    receiptUrl: typeof finalReceiptUrl === 'string' ? finalReceiptUrl : undefined
                }).unwrap();
                Alert.alert('Success', 'Expense added!');
            }

            setUploadingImage(false);
            navigation.goBack();
        } catch (error: any) {
            setUploadingImage(false);
            handleError(error, isEditing ? "Failed to update" : "Failed to save");
        }
    };


    // --- UNIFIED RENDER ---
    const renderGroupModal = () => (
        <Modal visible={showGroupModal} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Select Group</Text>
                    <TouchableOpacity onPress={() => setShowGroupModal(false)}><Text style={styles.closeText}>Close</Text></TouchableOpacity>
                </View>
                <FlatList
                    data={groups}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.memberRow, selectedGroupId === item.id && styles.selectedRow]}
                            onPress={() => { setSelectedGroupId(item.id); setShowGroupModal(false); }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {item.avatar_url ? (
                                    <Image source={{ uri: item.avatar_url }} style={styles.avatarSmall} />
                                ) : (
                                    <View style={styles.avatarSmall}><Text>{item.name.charAt(0)}</Text></View>
                                )}
                                <Text style={styles.memberName}>{item.name}</Text>
                            </View>
                            {selectedGroupId === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                        </TouchableOpacity>
                    )}
                />
            </View>
        </Modal>
    );

    const renderPayerModal = () => (
        <Modal visible={showPayerModal} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Who paid?</Text>
                    <TouchableOpacity onPress={() => setShowPayerModal(false)}><Text style={styles.closeText}>Done</Text></TouchableOpacity>
                </View>
                <FlatList
                    data={members}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[styles.memberRow, payerId === item.id && styles.selectedRow]}
                            onPress={() => { setPayerId(item.id); setShowPayerModal(false); }}
                        >
                            <Text style={styles.memberName}>{item.id === userId ? 'You' : item.full_name}</Text>
                            {payerId === item.id && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
                        </TouchableOpacity>
                    )}
                />
            </View>
        </Modal>
    );

    const renderSplitModal = () => (
        <Modal visible={showSplitModal} animationType="slide" presentationStyle="pageSheet">
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Split Options</Text>
                    <TouchableOpacity onPress={() => setShowSplitModal(false)}><Text style={styles.closeText}>Done</Text></TouchableOpacity>
                </View>

                {/* New Feature: Add Friend to Group Link */}
                <TouchableOpacity
                    style={styles.addMemberLink}
                    onPress={() => {
                        setShowSplitModal(false);
                        if (selectedGroupId) navigation.navigate('AddGroupMember', { groupId: selectedGroupId });
                    }}
                >
                    <Ionicons name="person-add-outline" size={20} color={Colors.primary} />
                    <Text style={styles.addMemberText}>Add person to group</Text>
                </TouchableOpacity>

                <View style={styles.tabContainer}>
                    <TouchableOpacity onPress={() => setSplitType('EQUAL')} style={[styles.tab, splitType === 'EQUAL' && styles.activeTab]}>
                        <Text style={[styles.tabText, splitType === 'EQUAL' && styles.activeTabText]}>Equal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSplitType('INDIVIDUAL')} style={[styles.tab, splitType === 'INDIVIDUAL' && styles.activeTab]}>
                        <Text style={[styles.tabText, splitType === 'INDIVIDUAL' && styles.activeTabText]}>Exact</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSplitType('PERCENTAGE')} style={[styles.tab, splitType === 'PERCENTAGE' && styles.activeTab]}>
                        <Text style={[styles.tabText, splitType === 'PERCENTAGE' && styles.activeTabText]}>%</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={{ marginTop: 10 }}>
                    {members.map(member => (
                        <View key={member.id} style={styles.splitMemberRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={styles.avatarSmall}>
                                    <Text>{member.full_name?.charAt(0)}</Text>
                                </View>
                                <Text style={styles.memberName}>{member.id === userId ? 'You' : member.full_name}</Text>
                            </View>

                            {splitType === 'EQUAL' && (
                                <TouchableOpacity onPress={() => {
                                    if (involvedUserIds.includes(member.id)) {
                                        setInvolvedUserIds(involvedUserIds.filter(id => id !== member.id));
                                    } else {
                                        setInvolvedUserIds([...involvedUserIds, member.id]);
                                    }
                                }}>
                                    <Ionicons name={involvedUserIds.includes(member.id) ? "checkbox" : "square-outline"} size={24} color={Colors.primary} />
                                </TouchableOpacity>
                            )}

                            {splitType === 'INDIVIDUAL' && (
                                <View style={styles.amountInputWrapper}>
                                    <Text style={styles.currencySymbol}>₹</Text>
                                    <TextInput
                                        style={styles.exactInput}
                                        placeholder="0.00"
                                        keyboardType="numeric"
                                        value={splitValues[member.id] || ''}
                                        onChangeText={text => setSplitValues({ ...splitValues, [member.id]: text })}
                                    />
                                </View>
                            )}

                            {splitType === 'PERCENTAGE' && (
                                <View style={styles.amountInputWrapper}>
                                    <TextInput
                                        style={styles.exactInput}
                                        placeholder="0"
                                        keyboardType="numeric"
                                        value={splitPercentages[member.id] || ''}
                                        onChangeText={text => setSplitPercentages({ ...splitPercentages, [member.id]: text })}
                                    />
                                    <Text style={styles.currencySymbol}>%</Text>
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>

                {/* Live Split Summary */}
                <View style={[styles.splitFooter,
                (splitType === 'INDIVIDUAL' || splitType === 'PERCENTAGE') &&
                    ((splitType === 'INDIVIDUAL' && Math.abs((Object.values(splitValues).reduce((s, v) => s + (parseFloat(v) || 0), 0)) - (parseFloat(amount) || 0)) > 0.05) ||
                        (splitType === 'PERCENTAGE' && Math.abs((Object.values(splitPercentages).reduce((s, v) => s + (parseFloat(v) || 0), 0)) - 100) > 0.1))
                    ? styles.splitFooterError : styles.splitFooterSuccess
                ]}>
                    <Text style={styles.splitFooterText}>
                        {(() => {
                            const totalAmt = parseFloat(amount) || 0;
                            if (splitType === 'EQUAL') {
                                const count = involvedUserIds.length;
                                return count > 0 ? `₹${(totalAmt / count).toFixed(2)} / person` : 'Select people';
                            }
                            if (splitType === 'INDIVIDUAL') {
                                const currentSum = Object.values(splitValues).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                                const left = totalAmt - currentSum;
                                return `Entered: ₹${currentSum.toFixed(2)} of ₹${totalAmt.toFixed(2)}\nRemaining: ₹${left.toFixed(2)}`;
                            }
                            if (splitType === 'PERCENTAGE') {
                                const currentPct = Object.values(splitPercentages).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                                const left = 100 - currentPct;
                                return `Total: ${currentPct.toFixed(1)}% / 100%\nRemaining: ${left.toFixed(1)}%`;
                            }
                        })()}
                    </Text>
                </View>
            </View>
        </Modal>
    );

    const isWorking = isCreating || isUpdating || uploadingImage;

    return (
        <ScreenWrapper style={{ flex: 1 }} edges={['top']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.cancelButton}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{isEditing ? 'Edit Expense' : 'Add Expense'}</Text>
                    <TouchableOpacity onPress={handleSave} disabled={isWorking}>
                        {isWorking ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.saveButton}>Save</Text>}
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.content}>

                    {/* Group Selector */}
                    <TouchableOpacity
                        style={styles.groupSelector}
                        onPress={() => !isEditing && setShowGroupModal(true)}
                        disabled={isEditing}
                    >
                        {selectedGroup?.avatar_url ? (
                            <Image source={{ uri: selectedGroup.avatar_url }} style={styles.groupSelectorImage} />
                        ) : (
                            <View style={styles.iconBox}>
                                <Ionicons name="people-outline" size={24} color={Colors.primary} />
                            </View>
                        )}

                        <Text style={styles.groupSelectorText}>
                            {selectedGroup ? selectedGroup.name : "Select a Group"}
                        </Text>
                        {!isEditing && <Ionicons name="chevron-forward" size={20} color="#ccc" />}
                    </TouchableOpacity>

                    {/* Inputs */}
                    <View style={styles.inputRow}>
                        <View style={styles.iconBox}><Ionicons name="reader-outline" size={24} color="#666" /></View>
                        <TextInput
                            style={styles.descInput}
                            placeholder="Enter description"
                            value={description}
                            onChangeText={setDescription}
                            autoFocus={!isEditing}
                        />
                    </View>

                    <View style={styles.inputRow}>
                        <View style={styles.iconBox}><Ionicons name="logo-usd" size={24} color="#666" /></View>
                        <TextInput
                            style={styles.amountInput}
                            placeholder="0.00"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                        />
                    </View>

                    <View style={styles.divider} />

                    {/* Paid By & Split Logic */}
                    {selectedGroupId ? (
                        <View style={styles.splitSummary}>
                            <Text style={styles.summaryText}>Paid by</Text>
                            <TouchableOpacity onPress={() => setShowPayerModal(true)} style={styles.pill}>
                                <Text style={styles.pillText}>{payerName}</Text>
                            </TouchableOpacity>
                            <Text style={styles.summaryText}>and split</Text>
                            <TouchableOpacity onPress={() => setShowSplitModal(true)} style={styles.pill}>
                                <Text style={styles.pillText}>
                                    {splitType === 'EQUAL' ? 'equally' : splitType === 'PERCENTAGE' ? 'by %' : 'unequally'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => Alert.alert('Attention', 'Please select a group first')} style={{ padding: 10 }}>
                            <Text style={{ textAlign: 'center', color: Colors.primary, fontStyle: 'italic', textDecorationLine: 'underline' }}>
                                Select a group to split expenses
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Date Display (Read only for now) */}
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={20} color="#888" />
                        <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                    </View>

                    {/* Receipt Image Handler */}
                    <View style={{ marginTop: 20 }}>
                        <TouchableOpacity style={styles.actionButton} onPress={handlePickImage}>
                            <Ionicons name={receiptImage ? "sync" : "camera-outline"} size={20} color={receiptImage ? Colors.primary : "#888"} />
                            <Text style={[styles.actionText, receiptImage && { color: Colors.primary, fontWeight: 'bold' }]}>
                                {receiptImage ? "Change Receipt" : "Add receipt"}
                            </Text>
                        </TouchableOpacity>

                        {receiptImage && (
                            <View style={styles.previewContainer}>
                                <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />
                                <TouchableOpacity onPress={handleRemoveImage} style={styles.removeReceiptBtn}>
                                    <Ionicons name="close-circle" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Delete Button (Only in Edit Mode) */}
                    {isEditing && (
                        <View style={{ marginTop: 40, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 20 }}>
                            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                                <Text style={styles.deleteText}>Delete Expense</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>

                {renderPayerModal()}
                {renderSplitModal()}
                {renderGroupModal()}
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff' },
    headerTitle: { fontSize: 17, fontWeight: '600' },
    cancelButton: { fontSize: 17, color: '#666' },
    saveButton: { fontSize: 17, fontWeight: 'bold', color: Colors.primary },
    content: { padding: 20 },
    groupSelector: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, padding: 12, backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
    groupSelectorText: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1, marginLeft: 12 },
    groupSelectorImage: { width: 40, height: 40, borderRadius: 8, marginRight: 12 },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconBox: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8, marginRight: 12 },
    descInput: { fontSize: 18, flex: 1, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 8 },
    amountInput: { fontSize: 32, fontWeight: 'bold', flex: 1, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 8 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
    splitSummary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
    summaryText: { fontSize: 16, color: '#333', marginHorizontal: 4 },
    pill: { backgroundColor: '#e6f7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginHorizontal: 14, borderWidth: 1, borderColor: '#1890ff' },
    pillText: { color: '#1890ff', fontWeight: '600' },
    dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8 },
    dateText: { marginLeft: 8, color: '#333' },
    actionButton: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    actionText: { marginLeft: 8, color: '#888' },
    previewContainer: { marginTop: 16, marginHorizontal: 12, height: 200, borderRadius: 12, overflow: 'hidden', position: 'relative' },
    receiptPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    removeReceiptBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
    modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    closeText: { fontSize: 16, color: Colors.primary },
    memberRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
    selectedRow: { backgroundColor: '#f0f9ff' },
    memberName: { fontSize: 16, marginLeft: 10 },
    tabContainer: { flexDirection: 'row', justifyContent: 'center', padding: 10, backgroundColor: '#f5f5f5' },
    tab: { paddingVertical: 8, paddingHorizontal: 24, borderRadius: 20 },
    activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
    tabText: { color: '#666', fontWeight: '600' },
    activeTabText: { color: Colors.primary },
    splitMemberRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    avatarSmall: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    amountInputWrapper: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.primary, width: 80 },
    currencySymbol: { fontSize: 16, marginRight: 4 },
    exactInput: { fontSize: 16, flex: 1, textAlign: 'right' },
    deleteBtn: { backgroundColor: '#FFEBEE', padding: 16, borderRadius: 12, alignItems: 'center' },
    deleteText: { color: Colors.error, fontWeight: 'bold' },
    addMemberLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: '#f9f9f9', marginBottom: 10 },
    addMemberText: { color: Colors.primary, marginLeft: 8, fontWeight: '600' },
    splitFooter: { padding: 16, backgroundColor: '#f0f9ff', borderTopWidth: 1, borderTopColor: '#e0e0e0', alignItems: 'center' },
    splitFooterError: { backgroundColor: '#fff0f0' },
    splitFooterSuccess: { backgroundColor: '#f0f9ff' },
    splitFooterText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', color: '#333' },
});

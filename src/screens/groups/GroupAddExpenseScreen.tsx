import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList, Image } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { SplitType } from '../../types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useCreateExpenseMutation } from '../../store/api/expensesApi';
import { useGetGroupsQuery, useGetGroupMembersQuery } from '../../store/api/groupsApi';

import { Colors, Typography } from '../../constants';
import { formatCurrency } from '../../utils';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToSupabase } from '../../services/imageUploadService';
import { handleError } from '../../lib/errorHandler';

type Props = NativeStackScreenProps<AppStackParamList, 'GroupAddExpense'>;

export default function GroupAddExpenseScreen({ route, navigation }: Props) {
    const { groupId } = route.params;

    const currentUser = useCurrentUser();
    const userId = currentUser.id;

    // API Hooks
    const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();

    // Fetch Group Data (Specific)
    const { group } = useGetGroupsQuery(currentUser.id || '', {
        selectFromResult: ({ data }) => ({
            group: data?.find(g => g.id === groupId)
        }),
        skip: !currentUser.id || !groupId
    });

    const { data: members = [] } = useGetGroupMembersQuery(groupId);
    const memberIdsString = useMemo(() => members.map((m: any) => m.id).sort().join(','), [members]);

    // Form State
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date());
    const [payerId, setPayerId] = useState(userId);
    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Split State
    const [splitType, setSplitType] = useState<SplitType>('EQUAL');
    const [involvedUserIds, setInvolvedUserIds] = useState<string[]>([]);
    const [splitValues, setSplitValues] = useState<Record<string, string>>({});
    const [splitPercentages, setSplitPercentages] = useState<Record<string, string>>({});

    // Modals
    const [showPayerModal, setShowPayerModal] = useState(false);
    const [showSplitModal, setShowSplitModal] = useState(false);

    // --- INITIALIZATION ---
    useEffect(() => {
        if (members.length > 0) {
            const memberIds = members.map(m => m.id);
            const currentSet = new Set(memberIds);
            const isExactMatch = involvedUserIds.length === memberIds.length && involvedUserIds.every(id => currentSet.has(id));

            if (!isExactMatch) {
                setInvolvedUserIds(memberIds);
                if (!payerId || !currentSet.has(payerId)) {
                    setPayerId(userId && currentSet.has(userId) ? userId : memberIds[0]);
                }
            }
        }
    }, [memberIdsString, userId]);

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
        }
    };

    const handleRemoveImage = () => {
        setReceiptImage(null);
    };

    const handleSave = async () => {
        if (!description.trim() || !amount.trim()) {
            Alert.alert('Error', 'Please enter description and amount');
            return;
        }

        const totalAmount = parseFloat(amount);
        if (isNaN(totalAmount) || totalAmount <= 0) {
            Alert.alert('Error', 'Invalid amount');
            return;
        }

        // --- Calculate Splits (Same logic as global) ---
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
                Alert.alert("Error", `Detail amounts (${formatCurrency(sum)}) do not match total (${formatCurrency(totalAmount)})`);
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
            // Re-verify sum
            const sumAmounts = splits.reduce((acc, curr) => acc + curr.amount, 0);
            if (Math.abs(sumAmounts - totalAmount) > 0.05) {
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
            let finalReceiptUrl: string | undefined = undefined;
            if (receiptImage) {
                // @ts-ignore
                finalReceiptUrl = await uploadImageToSupabase(receiptImage, 'receipts');
            }

            await createExpense({
                groupId: groupId,
                description,
                amount: totalAmount,
                date: date.toISOString(),
                paidBy: payerId!,
                userId: userId!,
                splits: finalSplits,
                receiptUrl: finalReceiptUrl
            }).unwrap();

            Alert.alert('Success', 'Expense added to group!');
            setUploadingImage(false);
            navigation.goBack();
        } catch (error: any) {
            setUploadingImage(false);
            handleError(error, "Failed to save");
        }
    };


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

                {/* Groups Context */}
                <TouchableOpacity
                    style={styles.addMemberLink}
                    onPress={() => {
                        setShowSplitModal(false);
                        navigation.navigate('AddGroupMember', { groupId: groupId });
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
                                return count > 0 ? `${formatCurrency(totalAmt / count)} / person` : 'Select people';
                            }
                            if (splitType === 'INDIVIDUAL') {
                                const currentSum = Object.values(splitValues).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                                const left = totalAmt - currentSum;
                                return `Entered: ${formatCurrency(currentSum)} of ${formatCurrency(totalAmt)}\nRemaining: ${formatCurrency(left)}`;
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

    const isWorking = isCreating || uploadingImage;

    return (
        <ScreenWrapper
            style={{ flex: 1 }}
            edges={['top']}
            gradient={[Colors.primary, Colors.primaryDark]}
        >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                {/* Header (Transparent over Gradient) */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={styles.cancelButton}>Cancel</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Add Expense</Text>
                    <TouchableOpacity onPress={handleSave} disabled={isWorking}>
                        {isWorking ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButton}>Save</Text>}
                    </TouchableOpacity>
                </View>

                {/* Form Container (White Card) */}
                <View style={styles.formContainer}>
                    <ScrollView contentContainerStyle={styles.content}>

                        {/* Group Indicator (Static) */}
                        <View style={styles.groupIndicator}>
                            {group?.avatar_url ? (
                                <Image source={{ uri: group.avatar_url }} style={styles.groupSelectorImage} />
                            ) : (
                                <View style={styles.iconBoxSmall}>
                                    <Ionicons name="people" size={16} color="#fff" />
                                </View>
                            )}
                            <Text style={styles.groupIndicatorText}>Group: {group?.name || 'Loading...'}</Text>
                        </View>

                        {/* Inputs */}
                        <View style={styles.inputRow}>
                            <View style={styles.iconBox}><Ionicons name="reader-outline" size={24} color="#666" /></View>
                            <TextInput
                                style={styles.descInput}
                                placeholder="Enter description"
                                value={description}
                                onChangeText={setDescription}
                                autoFocus
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
                    </ScrollView>
                </View>

                {renderPayerModal()}
                {renderSplitModal()}
            </KeyboardAvoidingView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    formContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden', // Clipping
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 20, paddingTop: 10 },
    headerTitle: { ...Typography.h3, fontSize: 18, color: '#fff' },
    cancelButton: { ...Typography.button, color: 'rgba(255,255,255,0.8)' },
    saveButton: { ...Typography.button, color: '#fff', fontWeight: 'bold' },
    content: { padding: 20 },

    groupIndicator: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, padding: 8, backgroundColor: '#f0f9ff', borderRadius: 20, alignSelf: 'flex-start' },
    groupIndicatorText: { ...Typography.body2, fontWeight: '600', color: Colors.primary, marginLeft: 8, marginRight: 8 },
    groupSelectorImage: { width: 24, height: 24, borderRadius: 12 },
    iconBoxSmall: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },

    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconBox: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 8, marginRight: 12 },
    descInput: { ...Typography.body1, fontSize: 18, flex: 1, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 8 },
    amountInput: { ...Typography.h1, fontSize: 32, flex: 1, borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 8 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
    splitSummary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
    summaryText: { ...Typography.body1, color: '#333', marginHorizontal: 4 },
    pill: { backgroundColor: '#e6f7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginHorizontal: 14, borderWidth: 1, borderColor: '#1890ff' },
    pillText: { ...Typography.button, color: '#1890ff' },
    dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 8 },
    dateText: { marginLeft: 8, ...Typography.body2, color: '#333' },
    actionButton: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    actionText: { marginLeft: 8, color: '#888' },
    previewContainer: { marginTop: 16, marginHorizontal: 12, height: 200, borderRadius: 12, overflow: 'hidden', position: 'relative' },
    receiptPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
    removeReceiptBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12 },
    modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { ...Typography.h3, color: '#333' },
    closeText: { ...Typography.button, color: Colors.primary },
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
    deleteText: { ...Typography.button, color: Colors.error },
    addMemberLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: '#f9f9f9', marginBottom: 10 },
    addMemberText: { ...Typography.button, color: Colors.primary, marginLeft: 8 },
    splitFooter: { padding: 16, backgroundColor: '#f0f9ff', borderTopWidth: 1, borderTopColor: '#e0e0e0', alignItems: 'center' },
    splitFooterError: { backgroundColor: '#fff0f0' },
    splitFooterSuccess: { backgroundColor: '#f0f9ff' },
    splitFooterText: { ...Typography.body1, fontWeight: 'bold', textAlign: 'center', color: '#333' },
});

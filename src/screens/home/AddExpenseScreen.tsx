import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, FlatList, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { Profile, GroupMember, SplitType } from '../../types';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppSelector } from '../../store/hooks';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useCreateExpenseMutation } from '../../store/api/expensesApi';
import { useGetGroupsQuery } from '../../store/api/groupsApi';
import { Colors } from '../../constants';
// Image Upload
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToSupabase } from '../../services/imageUploadService';

type Props = NativeStackScreenProps<AppStackParamList, 'AddExpense'>;

import { handleError } from '../../lib/errorHandler';

export default function AddExpenseScreen({ route, navigation }: Props) {
    const { groupId, groupName } = route.params || {};
    const currentUser = useCurrentUser();
    const userId = currentUser.id;

    // API Hooks
    const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();
    const { data: groups } = useGetGroupsQuery(currentUser.id || '', { skip: !currentUser.id });

    // Group & Members
    const selectedGroup = groups?.find(g => g.id === groupId);
    const [members, setMembers] = useState<Profile[]>([]);

    useEffect(() => {
        if (selectedGroup?.members) {
            // Filter out null profiles if any
            setMembers(selectedGroup.members);
        }
    }, [selectedGroup]);

    // Form State
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date());
    const [payerId, setPayerId] = useState(userId);
    const [category, setCategory] = useState('General');
    const [receiptImage, setReceiptImage] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Split State
    const [splitType, setSplitType] = useState<SplitType>('EQUAL');
    // For manual splits (userId -> amount/weight)
    const [splitValues, setSplitValues] = useState<Record<string, string>>({});
    // Who is included in the split? (Default all)
    const [involvedUserIds, setInvolvedUserIds] = useState<string[]>([]);

    // Modals
    const [showPayerModal, setShowPayerModal] = useState(false);
    const [showSplitModal, setShowSplitModal] = useState(false);

    // Initialize defaults when members load
    useEffect(() => {
        if (members.length > 0) {
            setInvolvedUserIds(members.map(m => m.id));
            setPayerId(userId || members[0].id);
        }
    }, [members, userId]);

    // Derived: Current Payer Name
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
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
            setReceiptImage(pickerResult.assets[0].uri);
        }
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

        // Calculate Splits based on Type
        let finalSplits: { userId: string; amount: number }[] = [];

        if (splitType === 'EQUAL') {
            const count = involvedUserIds.length;
            if (count === 0) { Alert.alert("Error", "Select at least one person to split with"); return; }

            const share = totalAmount / count;
            finalSplits = involvedUserIds.map(uid => ({
                userId: uid,
                amount: parseFloat(share.toFixed(2))
            }));
        } else if (splitType === 'INDIVIDUAL') { // Using 'INDIVIDUAL' alias for Exact Amount
            // Validation: Sum must match total
            let sum = 0;
            const splits = members.map(m => {
                const val = parseFloat(splitValues[m.id] || '0');
                sum += val;
                return { userId: m.id, amount: val };
            }).filter(s => s.amount > 0);

            if (Math.abs(sum - totalAmount) > 0.05) { // float tolerance
                Alert.alert("Error", `Detail amounts ($${sum.toFixed(2)}) do not match total ($${totalAmount.toFixed(2)})`);
                return;
            }
            finalSplits = splits;
        }

        try {
            let finalReceiptUrl = undefined;
            if (receiptImage) {
                setUploadingImage(true);
                finalReceiptUrl = await uploadImageToSupabase(receiptImage);
                setUploadingImage(false);
            }

            if (receiptImage && !finalReceiptUrl) {
                Alert.alert("Error", "Failed to upload receipt image.");
                return;
            }

            await createExpense({
                groupId: groupId,
                description,
                amount: totalAmount,
                date: date.toISOString(),
                paidBy: payerId!,
                userId: userId!,
                splits: finalSplits,
                receiptUrl: finalReceiptUrl || undefined // Pass receipt URL
            }).unwrap();

            Alert.alert('Success', 'Expense saved!');
            navigation.goBack();
        } catch (error: any) {
            setUploadingImage(false);
            handleError(error, "Failed to save expense");
        }
    };

    // --- RENDERERS ---

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

                {/* Tabs for Split Type */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity onPress={() => setSplitType('EQUAL')} style={[styles.tab, splitType === 'EQUAL' && styles.activeTab]}>
                        <Text style={[styles.tabText, splitType === 'EQUAL' && styles.activeTabText]}>Equal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setSplitType('INDIVIDUAL')} style={[styles.tab, splitType === 'INDIVIDUAL' && styles.activeTab]}>
                        <Text style={[styles.tabText, splitType === 'INDIVIDUAL' && styles.activeTabText]}>Exact</Text>
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
                                    <Ionicons
                                        name={involvedUserIds.includes(member.id) ? "checkbox" : "square-outline"}
                                        size={24}
                                        color={Colors.primary}
                                    />
                                </TouchableOpacity>
                            )}

                            {splitType === 'INDIVIDUAL' && (
                                <View style={styles.amountInputWrapper}>
                                    <Text style={styles.currencySymbol}>$</Text>
                                    <TextInput
                                        style={styles.exactInput}
                                        placeholder="0.00"
                                        keyboardType="numeric"
                                        value={splitValues[member.id] || ''}
                                        onChangeText={text => setSplitValues({ ...splitValues, [member.id]: text })}
                                    />
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>
                {splitType === 'INDIVIDUAL' && (
                    <View style={{ padding: 20 }}>
                        <Text style={{ textAlign: 'center', color: '#666' }}>
                            Total entered: ${Object.values(splitValues).reduce((a, b) => a + parseFloat(b || '0'), 0).toFixed(2)} / ${amount || '0'}
                        </Text>
                    </View>
                )}
            </View>
        </Modal>
    );

    return (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelButton}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Expense</Text>
                <TouchableOpacity onPress={handleSave} disabled={isCreating || uploadingImage}>
                    {isCreating || uploadingImage ? <ActivityIndicator /> : <Text style={styles.saveButton}>Save</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

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

                {/* Category Button */}
                <TouchableOpacity
                    style={styles.categoryBtn}
                    onPress={() => navigation.navigate('CategorySelector', { onSelect: setCategory })}
                >
                    <View style={styles.catIcon}><Ionicons name="pricetag" size={16} color={Colors.primary} /></View>
                    <Text style={styles.catText}>{category}</Text>
                </TouchableOpacity>

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
                            {splitType === 'EQUAL' ? 'equally' : 'unequally'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Date Input (Mock for now, can implement DatePicker) */}
                <TouchableOpacity style={styles.dateRow}>
                    <Ionicons name="calendar-outline" size={20} color="#888" />
                    <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                </TouchableOpacity>

                {/* Receipt Image Handler */}
                <TouchableOpacity style={styles.actionButton} onPress={handlePickImage}>
                    <Ionicons name={receiptImage ? "checkmark-circle" : "camera-outline"} size={20} color={receiptImage ? Colors.success : "#888"} />
                    <Text style={[styles.actionText, receiptImage && { color: Colors.success, fontWeight: 'bold' }]}>
                        {receiptImage ? "Receipt attached" : "Add receipt"}
                    </Text>
                </TouchableOpacity>
                {receiptImage && (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />
                        <TouchableOpacity onPress={() => setReceiptImage(null)} style={styles.removeReceiptBtn}>
                            <Ionicons name="close-circle" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}

            </ScrollView>

            {renderPayerModal()}
            {renderSplitModal()}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    headerTitle: { fontSize: 17, fontWeight: '600' },
    cancelButton: { fontSize: 17, color: '#666' },
    saveButton: { fontSize: 17, fontWeight: 'bold', color: Colors.primary },
    content: { padding: 20 },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconBox: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        marginRight: 12,
    },
    descInput: {
        fontSize: 18,
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingVertical: 8,
    },
    amountInput: {
        fontSize: 32,
        fontWeight: 'bold',
        flex: 1,
        borderBottomWidth: 1,
        borderBottomColor: '#ccc',
        paddingVertical: 8,
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 20,
    },
    splitSummary: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryText: {
        fontSize: 16,
        color: '#333',
        marginHorizontal: 4,
    },
    pill: {
        backgroundColor: '#e6f7ff',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#1890ff',
    },
    pillText: {
        color: '#1890ff',
        fontWeight: '600',
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 24,
        padding: 12,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 8,
    },
    dateText: {
        marginLeft: 8,
        color: '#333',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        padding: 12,
    },
    actionText: {
        marginLeft: 8,
        color: '#888',
    },

    // Receipt Preview
    previewContainer: {
        marginTop: 16,
        marginHorizontal: 12,
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative'
    },
    receiptPreview: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    removeReceiptBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 12
    },

    // Modal Styles
    modalContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 20 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold' },
    closeText: { fontSize: 16, color: Colors.primary },
    memberRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9',
    },
    selectedRow: { backgroundColor: '#f0f9ff' },
    memberName: { fontSize: 16, marginLeft: 10 },

    // Split Modal
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        padding: 10,
        backgroundColor: '#f5f5f5',
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 20,
    },
    activeTab: { backgroundColor: '#fff', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
    tabText: { color: '#666', fontWeight: '600' },
    activeTabText: { color: Colors.primary },
    splitMemberRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    avatarSmall: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
    amountInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: Colors.primary,
        width: 80,
    },
    currencySymbol: { fontSize: 16, marginRight: 4 },
    exactInput: { fontSize: 16, flex: 1, textAlign: 'right' },

    categoryBtn: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'center',
        paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
        borderWidth: 1, borderColor: '#e0e0e0', marginTop: 16, marginBottom: 16
    },
    catIcon: { marginRight: 8 },
    catText: { color: '#666', fontWeight: '500' }
});

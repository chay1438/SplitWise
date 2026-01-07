import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { Colors } from '../../constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../hooks/useAuth';
import { useDeleteExpenseMutation } from '../../store/api/expensesApi';

type Props = NativeStackScreenProps<AppStackParamList, 'ExpenseDetail'>;

export default function ExpenseDetailScreen({ route, navigation }: Props) {
    const { expense } = route.params;
    const { user } = useAuth();
    const currentUserId = user?.id;
    const [deleteExpense] = useDeleteExpenseMutation();

    // Derived State
    const payerName = expense.payer_id === currentUserId ? 'You' : expense.payer?.full_name || 'Unknown';
    const isPayer = expense.payer_id === currentUserId;

    // Calculate My Status
    const myStatus = useMemo(() => {
        if (isPayer) {
            // I paid. How much am I owed?
            // Sum of splits that are NOT me.
            const owedToMe = expense.splits?.reduce((sum: number, split: any) => {
                return split.user_id !== currentUserId ? sum + parseFloat(split.amount) : sum;
            }, 0) || 0;
            return { type: 'OWED', amount: owedToMe };
        } else {
            // I owe. Find my split.
            const mySplit = expense.splits?.find((s: any) => s.user_id === currentUserId);
            if (mySplit) {
                return { type: 'OWE', amount: parseFloat(mySplit.amount) };
            }
            return { type: 'NOT_INVOLVED', amount: 0 };
        }
    }, [expense, currentUserId]);

    const handleDelete = () => {
        Alert.alert("Delete Expense", "Are you sure?", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Delete", style: "destructive", onPress: async () => {
                    try {
                        await deleteExpense(expense.id).unwrap();
                        Alert.alert("Success", "Expense deleted");
                        navigation.goBack();
                    } catch (e: any) {
                        Alert.alert("Error", e.data?.error || "Failed to delete");
                    }
                }
            }
        ]);
    };

    return (
        <ScreenWrapper style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Expense Details</Text>
                {/* Options Menu (Edit/Delete) - Only if creator? Or Payer? */}
                {(expense.created_by === currentUserId || isPayer) && (
                    <View style={{ flexDirection: 'row' }}>
                        <TouchableOpacity onPress={() => navigation.navigate('EditExpense', { expenseId: expense.id, groupId: expense.group_id })} style={{ marginRight: 16 }}>
                            <Ionicons name="create-outline" size={24} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleDelete}>
                            <Ionicons name="trash-outline" size={24} color={Colors.error} />
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Main Info Card */}
                <View style={styles.mainCard}>
                    <View style={styles.categoryIcon}>
                        <Ionicons name="cart-outline" size={32} color={Colors.primary} />
                    </View>
                    <Text style={styles.expenseTitle}>{expense.description}</Text>
                    <Text style={styles.expenseAmount}>₹{expense.amount.toFixed(2)}</Text>
                    <Text style={styles.expenseDate}>
                        Added by {expense.created_by === currentUserId ? 'you' : 'someone else'} on {new Date(expense.date).toLocaleDateString()}
                    </Text>
                </View>

                {/* Receipt Preview */}
                {expense.receipt_url && (
                    <TouchableOpacity
                        style={styles.receiptPreview}
                        onPress={() => navigation.navigate('ReceiptViewer', {
                            imageUrl: expense.receipt_url!,
                            expenseId: expense.id,
                            description: expense.description,
                            date: expense.date,
                            amount: expense.amount
                        })}
                    >
                        <Image source={{ uri: expense.receipt_url }} style={styles.receiptImage} />
                        <View style={styles.receiptOverlay}>
                            <Ionicons name="expand-outline" size={24} color="#fff" />
                            <Text style={styles.receiptText}>View Receipt</Text>
                        </View>
                    </TouchableOpacity>
                )}

                {/* Status Highlight */}
                {myStatus.type !== 'NOT_INVOLVED' && (
                    <View style={[styles.statusCard, myStatus.type === 'OWED' ? styles.bgGreen : styles.bgRed]}>
                        <Text style={[styles.statusText, myStatus.type === 'OWED' ? styles.textGreen : styles.textRed]}>
                            {myStatus.type === 'OWED'
                                ? `You are owed ₹${myStatus.amount.toFixed(2)}`
                                : `You owe ₹${myStatus.amount.toFixed(2)}`
                            }
                        </Text>
                    </View>
                )}

                {/* Paid By Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Paid by</Text>
                    <View style={styles.userRow}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{payerName.charAt(0)}</Text>
                        </View>
                        <Text style={styles.userName}>{payerName}</Text>
                        <Text style={styles.amountText}>₹{expense.amount.toFixed(2)}</Text>
                    </View>
                </View>

                {/* Splits Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Split with</Text>
                    {expense.splits?.map((split: any) => {
                        const isMe = split.user_id === currentUserId;
                        const name = isMe ? 'You' : (split.user?.full_name || 'Unknown'); // user object might be populated or need lookup

                        return (
                            <View key={split.id} style={styles.userRow}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{name.charAt(0)}</Text>
                                </View>
                                <Text style={styles.userName}>{name}</Text>
                                <Text style={styles.amountText}>₹{parseFloat(split.amount).toFixed(2)}</Text>
                            </View>
                        );
                    })}
                </View>

            </ScrollView>
        </ScreenWrapper>
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
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    backButton: {
        padding: 4,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    mainCard: {
        alignItems: 'center',
        marginBottom: 24,
    },
    categoryIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    expenseTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        textAlign: 'center',
    },
    expenseAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    expenseDate: {
        fontSize: 14,
        color: '#999',
    },
    statusCard: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 32,
    },
    bgGreen: { backgroundColor: '#E8F5E9' },
    bgRed: { backgroundColor: '#FFEBEE' },
    statusText: { fontWeight: '700' },
    textGreen: { color: Colors.success },
    textRed: { color: Colors.error },

    receiptPreview: {
        marginTop: 16, marginHorizontal: 20, height: 150, borderRadius: 12, overflow: 'hidden',
        backgroundColor: '#f0f0f0', position: 'relative'
    },
    receiptImage: { width: '100%', height: '100%', resizeMode: 'cover', opacity: 0.9 },
    receiptOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center'
    },
    receiptText: { color: '#fff', fontWeight: 'bold', marginTop: 8 },
    section: {
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#999',
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    userRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontWeight: 'bold',
        color: '#666',
        fontSize: 16,
    },
    userName: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    amountText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
});

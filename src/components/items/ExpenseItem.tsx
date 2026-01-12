import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';
import { Expense } from '../../types';

interface ExpenseItemProps {
    item: any; // Using any for flexibility with joined types, but ideally ExpenseWithDetails
    onPress: () => void;
    currentUserId?: string;
    showGroup?: boolean;
}

export const ExpenseItem = ({ item, onPress, currentUserId, showGroup = false }: ExpenseItemProps) => {
    const isPayer = item.payer_id === currentUserId;
    const isPayment = item.category === 'payment';

    // Formatting
    const date = new Date(item.date || item.created_at);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();

    // Icon logic
    let iconName = isPayment ? "cash-outline" : "receipt-outline";
    let iconColor = isPayment ? Colors.success : Colors.textSecondary;
    let iconBg = isPayment ? '#E8F5E9' : '#f0f0f0';

    if (item.category !== 'payment' && !isPayment) {
        // Dynamic icon based on category could go here
    }

    // Text Logic
    let description = item.description;
    let subText = "";
    let amountColor = Colors.text;
    let amountPrefix = "";

    if (isPayment) {
        description = `Payment to ${isPayer ? 'someone' : 'you'}`; // Simplified
        if (item.payer && item.payee) {
            // If we have full details
            description = `${item.payer.full_name || 'Someone'} paid ${item.payee.full_name || 'Someone'}`;
        }
    }

    // Amount logic (simplified for list view)
    // Real logic requires analyzing splits
    const amount = item.amount;

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.dateBox}>
                <Text style={styles.dateMonth}>{month}</Text>
                <Text style={styles.dateDay}>{day}</Text>
            </View>

            <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                <Ionicons name={iconName} size={20} color={isPayment ? '#fff' : '#666'} />
            </View>

            <View style={styles.content}>
                <Text style={styles.description} numberOfLines={1}>{description}</Text>
                {showGroup && item.group && (
                    <Text style={styles.groupName} numberOfLines={1}>{item.group.name}</Text>
                )}
                {!showGroup && (
                    <Text style={styles.subtext}>
                        {isPayer ? `You paid ₹${amount.toFixed(2)}` : `Total: ₹${amount.toFixed(2)}`}
                    </Text>
                )}
            </View>

            <View style={styles.amountBox}>
                <Text style={[styles.amount, { color: isPayer ? Colors.success : Colors.error }]}>
                    {isPayer ? 'you lent' : 'you borrowed'}
                </Text>
                <Text style={[styles.amountValue, { color: isPayer ? Colors.success : Colors.error }]}>
                    ₹{amount.toFixed(2)}*
                </Text>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#f9f9f9'
    },
    dateBox: { alignItems: 'center', marginRight: 12, width: 40 },
    dateMonth: { fontSize: 10, color: '#666', textTransform: 'uppercase' },
    dateDay: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    iconBox: {
        width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    content: { flex: 1, marginRight: 8 },
    description: { fontSize: 16, fontWeight: '500', color: Colors.text },
    groupName: { fontSize: 12, color: Colors.textMuted },
    subtext: { fontSize: 12, color: Colors.textMuted },
    amountBox: { alignItems: 'flex-end' },
    amount: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    amountValue: { fontSize: 14, fontWeight: 'bold' }
});

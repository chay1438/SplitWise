import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Colors } from '../../constants';
import { formatCurrency } from '../../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../hooks/useAuth';
import { useGetExpensesQuery } from '../../store/api/expensesApi';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';

export default function ActivityScreen() {
    const { user } = useAuth();
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

    // Fetch Expenses (Simulating Activity Feed)
    const { data: expenses = [], isLoading } = useGetExpensesQuery({ userId: user?.id }, { skip: !user?.id });

    // Sort by created_at desc (Most recent action)
    const activities = useMemo(() => {
        if (!expenses) return [];
        return [...expenses].sort((a, b) => {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            return timeB - timeA;
        });
    }, [expenses]);

    const renderActivityItem = ({ item }: { item: any }) => {
        const isPayer = item.payer_id === user?.id;
        const isCreator = item.created_by === user?.id;
        const creatorName = isCreator ? 'You' : (item.created_by_user?.full_name || 'Someone'); // created_by_user field might not exist in Type, fallback needed

        // Determine Action Text
        let actionText = "";
        let iconName = "receipt-outline";
        let iconColor = Colors.primary;

        if (item.category === 'payment') {
            actionText = `${isPayer ? 'You' : item.payer?.full_name || 'Someone'} paid ${isPayer ? 'someone' : 'you'}`; // Simplified
            iconName = "cash-outline";
            iconColor = Colors.success;
        } else {
            if (isCreator) {
                actionText = `You added "${item.description}"`;
                if (!isPayer) actionText += ` (paid by ${item.payer?.full_name || 'someone else'})`;
            } else {
                actionText = `${creatorName} added "${item.description}"`;
            }
        }

        const timeAgo = new Date(item.created_at).toLocaleString(); // Simplified date

        return (
            <TouchableOpacity
                style={styles.item}
                onPress={() => navigation.navigate('ExpenseDetail' as any, { expense: item })}
            >
                <View style={[styles.iconBox, { backgroundColor: iconColor === Colors.success ? '#E8F5E9' : '#E0F2F1' }]}>
                    <Ionicons name={iconName} size={24} color={iconColor} />
                </View>
                <View style={styles.content}>
                    <Text style={styles.actionText}>{actionText}</Text>
                    <Text style={styles.subText}>
                        <Text style={[styles.amount, { color: isPayer ? Colors.success : Colors.error }]}>
                            {isPayer ? 'You paid ' : 'You owe '}
                            {formatCurrency(item.amount)}
                            {/* Logic simplification: ignoring splits amount for activity view */}
                        </Text>
                        • {item.group?.name || 'No Group'}
                    </Text>
                    <Text style={styles.dateText}>{timeAgo}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper
            gradient={[Colors.primary, Colors.primaryDark]}
            style={styles.container}
            statusBarStyle="light-content"
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Activity</Text>
                {/* Filter Placeholder */}
                <TouchableOpacity>
                    <Ionicons name="filter" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.sheetContainer}>
                {isLoading ? (
                    <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>
                ) : (
                    <FlatList
                        data={activities}
                        keyExtractor={item => item.id}
                        renderItem={renderActivityItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.centered}>
                                <Text style={{ color: '#999' }}>No recent activity</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20,
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    sheetContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    list: { padding: 0 },
    item: {
        flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9f9f9',
    },
    iconBox: {
        width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16,
    },
    content: { flex: 1 },
    actionText: { fontSize: 16, color: '#333', marginBottom: 4 },
    subText: { fontSize: 14, color: '#666', marginBottom: 4 },
    amount: { fontWeight: 'bold' },
    dateText: { fontSize: 12, color: '#999' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
});

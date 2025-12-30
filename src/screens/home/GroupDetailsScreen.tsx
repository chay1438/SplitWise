import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { expenseService } from '../../services/expenseService';
import { Expense } from '../../lib/types';

type Props = NativeStackScreenProps<AppStackParamList, 'GroupDetails'>;

export default function GroupDetailsScreen({ route, navigation }: Props) {
    const { groupId, groupName } = route.params;
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        navigation.setOptions({ title: groupName });
        loadExpenses();
    }, [groupId]);

    const loadExpenses = async () => {
        try {
            setLoading(true);
            const data = await expenseService.fetchGroupExpenses(groupId);
            setExpenses(data);
        } catch (error) {
            console.error('Failed to load expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: Expense }) => (
        <View style={styles.card}>
            <View style={styles.row}>
                <Text style={styles.desc}>{item.description}</Text>
                <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.meta}>Paid by user: {item.created_by.slice(0, 4)}...</Text>
                <Text style={styles.meta}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={expenses}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text>No expenses yet.</Text>
                    </View>
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    desc: {
        fontSize: 16,
        fontWeight: '500',
    },
    amount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    meta: {
        fontSize: 12,
        color: '#888',
    },
    emptyContainer: {
        padding: 20,
        alignItems: 'center',
    },
});

import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useGetFriendsQuery, useSearchUsersMutation, useSendFriendRequestMutation } from '../../store/api/friendsApi';
import { useGetExpensesQuery } from '../../store/api/expensesApi';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Profile } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { Colors } from '../../constants';

import { handleError } from '../../lib/errorHandler';

export default function FriendsScreen() {
    const currentUser = useCurrentUser();
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

    // Data Fetching
    const { data: friends = [], isLoading: loadingFriends } = useGetFriendsQuery(currentUser.id || '', { skip: !currentUser.id });
    const { data: expenses = [] } = useGetExpensesQuery({ userId: currentUser.id }, { skip: !currentUser.id });

    // Search State
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Profile[]>([]);
    const [searchUsers, { isLoading: searching }] = useSearchUsersMutation();
    const [sendFriendRequest, { isLoading: addingFriend }] = useSendFriendRequestMutation();

    // Calculate Balances
    const friendBalances = useMemo(() => {
        const balances: Record<string, number> = {};

        if (!currentUser.id || expenses.length === 0) return balances;

        expenses.forEach(expense => {
            const paidByMe = expense.payer_id === currentUser.id;

            expense.splits?.forEach(split => {
                if (split.user_id === currentUser.id) return; // Ignore self split

                // If I paid, they owe me (+)
                if (paidByMe) {
                    balances[split.user_id] = (balances[split.user_id] || 0) + parseFloat(split.amount as any);
                }
                // If they paid, I owe them (-)
                else if (expense.payer_id === split.user_id) {
                    // Wait, logic check: if expense.payer_id indicates THEM, and I am in splits...
                    // We need to find the split that belongs to ME.
                }
            });

            // Alternative Logic: Iterate my splits vs payer
            const mySplit = expense.splits?.find(s => s.user_id === currentUser.id);
            if (mySplit && expense.payer_id !== currentUser.id) {
                // I owe payer
                const payerId = expense.payer_id;
                balances[payerId] = (balances[payerId] || 0) - parseFloat(mySplit.amount as any);
            }
        });

        return balances;
    }, [expenses, currentUser]);

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length < 3) {
            setSearchResults([]);
            return;
        }
        try {
            const results = await searchUsers(text).unwrap();
            setSearchResults(results);
        } catch (error) {
            handleError(error, "Search failed");
        }
    };

    const renderFriendItem = ({ item }: { item: Profile }) => {
        const balance = friendBalances[item.id] || 0;
        let balanceText = "Settled up";
        let balanceColor = Colors.textMuted;

        if (balance > 0) {
            balanceText = `Owes you $${balance.toFixed(2)}`;
            balanceColor = Colors.success;
        } else if (balance < 0) {
            balanceText = `You owe $${Math.abs(balance).toFixed(2)}`;
            balanceColor = Colors.error;
        }

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => navigation.navigate('FriendDetail', { friendId: item.id })}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(item.full_name || item.email || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>{item.full_name || item.email}</Text>
                    <Text style={[styles.balance, { color: balanceColor }]}>{balanceText}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Friends</Text>
                <TouchableOpacity onPress={() => navigation.navigate('AddFriend')}>
                    <Ionicons name="person-add" size={24} color={Colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Friends List */}
            {loadingFriends ? (
                <View style={styles.centered}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={friends.slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))}
                    keyExtractor={item => item.id}
                    renderItem={renderFriendItem}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>No friends yet.</Text>
                            <Text style={styles.emptySubText}>Add friends to start sharing expenses.</Text>
                        </View>
                    }
                />
            )}
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
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#555',
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    balance: {
        fontSize: 14,
        marginTop: 2,
    },
    email: {
        fontSize: 14,
        color: '#888',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    emptySubText: {
        marginTop: 8,
        color: '#888',
        textAlign: 'center',
    },
    // Modal
    modalContainer: {
        flex: 1,
        backgroundColor: '#fff',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },
    searchBoxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        margin: 16,
        paddingHorizontal: 12,
        height: 44,
        borderRadius: 10,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    avatarSmall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarTextSmall: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#555',
    },
    noResults: {
        textAlign: 'center',
        marginTop: 20,
        color: '#888',
    },
    helpText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#888',
    },
});

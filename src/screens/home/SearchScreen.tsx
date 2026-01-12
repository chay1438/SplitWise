import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Keyboard, ActivityIndicator } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Colors, Spacing } from '../../constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useGetExpensesQuery } from '../../store/api/expensesApi';
import { useGetFriendsQuery } from '../../store/api/friendsApi';
import { useGetGroupsQuery } from '../../store/api/groupsApi';
import { useAuth } from '../../hooks/useAuth';
import { Expense, Group, Profile } from '../../types';

import { AppStackParamList } from '../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ExpenseItem } from '../../components/items/ExpenseItem';
import { FriendItem } from '../../components/items/FriendItem';
import { GroupItem } from '../../components/items/GroupItem';

type TabType = 'All' | 'Expenses' | 'Friends' | 'Groups';

export default function SearchScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [activeTab, setActiveTab] = useState<TabType>('All');

    // Fetch Data (Client-side filtering for responsiveness)
    const { data: expenses = [] } = useGetExpensesQuery({ userId: user?.id }, { skip: !user?.id });
    const { data: friends = [] } = useGetFriendsQuery(user?.id || '', { skip: !user?.id });
    const { data: groups = [] } = useGetGroupsQuery(user?.id || '', { skip: !user?.id });

    // Filter Logic
    const results = useMemo(() => {
        if (!query.trim()) return { expenses: [], friends: [], groups: [] };

        const lowerQuery = query.toLowerCase();

        const filteredExpenses = expenses.filter(e =>
            e.description.toLowerCase().includes(lowerQuery) ||
            (e.amount.toString().includes(lowerQuery))
        );

        const filteredFriends = friends.filter(f =>
            (f.full_name?.toLowerCase() || '').includes(lowerQuery) ||
            (f.email?.toLowerCase() || '').includes(lowerQuery)
        );

        const filteredGroups = groups.filter(g =>
            g.name.toLowerCase().includes(lowerQuery)
        );

        return { expenses: filteredExpenses, friends: filteredFriends, groups: filteredGroups };
    }, [query, expenses, friends, groups]);

    const hasResults = results.expenses.length > 0 || results.friends.length > 0 || results.groups.length > 0;

    // List Generation
    const dataList = useMemo(() => {
        if (!hasResults && query.trim()) return [];

        let list: { type: 'header' | 'expense' | 'friend' | 'group', data: any }[] = [];

        if (activeTab === 'All' || activeTab === 'Expenses') {
            if (results.expenses.length > 0) {
                if (activeTab === 'All') list.push({ type: 'header', data: 'Expenses' });
                results.expenses.forEach(e => list.push({ type: 'expense', data: e }));
            }
        }
        if (activeTab === 'All' || activeTab === 'Friends') {
            if (results.friends.length > 0) {
                if (activeTab === 'All') list.push({ type: 'header', data: 'Friends' });
                results.friends.forEach(f => list.push({ type: 'friend', data: f }));
            }
        }
        if (activeTab === 'All' || activeTab === 'Groups') {
            if (results.groups.length > 0) {
                if (activeTab === 'All') list.push({ type: 'header', data: 'Groups' });
                results.groups.forEach(g => list.push({ type: 'group', data: g }));
            }
        }
        return list;
    }, [results, activeTab, hasResults, query]);

    return (
        <ScreenWrapper edges={['top']} style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search expenses, friends, groups..."
                    value={query}
                    onChangeText={setQuery}
                    autoFocus
                    placeholderTextColor="#999"
                    returnKeyType="search"
                />
                {query.length > 0 ? (
                    <TouchableOpacity onPress={() => setQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#ccc" />
                    </TouchableOpacity>
                ) : null}
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
                {(['All', 'Expenses', 'Friends', 'Groups'] as TabType[]).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            <View style={styles.content}>
                {!query.trim() ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="search-outline" size={48} color="#ddd" />
                        <Text style={styles.emptyTitle}>Search Splitwise</Text>
                        <Text style={styles.emptySub}>Find expenses, friends, and groups instantly.</Text>

                        <View style={{ marginTop: 40, width: '100%', paddingHorizontal: 20 }}>
                            <Text style={styles.sectionHeader}>Recent Searches</Text>
                            {/* Mock Recent */}
                            <TouchableOpacity style={styles.recentItem} onPress={() => setQuery('Trip')}>
                                <Ionicons name="time-outline" size={20} color="#999" />
                                <Text style={{ marginLeft: 12, color: '#333' }}>Trip</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.recentItem} onPress={() => setQuery('Dinner')}>
                                <Ionicons name="time-outline" size={20} color="#999" />
                                <Text style={{ marginLeft: 12, color: '#333' }}>Dinner</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : dataList.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyTitle}>No results found</Text>
                        <Text style={styles.emptySub}>Try searching for something else.</Text>
                    </View>
                ) : (
                    <FlatList
                        data={dataList}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => {
                            if (item.type === 'header') return <Text style={styles.sectionHeader}>{item.data}</Text>;
                            if (item.type === 'expense') {
                                return (
                                    <ExpenseItem
                                        item={item.data}
                                        currentUserId={user?.id}
                                        onPress={() => navigation.navigate('ExpenseDetail' as any, { expense: item.data })}
                                    />
                                );
                            }
                            if (item.type === 'friend') {
                                return (
                                    <FriendItem
                                        item={item.data}
                                        onPress={() => navigation.navigate('FriendDetail' as any, { friendId: item.data.id })}
                                    />
                                );
                            }
                            if (item.type === 'group') {
                                return (
                                    <GroupItem
                                        item={item.data}
                                        onPress={() => navigation.navigate('GroupDetails' as any, { groupId: item.data.id, groupName: item.data.name })}
                                    />
                                );
                            }
                            return null;
                        }}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        keyboardShouldPersistTaps="handled"
                    />
                )}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
    },
    searchInput: {
        flex: 1, fontSize: 16, marginHorizontal: 12, paddingVertical: 8, color: '#333'
    },
    tabs: {
        flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5'
    },
    tab: {
        marginRight: 16, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#f5f5f5'
    },
    activeTab: { backgroundColor: Colors.primary },
    tabText: { color: '#666', fontWeight: '500' },
    activeTabText: { color: '#fff' },

    content: { flex: 1 },
    sectionHeader: {
        fontSize: 14, fontWeight: 'bold', color: '#999', marginTop: 16, marginBottom: 8, paddingHorizontal: 16, textTransform: 'uppercase'
    },
    resultItem: {
        flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9f9f9'
    },
    iconBox: {
        width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    itemTitle: { fontSize: 16, fontWeight: '500', color: '#333' },
    itemSub: { fontSize: 12, color: '#888' },

    emptyState: { flex: 1, alignItems: 'center', paddingTop: 60 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 16 },
    emptySub: { fontSize: 14, color: '#999', marginTop: 8 },
    recentItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' }
});

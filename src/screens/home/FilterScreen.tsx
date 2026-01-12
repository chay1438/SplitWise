import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors, Spacing, Typography } from '../../constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { useGetFriendsQuery } from '../../store/api/friendsApi';
import { useGetGroupsQuery } from '../../store/api/groupsApi';
import { useAuth } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<AppStackParamList, 'Filter'>;

export interface FilterState {
    dateRange: 'all' | 'today' | 'week' | 'month' | 'custom';
    minAmount: string;
    maxAmount: string;
    status: 'all' | 'settled' | 'unsettled';
    categories: string[];
    friendIds: string[];
    groupIds: string[];
}

const CATEGORIES = ['Food', 'Transport', 'Utilities', 'Rent', 'Entertainment', 'Shopping', 'Travel', 'Health', 'Other'];

export default function FilterScreen({ navigation, route }: Props) {
    const { user } = useAuth();
    const { data: friends = [] } = useGetFriendsQuery(user?.id || '', { skip: !user?.id });
    const { data: groups = [] } = useGetGroupsQuery(user?.id || '', { skip: !user?.id });

    // Initial state from params or default
    const [filters, setFilters] = useState<FilterState>({
        dateRange: 'all',
        minAmount: '',
        maxAmount: '',
        status: 'all',
        categories: [],
        friendIds: [],
        groupIds: [],
        ...(route.params?.currentFilters || {})
    });

    const toggleCategory = (cat: string) => {
        setFilters(prev => ({
            ...prev,
            categories: prev.categories.includes(cat)
                ? prev.categories.filter(c => c !== cat)
                : [...prev.categories, cat]
        }));
    };

    const toggleFriend = (id: string) => {
        setFilters(prev => ({
            ...prev,
            friendIds: prev.friendIds.includes(id)
                ? prev.friendIds.filter(f => f !== id)
                : [...prev.friendIds, id]
        }));
    };

    const toggleGroup = (id: string) => {
        setFilters(prev => ({
            ...prev,
            groupIds: prev.groupIds.includes(id)
                ? prev.groupIds.filter(g => g !== id)
                : [...prev.groupIds, id]
        }));
    };

    const handleApply = () => {
        // Pass filters back
        // Using navigation.navigate to merge params to previous screen
        // But we don't know exactly which screen opened us easily without params.
        // Assuming ActivityScreen for now, or use a callback if we ignore serialization warnings.
        // Doing the simple 'goBack' with params merge isn't straight-forward in generic stack.
        // We will assume the calling screen can read 'route.params.filters' if we navigate to it?
        // Or simply `navigation.goBack()` and let the caller receive it via Context?
        // Let's standardise: Caller passes prompt to navigate.
        // For MVP: We return to 'Activity' with params.

        navigation.navigate({
            name: 'Activity',
            params: { filters: filters },
            merge: true,
        } as any);
    };

    const handleReset = () => {
        setFilters({
            dateRange: 'all',
            minAmount: '',
            maxAmount: '',
            status: 'all',
            categories: [],
            friendIds: [],
            groupIds: []
        });
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelBtn}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Filters</Text>
                <TouchableOpacity onPress={handleReset}>
                    <Text style={styles.resetBtn}>Reset</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Date Range */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Date Range</Text>
                    <View style={styles.pillsRow}>
                        {['all', 'today', 'week', 'month'].map((range) => (
                            <TouchableOpacity
                                key={range}
                                style={[styles.pill, filters.dateRange === range && styles.activePill]}
                                onPress={() => setFilters({ ...filters, dateRange: range as any })}
                            >
                                <Text style={[styles.pillText, filters.dateRange === range && styles.activePillText]}>
                                    {range.charAt(0).toUpperCase() + range.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Amount Range */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Amount</Text>
                    <View style={styles.row}>
                        <View style={styles.inputWrap}>
                            <Text style={styles.label}>Min</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="$0"
                                keyboardType="numeric"
                                value={filters.minAmount}
                                onChangeText={t => setFilters({ ...filters, minAmount: t })}
                            />
                        </View>
                        <View style={styles.spacer} />
                        <View style={styles.inputWrap}>
                            <Text style={styles.label}>Max</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="$∞"
                                keyboardType="numeric"
                                value={filters.maxAmount}
                                onChangeText={t => setFilters({ ...filters, maxAmount: t })}
                            />
                        </View>
                    </View>
                </View>

                {/* Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Status</Text>
                    <View style={styles.pillsRow}>
                        {['all', 'settled', 'unsettled'].map((s) => (
                            <TouchableOpacity
                                key={s}
                                style={[styles.pill, filters.status === s && styles.activePill]}
                                onPress={() => setFilters({ ...filters, status: s as any })}
                            >
                                <Text style={[styles.pillText, filters.status === s && styles.activePillText]}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Categories */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Categories</Text>
                    <View style={styles.grid}>
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[styles.smallPill, filters.categories.includes(cat) && styles.activeSmallPill]}
                                onPress={() => toggleCategory(cat)}
                            >
                                <Text style={[styles.smallPillText, filters.categories.includes(cat) && styles.activePillText]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Friends */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>People</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {friends.map(f => (
                            <TouchableOpacity
                                key={f.id}
                                style={[styles.avatarPill, filters.friendIds.includes(f.id) && styles.activeAvatarPill]}
                                onPress={() => toggleFriend(f.id)}
                            >
                                <View style={styles.avatar}>
                                    <Text>{f.full_name?.charAt(0)}</Text>
                                </View>
                                <Text style={styles.avatarName}>{f.full_name?.split(' ')[0]}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Groups */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Groups</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {groups.map(g => (
                            <TouchableOpacity
                                key={g.id}
                                style={[styles.avatarPill, filters.groupIds.includes(g.id) && styles.activeAvatarPill]}
                                onPress={() => toggleGroup(g.id)}
                            >
                                <View style={[styles.avatar, { backgroundColor: '#e0f7fa' }]}>
                                    <Ionicons name="people" size={16} color={Colors.info} />
                                </View>
                                <Text style={styles.avatarName}>{g.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                    <Text style={styles.applyBtnText}>Apply Filters</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    cancelBtn: { color: Colors.textSecondary, fontSize: 16 },
    resetBtn: { color: Colors.primary, fontSize: 16 },

    content: { padding: 20 },
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },

    pillsRow: { flexDirection: 'row', flexWrap: 'wrap' },
    pill: {
        paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
        backgroundColor: '#f5f5f5', marginRight: 8, marginBottom: 8
    },
    activePill: { backgroundColor: Colors.primary },
    pillText: { color: '#666' },
    activePillText: { color: '#fff', fontWeight: 'bold' },

    row: { flexDirection: 'row' },
    inputWrap: { flex: 1 },
    spacer: { width: 16 },
    label: { fontSize: 12, color: '#999', marginBottom: 4 },
    input: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 16, color: '#333'
    },

    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    smallPill: {
        paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16,
        borderWidth: 1, borderColor: '#eee', marginRight: 8, marginBottom: 8
    },
    activeSmallPill: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    smallPillText: { color: '#666', fontSize: 14 },

    avatarPill: { alignItems: 'center', marginRight: 16, opacity: 0.6 },
    activeAvatarPill: { opacity: 1 },
    avatar: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#f0f0f0',
        justifyContent: 'center', alignItems: 'center', marginBottom: 4
    },
    avatarName: { fontSize: 12, color: '#333' },

    footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    applyBtn: {
        backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center'
    },
    applyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});

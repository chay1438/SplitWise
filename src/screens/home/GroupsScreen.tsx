import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Colors } from '../../constants';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { useGetGroupsQuery } from '../../store/api/groupsApi';
import { Group, GroupWithMembers } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from 'react-native-vector-icons/Ionicons';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export default function GroupsScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth();
    const {
        data: groups = [],
        isLoading: loading,
        refetch,
        isFetching
    } = useGetGroupsQuery(user?.id || '', { skip: !user?.id });

    const onRefresh = () => {
        refetch();
    };

    const renderItem = ({ item }: { item: GroupWithMembers }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('GroupDetails', { groupId: item.id, groupName: item.name })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.groupIconContainer}>
                    {item.avatar_url ? (
                        <Image source={{ uri: item.avatar_url }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                        <Ionicons name="people" size={24} color="#fff" />
                    )}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.groupName}>{item.name}</Text>
                    <Text style={styles.groupDate}>Created: {new Date(item.created_at).toLocaleDateString()}</Text>
                </View>
                {/* Optional: Add chevron or status here */}
                <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View>

            {/* Members Stack */}
            {/* Footer with Creator Info */}
            <View style={styles.cardFooter}>
                <Text style={styles.createdByText}>
                    Created by: {item.members?.find(m => m.id === item.created_by)?.full_name || 'Guest'}
                </Text>

                {/* Optional: Keep 'View details' or remove if strictly 'only created by' is needed. 
                    I'll keep it as a subtle link since it's a card. */}
                <Text style={styles.settledStatus}>View details</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScreenWrapper
            gradient={[Colors.primary, Colors.primaryDark]}
            style={styles.container}
            statusBarStyle="light-content"
        >
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>My Groups</Text>
                    <Text style={styles.subtitle}>You are in {groups.length} groups</Text>
                </View>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => navigation.navigate('MakeGroup')}
                >
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.sheetContainer}>
                {loading && !isFetching ? (
                    <ActivityIndicator size="large" color={Colors.primary} />
                ) : (
                    <FlatList
                        data={groups}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        refreshControl={
                            <RefreshControl refreshing={isFetching} onRefresh={onRefresh} tintColor={Colors.primary} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Text style={{ color: '#999' }}>No groups found. Create one!</Text>
                            </View>
                        }
                        contentContainerStyle={{ paddingBottom: 60 }}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1, // Removed backgroundColor
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff', // White for gradient
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)', // Semi-transparent white
        marginTop: 4,
    },
    createButton: {
        backgroundColor: 'rgba(255,255,255,0.2)', // Glass effect
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    sheetContainer: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 16,
        paddingTop: 24,
        overflow: 'hidden',
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    groupIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#FF8A8E',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
    },
    groupName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    groupDate: {
        fontSize: 12,
        color: '#999',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 12,
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatarCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#ddd',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatarText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#555',
    },
    createdByText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    settledStatus: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary, // Use primary color
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
});

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { groupService } from '../../services/groupService';
import { Group } from '../../lib/types';
import { useAuth } from '../../hooks/useAuth';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export default function GroupsScreen() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation<NavigationProp>();

    const loadGroups = async () => {
        try {
            setLoading(true);
            const data = await groupService.fetchMyGroups();
            setGroups(data);
        } catch (error) {
            console.error('Failed to load groups:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadGroups();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadGroups();
    };

    const renderItem = ({ item }: { item: Group }) => (
        <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('GroupDetails', { groupId: item.id, groupName: item.name })}
        >
            <View style={styles.cardContent}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.groupDate}>Created: {new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Groups</Text>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => navigation.navigate('MakeGroup')}
                >
                    <Text style={styles.createButtonText}>+ New</Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#FF5A5F" />
            ) : (
                <FlatList
                    data={groups}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5A5F" />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text>No groups found. Create one!</Text>
                        </View>
                    }
                    contentContainerStyle={{ paddingBottom: 60 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
        paddingTop: 60,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    createButton: {
        backgroundColor: '#FF5A5F',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardContent: {
        flexDirection: 'column',
    },
    groupName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
        color: '#333',
    },
    groupDate: {
        fontSize: 12,
        color: '#888',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
});

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { groupService } from '../../services/groupService';
import { Group } from '../../lib/types';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase'

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'Home'>;

export default function HomeScreen() {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const navigation = useNavigation<NavigationProp>();
    const { user } = useAuth();

    const loadGroups = async () => {
        try {
            setLoading(true);
            const data = await groupService.fetchMyGroups();
            setGroups(data);
        } catch (error) {
            console.error('Failed to load groups:', error);
            // alert('Failed to load groups');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };
    const handleLogin = async () => {


        await supabase.auth.signOut


    }

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
                <Text style={styles.welcome}>Welcome, {user?.name}</Text>
                <TouchableOpacity
                    style={styles.createButton}
                    onPress={() => navigation.navigate('MakeGroup')}
                >
                    <Text style={styles.createButtonText}>+ New Group</Text>
                </TouchableOpacity>
            </View>

            {loading && !refreshing ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : (
                <FlatList
                    data={groups}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text>No groups found. Create one!</Text>
                        </View>
                    }
                />
            )}
            <Text onPress={handleLogin}>Logout</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    welcome: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    createButton: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 8,
    },
    createButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    card: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardContent: {
        flexDirection: 'column',
    },
    groupName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    groupDate: {
        fontSize: 12,
        color: '#666',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
});

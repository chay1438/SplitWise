import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, FlatList, Switch, Alert, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { useCreateGroupMutation, useUpdateGroupMutation, useGetGroupsQuery, useAddMemberMutation } from '../../store/api/groupsApi';
import { useGetFriendsQuery } from '../../store/api/friendsApi';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';

type MakeGroupRouteProp = RouteProp<AppStackParamList, 'MakeGroup'>;
type EditGroupRouteProp = RouteProp<AppStackParamList, 'EditGroup'>;

import { useCurrentUser } from '../../hooks/useCurrentUser';
import { handleError } from '../../lib/errorHandler';
import { supabase } from '../../lib/supabase';

export default function MakeGroupScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const route = useRoute<MakeGroupRouteProp | EditGroupRouteProp>();

    const isEditMode = route.name === 'EditGroup';
    // @ts-ignore - params might be undefined if MakeGroup, but defined if EditGroup
    const groupId = isEditMode ? route.params?.groupId : undefined;

    const currentUser = useCurrentUser();
    const [createGroup, { isLoading: isCreating }] = useCreateGroupMutation();
    const [updateGroup, { isLoading: isUpdating }] = useUpdateGroupMutation();
    const [addMember] = useAddMemberMutation();

    // Fetch group details if editing
    const { group } = useGetGroupsQuery(currentUser.id || '', {
        selectFromResult: ({ data }) => ({
            group: data?.find(g => g.id === groupId)
        }),
        skip: !groupId || !currentUser.id
    });

    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState('Trip');
    const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

    // Pre-fill
    useEffect(() => {
        if (isEditMode && group) {
            setName(group.name);
            setType(group.type);
            if (group.members) {
                setSelectedFriends(new Set(group.members.map(m => m.id)));
            }
            navigation.setOptions({ title: 'Edit Group' });
        }
    }, [isEditMode, group]);

    // Friend Fetch
    const { data: friends = [] } = useGetFriendsQuery(currentUser.id || '', { skip: !currentUser.id });

    // Types
    const GROUP_TYPES = [
        { id: 'Trip', icon: 'airplane', label: 'Trip' },
        { id: 'Home', icon: 'home', label: 'Home' },
        { id: 'Couple', icon: 'heart', label: 'Couple' },
        { id: 'Other', icon: 'list', label: 'Other' },
    ];

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Please enter a group name");
            return;
        }

        if (!currentUser.id) {
            Alert.alert("Error", "You must be logged in to create a group.");
            return;
        }

        try {
            // Self-healing: Ensure profile exists
            if (currentUser.session?.user) {
                const u = currentUser.session.user;
                await supabase.from('profiles').upsert({
                    id: u.id,
                    email: u.email,
                    full_name: u.user_metadata?.name || u.email?.split('@')[0],
                }, { onConflict: 'id' });
            }

            if (isEditMode && groupId) {
                // 1. Update Details
                await updateGroup({
                    groupId,
                    name,
                    type
                }).unwrap();

                // 2. Add New Members
                if (group?.members) {
                    const existingIds = new Set(group.members.map(m => m.id));
                    const newIds = Array.from(selectedFriends).filter(id => !existingIds.has(id));

                    for (const friendId of newIds) {
                        try {
                            await addMember({ groupId, userId: friendId }).unwrap();
                        } catch (e) {
                            console.warn('Failed to add member', friendId, e);
                        }
                    }
                }
            } else {
                await createGroup({
                    name,
                    type,
                    createdBy: currentUser.id,
                    memberIds: Array.from(selectedFriends)
                }).unwrap();
            }
            navigation.goBack();
        } catch (error: any) {
            handleError(error, "Failed to save group");
        }
    };

    const toggleFriend = (id: string) => {
        const next = new Set(selectedFriends);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedFriends(next);
    };

    const renderFriendItem = ({ item }: { item: any }) => {
        const isSelected = selectedFriends.has(item.id);
        return (
            <TouchableOpacity
                style={[styles.friendItem, isSelected && styles.friendItemSelected]}
                onPress={() => toggleFriend(item.id)}
            >
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <View style={styles.friendAvatar}>
                    <Text style={styles.friendAvatarText}>{item.full_name?.charAt(0)}</Text>
                </View>
                <Text style={[styles.friendName, isSelected && styles.friendNameSelected]}>
                    {item.full_name}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Group</Text>
                <TouchableOpacity onPress={handleSubmit} disabled={isCreating || isUpdating}>
                    {isCreating || isUpdating ? <ActivityIndicator color={Colors.primary} /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Group Details */}
                <View style={styles.section}>
                    <View style={styles.inputRow}>
                        <TouchableOpacity style={styles.photoButton}>
                            <Ionicons name="camera-outline" size={24} color="#666" />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.nameInput}
                            placeholder="Group Name"
                            value={name}
                            onChangeText={setName}
                            autoFocus
                        />
                    </View>
                </View>

                {/* Type Selector */}
                <Text style={styles.sectionLabel}>Type</Text>
                <View style={styles.typeRow}>
                    {GROUP_TYPES.map(t => (
                        <TouchableOpacity
                            key={t.id}
                            style={[styles.typeChip, type === t.id && styles.typeChipSelected]}
                            onPress={() => setType(t.id)}
                        >
                            <Ionicons name={t.icon} size={16} color={type === t.id ? '#fff' : '#666'} />
                            <Text style={[styles.typeText, type === t.id && styles.typeTextSelected]}>{t.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Add Members */}
                <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Add Members</Text>
                <View style={styles.friendsListContainer}>
                    {friends.length === 0 ? (
                        <Text style={styles.emptyFriends}>No friends found. Add friends first!</Text>
                    ) : (
                        <FlatList
                            data={friends}
                            renderItem={renderFriendItem}
                            keyExtractor={item => item.id}
                            horizontal={false}
                            scrollEnabled={false} // Let parent scroll
                        />
                    )}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', paddingTop: 10 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    cancelText: { fontSize: 16, color: '#666' },
    saveText: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    content: { padding: 20 },

    section: { marginBottom: 24 },
    inputRow: { flexDirection: 'row', alignItems: 'center' },
    photoButton: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
    nameInput: { flex: 1, fontSize: 18, borderBottomWidth: 1, borderBottomColor: Colors.primary, paddingVertical: 8 },

    sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#999', textTransform: 'uppercase', marginBottom: 12 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap' },
    typeChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', marginRight: 8, marginBottom: 8 },
    typeChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    typeText: { marginLeft: 6, fontSize: 14, color: '#666' },
    typeTextSelected: { color: '#fff', fontWeight: 'bold' },

    friendsListContainer: { marginTop: 8 },
    friendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    friendItemSelected: { backgroundColor: '#f9f9f9', borderRadius: 8, paddingHorizontal: 8 },
    checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
    checkboxSelected: { backgroundColor: Colors.success, borderColor: Colors.success },
    friendAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    friendAvatarText: { fontWeight: 'bold', color: '#555' },
    friendName: { fontSize: 16, color: '#333' },
    friendNameSelected: { fontWeight: '600' },
    emptyFriends: { color: '#999', fontStyle: 'italic' }
});

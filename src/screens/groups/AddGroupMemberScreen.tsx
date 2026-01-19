import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { Colors } from '../../constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useGetFriendsQuery } from '../../store/api/friendsApi';
import { useAddMemberMutation, useGetGroupMembersQuery } from '../../store/api/groupsApi';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { invitationService } from '../../services/invitationService';

export default function AddGroupMemberScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const route = useRoute<any>();
    const { groupId } = route.params || {};
    const currentUser = useCurrentUser();

    const [searchQuery, setSearchQuery] = useState('');

    // 1. Fetch Data
    const { data: friends = [], isLoading: loadingFriends } = useGetFriendsQuery(currentUser.id || '', { skip: !currentUser.id });
    const { data: groupMembers = [] } = useGetGroupMembersQuery(groupId, { skip: !groupId });

    // 2. Mutation
    const [addMember, { isLoading: isAdding }] = useAddMemberMutation();

    // 3. Filter Friends (only show those NOT in group)
    const existingMemberIds = new Set(groupMembers.map((m: any) => m.id));

    const availableFriends = friends.filter(f => !existingMemberIds.has(f.id));

    const filteredFriends = availableFriends.filter(f =>
        (f.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.email || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleAddMember = async (friendId: string, name: string) => {
        if (!groupId) return;
        try {
            await addMember({ groupId, userId: friendId }).unwrap();
            Alert.alert("Success", `${name} added to the group!`);
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to add member");
        }
    };

    // Invite Link Logic (Fallback)
    const handleInviteLink = async () => {
        await invitationService.shareGroupInvite(groupId, 'this group');
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.itemContainer}>
            <View style={styles.userInfo}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(item.full_name || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                    <Text style={styles.name}>{item.full_name || item.email}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => handleAddMember(item.id, item.full_name || item.email)}
                disabled={isAdding}
            >
                <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#888" style={{ marginRight: 8 }} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search your friends..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                />
            </View>

            {/* Action: Invite via Link */}
            <TouchableOpacity style={styles.inviteLinkButton} onPress={handleInviteLink}>
                <Ionicons name="link-outline" size={20} color={Colors.primary} />
                <Text style={styles.inviteLinkText}>Invite via Link (for non-friends)</Text>
            </TouchableOpacity>

            {loadingFriends ? (
                <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={filteredFriends}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>
                                {searchQuery ? "No friends found." : "No new friends to add."}
                            </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('AddFriend')} style={{ marginTop: 10 }}>
                                <Text style={styles.addFriendLink}>+ Add New Friend to SplitWise</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', margin: 16, padding: 12, borderRadius: 12 },
    searchInput: { flex: 1, fontSize: 16 },
    itemContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { fontSize: 16, fontWeight: 'bold', color: '#555' },
    name: { fontSize: 16, fontWeight: '600', color: '#333' },
    email: { fontSize: 14, color: '#888' },
    addButton: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    addButtonText: { color: '#fff', fontWeight: '600' },
    inviteLinkButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#f9f9f9', marginBottom: 8 },
    inviteLinkText: { color: Colors.primary, marginLeft: 8, fontWeight: '600' },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#888', marginBottom: 12, fontSize: 16 },
    addFriendLink: { color: Colors.primary, fontWeight: 'bold', fontSize: 16 }
});

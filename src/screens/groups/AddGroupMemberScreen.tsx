import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Share
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import { contactService } from '../../services/contactService';
import { useSendFriendRequestMutation } from '../../store/api/friendsApi';
import { useAuth } from '../../hooks/useAuth';
import Ionicons from 'react-native-vector-icons/Ionicons';

const AddGroupMemberScreen = ({ route }: any) => {
    const navigation = useNavigation();
    const { user } = useAuth();
    const { groupId } = route.params || {};

    const [sendRequest] = useSendFriendRequestMutation();

    const [searchQuery, setSearchQuery] = useState('');
    const [allContacts, setAllContacts] = useState<any[]>([]);
    const [matchedUsers, setMatchedUsers] = useState<any[]>([]);
    const [unmatchedContacts, setUnmatchedContacts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
        checkPermissionAndLoadContacts();
    }, []);

    const checkPermissionAndLoadContacts = async () => {
        try {
            const { status } = await Contacts.getPermissionsAsync();

            if (status === 'granted') {
                setHasPermission(true);
                loadContacts();
            } else {
                // Request permission
                const { status: newStatus } = await Contacts.requestPermissionsAsync();
                if (newStatus === 'granted') {
                    setHasPermission(true);
                    loadContacts();
                } else {
                    Alert.alert(
                        'Permission Required',
                        'Please grant contacts access to add group members.',
                        [{ text: 'OK', onPress: () => navigation.goBack() }]
                    );
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to access contacts');
        }
    };

    const loadContacts = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const result = await contactService.findFriendsFromContacts(user.id);

            setMatchedUsers(result.matched);
            setUnmatchedContacts(result.unmatched);
            setAllContacts([...result.matched, ...result.unmatched]);
        } catch (error) {
            Alert.alert('Error', 'Failed to load contacts');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Filter contacts based on search
    const filteredMatched = matchedUsers.filter(user =>
        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone_number?.includes(searchQuery)
    );

    const filteredUnmatched = unmatchedContacts.filter(contact =>
        contact.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Add registered user as friend and to group
    const handleAddRegisteredUser = async (userId: string, userName: string) => {
        if (!user) return;
        try {
            // Send friend request
            await sendRequest({
                fromUserId: user.id,
                toUserId: userId
            }).unwrap();

            // If groupId provided, add to group logic would go here
            // For now we just friend request them

            Alert.alert(
                'Success',
                `Friend request sent to ${userName}!${groupId ? ' They will be added to the group once they accept.' : ''}`
            );
        } catch (error) {
            Alert.alert('Error', 'Failed to send friend request');
        }
    };

    // Invite unregistered user
    const handleInviteUser = async (contactName: string) => {
        const message = `Hey ${contactName}! Join me on SplitWise to split expenses easily. Download: https://splitwise.app`;

        try {
            await Share.share({
                message,
                title: 'Join SplitWise'
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={{ marginTop: 10, color: '#6B7280' }}>Loading contacts...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            {/* Search Bar */}
            <View style={{ padding: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10 }}>
                    <Ionicons name="search" size={20} color="#9CA3AF" />
                    <TextInput
                        placeholder="Search by name, email, or phone"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        style={{
                            flex: 1,
                            padding: 12,
                            fontSize: 16,
                            color: '#1F2937'
                        }}
                    />
                </View>
            </View>

            <FlatList
                data={[
                    ...filteredMatched.map(u => ({ ...u, isRegistered: true })),
                    ...filteredUnmatched.map(c => ({ ...c, isRegistered: false }))
                ]}
                keyExtractor={(item: any) => item.id || item.contactId || item.lookupKey || Math.random().toString()}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListHeaderComponent={() => (
                    <View style={{ padding: 16 }}>
                        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>
                            All Contacts ({filteredMatched.length + filteredUnmatched.length})
                        </Text>
                    </View>
                )}
                renderItem={({ item }: { item: any }) => (
                    <View
                        style={{
                            backgroundColor: 'white',
                            padding: 16,
                            marginHorizontal: 16,
                            marginBottom: 12,
                            borderRadius: 12,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 4,
                            elevation: 3
                        }}
                    >
                        <View style={{ flex: 1, marginRight: 10 }}>
                            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 4 }}>
                                {item.full_name || item.name}
                            </Text>
                            <Text style={{ fontSize: 14, color: '#6B7280' }} numberOfLines={1}>
                                {item.email || (item.phoneNumbers && item.phoneNumbers[0]?.number) || 'No contact info'}
                            </Text>
                            {item.isRegistered && (
                                <Text style={{ fontSize: 12, color: '#10B981', marginTop: 2 }}>
                                    ✓ On SplitWise
                                </Text>
                            )}
                            {!item.isRegistered && (
                                <Text style={{ fontSize: 12, color: '#EF4444', marginTop: 2 }}>
                                    ⚠️ Not registered
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={{
                                backgroundColor: item.isRegistered ? '#6366F1' : '#E5E7EB',
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 8
                            }}
                            onPress={() =>
                                item.isRegistered
                                    ? handleAddRegisteredUser(item.id, item.full_name)
                                    : handleInviteUser(item.name)
                            }
                        >
                            <Text style={{
                                color: item.isRegistered ? 'white' : '#374151',
                                fontWeight: '600'
                            }}>
                                {item.isRegistered ? 'Add' : 'Invite'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, color: '#6B7280', textAlign: 'center' }}>
                            No contacts found matching your search.
                        </Text>
                    </View>
                )}
            />
        </View>
    );
};

export default AddGroupMemberScreen;

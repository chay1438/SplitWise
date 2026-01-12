import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, Share, Dimensions } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSearchUsersMutation, useSendFriendRequestMutation } from '../../store/api/friendsApi';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Profile } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../../constants';
import { handleError } from '../../lib/errorHandler';
import { contactService } from '../../services/contactService';
import { invitationService } from '../../services/invitationService';
import * as Contacts from 'expo-contacts';

export default function AddFriendScreen() {
    const currentUser = useCurrentUser();
    const navigation = useNavigation();

    // Search/Friend Request State (for sending requests to Matched Users)
    const [sendFriendRequest, { isLoading: addingFriend }] = useSendFriendRequestMutation();

    // Contacts State
    const [contacts, setContacts] = useState<Contacts.Contact[]>([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [matchedUsers, setMatchedUsers] = useState<Profile[]>([]);

    // Local Filter State
    const [contactSearchQuery, setContactSearchQuery] = useState('');

    // Fetch contacts on mount
    useEffect(() => {
        fetchContacts();
    }, []);

    const fetchContacts = async () => {
        if (!currentUser.id) return;
        setLoadingContacts(true);
        try {
            const result = await contactService.findFriendsFromContacts(currentUser.id);
            setContacts(result.unmatched);
            setMatchedUsers(result.matched);
        } catch (error) {
            console.error('Failed to fetch contacts:', error);
            Alert.alert("Permission Required", "Please allow access to contacts to find friends.");
        } finally {
            setLoadingContacts(false);
        }
    };

    const handleAddFriend = async (userId: string, name: string) => {
        if (!currentUser.id) return;
        try {
            await sendFriendRequest({ fromUserId: currentUser.id, toUserId: userId }).unwrap();
            Alert.alert("Success", `Friend request sent to ${name}`);
            // Remove from matched list locally to reflect status
            setMatchedUsers(prev => prev.filter(p => p.id !== userId));
        } catch (err: any) {
            handleError(err, "Failed to send friend request");
        }
    };

    const handleInvite = async (contact: Contacts.Contact) => {
        // Use unified invitation service
        await invitationService.inviteToApp(currentUser.full_name || 'Your friend');
    };

    const renderUserItem = ({ item }: { item: Profile }) => (
        <View style={styles.userItem}>
            <View style={styles.avatarSmall}>
                <Text style={styles.avatarTextSmall}>{(item.full_name || item.email || '?').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.full_name || item.email}</Text>
                <Text style={styles.email}>{item.email}</Text>
                <Text style={styles.matchedText}>Found in your contacts</Text>
            </View>
            <TouchableOpacity
                disabled={addingFriend}
                style={styles.addButton}
                onPress={() => handleAddFriend(item.id, item.full_name || '')}
            >
                <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
        </View>
    );

    const renderContactItem = ({ item }: { item: Contacts.Contact }) => (
        <View style={styles.userItem}>
            <View style={[styles.avatarSmall, { backgroundColor: '#e0e0e0' }]}>
                <Text style={[styles.avatarTextSmall, { color: '#888' }]}>{(item.name || '?').charAt(0).toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                {item.phoneNumbers && item.phoneNumbers[0] && (
                    <Text style={styles.email}>{item.phoneNumbers[0].number}</Text>
                )}
            </View>
            <TouchableOpacity
                style={styles.inviteButton}
                onPress={() => handleInvite(item)}
            >
                <Text style={styles.inviteButtonText}>Invite</Text>
            </TouchableOpacity>
        </View>
    );

    // Filtering Logic
    const filteredMatched = matchedUsers.filter(u =>
    (u.full_name?.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(contactSearchQuery.toLowerCase()))
    );

    const filteredContacts = contacts.filter(c =>
        c.name?.toLowerCase().includes(contactSearchQuery.toLowerCase())
    );

    const hasResults = filteredMatched.length > 0 || filteredContacts.length > 0;

    return (
        <ScreenWrapper style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Friends</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.searchBoxContainer}>
                    <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search contacts..."
                        value={contactSearchQuery}
                        onChangeText={setContactSearchQuery}
                        autoCapitalize="none"
                    />
                    {contactSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setContactSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#ccc" />
                        </TouchableOpacity>
                    )}
                </View>

                {loadingContacts ? (
                    <View style={styles.centered}>
                        <ActivityIndicator size="large" color={Colors.primary} />
                        <Text style={styles.loadingText}>Syncing contacts...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredMatched} // Primary data is matched users
                        keyExtractor={item => 'matched_' + item.id}
                        renderItem={renderUserItem}
                        ListHeaderComponent={
                            filteredMatched.length > 0 ? (
                                <View style={styles.sectionHeader}>
                                    <Text style={styles.sectionHeaderText}>On SplitWise</Text>
                                </View>
                            ) : null
                        }
                        ListFooterComponent={
                            <View>
                                {filteredContacts.length > 0 && (
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionHeaderText}>Invite to SplitWise</Text>
                                    </View>
                                )}
                                <FlatList
                                    data={filteredContacts}
                                    keyExtractor={(item, index) => (item as any).id || `contact_${index}`}
                                    renderItem={renderContactItem}
                                    scrollEnabled={false} // Nested list
                                />
                                {!hasResults && (
                                    <View style={styles.emptyContainer}>
                                        <Ionicons name="people-outline" size={48} color="#ddd" />
                                        <Text style={styles.helpText}>No contacts found.</Text>
                                    </View>
                                )}
                            </View>
                        }
                    />
                )}
            </View>
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    content: {
        flex: 1,
    },
    searchBoxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
        margin: 16,
        paddingHorizontal: 12,
        height: 48,
        borderRadius: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: '#333',
    },
    userItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    avatarSmall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#e6f4ea',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarTextSmall: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    email: {
        fontSize: 14,
        color: '#666',
    },
    matchedText: {
        fontSize: 12,
        color: Colors.success,
        marginTop: 2,
    },
    addButton: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    addButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    inviteButton: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    inviteButtonText: {
        color: Colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    helpText: {
        marginTop: 16,
        fontSize: 16,
        color: '#999',
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 16,
    },
    sectionHeader: {
        backgroundColor: '#f9f9f9',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    sectionHeaderText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#888',
        textTransform: 'uppercase',
    },
});

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, FlatList, ScrollView, Alert } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { useUpdateGroupMutation, useGetGroupsQuery, useGetGroupMembersQuery, useAddMemberMutation } from '../../store/api/groupsApi';
import { useGetFriendsQuery } from '../../store/api/friendsApi';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors, Typography } from '../../constants';
import { handleError } from '../../lib/errorHandler';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToSupabase, deleteImageFromSupabase } from '../../services/imageUploadService';

type EditGroupRouteProp = RouteProp<AppStackParamList, 'EditGroup'>;

export default function EditGroupScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const route = useRoute<EditGroupRouteProp>();
    const { groupId } = route.params;

    const currentUser = useCurrentUser();
    const [updateGroup, { isLoading: isUpdating }] = useUpdateGroupMutation();
    const [addMember] = useAddMemberMutation();

    // Fetch group details
    const { group } = useGetGroupsQuery(currentUser.id || '', {
        selectFromResult: ({ data }) => ({
            group: data?.find(g => g.id === groupId)
        }),
        skip: !groupId || !currentUser.id
    });

    // Fetch existing members
    const { data: currentMembers = [] } = useGetGroupMembersQuery(groupId);

    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState('Trip');
    const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

    // Image State
    const [groupImage, setGroupImage] = useState<string | null>(null);
    const [imageDeleted, setImageDeleted] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Friend Fetch
    const { data: friends = [] } = useGetFriendsQuery(currentUser.id || '', { skip: !currentUser.id });

    const GROUP_TYPES = [
        { id: 'Trip', icon: 'airplane', label: 'Trip' },
        { id: 'Home', icon: 'home', label: 'Home' },
        { id: 'Couple', icon: 'heart', label: 'Couple' },
        { id: 'Other', icon: 'list', label: 'Other' },
    ];

    // Initialize State from Group Data
    useEffect(() => {
        if (group) {
            setName(group.name);
            setType(group.type);
            if (group.avatar_url) {
                setGroupImage(group.avatar_url);
            }
            if (currentMembers) {
                setSelectedFriends(new Set(currentMembers.map((m: any) => m.id)));
            }
        }
    }, [group, currentMembers]);

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "Permission to access camera roll is required!");
            return;
        }

        const pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
            setGroupImage(pickerResult.assets[0].uri);
            setImageDeleted(false);
        }
    };

    const handleRemoveImage = () => {
        if (groupImage && groupImage.startsWith('http')) {
            setImageDeleted(true);
        }
        setGroupImage(null);
    };

    const toggleFriend = (id: string) => {
        const next = new Set(selectedFriends);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedFriends(next);
    };

    const handleSubmit = async () => {
        if (!name.trim()) {
            Alert.alert("Error", "Please enter a group name");
            return;
        }

        try {
            setUploadingImage(true);

            // 1. Handle Image Deletion
            if (imageDeleted && group?.avatar_url) {
                deleteImageFromSupabase(group.avatar_url, 'avatars');
            }

            // 2. Handle Image Upload
            let finalImageUrl = undefined;
            if (imageDeleted) {
                finalImageUrl = null;
            } else if (groupImage && !groupImage.startsWith('http')) {
                finalImageUrl = await uploadImageToSupabase(groupImage, 'avatars');
            } else if (groupImage) {
                finalImageUrl = groupImage;
            }

            // 3. Update Group Details
            await updateGroup({
                groupId,
                name,
                type,
                // @ts-ignore
                avatar_url: finalImageUrl
            }).unwrap();

            // 4. Update Members (Only Adding New Ones supported here)
            // Note: Removing members usually handled in GroupDetails or specific management screen
            if (currentMembers) {
                const existingIds = new Set(currentMembers.map((m: any) => m.id));
                const newIds = Array.from(selectedFriends).filter(id => !existingIds.has(id));

                for (const friendId of newIds) {
                    try {
                        await addMember({ groupId, userId: friendId }).unwrap();
                    } catch (e) {
                        console.warn('Failed to add member', friendId, e);
                    }
                }
            }

            setUploadingImage(false);
            Alert.alert("Success", "Group updated successfully!");
            navigation.goBack();

        } catch (error: any) {
            setUploadingImage(false);
            handleError(error, "Failed to update group");
        }
    };

    const renderFriendItem = ({ item }: { item: any }) => {
        const isSelected = selectedFriends.has(item.id);
        // If already in group (from initial load), maybe disable unchecking? 
        // For now, let's just show checkmarks. 
        // Logic constraint: If we uncheck an EXISTING member, this screen doesn't explicitly remove them based on current 'MakeGroup' logic.
        // It only ADDs regular friends.

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
        <ScreenWrapper
            style={styles.container}
            gradient={[Colors.primary, Colors.primaryDark]}
            statusBarStyle="light-content"
            edges={['top']}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Edit Group</Text>
                <TouchableOpacity onPress={handleSubmit} disabled={isUpdating || uploadingImage}>
                    {isUpdating || uploadingImage ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.sheetContainer}>
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.section}>
                        <View style={styles.inputRow}>
                            <View>
                                <TouchableOpacity style={styles.photoButton} onPress={handlePickImage} disabled={uploadingImage}>
                                    {groupImage ? (
                                        <>
                                            <Image source={{ uri: groupImage }} style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                                            <View style={styles.editBadge}>
                                                <Ionicons name="pencil" size={12} color="#fff" />
                                            </View>
                                        </>
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <Ionicons name="camera-outline" size={24} color="#666" />
                                            <Text style={{ fontSize: 10, color: '#666', marginTop: 4 }}>Add</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                                {groupImage && (
                                    <TouchableOpacity style={styles.removeBadge} onPress={handleRemoveImage}>
                                        <Ionicons name="close" size={12} color="#fff" />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TextInput
                                style={styles.nameInput}
                                placeholder="Group Name"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>
                    </View>

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

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 }}>
                        <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>Add Members</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('AddFriend')}>
                            <Text style={{ color: Colors.primary, fontWeight: '600' }}>+ Add New Friend</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.friendsListContainer}>
                        {friends.length === 0 ? (
                            <Text style={styles.emptyFriends}>No friends found. Add friends first!</Text>
                        ) : (
                            <FlatList
                                data={friends}
                                renderItem={renderFriendItem}
                                keyExtractor={item => item.id}
                                horizontal={false}
                                scrollEnabled={false}
                            />
                        )}
                    </View>

                </ScrollView>
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16,
        // Transparent on gradient
    },
    cancelText: { ...Typography.button, color: '#fff' },
    saveText: { ...Typography.button, color: '#fff' },
    headerTitle: { ...Typography.h3, color: '#fff' },
    sheetContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    content: { padding: 20 },
    section: { marginBottom: 24 },
    inputRow: { flexDirection: 'row', alignItems: 'center' },
    photoButton: { width: 60, height: 60, borderRadius: 8, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#ccc' },
    nameInput: { flex: 1, ...Typography.body1, fontSize: 18, borderBottomWidth: 1, borderBottomColor: Colors.primary, paddingVertical: 8 },
    sectionLabel: { ...Typography.label, color: '#999', marginBottom: 12 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap' },
    typeChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: '#ddd', marginRight: 8, marginBottom: 8 },
    typeChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    typeText: { marginLeft: 6, ...Typography.body2, color: '#666' },
    typeTextSelected: { color: '#fff', fontWeight: 'bold' },
    friendsListContainer: { marginTop: 8 },
    friendItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
    friendItemSelected: { backgroundColor: '#f9f9f9', borderRadius: 8, paddingHorizontal: 8 },
    checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#ccc', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
    checkboxSelected: { backgroundColor: Colors.success, borderColor: Colors.success },
    friendAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    friendAvatarText: { ...Typography.body2, fontWeight: 'bold', color: '#555' },
    friendName: { ...Typography.body1, color: '#333' },
    friendNameSelected: { fontWeight: '600' },
    emptyFriends: { ...Typography.caption, color: '#999', fontStyle: 'italic' },
    editBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: Colors.primary, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    removeBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ff4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', zIndex: 10 },
});

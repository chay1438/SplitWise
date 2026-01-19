import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, FlatList, ScrollView, Alert } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { useCreateGroupMutation } from '../../store/api/groupsApi';
import { useGetFriendsQuery } from '../../store/api/friendsApi';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';
import { handleError } from '../../lib/errorHandler';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { uploadImageToSupabase } from '../../services/imageUploadService';

export default function MakeGroupScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

    const currentUser = useCurrentUser();
    const [createGroup, { isLoading: isCreating }] = useCreateGroupMutation();

    // Form State
    const [name, setName] = useState('');
    const [type, setType] = useState('Trip');
    const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

    // Image State
    const [groupImage, setGroupImage] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);

    // Friend Fetch
    const { data: friends = [] } = useGetFriendsQuery(currentUser.id || '', { skip: !currentUser.id });

    // Types
    const GROUP_TYPES = [
        { id: 'Trip', icon: 'airplane', label: 'Trip' },
        { id: 'Home', icon: 'home', label: 'Home' },
        { id: 'Couple', icon: 'heart', label: 'Couple' },
        { id: 'Other', icon: 'list', label: 'Other' },
    ];

    const handlePickImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            Alert.alert("Permission Required", "Permission to access camera roll is required!");
            return;
        }

        const pickerResult = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1], // Square for group icon
            quality: 0.5,
        });

        if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets.length > 0) {
            setGroupImage(pickerResult.assets[0].uri);
        }
    };

    const handleRemoveImage = () => {
        setGroupImage(null);
    };

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
            setUploadingImage(true);

            // Handle Upload
            let finalImageUrl = undefined;
            if (groupImage) {
                finalImageUrl = await uploadImageToSupabase(groupImage, 'avatars');
            }

            // Self-healing: Ensure profile exists
            if (currentUser.session?.user) {
                const u = currentUser.session.user;
                await supabase.from('profiles').upsert({
                    id: u.id,
                    email: u.email,
                    full_name: u.user_metadata?.name || u.email?.split('@')[0],
                }, { onConflict: 'id' });
            }

            const groupData = await createGroup({
                name,
                type,
                createdBy: currentUser.id,
                memberIds: Array.from(selectedFriends),
                // @ts-ignore
                imageUrl: finalImageUrl
            }).unwrap();

            setUploadingImage(false);
            navigation.replace('GroupDetails', { groupId: groupData.id, groupName: groupData.name });
        } catch (error: any) {
            setUploadingImage(false);
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
        <ScreenWrapper
            gradient={[Colors.primary, Colors.primaryDark]}
            style={styles.container}
            statusBarStyle="light-content"
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Group</Text>
                <TouchableOpacity onPress={handleSubmit} disabled={isCreating || uploadingImage}>
                    {isCreating || uploadingImage ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
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
                                autoFocus
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
        // No bottom border, transparent on gradient
    },
    cancelText: { fontSize: 16, color: '#fff' },
    saveText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
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
    emptyFriends: { color: '#999', fontStyle: 'italic' },
    editBadge: { position: 'absolute', bottom: -4, right: -4, backgroundColor: Colors.primary, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    removeBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#ff4444', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', zIndex: 10 },
});

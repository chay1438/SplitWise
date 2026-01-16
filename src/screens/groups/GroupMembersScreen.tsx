import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/types';
import { useGetGroupsQuery, useGetGroupMembersQuery, useUpdateMemberRoleMutation, useRemoveMemberMutation } from '../../store/api/groupsApi';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Colors, Typography } from '../../constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Profile } from '../../types';

type RouteProps = RouteProp<AppStackParamList, 'GroupMembers'>;

export default function GroupMembersScreen() {
    const navigation = useNavigation();
    const route = useRoute<RouteProps>();
    const { groupId } = route.params;
    const currentUser = useCurrentUser();
    const currentUserId = currentUser.id;

    const [updateMemberRole] = useUpdateMemberRoleMutation();
    const [removeMember] = useRemoveMemberMutation();

    // Fetch Group
    const { group } = useGetGroupsQuery(currentUser.id || '', {
        selectFromResult: ({ data }) => ({
            group: data?.find(g => g.id === groupId)
        }),
        skip: !groupId || !currentUser.id
    });

    const { data: membersList = [] } = useGetGroupMembersQuery(groupId, { skip: !groupId });

    const members = useMemo(() => {
        return [...membersList].sort((a, b) => {
            // 1. "You" always on top
            if (a.id === currentUserId) return -1;
            if (b.id === currentUserId) return 1;

            // 2. Admins/Creators next
            const aAdmin = (a as any).role === 'admin' || group?.created_by === a.id;
            const bAdmin = (b as any).role === 'admin' || group?.created_by === b.id;

            if (aAdmin && !bAdmin) return -1;
            if (!aAdmin && bAdmin) return 1;

            // 3. Alphabetical
            return (a.full_name || '').localeCompare(b.full_name || '');
        });
    }, [membersList, group, currentUserId]);

    // Check Admin Rights
    // Creator is super admin. A member can be admin if role='admin'.
    const myMemberInfo = members.find(m => m.id === currentUserId);
    const isCreator = group?.created_by === currentUserId;
    const isAdmin = isCreator || (myMemberInfo as any)?.role === 'admin';

    const handleMemberPress = (member: Profile) => {
        if (!isAdmin) return;
        if (member.id === currentUserId) return; // Can't edit yourself here

        const memberRole = (member as any).role;
        const isMemberAdmin = memberRole === 'admin';

        Alert.alert("Manage Member", `Options for ${member.full_name}`, [
            { text: "Cancel", style: "cancel" },
            {
                text: isMemberAdmin ? "Dismiss as Admin" : "Make Group Admin",
                onPress: () => {
                    const action = isMemberAdmin ? 'member' : 'admin';
                    const title = isMemberAdmin ? "Dismiss Admin?" : "Make Admin?";

                    Alert.alert("Confirm", title, [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Confirm", onPress: async () => {
                                try { await updateMemberRole({ groupId, userId: member.id, role: action }).unwrap(); }
                                catch (e: any) { Alert.alert("Error", e.message); }
                            }
                        }
                    ]);
                }
            },
            {
                text: "Remove from Group",
                style: "destructive",
                onPress: () => {
                    Alert.alert("Remove", `Remove ${member.full_name}?`, [
                        { text: "Cancel", style: "cancel" },
                        {
                            text: "Remove", style: "destructive", onPress: async () => {
                                try { await removeMember({ groupId, userId: member.id }).unwrap(); }
                                catch (e: any) { Alert.alert("Error", e.message); }
                            }
                        }
                    ]);
                }
            }
        ]);
    };

    const renderMember = ({ item }: { item: Profile }) => {
        const isMe = item.id === currentUserId;
        const memberRole = (item as any).role; // 'admin' or 'member'
        const isMemberAdmin = memberRole === 'admin';
        const isGroupCreator = group?.created_by === item.id;

        return (
            <TouchableOpacity
                style={styles.memberRow}
                activeOpacity={isAdmin && !isMe ? 0.6 : 1}
                onPress={() => handleMemberPress(item)}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.full_name?.charAt(0)}</Text>
                </View>
                <View style={styles.info}>
                    <Text style={styles.name}>
                        {isMe ? "You" : item.full_name}
                    </Text>
                    {item.email && <Text style={styles.email}>{item.email}</Text>}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                    {(isGroupCreator || isMemberAdmin) && <Text style={[styles.roleBadge, { color: Colors.primary }]}>Admin</Text>}
                </View>

                {isAdmin && !isMe && (
                    <Ionicons name="ellipsis-vertical" size={20} color="#ccc" style={{ marginLeft: 10 }} />
                )}
            </TouchableOpacity>
        );
    };

    return (
        <ScreenWrapper style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8 }}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Group Members</Text>
                <View style={{ width: 40 }} />
            </View>



            <Text style={styles.countText}>{members.length} members</Text>

            <FlatList
                data={members}
                keyExtractor={item => item.id}
                renderItem={renderMember}
                contentContainerStyle={styles.listContent}
            />
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    title: { ...Typography.h3, color: '#333' },
    listContent: { paddingBottom: 40 },
    memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    avatarText: { ...Typography.body1, fontWeight: 'bold', color: '#555' },
    info: { flex: 1 },
    name: { ...Typography.body1, color: '#333', fontWeight: '500' },
    email: { ...Typography.caption, fontSize: 13 },
    roleBadge: { ...Typography.label, color: '#888' },
    addMemberRow: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    addIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    addText: { ...Typography.button, color: Colors.primary },
    countText: { ...Typography.label, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, color: '#666' }
});

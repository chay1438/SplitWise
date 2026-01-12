import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Animated, Dimensions, ActivityIndicator } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/types';
import { useGetGroupsQuery, useGetGroupMembersQuery, useLeaveGroupMutation, useDeleteGroupMutation } from '../../store/api/groupsApi';
import { useCreateInvitationMutation } from '../../store/api/invitationsApi'; // RTK Query
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Colors, Typography } from '../../constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useGetExpensesQuery } from '../../store/api/expensesApi';
import LinearGradient from 'react-native-linear-gradient';
import { invitationService } from '../../services/invitationService';

type RouteProps = RouteProp<AppStackParamList, 'GroupSettings'>;

export default function GroupSettingsScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProps>();
    const { groupId } = route.params;
    const currentUser = useCurrentUser();
    const currentUserId = currentUser.id;
    const screenWidth = Dimensions.get('window').width;
    const slideAnim = React.useRef(new Animated.Value(screenWidth)).current;

    // Mutations
    const [createInvitation, { isLoading: creatingInvite }] = useCreateInvitationMutation();
    const [leaveGroup] = useLeaveGroupMutation();
    const [deleteGroup] = useDeleteGroupMutation();

    React.useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleClose = () => {
        Animated.timing(slideAnim, {
            toValue: screenWidth,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            navigation.goBack();
        });
    };

    // Invite Logic
    const handleInvite = async () => {
        try {
            const token = await createInvitation({ groupId }).unwrap();
            // Create Deep Link manually or via helper
            const link = `splitwise://join-group?token=${token}`;
            await invitationService.shareGroupLink(link, group?.name || 'Group');
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to create invite link");
        }
    };

    // Fetch Group
    const { group } = useGetGroupsQuery(currentUser.id || '', {
        selectFromResult: ({ data }) => ({
            group: data?.find(g => g.id === groupId)
        }),
        skip: !groupId || !currentUser.id
    });

    const isCreator = group?.created_by === currentUserId;
    const { data: members = [] } = useGetGroupMembersQuery(groupId);
    const myMemberInfo = members.find((m: any) => m.id === currentUserId);
    const isAdmin = isCreator || (myMemberInfo as any)?.role === 'admin';

    return (
        <View style={styles.rootContainer}>
            {/* Transparent Backdrop to close on click outside */}
            <TouchableOpacity style={styles.backdrop} onPress={handleClose} activeOpacity={1} />

            {/* Right Side Panel */}
            <Animated.View style={[styles.modalPanel, { transform: [{ translateX: slideAnim }] }]}>
                <LinearGradient
                    colors={[Colors.primary, Colors.primaryDark]}
                    style={styles.gradientContainer}
                >
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={{ padding: 8 }}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.title}>Settings</Text>
                        <View style={{ width: 40 }} />
                    </View>

                    <View style={styles.sheetContainer}>
                        <ScrollView contentContainerStyle={styles.content}>

                            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('GroupMembers', { groupId })}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="people-outline" size={20} color="#333" />
                                </View>
                                <Text style={styles.cardText}>Members</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AddGroupMember', { groupId })}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="person-add-outline" size={20} color="#333" />
                                </View>
                                <Text style={styles.cardText}>Add People</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('EditGroup', { groupId })}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="create-outline" size={20} color="#333" />
                                </View>
                                <Text style={styles.cardText}>Edit Group</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.card}
                                onPress={handleInvite}
                                disabled={creatingInvite}
                            >
                                <View style={styles.iconContainer}>
                                    {creatingInvite ? (
                                        <ActivityIndicator size="small" color="#333" />
                                    ) : (
                                        <Ionicons name="share-social-outline" size={20} color="#333" />
                                    )}
                                </View>
                                <Text style={styles.cardText}>
                                    {creatingInvite ? 'Creating Link...' : 'Invite via Link'}
                                </Text>
                            </TouchableOpacity>

                            {isAdmin && (
                                <TouchableOpacity style={[styles.card, styles.dangerCard]} onPress={() => navigation.navigate('DeleteGroup', { groupId })}>
                                    <View style={styles.iconContainer}>
                                        <Ionicons name="trash-outline" size={20} color={Colors.error} />
                                    </View>
                                    <Text style={[styles.cardText, { color: Colors.error }]}>Delete Group</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={[styles.card, styles.dangerCard]} onPress={() => navigation.navigate('ExitGroup', { groupId })}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                                </View>
                                <Text style={[styles.cardText, { color: Colors.error }]}>Exit Group</Text>
                            </TouchableOpacity>

                        </ScrollView>
                    </View>
                </LinearGradient>
            </Animated.View>
        </View >
    );
}

const styles = StyleSheet.create({
    rootContainer: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.3)', // Semi-transparent overlay
    },
    backdrop: {
        flex: 1, // Takes up remaining space (left side)
    },
    modalPanel: {
        width: '70%', // Modal width
        backgroundColor: '#fff', // fallback
        height: '100%',
        borderTopLeftRadius: 20,
        borderBottomLeftRadius: 20,
        overflow: 'hidden',
        shadowColor: "#000",
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    gradientContainer: {
        flex: 1,
        paddingTop: 50,
    },
    sheetContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
    title: { ...Typography.h3, color: '#fff' },
    content: { padding: 16, paddingTop: 24 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#faf4f4ff',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    dangerCard: {
        borderColor: '#ffebee',
        backgroundColor: '#fffcfc'
    },
    iconContainer: {
        marginRight: 12,
        width: 24,
        alignItems: 'center'
    },
    cardText: {
        ...Typography.body1,
        color: '#333',
        fontWeight: '500'
    }
});

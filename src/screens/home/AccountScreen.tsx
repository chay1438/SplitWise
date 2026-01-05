import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Alert, Linking } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Colors, Spacing } from '../../constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSignOutMutation } from '../../store/api/authApi';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';

export default function AccountScreen() {
    const { user, profile } = useAuth();
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
    const [signOut, { isLoading: loading }] = useSignOutMutation();

    // Settings State (Mock for UI)
    const [emailNotifs, setEmailNotifs] = useState(true);
    const [pushNotifs, setPushNotifs] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [hideSettled, setHideSettled] = useState(false);

    const handleLogout = async () => {
        Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Sign Out', style: 'destructive', onPress: async () => {
                    try {
                        await signOut().unwrap();
                    } catch (error: any) {
                        Alert.alert('Error', error.message || 'Failed to logout');
                    }
                }
            }
        ]);
    };

    const handleDeleteAccount = () => {
        Alert.alert('Delete Account', 'This is permanent. Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Request Sent', 'Your account deletion request has been received.') }
        ]);
    };

    const SettingItem = ({ icon, title, value, type = 'chevron', onPress, color = Colors.text }: any) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={type === 'toggle'}>
            <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#f5f5f5' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <Text style={[styles.settingTitle, { color }]}>{title}</Text>
            </View>
            <View style={styles.settingRight}>
                {type === 'toggle' && (
                    <Switch
                        value={value}
                        onValueChange={onPress}
                        trackColor={{ false: '#767577', true: Colors.primary }}
                        thumbColor={'#f4f3f4'}
                    />
                )}
                {type === 'chevron' && (
                    <>
                        <Text style={styles.settingValue}>{value}</Text>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </>
                )}
            </View>
        </TouchableOpacity>
    );

    const SectionHeader = ({ title }: { title: string }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    return (
        <ScreenWrapper edges={['top']} style={{ backgroundColor: '#f8f9fa' }} statusBarStyle="dark-content">
            <ScrollView contentContainerStyle={styles.container}>

                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Account</Text>
                </View>

                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <TouchableOpacity style={styles.avatarContainer}>
                        {/* Mock Avatar Logic - use Image if url exists */}
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{(profile?.full_name || user?.email || '?').charAt(0).toUpperCase()}</Text>
                        </View>
                        <View style={styles.editIcon}>
                            <Ionicons name="pencil" size={12} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.userName}>{profile?.full_name || 'User Name'}</Text>
                    <Text style={styles.userEmail}>{user?.email}</Text>
                    <TouchableOpacity style={styles.editProfileBtn} onPress={() => Alert.alert('Coming Soon', 'Profile editing')}>
                        <Text style={styles.editProfileText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Account Settings */}
                <SectionHeader title="Account Settings" />
                <View style={styles.sectionCard}>
                    <SettingItem
                        icon="mail-outline"
                        title="Email Notifications"
                        type="toggle"
                        value={emailNotifs}
                        onPress={() => setEmailNotifs(!emailNotifs)}
                    />
                    <SettingItem
                        icon="notifications-outline"
                        title="Push Notifications"
                        type="toggle"
                        value={pushNotifs}
                        onPress={() => setPushNotifs(!pushNotifs)}
                    />
                    <SettingItem
                        icon="cash-outline"
                        title="Currency"
                        value="USD"
                        onPress={() => Alert.alert('Currency', 'USD Selected')}
                    />
                    <SettingItem
                        icon="language-outline"
                        title="Language"
                        value="English"
                        onPress={() => { }}
                    />
                </View>

                {/* Preferences */}
                <SectionHeader title="Preferences" />
                <View style={styles.sectionCard}>
                    <SettingItem
                        icon="moon-outline"
                        title="Dark Mode"
                        type="toggle"
                        value={darkMode}
                        onPress={() => setDarkMode(!darkMode)}
                    />
                    <SettingItem
                        icon="eye-off-outline"
                        title="Hide Settled"
                        type="toggle"
                        value={hideSettled}
                        onPress={() => setHideSettled(!hideSettled)}
                    />
                    <SettingItem
                        icon="cut-outline"
                        title="Default Split"
                        value="Equal"
                        onPress={() => { }}
                    />
                </View>

                {/* Community */}
                <SectionHeader title="Community" />
                <View style={styles.sectionCard}>
                    <SettingItem
                        icon="share-social-outline"
                        title="Invite Friends"
                        onPress={() => Alert.alert('Invite', 'Share link copied!')}
                    />
                    <SettingItem
                        icon="people-outline"
                        title="Manage Groups"
                        onPress={() => navigation.navigate('Groups' as any)}
                    />
                </View>

                {/* Support */}
                <SectionHeader title="Support" />
                <View style={styles.sectionCard}>
                    <SettingItem
                        icon="help-circle-outline"
                        title="Help & Support"
                        onPress={() => { }}
                    />
                    <SettingItem
                        icon="star-outline"
                        title="Rate the App"
                        onPress={() => { }}
                    />
                    <View style={styles.versionRow}>
                        <Text style={styles.versionText}>Version 1.0.0</Text>
                    </View>
                </View>

                {/* Dangerous */}
                <View style={[styles.sectionCard, { marginTop: 20 }]}>
                    <SettingItem
                        icon="log-out-outline"
                        title="Sign Out"
                        onPress={handleLogout}
                        color={Colors.primary}
                    />
                    <SettingItem
                        icon="trash-outline"
                        title="Delete Account"
                        onPress={handleDeleteAccount}
                        color={Colors.error}
                    />
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 20,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        marginBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
    },
    profileSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 12,
    },
    avatarPlaceholder: {
        width: 100, height: 100, borderRadius: 50, backgroundColor: '#eee',
        justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontSize: 36, fontWeight: 'bold', color: '#666' },
    editIcon: {
        position: 'absolute', bottom: 0, right: 0,
        backgroundColor: Colors.primary, width: 30, height: 30, borderRadius: 15,
        justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff'
    },
    userName: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    userEmail: { fontSize: 14, color: '#666', marginBottom: 12 },
    editProfileBtn: {
        paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, borderWidth: 1, borderColor: '#ddd',
    },
    editProfileText: { fontSize: 14, fontWeight: '600', color: '#333' },

    sectionHeader: {
        fontSize: 14, fontWeight: 'bold', color: '#999', textTransform: 'uppercase',
        marginLeft: 20, marginBottom: 8, marginTop: 16,
    },
    sectionCard: {
        backgroundColor: '#fff', borderRadius: 12, marginHorizontal: 16,
        paddingVertical: 4,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 1,
    },
    settingItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f9f9f9',
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center' },
    iconContainer: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    settingTitle: { fontSize: 16, fontWeight: '500', color: '#333' },
    settingRight: { flexDirection: 'row', alignItems: 'center' },
    settingValue: { fontSize: 14, color: '#999', marginRight: 8 },
    versionRow: { padding: 12, alignItems: 'center' },
    versionText: { fontSize: 12, color: '#ccc' },
});

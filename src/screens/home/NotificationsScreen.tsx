import React, { useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl, Image, Alert } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Colors } from '../../constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useGetNotificationsQuery, useMarkAllAsReadMutation, useMarkAsReadMutation, useDeleteNotificationMutation } from '../../store/api/notificationsApi';
import { useAuth } from '../../hooks/useAuth';
import { Notification } from '../../types';
import { useNavigation } from '@react-navigation/native';

import { NotificationItem } from '../../components/items/NotificationItem';

export default function NotificationsScreen() {


    const { user } = useAuth();
    const navigation = useNavigation();

    const { data: notifications = [], isLoading, refetch } = useGetNotificationsQuery(user?.id || '', { skip: !user?.id });
    const [markAllAsRead] = useMarkAllAsReadMutation();
    const [markAsRead] = useMarkAsReadMutation();
    const [deleteNotification] = useDeleteNotificationMutation();

    // Grouping Logic
    const sections = useMemo(() => {
        if (!notifications.length) return [];

        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const isSameDay = (d1: Date, d2: Date) =>
            d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();

        const grouped: { [key: string]: Notification[] } = {
            'Today': [],
            'Yesterday': [],
            'Earlier': []
        };

        notifications.forEach(n => {
            const date = new Date(n.created_at);
            if (isSameDay(date, today)) {
                grouped['Today'].push(n);
            } else if (isSameDay(date, yesterday)) {
                grouped['Yesterday'].push(n);
            } else {
                grouped['Earlier'].push(n);
            }
        });

        return Object.keys(grouped)
            .filter(key => grouped[key].length > 0)
            .map(key => ({
                title: key,
                data: grouped[key]
            }));
    }, [notifications]);

    const handleMarkAllRead = async () => {
        if (!user) return;
        try {
            await markAllAsRead(user.id).unwrap();
        } catch (e) {
            console.error(e);
        }
    };

    const handleNotificationPress = async (item: Notification) => {
        if (!item.is_read) {
            markAsRead(item.id);
        }
        // Navigation Logic based on type/message (Simple parsing or data payload)
        // Assuming notification structure or just go to Activity/Home
        // For MVP, just mark read.
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteNotification(id).unwrap();
        } catch (e) {
            console.error(e);
        }
    };

    const renderItem = ({ item }: { item: Notification }) => (
        <NotificationItem
            item={item}
            onPress={handleNotificationPress}
            onDelete={handleDelete}
        />
    );

    return (
        <ScreenWrapper
            gradient={[Colors.primary, Colors.primaryDark]}
            style={styles.container}
            edges={['top']}
            statusBarStyle="light-content"
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Notifications</Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleMarkAllRead} style={styles.actionBtn}>
                        <Ionicons name="checkmark-done-outline" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.sheetContainer}>
                <SectionList
                    sections={sections}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    renderSectionHeader={({ section: { title } }) => (
                        <Text style={styles.sectionHeader}>{title}</Text>
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} />}
                    ListEmptyComponent={<Text style={styles.emptyText}>No notifications</Text>}
                    stickySectionHeadersEnabled={false}
                />
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20,
        // removed borders
    },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
    headerActions: { flexDirection: 'row' },
    actionBtn: { padding: 8 },
    sheetContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    listContent: { paddingBottom: 20 },
    sectionHeader: {
        fontSize: 14, fontWeight: 'bold', color: '#999', backgroundColor: '#fff',
        paddingHorizontal: 20, paddingVertical: 12, textTransform: 'uppercase'
    },

    emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});

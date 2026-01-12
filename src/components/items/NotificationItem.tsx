import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';
import { Notification } from '../../types';

interface NotificationItemProps {
    item: Notification;
    onPress: (item: Notification) => void;
    onDelete: (id: string) => void;
}

export const NotificationItem = ({ item, onPress, onDelete }: NotificationItemProps) => {
    let icon = 'notifications-outline';
    let color = '#666';
    const msg = (item.message || '').toLowerCase();

    if (msg.includes('expense')) { icon = 'receipt-outline'; color = Colors.error; }
    else if (msg.includes('settle') || msg.includes('paid')) { icon = 'cash-outline'; color = Colors.success; }
    else if (msg.includes('group')) { icon = 'people-outline'; color = Colors.info; }

    return (
        <TouchableOpacity
            style={[styles.container, item.is_read ? styles.readItem : styles.unreadItem]}
            onPress={() => onPress(item)}
        >
            <View style={[styles.iconContainer, { backgroundColor: item.is_read ? '#f0f0f0' : '#E8EAF6' }]}>
                <Ionicons name={icon} size={24} color={item.is_read ? '#999' : color} />
            </View>
            <View style={styles.textContainer}>
                <Text style={[styles.messageText, !item.is_read && styles.unreadText]}>{item.message}</Text>
                <Text style={styles.timeText}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            <TouchableOpacity onPress={() => onDelete(item.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={20} color="#ccc" />
            </TouchableOpacity>
            {!item.is_read && <View style={styles.dot} />}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9f9f9',
    },
    readItem: { backgroundColor: '#fff' },
    unreadItem: { backgroundColor: '#F0F4FF' },
    iconContainer: {
        width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16
    },
    textContainer: { flex: 1 },
    messageText: { fontSize: 16, color: '#333', marginBottom: 4 },
    unreadText: { fontWeight: '600' },
    timeText: { fontSize: 12, color: '#999' },
    deleteBtn: { padding: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary, marginLeft: 8 },
});

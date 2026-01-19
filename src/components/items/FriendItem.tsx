import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '../../constants';
import { Profile } from '../../types';

interface FriendItemProps {
    item: Profile;
    onPress: () => void;
}

export const FriendItem = ({ item, onPress }: FriendItemProps) => {
    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.full_name?.charAt(0).toUpperCase() || '?'}</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.name}>{item.full_name}</Text>
                {item.email && <Text style={styles.email}>{item.email}</Text>}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#f9f9f9'
    },
    avatar: {
        width: 48, height: 48, borderRadius: 24, backgroundColor: '#f0f0f0',
        justifyContent: 'center', alignItems: 'center', marginRight: 16
    },
    avatarText: { fontSize: 20, fontWeight: 'bold', color: '#555' },
    content: { flex: 1 },
    name: { fontSize: 16, fontWeight: '500', color: Colors.text },
    email: { fontSize: 12, color: Colors.textMuted }
});

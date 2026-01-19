import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';
import { Group } from '../../types';

interface GroupItemProps {
    item: Group;
    onPress: () => void;
}

export const GroupItem = ({ item, onPress }: GroupItemProps) => {
    let iconName = 'people-outline';
    if (item.type === 'Home') iconName = 'home-outline';
    if (item.type === 'Trip') iconName = 'airplane-outline';
    if (item.type === 'Couple') iconName = 'heart-outline';

    return (
        <TouchableOpacity style={styles.container} onPress={onPress}>
            <View style={styles.iconBox}>
                <Ionicons name={iconName} size={24} color={Colors.textSecondary} />
            </View>
            <View style={styles.content}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.type}>{item.type}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff',
        borderBottomWidth: 1, borderBottomColor: '#f9f9f9'
    },
    iconBox: {
        width: 48, height: 48, borderRadius: 8, backgroundColor: '#f0f0f0',
        justifyContent: 'center', alignItems: 'center', marginRight: 16
    },
    content: { flex: 1 },
    name: { fontSize: 16, fontWeight: '500', color: Colors.text },
    type: { fontSize: 12, color: Colors.textMuted }
});

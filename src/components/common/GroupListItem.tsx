import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Colors } from '../../constants';

interface GroupListItemProps {
    title: string;
    amount: number;
    subtext?: string;
    members?: any[];
    imageUrl?: string;
    onPress: () => void;
    color?: string; // Background color for the icon
}

export const GroupListItem = ({
    title,
    amount,
    subtext,
    members,
    imageUrl,
    onPress,
    color = Colors.primary
}: GroupListItemProps) => {

    const isOwed = amount > 0;
    const isSettled = Math.abs(amount) < 0.01;

    let statusText = 'no expenses';
    let statusColor = '#999';
    let amountText = '';

    if (!isSettled) {
        if (isOwed) {
            statusText = 'you are owed ';
            statusColor = '#4CAF50'; // Green
            amountText = `$${Math.abs(amount).toFixed(2)}`;
        } else {
            statusText = 'you owe ';
            statusColor = '#FF5A5F'; // Red
            amountText = `$${Math.abs(amount).toFixed(2)}`;
        }
    }

    return (
        <TouchableOpacity style={styles.card} onPress={onPress}>
            {/* Left Icon (Image or Default Icon) */}
            <View style={[styles.iconBox, { backgroundColor: imageUrl ? '#fff' : color }]}>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                ) : (
                    <Ionicons name="people" size={24} color="#fff" />
                )}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <Text style={styles.title}>{title}</Text>
                <View style={styles.row}>
                    <Text style={[styles.statusPrefix, { color: statusColor }]}>
                        {statusText}
                        <Text style={[styles.amount, { color: statusColor }]}>
                            {amountText}
                        </Text>
                    </Text>
                </View>
                {/* Members Avatar Stack or Subtext */}
                {members && members.length > 0 ? (
                    <View style={styles.avatarStack}>
                        {members.slice(0, 4).map((member, index) => (
                            <View key={member.id || index} style={[styles.avatarCircle, { marginLeft: index > 0 ? -8 : 0, zIndex: 10 - index, backgroundColor: '#e0e0e0' }]}>
                                <Text style={styles.avatarText}>
                                    {member.full_name ? member.full_name.charAt(0).toUpperCase() : '?'}
                                </Text>
                            </View>
                        ))}
                        {members.length > 4 && (
                            <View style={[styles.avatarCircle, { marginLeft: -8, backgroundColor: '#f0f0f0', zIndex: 0 }]}>
                                <Text style={styles.avatarText}>+{members.length - 4}</Text>
                            </View>
                        )}
                    </View>
                ) : (
                    subtext && !isSettled && <Text style={styles.subtext} numberOfLines={1}>{subtext}</Text>
                )}

                {isSettled && !members && (
                    <Text style={styles.subtext}>settled up</Text>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        overflow: 'hidden',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusPrefix: {
        fontSize: 14,
        fontWeight: '500',
    },
    amount: {
        fontWeight: 'bold',
    },
    // Styles for Avatar Stack
    avatarStack: {
        flexDirection: 'row',
        marginTop: 6,
    },
    avatarCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff',
    },
    avatarText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#555',
    },
});

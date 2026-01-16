import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Colors } from '../../constants';
import { formatCurrency } from '../../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../hooks/useAuth';
import { useGetActivitiesQuery } from '../../store/api/activitiesApi';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';

export default function ActivityScreen() {
    const { user } = useAuth();
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

    // Fetch Real Activities
    const { data: activities = [], isLoading } = useGetActivitiesQuery(
        { userId: user?.id || '' },
        { pollingInterval: 5000, skip: !user?.id }
    );

    const renderActivityItem = ({ item }: { item: any }) => {
        const { action, details, created_at } = item;
        let actionText = "";
        let iconName = "notifications-outline";
        let iconColor = Colors.primary;
        let subText = "";

        // Parse details based on Action Type
        // 1. Expense Created
        if (action === 'expense_created') {
            const isCreator = details.created_by === user?.id;
            const amount = formatCurrency(details.amount);

            if (isCreator) {
                actionText = `You added "${details.description}"`;
                subText = `You paid ${amount}`;
            } else {
                actionText = `${details.creator_name || 'Someone'} added "${details.description}"`;
                subText = `${details.creator_name} paid ${amount}`;
            }
            iconName = "receipt-outline";
            iconColor = Colors.primary;
        }
        // 2. Settlement
        else if (action === 'paid_settlement') {
            actionText = `You paid ${details.payee_name}`;
            subText = `Settled ${formatCurrency(details.amount)}`;
            iconName = "arrow-up-circle-outline";
            iconColor = Colors.success;
        }
        else if (action === 'received_settlement') {
            actionText = `${details.payer_name} paid you`;
            subText = `Received ${formatCurrency(details.amount)}`;
            iconName = "arrow-down-circle-outline";
            iconColor = Colors.success;
        }
        // 3. Group Join
        else if (action === 'joined_group') {
            actionText = `You joined "${details.group_name}"`;
            iconName = "people-outline";
            iconColor = Colors.secondary;
        }

        const timeAgo = new Date(created_at).toLocaleString();

        return (
            <TouchableOpacity style={styles.item} disabled={action === 'joined_group'}>
                <View style={[styles.iconBox, { backgroundColor: iconColor === Colors.success ? '#E8F5E9' : '#E0F2F1' }]}>
                    <Ionicons name={iconName} size={24} color={iconColor} />
                </View>
                <View style={styles.content}>
                    <Text style={styles.actionText}>{actionText}</Text>
                    {subText ? <Text style={styles.subText}>{subText}</Text> : null}
                    <Text style={styles.dateText}>{timeAgo}</Text>
                </View>
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
                <Text style={styles.headerTitle}>Activity</Text>
            </View>

            <View style={styles.sheetContainer}>
                {isLoading ? (
                    <View style={styles.centered}><ActivityIndicator color={Colors.primary} /></View>
                ) : (
                    <FlatList
                        data={activities}
                        keyExtractor={item => item.id}
                        renderItem={renderActivityItem}
                        contentContainerStyle={styles.list}
                        ListEmptyComponent={
                            <View style={styles.centered}>
                                <Text style={{ color: '#999' }}>No recent activity</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20,
    },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    sheetContainer: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        overflow: 'hidden',
    },
    list: { padding: 0 },
    item: {
        flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9f9f9',
    },
    iconBox: {
        width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16,
    },
    content: { flex: 1 },
    actionText: { fontSize: 16, color: '#333', marginBottom: 4 },
    subText: { fontSize: 14, color: '#666', marginBottom: 4 },
    amount: { fontWeight: 'bold' },
    dateText: { fontSize: 12, color: '#999' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
});

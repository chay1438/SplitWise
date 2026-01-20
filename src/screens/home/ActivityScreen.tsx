import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Colors } from '../../constants';
import { formatCurrency } from '../../utils';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../hooks/useAuth';
import { useGetActivitiesQuery } from '../../store/api/activitiesApi'; // Using the Real API
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/types';
import { Activity } from '../../types';

export default function ActivityScreen() {
    const { user } = useAuth();
    const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

    // Fetch Real Activities (Group creation, Members, Expenses)
    // Auto-refresh every 5 seconds to keep the feed live
    const { data: activities = [], isLoading } = useGetActivitiesQuery(
        { userId: user?.id || '' },
        { pollingInterval: 5000, skip: !user?.id }
    );

    const renderActivityItem = ({ item }: { item: Activity }) => {
        const details: any = item.details || {};

        let iconName = "notifications-outline";
        let iconColor = Colors.primary;
        let mainText = "";
        let subText = "";
        let amountText = "";
        let amountTextColor = Colors.text;
        let isClickable = false;

        // Determine UI based on Action Type
        switch (item.action) {
            case 'expense_created':
                iconName = "receipt-outline";
                iconColor = Colors.primary;
                mainText = `${details.creator_name || 'Someone'} added "${details.description}"`;
                // Show the total amount. 
                // Note: We can't show "You owe X" here because the 'details' JSON only includes the total.
                amountText = formatCurrency(details.amount);
                isClickable = true;
                break;

            case 'joined_group':
                iconName = "people-outline";
                iconColor = Colors.secondary || '#9C27B0';
                mainText = `You were added to group "${details.group_name}"`;
                break;

            case 'paid_settlement':
                iconName = "cash-outline";
                iconColor = Colors.success;
                mainText = `You paid ${details.payee_name || 'someone'}`;
                amountText = formatCurrency(details.amount);
                amountTextColor = Colors.success;
                break;

            case 'received_settlement':
                iconName = "cash-outline";
                iconColor = Colors.success;
                mainText = `${details.payer_name || 'Someone'} paid you`;
                amountText = formatCurrency(details.amount);
                amountTextColor = Colors.success;
                break;

            default:
                mainText = "New Activity";
        }

        const timeAgo = new Date(item.created_at).toLocaleString();

        const Container = isClickable ? TouchableOpacity : View;

        return (
            <Container
                style={styles.item}
                onPress={isClickable ? () => {
                    // Navigate only if it's an expense 
                    if (item.action === 'expense_created') {
                        // We need to fetch the full expense object to navigate to details, 
                        // but currently we only have 'Activity'. 
                        // Ideally, we would navigate to ExpenseDetail by ID and let it fetch.
                        // navigation.navigate('ExpenseDetail', { expenseId: item.target_id });
                        // For now, disabling navigation to prevent crash until ExpenseDetail supports ID-only load.
                    }
                } : undefined}
            >
                <View style={[styles.iconBox, { backgroundColor: iconColor === Colors.success ? '#E8F5E9' : '#E3F2FD' }]}>
                    <Ionicons name={iconName} size={24} color={iconColor} />
                </View>
                <View style={styles.content}>
                    <Text style={styles.actionText}>{mainText}</Text>
                    <Text style={styles.subText}>
                        {amountText ? <Text style={[styles.amount, { color: amountTextColor }]}>{amountText} • </Text> : null}
                        {timeAgo}
                    </Text>
                </View>
            </Container>
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
                                <Text style={{ color: '#999' }}>No activity yet</Text>
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
    content: { flex: 1, justifyContent: 'center' },
    actionText: { fontSize: 16, color: '#333', marginBottom: 4 },
    subText: { fontSize: 14, color: '#999' },
    amount: { fontWeight: 'bold' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
});

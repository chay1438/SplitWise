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
    const { data: activities = [], isLoading } = useGetActivitiesQuery({ userId: user?.id || '' }, { skip: !user?.id });

    const renderActivityItem = ({ item }: { item: any }) => {
        const details = item.details || {};
        let actionText = "";
        let subText = "";
        let iconName = "notifications-outline";
        let iconColor = Colors.primary;
        let amountDisplay = null;

        switch (item.action) {
            case 'expense_created':
                iconName = "receipt-outline";
                iconColor = Colors.primary;
                actionText = `Added "${details.description}"`;
                subText = details.creator_name ? `by ${details.creator_name}` : 'Expense added';
                amountDisplay = (
                    <Text style={[styles.amount, { color: Colors.error }]}>
                        {formatCurrency(details.amount)}
                    </Text>
                );
                break;

            case 'paid_settlement':
                iconName = "arrow-up-circle-outline";
                iconColor = Colors.success;
                actionText = `You paid ${details.payee_name}`;
                amountDisplay = (
                    <Text style={[styles.amount, { color: Colors.success }]}>
                        {formatCurrency(details.amount)}
                    </Text>
                );
                break;

            case 'received_settlement':
                iconName = "arrow-down-circle-outline";
                iconColor = Colors.success;
                actionText = `${details.payer_name} paid you`;
                amountDisplay = (
                    <Text style={[styles.amount, { color: Colors.success }]}>
                        {formatCurrency(details.amount)}
                    </Text>
                );
                break;

            case 'joined_group':
                iconName = "people-outline";
                iconColor = "#9C27B0";
                actionText = `You joined "${details.group_name}"`;
                break;

            default:
                actionText = "New Activity";
                break;
        }

        const timeAgo = new Date(item.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        return (
            <TouchableOpacity
                style={styles.item}
                disabled={!item.target_id || item.action === 'joined_group'} // Disable click for now if simpler
            // onPress={() => navigation.navigate('ExpenseDetail', { expenseId: item.target_id })} // Future improvement
            >
                <View style={[styles.iconBox, { backgroundColor: iconColor + '20' }]}>
                    <Ionicons name={iconName} size={24} color={iconColor} />
                </View>
                <View style={styles.content}>
                    <Text style={styles.actionText}>{actionText}</Text>
                    <Text style={styles.subText}>
                        {amountDisplay && <>{amountDisplay} • </>}
                        {subText || timeAgo}
                    </Text>
                    {amountDisplay && <Text style={styles.dateText}>{timeAgo}</Text>}
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
                {/* Filter Placeholder */}
                <TouchableOpacity>
                    <Ionicons name="filter" size={24} color="#fff" />
                </TouchableOpacity>
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
                                <Text style={{ color: '#999', textAlign: 'center', marginHorizontal: 40 }}>
                                    No recent activity. Create expenses in a group to see them here.
                                </Text>
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
        flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f9f9f9', alignItems: 'center'
    },
    iconBox: {
        width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 16,
    },
    content: { flex: 1 },
    actionText: { fontSize: 16, color: '#333', marginBottom: 4, fontWeight: '500' },
    subText: { fontSize: 13, color: '#666' },
    amount: { fontWeight: 'bold' },
    dateText: { fontSize: 11, color: '#999', marginTop: 4 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 50 },
});

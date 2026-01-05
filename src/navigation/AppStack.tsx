import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabs from './BottomTabs';
import MakeGroupScreen from '../screens/home/MakeGroupScreen';
import GroupDetailsScreen from '../screens/home/GroupDetailsScreen';
import AddExpenseScreen from '../screens/home/AddExpenseScreen';
import SettleUpScreen from '../screens/home/SettleUpScreen';
import { AppStackParamList } from './types';
import AddGroupMemberScreen from '../screens/groups/AddGroupMemberScreen';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
                name="MainTabs"
                component={BottomTabs}
            />
            <Stack.Screen
                name="MakeGroup"
                component={MakeGroupScreen}
                options={{ title: 'Create New Group', headerShown: true }}
            />
            <Stack.Screen
                name="EditGroup"
                component={MakeGroupScreen}
                options={{ title: 'Edit Group', headerShown: true }}
            />
            <Stack.Screen
                name="GroupDetails"
                component={GroupDetailsScreen}
                options={{ title: 'Group Details', headerShown: true }}
            />
            <Stack.Screen
                name="AddExpense"
                component={AddExpenseScreen}
                options={{ title: 'Add Expense', headerShown: true }}
            />
            <Stack.Screen
                name="SettleUp"
                component={SettleUpScreen}
                options={{ title: 'Settle Up', headerShown: true }}
            />
            <Stack.Screen
                name="ExpenseDetail"
                component={require('../screens/home/ExpenseDetailScreen').default}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="FriendDetail"
                component={require('../screens/home/FriendDetailScreen').default}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Notifications"
                component={require('../screens/home/NotificationsScreen').default}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Search"
                component={require('../screens/home/SearchScreen').default}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ReceiptViewer"
                component={require('../screens/home/ReceiptViewerScreen').default}
                options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'simple_push' }}
            />
            <Stack.Screen
                name="Filter"
                component={require('../screens/home/FilterScreen').default}
                options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
                name="CategorySelector"
                component={require('../screens/home/CategorySelectorScreen').default}
                options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
                name="EditExpense"
                component={require('../screens/home/EditExpenseScreen').default}
                options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
                name="AddGroupMember"
                component={AddGroupMemberScreen}
                options={{
                    title: 'Add Group Member',
                    headerShown: true,
                    headerBackTitle: 'Back'
                }}
            />
        </Stack.Navigator>
    );
}

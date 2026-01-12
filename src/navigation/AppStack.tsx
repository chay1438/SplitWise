import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabs from './BottomTabs';
import MakeGroupScreen from '../screens/home/MakeGroupScreen';
import GroupDetailsScreen from '../screens/home/GroupDetailsScreen';
import AddExpenseScreen from '../screens/home/AddExpenseScreen';
import GroupSettleUpScreen from '../screens/home/GroupSettleUpScreen';
import { AppStackParamList } from './types';
import AddGroupMemberScreen from '../screens/groups/AddGroupMemberScreen';

import EditGroupScreen from '../screens/groups/EditGroupScreen';
import GroupMembersScreen from '../screens/groups/GroupMembersScreen';
import GroupSettingsScreen from '../screens/groups/GroupSettingsScreen';
import ExitGroupScreen from '../screens/groups/ExitGroupScreen';
import DeleteGroupScreen from '../screens/groups/DeleteGroupScreen';
import GroupAddExpenseScreen from '../screens/groups/GroupAddExpenseScreen';

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
                options={{ title: 'Create New Group', headerShown: false }}
            />
            <Stack.Screen
                name="EditGroup"
                component={EditGroupScreen}
                options={{ title: 'Edit Group', headerShown: false }}
            />
            <Stack.Screen
                name="GroupMembers"
                component={GroupMembersScreen}
                options={{ title: 'Group Members', headerShown: false }} // Assuming ScreenWrapper handles header or customized header
            />
            <Stack.Screen
                name="GroupDetails"
                component={GroupDetailsScreen}
                options={{ title: 'Group Details', headerShown: false }}
            />
            <Stack.Screen
                name="GroupSettings"
                component={GroupSettingsScreen}
                options={{
                    headerShown: false,
                    presentation: 'transparentModal',
                    animation: 'fade'
                }}
            />
            <Stack.Screen
                name="ExitGroup"
                component={ExitGroupScreen}
                options={{
                    headerShown: false,
                    presentation: 'transparentModal',
                    animation: 'fade'
                }}
            />
            <Stack.Screen
                name="DeleteGroup"
                component={DeleteGroupScreen}
                options={{
                    headerShown: false,
                    presentation: 'transparentModal',
                    animation: 'fade'
                }}
            />
            <Stack.Screen
                name="AddExpense"
                component={AddExpenseScreen}
                options={{ title: 'Add Expense', headerShown: true }}
            />
            <Stack.Screen
                name="GroupAddExpense"
                component={GroupAddExpenseScreen}
                options={{ title: 'Add Group Expense', headerShown: false }}
            />
            <Stack.Screen
                name="GroupSettleUp"
                component={GroupSettleUpScreen}
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
                name="EditExpense"
                component={AddExpenseScreen}
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
            <Stack.Screen
                name="AddFriend"
                component={require('../screens/home/AddFriendScreen').default}
                options={{ headerShown: false, presentation: 'modal' }}
            />
            <Stack.Screen
                name="EditProfile"
                component={require('../screens/home/EditProfileScreen').default}
                options={{ headerShown: false }}
            />
        </Stack.Navigator>
    );
}

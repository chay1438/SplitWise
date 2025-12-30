import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabs from './BottomTabs';
import MakeGroupScreen from '../screens/home/MakeGroupScreen';
import GroupDetailsScreen from '../screens/home/GroupDetailsScreen';
import { AppStackParamList } from './types';

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
                name="GroupDetails"
                component={GroupDetailsScreen}
                options={{ title: 'Group Details', headerShown: true }}
            />
        </Stack.Navigator>
    );
}

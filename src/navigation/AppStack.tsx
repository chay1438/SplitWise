import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import MakeGroupScreen from '../screens/home/MakeGroupScreen';
import GroupDetailsScreen from '../screens/home/GroupDetailsScreen';

import { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'My Groups' }}
            />
            <Stack.Screen
                name="MakeGroup"
                component={MakeGroupScreen}
                options={{ title: 'Create New Group' }}
            />
        </Stack.Navigator>
    );
}

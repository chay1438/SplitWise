import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/home/HomeScreen';
import GroupsScreen from '../screens/home/GroupsScreen';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, Platform } from 'react-native';
import { BottomTabParamList } from './types';

import FriendsScreen from '../screens/home/FriendsScreen';

import AccountScreen from '../screens/home/AccountScreen';

import ActivityScreen from '../screens/home/ActivityScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export default function BottomTabs() {
    const insets = useSafeAreaInsets();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName: string = 'home';

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Groups') {
                        iconName = focused ? 'people' : 'people-outline';
                    } else if (route.name === 'Friends') {
                        iconName = focused ? 'person' : 'person-outline';
                    } else if (route.name === 'Activity') {
                        iconName = focused ? 'time' : 'time-outline';
                    } else if (route.name === 'Account') {
                        iconName = focused ? 'settings' : 'settings-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#FF5A5F',
                tabBarInactiveTintColor: 'gray',
                tabBarStyle: {
                    paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
                    height: Platform.OS === 'ios' ? 60 + insets.bottom : 70,
                    borderTopWidth: 0,
                    elevation: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    backgroundColor: '#fff',
                }
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Groups" component={GroupsScreen} />
            <Tab.Screen name="Friends" component={FriendsScreen} />
            <Tab.Screen name="Activity" component={ActivityScreen} />
            <Tab.Screen name="Account" component={AccountScreen} />
        </Tab.Navigator>
    );
}

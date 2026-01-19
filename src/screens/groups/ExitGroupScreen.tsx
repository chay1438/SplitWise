import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/types';
import { useLeaveGroupMutation } from '../../store/api/groupsApi';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { Colors, Typography } from '../../constants';
import Ionicons from 'react-native-vector-icons/Ionicons';

type RouteProps = RouteProp<AppStackParamList, 'ExitGroup'>;

export default function ExitGroupScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProps>();
    const { groupId } = route.params;
    const currentUser = useCurrentUser();
    const currentUserId = currentUser.id;

    const [leaveGroup, { isLoading: isLeaving }] = useLeaveGroupMutation();

    const handleLeave = async () => {
        try {
            // No extra alert needed, this screen is the confirmation
            await leaveGroup({ groupId, userId: currentUserId! }).unwrap();
            navigation.popToTop(); // Go Home
        } catch (e: any) {
            Alert.alert("Error", e.message);
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => navigation.goBack()} />

            <View style={styles.modalContent}>
                <View style={styles.iconContainer}>
                    <Ionicons name="log-out-outline" size={40} color={Colors.error} />
                </View>

                <Text style={styles.title}>Exit Group?</Text>

                <Text style={styles.warningText}>
                    Are you sure you want to leave this group? You won't be able to see expenses anymore unless you are added back.
                </Text>

                <View style={styles.buttonGroup}>
                    <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => navigation.goBack()}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.leaveButton]} onPress={handleLeave} disabled={isLeaving}>
                        {isLeaving ? <ActivityIndicator color="#fff" /> : (
                            <Text style={styles.leaveText}>Exit Group</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    modalContent: {
        width: '85%',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5
    },
    iconContainer: {
        marginBottom: 16,
        padding: 16,
        backgroundColor: '#fff0f0',
        borderRadius: 50,
    },
    title: { ...Typography.h3, color: '#333', marginBottom: 12 },
    warningText: { ...Typography.body1, textAlign: 'center', color: '#666', marginBottom: 24 },
    buttonGroup: { flexDirection: 'row', width: '100%', gap: 12 },
    button: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    cancelButton: { backgroundColor: '#f0f0f0' },
    leaveButton: { backgroundColor: Colors.error },
    cancelText: { ...Typography.button, color: '#666' },
    leaveText: { ...Typography.button, color: '#fff' }
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/types';
import { useDeleteGroupMutation } from '../../store/api/groupsApi';
import { Colors, Typography } from '../../constants';
import Ionicons from 'react-native-vector-icons/Ionicons';

type RouteProps = RouteProp<AppStackParamList, 'DeleteGroup'>;

export default function DeleteGroupScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProps>();
    const { groupId } = route.params;

    const [deleteGroup, { isLoading: isDeleting }] = useDeleteGroupMutation();

    const handleDelete = async () => {
        try {
            // No extra alert needed if this screen itself acts as the confirmation modal
            await deleteGroup(groupId).unwrap();
            navigation.popToTop(); // Go Home
        } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to delete group");
        }
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => navigation.goBack()} />

            <View style={styles.modalContent}>
                <View style={styles.iconContainer}>
                    <Ionicons name="trash-bin-outline" size={40} color={Colors.error} />
                </View>

                <Text style={styles.title}>Delete Group?</Text>

                <Text style={styles.warningText}>
                    You are about to delete this group permanently. All data including expenses and balances will be erased for everyone.
                </Text>

                <View style={styles.buttonGroup}>
                    <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={() => navigation.goBack()}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDelete} disabled={isDeleting}>
                        {isDeleting ? <ActivityIndicator color="#fff" /> : (
                            <Text style={styles.deleteText}>Delete</Text>
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
    deleteButton: { backgroundColor: Colors.error },
    cancelText: { ...Typography.button, color: '#666' },
    deleteText: { ...Typography.button, color: '#fff' }
});

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { ScreenWrapper } from '../../components/common/ScreenWrapper';
import { Colors, Spacing, Typography } from '../../constants';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useUpdateProfileMutation } from '../../store/api/authApi';

export default function EditProfileScreen() {
    const navigation = useNavigation();
    const { user, profile } = useAuth();
    const [updateProfile, { isLoading }] = useUpdateProfileMutation();

    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [email, setEmail] = useState(user?.email || ''); // Read Only
    const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setPhoneNumber(profile.phone_number || '');
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user || !profile) return;
        if (!fullName.trim()) {
            Alert.alert("Error", "Full Name is required");
            return;
        }

        try {
            await updateProfile({
                id: user.id,
                full_name: fullName,
                phone_number: phoneNumber,
            }).unwrap();

            Alert.alert("Success", "Profile updated successfully");
            navigation.goBack();
        } catch (error: any) {
            console.error("Profile update failed", error);
            Alert.alert("Error", error.message || "Failed to update profile");
        }
    };

    return (
        <ScreenWrapper style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginLeft: -8 }}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={isLoading} style={styles.saveBtn}>
                    {isLoading ? <ActivityIndicator color={Colors.primary} size="small" /> : <Text style={styles.saveText}>Save</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Form */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="Your Name"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Email (Cannot be changed)</Text>
                    <TextInput
                        style={[styles.input, styles.disabledInput]}
                        value={email}
                        editable={false}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        placeholder="Optional"
                        keyboardType="phone-pad"
                    />
                </View>

            </ScrollView>
        </ScreenWrapper>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee'
    },
    title: { ...Typography.h3, color: '#333' },
    saveBtn: { padding: 8 },
    saveText: { ...Typography.button, color: Colors.primary },
    content: { padding: 20 },
    formGroup: { marginBottom: 20 },
    label: { ...Typography.label, color: '#666', marginBottom: 8, textTransform: 'uppercase' },
    input: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12,
        ...Typography.body1, color: '#333', backgroundColor: '#fff'
    },
    disabledInput: { backgroundColor: '#f9f9f9', color: '#999' }
});

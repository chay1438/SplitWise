import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { supabase } from '../../lib/supabase';

const VerifyEmailScreen = ({ route, navigation }: any) => {
    const { email } = route.params || {};
    const [resending, setResending] = useState(false);

    const handleOpenEmail = () => {
        // Tries to open the default email client
        Linking.openURL('mailto:');
    };

    const handleResendEmail = async () => {
        if (!email) return;
        setResending(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email,
            });
            if (error) throw error;
            alert('Verification email sent!');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setResending(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe}>
            <View style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="mail-unread-outline" size={64} color="#FF8A34" />
                    </View>

                    <Text style={styles.title}>Check your email</Text>
                    <Text style={styles.description}>
                        We have sent a verification link to{' '}
                        <Text style={styles.emailText}>{email || 'your email'}</Text>.
                    </Text>
                    <Text style={styles.subDescription}>
                        Please verify your email to continue.
                    </Text>

                    <TouchableOpacity style={styles.primaryButton} onPress={handleOpenEmail}>
                        <Text style={styles.primaryButtonText}>Open Email App</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleResendEmail}
                        disabled={resending}
                    >
                        <Text style={styles.secondaryButtonText}>
                            {resending ? 'Sending...' : 'Resend Email'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.textButton}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Text style={styles.textButtonText}>Back to Login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default VerifyEmailScreen;

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#0B0B0F',
    },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 138, 52, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 24,
    },
    subDescription: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
        marginBottom: 32,
    },
    emailText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    primaryButton: {
        backgroundColor: '#FF8A34',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
    },
    secondaryButton: {
        backgroundColor: '#14141A',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#2A2A33',
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    textButton: {
        padding: 8,
    },
    textButtonText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
    },
});

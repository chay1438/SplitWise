import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native'
import Icon from 'react-native-vector-icons/Ionicons'
import { useResetPasswordMutation } from '../../store/api/authApi'

export default function ForgotPasswordScreen({ navigation }: any) {
    const [resetPassword, { isLoading: loading }] = useResetPasswordMutation()

    // Local state for UI only (removing loading since hook handles it)
    // const [loading, setLoading] = useState(false) <-- Removed
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [errorMessage, setErrorMessage] = useState('')

    const handleResetPassword = async () => {
        setMessage('')
        setErrorMessage('')

        if (!email) {
            setErrorMessage('Please enter your email address')
            return
        }

        try {
            await resetPassword(email).unwrap()
            setMessage('Check your email for the password reset link.')
        } catch (err: any) {
            setErrorMessage(err.data?.error || err.message || 'An unexpected error occurred')
        }
    }

    return (
        <View style={styles.container}>
            {/* Back Button */}
            <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.goBack()}
            >
                <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your
                password.
            </Text>

            {/* Email */}
            <Text style={styles.label}>Email</Text>
            <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#777"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
            />

            {/* Success Message */}
            {message ? (
                <Text style={styles.successText}>{message}</Text>
            ) : null}

            {/* Error Message */}
            {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            {/* Reset Button */}
            <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetPassword}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#000" />
                ) : (
                    <Text style={styles.resetText}>Send Instructions</Text>
                )}
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0B0B0B',
        padding: 24,
        justifyContent: 'center',
    },
    backBtn: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 10,
    },
    title: {
        fontSize: 28,
        color: '#fff',
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 10,
    },
    subtitle: {
        color: '#aaa',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 20,
    },
    label: {
        color: '#ccc',
        marginBottom: 6,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#161616',
        borderRadius: 12,
        padding: 14,
        color: '#fff',
        marginBottom: 20,
    },
    resetBtn: {
        backgroundColor: '#FF8C32',
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 10,
    },
    resetText: {
        fontWeight: '700',
        color: '#000',
    },
    errorText: {
        color: '#EF4444',
        marginBottom: 12,
        textAlign: 'center',
    },
    successText: {
        color: '#10B981',
        marginBottom: 12,
        textAlign: 'center',
    },
})

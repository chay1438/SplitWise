import React, { useState, useEffect } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
} from 'react-native'
import Icon from 'react-native-vector-icons/Ionicons'
import { useUpdatePasswordMutation } from '../../store/api/authApi'

export default function UpdatePasswordScreen({ navigation }: any) {
    const [updatePassword, { isLoading: loading }] = useUpdatePasswordMutation()

    // const [loading, setLoading] = useState(false)
    const [password, setPassword] = useState('')
    const [errorMessage, setErrorMessage] = useState('')
    const [secure, setSecure] = useState(true)

    const handleUpdatePassword = async () => {
        setErrorMessage('')

        if (!password) {
            setErrorMessage('Please enter a new password')
            return
        }

        if (password.length < 6) {
            setErrorMessage('Password must be at least 6 characters')
            return
        }

        try {
            await updatePassword(password).unwrap()
            alert('Password updated successfully! Please log in.')
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            })
        } catch (err: any) {
            setErrorMessage(err.data?.error || err.message || 'An unexpected error occurred')
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>New Password</Text>
            <Text style={styles.subtitle}>
                Please enter your new password below.
            </Text>

            {/* Password */}
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordContainer}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder="New password"
                    placeholderTextColor="#777"
                    secureTextEntry={secure}
                    value={password}
                    onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setSecure(!secure)}>
                    <Icon
                        name={secure ? 'eye-outline' : 'eye-off-outline'}
                        size={20}
                        color="#999"
                    />
                </TouchableOpacity>
            </View>

            {/* Error Message */}
            {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}

            {/* Update Button */}
            <TouchableOpacity
                style={styles.btn}
                onPress={handleUpdatePassword}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#000" />
                ) : (
                    <Text style={styles.btnText}>Update Password</Text>
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
    },
    label: {
        color: '#ccc',
        marginBottom: 6,
        marginTop: 12,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#161616',
        borderRadius: 12,
        paddingHorizontal: 14,
    },
    passwordInput: {
        flex: 1,
        paddingVertical: 14,
        color: '#fff',
    },
    btn: {
        backgroundColor: '#FF8C32',
        padding: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 24,
    },
    btnText: {
        fontWeight: '700',
        color: '#000',
    },
    errorText: {
        color: '#EF4444',
        marginBottom: 12,
        textAlign: 'center',
        marginTop: 12,
    },
})

import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native'
import Icon from 'react-native-vector-icons/Ionicons';
import { useSignInMutation } from '../../store/api/authApi';

export default function LoginScreen({ navigation, route }: any) {
  const [email, setEmail] = useState(route.params?.email || '')
  const [password, setPassword] = useState('')
  const [secure, setSecure] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState(route.params?.successMessage || '')

  const [signIn, { isLoading: loading }] = useSignInMutation();

  const handleLogin = async () => {
    setErrorMessage('')
    setSuccessMessage('') // Clear success message when logging in

    if (!email || !password) {
      setErrorMessage('Please enter both email and password')
      return
    }

    try {
      const res = await signIn({ email, password }).unwrap();
      // On success, the store will update and auth listener will redirect
    } catch (err: any) {
      console.log('Login error:', err);
      let msg = 'An unexpected error occurred';

      if (typeof err === 'string') {
        msg = err;
      } else if (err?.error) {
        msg = err.error;
      } else if (err?.message) {
        msg = err.message;
      } else if (err?.data?.error) {
        msg = err.data.error;
      } else if (err?.data?.message) {
        msg = err.data.message;
      }

      if (msg.includes('Invalid login credentials')) {
        setErrorMessage('Incorrect email or password. Please try again.')
      } else if (msg.includes('Email not confirmed')) {
        setErrorMessage('Please verify your email address before logging in.')
      } else {
        setErrorMessage(msg)
      }
    }
  }

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>
        Sign in to continue to <Text style={styles.highlight}>Split</Text>
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

      {/* Password */}
      <Text style={styles.label}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Enter your password"
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

      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgot}>Forgot password?</Text>
      </TouchableOpacity>

      {successMessage ? (
        <Text style={{ color: '#10B981', marginBottom: 12, marginTop: 16, textAlign: 'center', fontSize: 14 }}>
          ✓ {successMessage}
        </Text>
      ) : null}

      {errorMessage ? (
        <Text style={{ color: '#EF4444', marginBottom: 12, marginTop: successMessage ? 0 : 16, textAlign: 'center' }}>
          {errorMessage}
        </Text>
      ) : null}

      {/* Login Button */}
      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}>
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.loginText}>Log in</Text>
        )}
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.line} />
        <Text style={styles.or}>or</Text>
        <View style={styles.line} />
      </View>

      {/* Google Login */}
      <TouchableOpacity style={styles.googleBtn}>
        <Icon name="logo-google" size={20} color="#000" />
        <Text style={styles.googleText}>Continue with Google</Text>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
          <Text style={styles.signup}> Sign up</Text>
        </TouchableOpacity>
      </View>
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
  },
  subtitle: {
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 32,
  },
  highlight: {
    color: '#FF8C32',
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
  forgot: {
    color: '#4da6ff',
    textAlign: 'right',
    marginTop: 8,
  },
  loginBtn: {
    backgroundColor: '#FF8C32',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  loginText: {
    fontWeight: '700',
    color: '#000',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  or: {
    color: '#777',
    marginHorizontal: 10,
  },
  googleBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleText: {
    marginLeft: 10,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#aaa',
  },
  signup: {
    color: '#FF8C32',
    fontWeight: '600',
  },
})

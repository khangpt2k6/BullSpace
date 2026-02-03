import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput, Card } from 'react-native-paper';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { USF_GREEN } from '../../theme/colors';

export default function AuthScreen() {
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!signInLoaded) return;

    setLoading(true);
    setError('');

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      // Set the active session
      await setActiveSignIn({ session: result.createdSessionId });
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.errors?.[0]?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signUpLoaded) return;

    setLoading(true);
    setError('');

    try {
      // Create the user
      await signUp.create({
        emailAddress: email,
        password,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' ') || undefined,
      });

      // Send email verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });


      // Create session after signup
      await setActiveSignUp({ session: signUp.createdSessionId });
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.errors?.[0]?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.title}>
            🎓 BullRoom
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            USF Study Room Booking
          </Text>
        </View>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.cardTitle}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </Text>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {!isLogin && (
              <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                autoCapitalize="words"
              />
            )}

            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
            />

            <Button
              mode="contained"
              onPress={isLogin ? handleLogin : handleSignup}
              loading={loading}
              disabled={loading || !email || !password || (!isLogin && !name)}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              {isLogin ? 'Log In' : 'Sign Up'}
            </Button>

            <Button
              mode="text"
              onPress={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              style={styles.switchButton}
            >
              {isLogin
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Log In'}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontWeight: 'bold',
    color: USF_GREEN,
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
  },
  card: {
    elevation: 4,
  },
  cardTitle: {
    fontWeight: 'bold',
    color: USF_GREEN,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorText: {
    color: '#D32F2F',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
  buttonContent: {
    height: 50,
  },
  switchButton: {
    marginTop: 8,
  },
});

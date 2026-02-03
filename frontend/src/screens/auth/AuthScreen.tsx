import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Button, TextInput, Card, Divider } from 'react-native-paper';
import { useSignIn, useSignUp, useOAuth } from '@clerk/clerk-expo';
import { useWarmUpBrowser } from '../../hooks/useWarmUpBrowser';
import { USF_GREEN } from '../../theme/colors';
import * as WebBrowser from 'expo-web-browser';

// Important: Close the browser when done
WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen() {
  // Warm up browser for better OAuth UX
  useWarmUpBrowser();

  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  // OAuth hooks
  const { startOAuthFlow: startGoogleOAuth } = useOAuth({ strategy: 'oauth_google' });
  const { startOAuthFlow: startGitHubOAuth } = useOAuth({ strategy: 'oauth_github' });
  const { startOAuthFlow: startLinkedInOAuth } = useOAuth({ strategy: 'oauth_linkedin' });

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

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

      // Show verification input instead of creating session immediately
      setPendingVerification(true);
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.errors?.[0]?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!signUpLoaded) return;

    setLoading(true);
    setError('');

    try {
      // Verify the email with the code
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code: verificationCode,
      });

      // Create session after successful verification
      await setActiveSignUp({ session: completeSignUp.createdSessionId });
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.errors?.[0]?.message || 'Verification failed. Please check your code.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = useCallback(
    async (startOAuth: any) => {
      try {
        setLoading(true);
        setError('');

        console.log('🔐 Starting OAuth flow...');
        const { createdSessionId, setActive, signIn, signUp } = await startOAuth();

        console.log('✅ OAuth response:', { createdSessionId, hasSetActive: !!setActive, signIn, signUp });

        // Check if we have a session ID to activate
        if (createdSessionId) {
          console.log('🔄 Setting active session:', createdSessionId);
          await setActive({ session: createdSessionId });
          console.log('✅ Session activated successfully!');
        } 
        // If no session but we have a signUp with a session, activate it
        else if (signUp?.createdSessionId) {
          console.log('🔄 Activating signUp session:', signUp.createdSessionId);
          await setActive({ session: signUp.createdSessionId });
          console.log('✅ SignUp session activated!');
        }
        // If no session but we have a signIn with a session, activate it
        else if (signIn?.createdSessionId) {
          console.log('🔄 Activating signIn session:', signIn.createdSessionId);
          await setActive({ session: signIn.createdSessionId });
          console.log('✅ SignIn session activated!');
        }
        else {
          console.warn('⚠️ No session found in OAuth response', { 
            createdSessionId, 
            signInSessionId: signIn?.createdSessionId,
            signUpSessionId: signUp?.createdSessionId,
            signInStatus: signIn?.status,
            signUpStatus: signUp?.status
          });
          setError('Authentication completed but session creation failed. Please try logging in manually.');
        }
      } catch (err: any) {
        console.error('❌ OAuth error:', err);
        console.error('Error details:', JSON.stringify(err, null, 2));
        setError(err.message || 'OAuth sign in failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
              {pendingVerification ? 'Verify Your Email' : isLogin ? 'Welcome Back' : 'Create Account'}
            </Text>

            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            {/* Email Verification Form */}
            {pendingVerification ? (
              <>
                <Text style={styles.verificationText}>
                  We've sent a verification code to {email}. Please enter it below.
                </Text>

                <TextInput
                  label="Verification Code"
                  value={verificationCode}
                  onChangeText={setVerificationCode}
                  mode="outlined"
                  style={styles.input}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  disabled={loading}
                  placeholder="Enter 6-digit code"
                />

                <Button
                  mode="contained"
                  onPress={handleVerifyEmail}
                  loading={loading}
                  disabled={loading || !verificationCode}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                >
                  Verify Email
                </Button>

                <Button
                  mode="text"
                  onPress={() => {
                    setPendingVerification(false);
                    setVerificationCode('');
                    setError('');
                  }}
                  disabled={loading}
                  style={styles.switchButton}
                >
                  Back to Sign Up
                </Button>
              </>
            ) : (
              <>
                {/* Social Login Buttons */}
                <View style={styles.socialContainer}>
              <Button
                mode="outlined"
                onPress={() => handleOAuthSignIn(startGoogleOAuth)}
                disabled={loading}
                style={styles.socialButton}
                icon="google"
              >
                Continue with Google
              </Button>

              <Button
                mode="outlined"
                onPress={() => handleOAuthSignIn(startGitHubOAuth)}
                disabled={loading}
                style={styles.socialButton}
                icon="github"
              >
                Continue with GitHub
              </Button>

              <Button
                mode="outlined"
                onPress={() => handleOAuthSignIn(startLinkedInOAuth)}
                disabled={loading}
                style={styles.socialButton}
                icon="linkedin"
              >
                Continue with LinkedIn
              </Button>
            </View>

            <View style={styles.dividerContainer}>
              <Divider style={styles.divider} />
              <Text style={styles.dividerText}>OR</Text>
              <Divider style={styles.divider} />
            </View>

            {/* Email/Password Form */}
            {!isLogin && (
              <TextInput
                label="Full Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                autoCapitalize="words"
                disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
              style={styles.switchButton}
            >
              {isLogin
                ? "Don't have an account? Sign Up"
                : 'Already have an account? Log In'}
            </Button>
              </>
            )}
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
  verificationText: {
    marginBottom: 16,
    textAlign: 'center',
    color: '#666',
  },
  socialContainer: {
    marginBottom: 16,
  },
  socialButton: {
    marginBottom: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#999',
    fontWeight: '600',
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

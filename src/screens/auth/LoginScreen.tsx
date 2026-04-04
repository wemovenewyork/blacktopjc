import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;
type AuthMode = 'phone' | 'email';

export function LoginScreen({ navigation }: Props) {
  const [mode, setMode] = useState<AuthMode>('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  async function handlePhoneSubmit() {
    if (!phone || phone.length < 10) {
      setError('Enter a valid phone number');
      return;
    }
    setLoading(true);
    setError('');
    const formattedPhone = phone.startsWith('+1') ? phone : `+1${phone.replace(/\D/g, '')}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigation.navigate('PhoneVerify', { phone: formattedPhone });
    }
  }

  async function handleEmailSubmit() {
    if (!email || !password) {
      setError('Enter email and password');
      return;
    }
    setLoading(true);
    setError('');

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
    }
    // On success, the auth state listener in RootNavigator will handle navigation
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.title}>JOIN THE GAME</Text>
        <Text style={styles.subtitle}>Sign in or create your account</Text>

        {/* Mode toggle */}
        <View style={styles.toggleRow}>
          {(['phone', 'email'] as AuthMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.toggleButton, mode === m && styles.toggleButtonActive]}
              onPress={() => { setMode(m); setError(''); }}
            >
              <Text style={[styles.toggleText, mode === m && styles.toggleTextActive]}>
                {m.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Phone form */}
        {mode === 'phone' && (
          <View style={styles.form}>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇺🇸 +1</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="(555) 000-0000"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handlePhoneSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>CONTINUE WITH PHONE</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Email form */}
        {mode === 'email' && (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <View style={styles.signupToggle}>
              <Text style={styles.signupToggleText}>
                {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
              </Text>
              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.signupToggleLink}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleEmailSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isSignUp ? 'CREATE ACCOUNT' : 'CONTINUE WITH EMAIL'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.legal}>
          By continuing, you agree to Blacktop JC's Terms of Service and Privacy Policy.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingTop: 60, paddingBottom: Spacing.xxl },
  backButton: { marginBottom: Spacing.xl },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 40,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: Spacing.xl,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
  },
  toggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
  toggleTextActive: {
    color: Colors.textPrimary,
  },
  form: { gap: Spacing.md },
  phoneRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  countryCode: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  countryCodeText: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  signupToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signupToggleText: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  signupToggleLink: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  primaryButtonText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  error: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.sm,
    color: Colors.error,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  legal: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
    lineHeight: 16,
  },
});

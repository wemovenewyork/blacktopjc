import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'PhoneVerify'>;

export function PhoneVerifyScreen({ navigation, route }: Props) {
  const { phone } = route.params;
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function handleDigitChange(text: string, index: number) {
    if (text.length > 1) {
      // Handle paste
      const pastedDigits = text.slice(0, 6).split('');
      const newDigits = [...digits];
      pastedDigits.forEach((d, i) => {
        if (index + i < 6) newDigits[index + i] = d;
      });
      setDigits(newDigits);
      inputRefs.current[Math.min(index + pastedDigits.length, 5)]?.focus();
      if (newDigits.every((d) => d !== '')) {
        handleVerify(newDigits.join(''));
      }
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = text;
    setDigits(newDigits);

    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newDigits.every((d) => d !== '')) {
      handleVerify(newDigits.join(''));
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(code?: string) {
    const token = code ?? digits.join('');
    if (token.length !== 6) {
      setError('Enter all 6 digits');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
    setLoading(false);
    if (error) {
      setError(error.message);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
    // On success, auth state listener handles navigation
  }

  async function handleResend() {
    if (!canResend) return;
    setCanResend(false);
    setCountdown(60);
    setError('');
    await supabase.auth.signInWithOtp({ phone });
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { setCanResend(true); clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>

      <Text style={styles.title}>ENTER CODE</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to</Text>
      <Text style={styles.phone}>{phone}</Text>

      <View style={styles.codeRow}>
        {digits.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { inputRefs.current[index] = ref; }}
            style={[styles.digitInput, digit && styles.digitInputFilled]}
            value={digit}
            onChangeText={(text) => handleDigitChange(text, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            keyboardType="number-pad"
            maxLength={6}
            selectTextOnFocus
            autoFocus={index === 0}
          />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => handleVerify()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryButtonText}>VERIFY CODE</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={handleResend} disabled={!canResend} style={styles.resendButton}>
        <Text style={[styles.resendText, !canResend && styles.resendTextDisabled]}>
          {canResend ? 'Resend code' : `Resend in ${countdown}s`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.xl, paddingTop: 60 },
  backButton: { marginBottom: Spacing.xl },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 40, color: Colors.textPrimary, letterSpacing: 2 },
  subtitle: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textMuted, marginTop: 4 },
  phone: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.lg, color: Colors.secondary, marginTop: 4, marginBottom: Spacing.xl },
  codeRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  digitInput: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  digitInputFilled: { borderColor: Colors.primary },
  error: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.error, marginBottom: Spacing.md, textAlign: 'center' },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  primaryButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.xl, color: Colors.textPrimary, letterSpacing: 2 },
  resendButton: { alignItems: 'center' },
  resendText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.primary },
  resendTextDisabled: { color: Colors.textMuted },
});

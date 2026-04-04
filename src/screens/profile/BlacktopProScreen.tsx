import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { supabase } from '@/lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '@/theme';

const FEATURES = [
  { icon: 'stats-chart', text: 'Full career stat history with season-by-season charts' },
  { icon: 'trending-up', text: 'ELO history graph — watch your rating climb over time' },
  { icon: 'arrow-up-circle', text: 'Priority listing position in game discovery feed' },
  { icon: 'star', text: 'Exclusive PRO badge on your profile' },
  { icon: 'infinite', text: 'Unlimited stat history (free tier caps at 10 games)' },
];

export function BlacktopProScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      // In production, your backend would create a payment intent / subscription
      // and return client_secret. For now we show the payment sheet with a demo flow.
      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Blacktop JC',
        // paymentIntentClientSecret: returned from your backend
        style: 'alwaysDark',
        primaryButtonLabel: 'Subscribe — $4.99/mo',
      });

      if (initError) throw new Error(initError.message);

      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code !== 'Canceled') {
          throw new Error(presentError.message);
        }
      } else {
        // Payment success — update user record
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await supabase.from('users').update({ is_pro: true }).eq('auth_id', session.user.id);
        }
        Alert.alert('Welcome to Blacktop Pro! 🏆', 'Your Pro features are now active.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="basketball" size={48} color={Colors.secondary} />
        </View>
        <Text style={styles.title}>BLACKTOP PRO</Text>
        <Text style={styles.price}>
          $4.99<Text style={styles.pricePer}>/month</Text>
        </Text>
      </View>

      {/* Features */}
      <View style={styles.featuresCard}>
        {FEATURES.map(({ icon, text }, i) => (
          <View key={i} style={[styles.featureRow, i > 0 && styles.featureRowBorder]}>
            <View style={styles.featureIcon}>
              <Ionicons name={icon as any} size={18} color={Colors.secondary} />
            </View>
            <Text style={styles.featureText}>{text}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[styles.subscribeButton, Shadow.gold]}
        onPress={handleSubscribe}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.background} />
        ) : (
          <>
            <Ionicons name="star" size={18} color={Colors.background} />
            <Text style={styles.subscribeText}>GO PRO</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.restoreButton}>
        <Text style={styles.restoreText}>Restore Purchase</Text>
      </TouchableOpacity>

      <Text style={styles.legal}>
        By subscribing you agree to our Terms of Service. Cancel anytime in your App Store / Play Store settings.
        Subscription renews automatically at $4.99/month.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, paddingBottom: 60, alignItems: 'center' },
  hero: { alignItems: 'center', marginBottom: Spacing.xl },
  iconCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: `${Colors.secondary}15`, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.secondary, marginBottom: Spacing.md },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 48, color: Colors.secondary, letterSpacing: 4 },
  price: { fontFamily: 'BebasNeue_400Regular', fontSize: 40, color: Colors.textPrimary, marginTop: 4 },
  pricePer: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.lg, color: Colors.textMuted },
  featuresCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.xl, borderWidth: 1, borderColor: Colors.border, width: '100%', marginBottom: Spacing.xl, overflow: 'hidden' },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.md },
  featureRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  featureIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: `${Colors.secondary}15`, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textSecondary, lineHeight: 20 },
  subscribeButton: { backgroundColor: Colors.secondary, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 18, paddingHorizontal: Spacing.xxl, borderRadius: BorderRadius.xl, width: '100%', justifyContent: 'center', marginBottom: Spacing.md },
  subscribeText: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: Colors.background, letterSpacing: 3 },
  restoreButton: { paddingVertical: Spacing.sm },
  restoreText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted },
  legal: { fontFamily: 'RobotoCondensed_400Regular', fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl, lineHeight: 16 },
});

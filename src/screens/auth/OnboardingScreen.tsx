import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { Colors, FontSize, Spacing } from '@/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const { width, height } = Dimensions.get('window');
const HERO_HEIGHT = typeof window !== 'undefined' ? window.innerHeight : height;

const FEATURES = [
  { icon: 'basketball', title: 'FIND A RUN', body: 'See every pickup game in JC — open, filling, and full — updated in real time.' },
  { icon: 'location', title: 'KNOW THE COURTS', body: 'Court conditions, lighting, crowd levels, and check-ins from players already there.' },
  { icon: 'trending-up', title: 'TRACK YOUR GAME', body: 'ELO rating, career stats, and a rep system built on how you actually play.' },
];

const JC_COURTS = [
  { name: 'Pershing Field', neighborhood: 'Journal Square', photo: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=600&q=80&fit=crop' },
  { name: 'Hamilton Park', neighborhood: 'Downtown', photo: 'https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=600&q=80&fit=crop' },
  { name: 'Berry Lane Park', neighborhood: 'Bergen-Lafayette', photo: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=600&q=80&fit=crop' },
];

export function OnboardingScreen({ navigation }: Props) {
  // Pulse animation for LIVE dot
  const pulse = useRef(new Animated.Value(1)).current;
  // Hero content fade-in
  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1,
      duration: 900,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.2, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const heroTranslate = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.rootContent} bounces={false} showsVerticalScrollIndicator={false}>

      {/* ══════════════ HERO ══════════════ */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1400&q=85&fit=crop' }}
        style={[styles.hero, { minHeight: HERO_HEIGHT }]}
        imageStyle={styles.heroImage}
      >
        {/* Gradient-style scrim: lighter at top, heavy at bottom */}
        <View style={styles.scrimTop} />
        <View style={styles.scrimBottom} />

        {/* ── Navbar ── */}
        <View style={styles.nav}>
          <View style={styles.navLogo}>
            <View style={styles.navDiamond} />
            <Text style={styles.navWordmark}>BLACKTOP<Text style={styles.navWordmarkRed}> JC</Text></Text>
          </View>
          <View style={styles.liveChip}>
            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
            <Text style={styles.liveLabel}>LIVE</Text>
          </View>
        </View>

        {/* ── Hero copy ── */}
        <Animated.View style={[styles.heroBody, { opacity: heroAnim, transform: [{ translateY: heroTranslate }] }]}>
          <Text style={styles.heroEyebrow}>JERSEY CITY PICKUP BASKETBALL</Text>

          <Text style={styles.heroH1}>
            FIND{'\n'}YOUR{'\n'}<Text style={styles.heroH1Red}>RUN.</Text>
          </Text>

          <Text style={styles.heroCopy}>
            Real courts. Real players.{'\n'}Real-time games — happening right now.
          </Text>

          <View style={styles.heroCTAs}>
            <TouchableOpacity
              style={styles.ctaPrimary}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaPrimaryText}>GET ON THE COURT</Text>
              <Ionicons name="arrow-forward" size={18} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaSecondary}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text style={styles.ctaSecondaryText}>SIGN IN</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Scroll hint ── */}
        <View style={styles.scrollHint}>
          <Ionicons name="chevron-down" size={20} color="rgba(255,255,255,0.4)" />
        </View>
      </ImageBackground>

      {/* ══════════════ FEATURES ══════════════ */}
      <View style={styles.section}>
        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>HOW IT WORKS</Text>
        </View>

        <Text style={styles.sectionH2}>THE WHOLE GAME{'\n'}<Text style={styles.sectionH2Red}>IN YOUR POCKET.</Text></Text>

        <View style={styles.featureGrid}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={styles.featureIconWrap}>
                <Ionicons name={f.icon as any} size={28} color={Colors.primary} />
              </View>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureBody}>{f.body}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ══════════════ COURTS ══════════════ */}
      <View style={[styles.section, styles.sectionDark]}>
        <View style={styles.sectionLabel}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabelText}>THE SPOTS</Text>
        </View>
        <Text style={styles.sectionH2}>JC'S BEST{'\n'}<Text style={styles.sectionH2Red}>COURTS.</Text></Text>

        <View style={styles.courtGrid}>
          {JC_COURTS.map((c, i) => (
            <ImageBackground
              key={i}
              source={{ uri: c.photo }}
              style={styles.courtCard}
              imageStyle={styles.courtCardImage}
            >
              <View style={styles.courtCardScrim} />
              <View style={styles.courtCardContent}>
                <Text style={styles.courtCardName}>{c.name}</Text>
                <Text style={styles.courtCardNeighborhood}>{c.neighborhood.toUpperCase()}</Text>
              </View>
              {/* Red left glow bar */}
              <View style={styles.courtCardBar} />
            </ImageBackground>
          ))}
        </View>
      </View>

      {/* ══════════════ BOTTOM CTA ══════════════ */}
      <View style={styles.bottomCta}>
        <View style={styles.bottomCtaDiamond} />
        <Text style={styles.bottomCtaH2}>READY TO RUN?</Text>
        <Text style={styles.bottomCtaSub}>Join Jersey City's pickup basketball community.</Text>
        <TouchableOpacity
          style={styles.ctaPrimary}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaPrimaryText}>CREATE FREE ACCOUNT</Text>
          <Ionicons name="arrow-forward" size={18} color="#000" />
        </TouchableOpacity>
        <Text style={styles.bottomCtaLegal}>Free forever · No credit card needed</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  rootContent: { flexGrow: 1 },

  // ── Hero
  hero: {
    width: '100%',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  heroImage: {
    resizeMode: 'cover',
  },
  scrimTop: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  scrimBottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '70%',
    backgroundColor: 'rgba(0,0,0,0.80)',
  },

  // Nav
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 20,
    paddingBottom: Spacing.md,
    position: 'relative',
  },
  navLogo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navDiamond: {
    width: 10, height: 10,
    backgroundColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  navWordmark: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24,
    color: '#FFFFFF',
    letterSpacing: 5,
  },
  navWordmarkRed: { color: Colors.primary },
  liveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: `${Colors.success}70`,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 2,
    backgroundColor: `${Colors.success}10`,
  },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 6,
  },
  liveLabel: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 11, color: Colors.success, letterSpacing: 2,
  },

  // Hero body
  heroBody: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    position: 'relative',
  },
  heroEyebrow: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 10, color: 'rgba(255,255,255,0.5)',
    letterSpacing: 4, marginBottom: 12,
  },
  heroH1: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: Math.min(width * 0.22, 140),
    color: '#FFFFFF',
    letterSpacing: -2,
    lineHeight: Math.min(width * 0.22, 140) * 0.88,
    marginBottom: 20,
  },
  heroH1Red: {
    color: Colors.primary,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  },
  heroCopy: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.lg,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 24,
    marginBottom: 32,
    maxWidth: 340,
  },
  heroCTAs: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  ctaPrimary: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 16, paddingHorizontal: 28,
    borderRadius: 0,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 20,
  },
  ctaPrimaryText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20, color: '#000000', letterSpacing: 2,
  },
  ctaSecondary: {
    paddingVertical: 16, paddingHorizontal: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 0,
  },
  ctaSecondaryText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20, color: 'rgba(255,255,255,0.7)', letterSpacing: 2,
  },
  scrollHint: { alignItems: 'center', paddingBottom: 16, position: 'relative' },

  // ── Sections
  section: {
    backgroundColor: '#000000',
    paddingHorizontal: Spacing.lg,
    paddingTop: 56,
    paddingBottom: 56,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  sectionDark: { backgroundColor: '#040404' },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  sectionAccent: {
    width: 4, height: 16,
    backgroundColor: Colors.primary, borderRadius: 1,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 6,
  },
  sectionLabelText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 10, color: Colors.primary, letterSpacing: 4,
  },
  sectionH2: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: Math.min(width * 0.12, 72),
    color: '#FFFFFF',
    letterSpacing: 1,
    lineHeight: Math.min(width * 0.12, 72) * 0.95,
    marginBottom: 36,
  },
  sectionH2Red: { color: Colors.primary },

  // Feature cards
  featureGrid: { gap: 16 },
  featureCard: {
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    padding: Spacing.lg,
    gap: 10,
  },
  featureIconWrap: {
    width: 48, height: 48,
    backgroundColor: `${Colors.primary}12`,
    borderWidth: 1,
    borderColor: Colors.borderRed,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 0,
  },
  featureTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22, color: '#FFFFFF', letterSpacing: 2,
  },
  featureBody: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.md, color: 'rgba(255,255,255,0.5)',
    lineHeight: 22,
  },

  // Court grid
  courtGrid: { gap: 10 },
  courtCard: {
    height: 140,
    overflow: 'hidden',
    borderRadius: 0,
    justifyContent: 'flex-end',
    position: 'relative',
  },
  courtCardImage: { resizeMode: 'cover' },
  courtCardScrim: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  courtCardContent: {
    position: 'relative',
    padding: 14, paddingLeft: 18,
  },
  courtCardName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24, color: '#FFFFFF', letterSpacing: 1,
  },
  courtCardNeighborhood: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 2,
    marginTop: 2,
  },
  courtCardBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 4,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 8,
  },

  // Bottom CTA
  bottomCta: {
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: Colors.borderRed,
    padding: Spacing.xl,
    paddingTop: 56,
    paddingBottom: 56,
    alignItems: 'center',
    gap: 20,
  },
  bottomCtaDiamond: {
    width: 16, height: 16,
    backgroundColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1, shadowRadius: 16,
    marginBottom: 8,
  },
  bottomCtaH2: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 52, color: '#FFFFFF', letterSpacing: 3, textAlign: 'center',
  },
  bottomCtaSub: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.lg, color: 'rgba(255,255,255,0.45)',
    textAlign: 'center', marginBottom: 8,
  },
  bottomCtaLegal: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: 1,
  },
});

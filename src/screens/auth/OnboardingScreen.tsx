import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';

type Props = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;

const { width, height } = Dimensions.get('window');

export function OnboardingScreen({ navigation }: Props) {
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(30);
  const subtitleOpacity = useSharedValue(0);
  const courtOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    titleY.value = withDelay(200, withTiming(0, { duration: 600, easing: Easing.out(Easing.quad) }));
    subtitleOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    courtOpacity.value = withDelay(700, withTiming(1, { duration: 800 }));
    buttonsOpacity.value = withDelay(1000, withTiming(1, { duration: 600 }));
  }, []);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const courtStyle = useAnimatedStyle(() => ({ opacity: courtOpacity.value }));
  const buttonsStyle = useAnimatedStyle(() => ({ opacity: buttonsOpacity.value }));

  return (
    <View style={styles.container}>
      {/* Background court lines */}
      <Animated.View style={[styles.courtContainer, courtStyle]}>
        <CourtGraphic />
      </Animated.View>

      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Content */}
      <View style={styles.content}>
        <Animated.Text style={[styles.title, titleStyle]}>BLACKTOP JC</Animated.Text>
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          JERSEY CITY'S PICKUP BASKETBALL PLATFORM
        </Animated.Text>
      </View>

      <Animated.View style={[styles.buttons, buttonsStyle]}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>GET STARTED</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>I ALREADY HAVE AN ACCOUNT</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

function CourtGraphic() {
  return (
    <View style={courtStyles.court}>
      {/* Center circle */}
      <View style={courtStyles.centerCircle} />
      {/* Center line */}
      <View style={courtStyles.centerLine} />
      {/* Three-point arc left */}
      <View style={courtStyles.threePointLeft} />
      {/* Three-point arc right */}
      <View style={courtStyles.threePointRight} />
      {/* Key left */}
      <View style={courtStyles.keyLeft} />
      {/* Key right */}
      <View style={courtStyles.keyRight} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
    paddingBottom: 48,
  },
  courtContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,14,23,0.75)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 72,
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: 4,
    lineHeight: 76,
  },
  subtitle: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.md,
    color: Colors.secondary,
    textAlign: 'center',
    letterSpacing: 3,
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  buttons: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  secondaryButton: {
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    letterSpacing: 1,
  },
});

const courtStyles = StyleSheet.create({
  court: {
    width: width,
    height: height * 0.7,
    borderWidth: 2,
    borderColor: 'rgba(201,8,42,0.3)',
    position: 'relative',
  },
  centerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(201,8,42,0.3)',
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -60,
    marginLeft: -60,
  },
  centerLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(201,8,42,0.3)',
  },
  threePointLeft: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(201,8,42,0.3)',
    position: 'absolute',
    top: '50%',
    left: -80,
    marginTop: -80,
  },
  threePointRight: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 2,
    borderColor: 'rgba(201,8,42,0.3)',
    position: 'absolute',
    top: '50%',
    right: -80,
    marginTop: -80,
  },
  keyLeft: {
    width: 60,
    height: 100,
    borderWidth: 2,
    borderColor: 'rgba(201,8,42,0.25)',
    position: 'absolute',
    top: '50%',
    left: 0,
    marginTop: -50,
  },
  keyRight: {
    width: 60,
    height: 100,
    borderWidth: 2,
    borderColor: 'rgba(201,8,42,0.25)',
    position: 'absolute',
    top: '50%',
    right: 0,
    marginTop: -50,
  },
});

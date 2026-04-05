import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Colors } from '@/theme';

interface Props {
  label?: string;
}

export function BallLoader({ label }: Props) {
  const bounceY = useRef(new Animated.Value(0)).current;
  const shadowScale = useRef(new Animated.Value(1)).current;
  const squash = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        // Fall
        Animated.parallel([
          Animated.timing(bounceY, { toValue: 32, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(shadowScale, { toValue: 1.4, duration: 300, useNativeDriver: true }),
          Animated.timing(squash, { toValue: 1, duration: 300, useNativeDriver: true }),
        ]),
        // Squash on impact
        Animated.parallel([
          Animated.timing(squash, { toValue: 0.7, duration: 80, useNativeDriver: true }),
          Animated.timing(shadowScale, { toValue: 1.6, duration: 80, useNativeDriver: true }),
        ]),
        // Rise
        Animated.parallel([
          Animated.timing(bounceY, { toValue: 0, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(shadowScale, { toValue: 0.6, duration: 280, useNativeDriver: true }),
          Animated.timing(squash, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]),
        Animated.delay(80),
      ])
    ).start();
  }, []);

  const ballStyle = {
    transform: [
      { translateY: bounceY },
      { scaleX: squash.interpolate({ inputRange: [0.7, 1], outputRange: [1.2, 1] }) },
      { scaleY: squash },
    ],
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ball, ballStyle]}>
        {/* Ball lines */}
        <View style={styles.ballLineH} />
        <View style={styles.ballLineV} />
        <View style={styles.ballArcLeft} />
        <View style={styles.ballArcRight} />
      </Animated.View>

      {/* Shadow */}
      <Animated.View style={[styles.shadow, { transform: [{ scaleX: shadowScale }] }]} />

      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 32,
  },
  ball: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondary,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
  },
  ballLineH: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginTop: -0.75,
  },
  ballLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: 1.5,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginLeft: -0.75,
  },
  ballArcLeft: {
    position: 'absolute',
    top: 4,
    left: -8,
    width: 20,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.25)',
    backgroundColor: 'transparent',
  },
  ballArcRight: {
    position: 'absolute',
    top: 4,
    right: -8,
    width: 20,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.25)',
    backgroundColor: 'transparent',
  },
  shadow: {
    width: 32,
    height: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,184,0,0.2)',
    marginTop: 4,
  },
  label: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: 4,
    marginTop: 16,
  },
});

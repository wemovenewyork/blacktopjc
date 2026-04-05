import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

export function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <View style={styles.card}>
      {/* Left accent bar */}
      <Animated.View style={[styles.accentBar, { opacity }]} />

      <View style={styles.inner}>
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <Animated.View style={[styles.lineWide, { opacity }]} />
            <Animated.View style={[styles.lineNarrow, { opacity }]} />
          </View>
          <Animated.View style={[styles.formatBlock, { opacity }]} />
        </View>

        {/* Mid row */}
        <View style={styles.midRow}>
          <Animated.View style={[styles.timeChip, { opacity }]} />
          <Animated.View style={[styles.eloChip, { opacity }]} />
        </View>

        {/* Progress bar */}
        <Animated.View style={[styles.progressBar, { opacity }]} />

        {/* Footer */}
        <View style={styles.footer}>
          <Animated.View style={[styles.circle, { opacity }]} />
          <Animated.View style={[styles.lineShort, { opacity }]} />
          <View style={{ flex: 1 }} />
          <Animated.View style={[styles.joinBtn, { opacity }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#070707',
    borderRadius: 0,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  accentBar: { width: 4, backgroundColor: '#2A2A2A' },
  inner: { flex: 1, padding: 16, gap: 10 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topLeft: { gap: 6, flex: 1 },
  lineWide: { height: 14, width: '55%', backgroundColor: '#2A2A2A', borderRadius: 2 },
  lineNarrow: { height: 9, width: '30%', backgroundColor: '#222', borderRadius: 2 },
  formatBlock: { width: 32, height: 28, backgroundColor: '#222', borderRadius: 2 },
  midRow: { flexDirection: 'row', gap: 8 },
  timeChip: { height: 22, width: 120, backgroundColor: '#1A1A1A', borderRadius: 2 },
  eloChip: { height: 22, width: 70, backgroundColor: '#1A1A1A', borderRadius: 2 },
  progressBar: { height: 2, backgroundColor: '#1F1F1F', borderRadius: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  circle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#222' },
  lineShort: { height: 10, width: 70, backgroundColor: '#1A1A1A', borderRadius: 2 },
  joinBtn: { width: 44, height: 26, backgroundColor: '#1A1A1A', borderRadius: 2 },
});

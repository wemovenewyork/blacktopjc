/**
 * EloGraph — broadcast-style glowing ELO history line chart.
 * Draws a polyline SVG with a neon glow effect on web.
 * Falls back to a simple bar representation on native.
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import { Colors, FontSize } from '@/theme';

interface DataPoint {
  rating: number;
  label?: string;
}

interface Props {
  data: DataPoint[];
  color?: string;
  height?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function EloGraph({ data, color = Colors.primary, height = 120 }: Props) {
  const isWeb = typeof window !== 'undefined';
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  if (!data || data.length < 2) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>PLAY MORE GAMES TO SEE YOUR GRAPH</Text>
      </View>
    );
  }

  const ratings = data.map((d) => d.rating);
  const min = Math.min(...ratings) - 50;
  const max = Math.max(...ratings) + 50;
  const range = max - min || 1;
  const W = SCREEN_WIDTH - 64;
  const H = height;

  // Build SVG polyline points
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((d.rating - min) / range) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const firstRating = ratings[0];
  const lastRating = ratings[ratings.length - 1];
  const change = lastRating - firstRating;
  const changeColor = change >= 0 ? Colors.success : Colors.error;
  const changeLabel = `${change >= 0 ? '+' : ''}${change}`;

  if (isWeb) {
    return (
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.title}>ELO HISTORY</Text>
          <View style={[styles.changeBadge, { borderColor: changeColor, backgroundColor: `${changeColor}12` }]}>
            <Text style={[styles.changeText, { color: changeColor }]}>{changeLabel}</Text>
          </View>
        </View>

        {/* SVG line chart — web only */}
        <View style={[styles.chartWrap, { height: H }]}>
          {/* @ts-ignore — svg is valid in RN web */}
          <svg width={W} height={H} style={{ overflow: 'visible' }}>
            {/* Glow filter */}
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Area fill under line */}
            <polygon
              points={`0,${H} ${points} ${W},${H}`}
              fill={`${color}14`}
            />

            {/* Main line */}
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="2"
              filter="url(#glow)"
            />

            {/* Data point dots */}
            {data.map((d, i) => {
              const x = (i / (data.length - 1)) * W;
              const y = H - ((d.rating - min) / range) * H;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={i === data.length - 1 ? 5 : 3}
                  fill={i === data.length - 1 ? color : `${color}80`}
                  filter="url(#glow)"
                />
              );
            })}
          </svg>

          {/* Y-axis labels */}
          <Text style={[styles.yMax, { color: Colors.textMuted }]}>{max}</Text>
          <Text style={[styles.yMin, { color: Colors.textMuted }]}>{min}</Text>
        </View>

        {/* Current rating callout */}
        <View style={styles.footer}>
          <Text style={styles.footerLabel}>CURRENT</Text>
          <Text style={[styles.footerValue, { color }]}>{lastRating}</Text>
          <Text style={styles.footerLabel}>PEAK</Text>
          <Text style={[styles.footerValue, { color: Colors.secondary }]}>{Math.max(...ratings)}</Text>
          <Text style={styles.footerLabel}>GAMES</Text>
          <Text style={[styles.footerValue, { color: Colors.textSecondary }]}>{data.length}</Text>
        </View>
      </Animated.View>
    );
  }

  // Native fallback: horizontal bars
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <Text style={styles.title}>ELO HISTORY</Text>
        <View style={[styles.changeBadge, { borderColor: changeColor, backgroundColor: `${changeColor}12` }]}>
          <Text style={[styles.changeText, { color: changeColor }]}>{changeLabel}</Text>
        </View>
      </View>
      <View style={[styles.nativeBars, { height: H }]}>
        {data.slice(-12).map((d, i) => {
          const barH = ((d.rating - min) / range) * (H - 16);
          return (
            <View key={i} style={styles.nativeBarWrap}>
              <View style={[styles.nativeBar, { height: barH, backgroundColor: i === data.length - 1 ? color : `${color}50` }]} />
            </View>
          );
        })}
      </View>
      <View style={styles.footer}>
        <Text style={styles.footerLabel}>CURRENT</Text>
        <Text style={[styles.footerValue, { color }]}>{lastRating}</Text>
        <Text style={styles.footerLabel}>PEAK</Text>
        <Text style={[styles.footerValue, { color: Colors.secondary }]}>{Math.max(...ratings)}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderStyle: 'dashed' as any,
  },
  emptyText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    textAlign: 'center',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 3,
  },
  changeBadge: {
    borderWidth: 1, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 2,
  },
  changeText: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1,
  },
  chartWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  yMax: {
    position: 'absolute', top: 0, right: 0,
    fontFamily: 'RobotoCondensed_400Regular', fontSize: 9, letterSpacing: 1,
  },
  yMin: {
    position: 'absolute', bottom: 0, right: 0,
    fontFamily: 'RobotoCondensed_400Regular', fontSize: 9, letterSpacing: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 8,
    alignItems: 'baseline',
  },
  footerLabel: {
    fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, color: Colors.textMuted, letterSpacing: 2,
  },
  footerValue: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 22, lineHeight: 22,
  },
  nativeBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  nativeBarWrap: { flex: 1, justifyContent: 'flex-end' },
  nativeBar: { borderRadius: 1, minHeight: 2 },
});

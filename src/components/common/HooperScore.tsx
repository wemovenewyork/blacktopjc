import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';

interface Props {
  punctuality: number;
  sportsmanship: number;
  skill: number;
  compact?: boolean;
}

export function HooperScore({ punctuality, sportsmanship, skill, compact = false }: Props) {
  const overall = Math.round(punctuality * 0.4 + sportsmanship * 0.35 + skill * 0.25);

  if (compact) {
    return (
      <View style={styles.compact}>
        <Text style={styles.compactScore}>{overall}</Text>
        <Text style={styles.compactLabel}>HS</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>HOOPER SCORE</Text>
        <Text style={styles.overallScore}>{overall}<Text style={styles.outOf}>/100</Text></Text>
      </View>

      <ScoreBar label="Punctuality" value={punctuality} color={Colors.secondary} />
      <ScoreBar label="Sportsmanship" value={sportsmanship} color={Colors.success} />
      <ScoreBar label="Skill Accuracy" value={skill} color={Colors.primary} />
    </View>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  const clampedValue = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${clampedValue}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barValue, { color }]}>{Math.round(clampedValue)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
  overallScore: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    color: Colors.textPrimary,
  },
  outOf: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  barLabel: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    width: 110,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  barValue: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.sm,
    width: 28,
    textAlign: 'right',
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  compactScore: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.md,
    color: Colors.secondary,
  },
  compactLabel: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});

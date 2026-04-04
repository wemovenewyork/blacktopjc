import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getEloTier, getEloColor, FontSize, BorderRadius, Spacing } from '@/theme';

interface Props {
  rating: number;
  rated: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function EloBadge({ rating, rated, size = 'md' }: Props) {
  const tier = getEloTier(rating, rated);
  const color = getEloColor(rating, rated);

  if (size === 'sm') {
    return (
      <View style={[styles.pill, { backgroundColor: `${color}22`, borderColor: color }]}>
        <Text style={[styles.pillText, { color }]}>{tier}</Text>
      </View>
    );
  }

  if (size === 'md') {
    return (
      <View style={[styles.pill, styles.pillMd, { backgroundColor: `${color}22`, borderColor: color }]}>
        <Text style={[styles.pillText, { color }]}>{tier}</Text>
        {rated && <Text style={[styles.ratingText, { color }]}> · {rating}</Text>}
      </View>
    );
  }

  // lg
  return (
    <View style={[styles.badgeLg, { backgroundColor: `${color}15`, borderColor: color }]}>
      <Text style={[styles.badgeLgRating, { color }]}>{rated ? rating : '—'}</Text>
      <Text style={[styles.badgeLgTier, { color }]}>{tier.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  pillMd: {
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    letterSpacing: 0.5,
  },
  ratingText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
  },
  badgeLg: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
  },
  badgeLgRating: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 36,
    lineHeight: 38,
  },
  badgeLgTier: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    letterSpacing: 2,
  },
});

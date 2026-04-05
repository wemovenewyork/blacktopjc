import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getEloTier, getEloColor, FontSize, Spacing } from '@/theme';

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
      <View style={[styles.pill, { backgroundColor: `${color}18`, borderColor: `${color}80` }]}>
        <Text style={[styles.pillText, { color }]}>{tier}</Text>
      </View>
    );
  }

  if (size === 'md') {
    return (
      <View style={[styles.pill, styles.pillMd, { backgroundColor: `${color}18`, borderColor: `${color}80` }]}>
        <Text style={[styles.pillText, { color }]}>{tier}</Text>
        {rated && <Text style={[styles.ratingText, { color }]}> · {rating}</Text>}
      </View>
    );
  }

  // lg — with glow
  return (
    <View style={[
      styles.badgeLg,
      {
        backgroundColor: `${color}10`,
        borderColor: color,
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
      },
    ]}>
      <Text style={[styles.badgeLgRating, { color, textShadowColor: color, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 }]}>
        {rated ? rating : '—'}
      </Text>
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
    borderRadius: 2,
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
    borderRadius: 2,
    borderWidth: 1.5,
  },
  badgeLgRating: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 40,
    lineHeight: 42,
  },
  badgeLgTier: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    letterSpacing: 3,
    marginTop: 2,
  },
});

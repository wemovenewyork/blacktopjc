import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { getEloColor } from '@/theme';
import { User } from '@/types';

const AVATAR_COLORS = [
  '#C9082A', '#C8A94A', '#3B82F6', '#22C55E',
  '#8B5CF6', '#F97316', '#EC4899', '#14B8A6',
];

function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface Props {
  user: Pick<User, 'display_name' | 'avatar_url' | 'elo_rating' | 'games_until_rated'>;
  size?: number;
  showBadge?: boolean;
}

export function Avatar({ user, size = 40, showBadge = false }: Props) {
  const fontSize = size * 0.35;
  const borderRadius = size / 2;
  const isRated = user.games_until_rated <= 0;
  const badgeColor = getEloColor(user.elo_rating, isRated);

  return (
    <View style={{ width: size, height: size }}>
      {user.avatar_url ? (
        <Image
          source={{ uri: user.avatar_url }}
          style={{ width: size, height: size, borderRadius }}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius,
              backgroundColor: nameToColor(user.display_name),
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>
            {initials(user.display_name)}
          </Text>
        </View>
      )}

      {showBadge && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: badgeColor,
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: size * 0.15,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontFamily: 'RobotoCondensed_700Bold',
    color: '#FFFFFF',
  },
  badge: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#0A0E17',
  },
});

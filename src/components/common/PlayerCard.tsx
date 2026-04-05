/**
 * PlayerCard — trading card style player profile component.
 * Shows photo/avatar, name, position, ELO tier, neighborhood, and key stats.
 * Used in PlayerProfileScreen as the hero card.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@/types';
import { getEloTier, getEloColor, Colors, FontSize } from '@/theme';
import { getNeighborhoodColor } from '@/lib/neighborhoods';

const { width } = Dimensions.get('window');
const CARD_WIDTH = Math.min(width - 32, 380);
const CARD_HEIGHT = CARD_WIDTH * 1.42; // standard card ratio

const AVATAR_COLORS = [
  '#C9082A', '#C8A94A', '#3B82F6', '#22C55E',
  '#8B5CF6', '#F97316', '#EC4899', '#14B8A6',
];
function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

interface Props {
  user: User & { home_court?: any };
  stats?: { pts: number; ast: number; reb: number; stl: number };
}

export function PlayerCard({ user, stats }: Props) {
  const isRated = user.games_until_rated <= 0;
  const tier = getEloTier(user.elo_rating, isRated);
  const tierColor = getEloColor(user.elo_rating, isRated);
  const neighborhoodColor = getNeighborhoodColor(user.neighborhood ?? '');
  const bgColor = nameToColor(user.display_name);

  // Shine sweep animation
  const shineX = useRef(new Animated.Value(-CARD_WIDTH)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(2500),
        Animated.timing(shineX, {
          toValue: CARD_WIDTH * 2,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(shineX, { toValue: -CARD_WIDTH, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const winRate = user.total_games > 0 ? Math.round((user.wins / user.total_games) * 100) : 0;

  return (
    <View style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT, borderColor: tierColor }]}>
      {/* Glow border */}
      <View style={[styles.glowBorder, { shadowColor: tierColor }]} />

      {/* ── Top section: photo / avatar ── */}
      <View style={[styles.photoSection, { backgroundColor: bgColor }]}>
        {user.avatar_url ? (
          <Image source={{ uri: user.avatar_url }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.initialsWrap}>
            <Text style={styles.initialsText}>{initials(user.display_name)}</Text>
          </View>
        )}

        {/* Gradient scrim at bottom of photo */}
        <View style={styles.photoScrim} />

        {/* Jersey number aesthetic — position pill top-right */}
        {user.position?.length > 0 && (
          <View style={styles.positionPill}>
            <Text style={styles.positionText}>{user.position[0]}</Text>
          </View>
        )}

        {/* PRO badge */}
        {user.is_pro && (
          <View style={styles.proBadge}>
            <Ionicons name="star" size={9} color="#000" />
            <Text style={styles.proText}>PRO</Text>
          </View>
        )}

        {/* Tier badge bottom-left */}
        <View style={[styles.tierBadge, { backgroundColor: tierColor, shadowColor: tierColor }]}>
          <Text style={styles.tierText}>{tier.toUpperCase()}</Text>
        </View>

        {/* Shine sweep */}
        <Animated.View
          style={[styles.shine, { transform: [{ translateX: shineX }] }]}
          pointerEvents="none"
        />
      </View>

      {/* ── Bottom section: info ── */}
      <View style={styles.infoSection}>
        {/* Neighborhood accent line */}
        <View style={[styles.neighborhoodBar, { backgroundColor: neighborhoodColor }]} />

        <View style={styles.nameRow}>
          <Text style={styles.playerName} numberOfLines={1}>{user.display_name.toUpperCase()}</Text>
        </View>

        <Text style={styles.neighborhoodText}>
          {(user.neighborhood ?? '').toUpperCase()}
          {user.home_court ? ` · ${(user.home_court as any).name?.toUpperCase()}` : ''}
        </Text>

        {/* ELO Rating */}
        <View style={styles.eloRow}>
          <Text style={[styles.eloNumber, { color: tierColor, textShadowColor: tierColor }]}>
            {isRated ? user.elo_rating : '—'}
          </Text>
          <Text style={styles.eloLabel}>ELO</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsRow}>
          <MiniStat label="G" value={user.total_games} color={Colors.textSecondary} />
          <View style={styles.statDivider} />
          <MiniStat label="W" value={user.wins} color={Colors.success} />
          <View style={styles.statDivider} />
          <MiniStat label="L" value={user.losses} color={Colors.primary} />
          <View style={styles.statDivider} />
          <MiniStat label="WIN%" value={`${winRate}%`} color={Colors.secondary} />
        </View>

        {/* Per-game stats if available */}
        {stats && (
          <View style={styles.pgRow}>
            <PGStat label="PPG" value={stats.pts.toFixed(1)} />
            <PGStat label="APG" value={stats.ast.toFixed(1)} />
            <PGStat label="RPG" value={stats.reb.toFixed(1)} />
            <PGStat label="SPG" value={stats.stl.toFixed(1)} />
          </View>
        )}
      </View>
    </View>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatValue, { color }]}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

function PGStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.pgStat}>
      <Text style={styles.pgStatValue}>{value}</Text>
      <Text style={styles.pgStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 4,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#0A0A0A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  glowBorder: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    zIndex: -1,
  },

  // Photo section — top 62% of card
  photoSection: {
    height: '62%',
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  initialsWrap: {
    width: '100%', height: '100%',
    alignItems: 'center', justifyContent: 'center',
  },
  initialsText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: CARD_WIDTH * 0.35,
    color: 'rgba(255,255,255,0.25)',
    letterSpacing: 4,
  },
  photoScrim: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: '50%',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  positionPill: {
    position: 'absolute',
    top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  positionText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 14, color: '#FFFFFF', letterSpacing: 2,
  },
  proBadge: {
    position: 'absolute',
    top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 2,
  },
  proText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 9, color: '#000', letterSpacing: 1.5,
  },
  tierBadge: {
    position: 'absolute',
    bottom: 12, left: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  tierText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 12, color: '#000', letterSpacing: 2,
  },
  shine: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255,255,255,0.08)',
    transform: [{ skewX: '-20deg' }],
  },

  // Info section — bottom 38%
  infoSection: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#080808',
    position: 'relative',
  },
  neighborhoodBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 2,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  playerName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: CARD_WIDTH * 0.085,
    color: '#FFFFFF',
    letterSpacing: 1,
    flex: 1,
  },
  neighborhoodText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 8, color: Colors.textMuted,
    letterSpacing: 2, marginTop: 1, marginBottom: 8,
  },
  eloRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 10,
  },
  eloNumber: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: CARD_WIDTH * 0.13,
    lineHeight: CARD_WIDTH * 0.13,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  eloLabel: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 10, color: Colors.textMuted, letterSpacing: 3,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: 8,
    alignItems: 'center',
  },
  statDivider: {
    width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 4,
  },
  miniStat: { flex: 1, alignItems: 'center' },
  miniStatValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: CARD_WIDTH * 0.065,
    lineHeight: CARD_WIDTH * 0.065,
  },
  miniStatLabel: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 7, color: Colors.textMuted, letterSpacing: 1.5, marginTop: 1,
  },
  pgRow: {
    flexDirection: 'row',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    paddingTop: 7,
  },
  pgStat: { flex: 1, alignItems: 'center' },
  pgStatValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: CARD_WIDTH * 0.058,
    color: Colors.secondary,
    lineHeight: CARD_WIDTH * 0.058,
  },
  pgStatLabel: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 7, color: Colors.textMuted, letterSpacing: 1, marginTop: 1,
  },
});

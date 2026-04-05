import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ImageBackground,
} from 'react-native';
import { format, isToday, isTomorrow, differenceInMinutes } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, getEloColor } from '@/theme';
import { Game, Court, User } from '@/types';
import { Avatar } from './Avatar';
import { EloBadge } from './EloBadge';
import { getCourtPhoto } from '@/lib/courtPhotos';
import { getNeighborhoodColor } from '@/lib/neighborhoods';

interface Props {
  game: Game & { court?: Court; host?: User; player_count?: number };
  onJoin: () => void;
  onPress: () => void;
}

function formatGameTime(scheduledAt: string): { line1: string; line2: string; isUrgent: boolean } {
  const date = new Date(scheduledAt);
  const minsUntil = differenceInMinutes(date, new Date());
  if (minsUntil > 0 && minsUntil <= 60) {
    return { line1: `${minsUntil}`, line2: 'MIN', isUrgent: true };
  }
  if (isToday(date)) return { line1: format(date, 'h:mm'), line2: format(date, 'a').toUpperCase(), isUrgent: false };
  if (isTomorrow(date)) return { line1: 'TMW', line2: format(date, 'h:mm a'), isUrgent: false };
  return { line1: format(date, 'EEE').toUpperCase(), line2: format(date, 'MMM d'), isUrgent: false };
}

const FORMAT_COLORS: Record<string, string> = {
  '5v5': Colors.primary,
  '3v3': '#3B82F6',
  '21': Colors.secondary,
  'Open': Colors.success,
};

const FORMAT_TEXT_COLORS: Record<string, string> = {
  '5v5': '#FFFFFF',
  '3v3': '#FFFFFF',
  '21': '#000000',
  'Open': '#000000',
};

export function GameCard({ game, onJoin, onPress }: Props) {
  const spotsLeft = game.max_players - (game.player_count ?? 0);
  const isFull = game.status === 'full' || spotsLeft <= 0;
  const formatColor = FORMAT_COLORS[game.format] ?? Colors.primary;
  const joinTextColor = FORMAT_TEXT_COLORS[game.format] ?? '#FFFFFF';
  const spotsPercent = ((game.player_count ?? 0) / game.max_players) * 100;
  const courtPhoto = getCourtPhoto(game.court?.name ?? '');
  const neighborhoodColor = getNeighborhoodColor(game.court?.neighborhood ?? '');
  const timeInfo = formatGameTime(game.scheduled_at);
  const isRated = (game.host?.games_until_rated ?? 3) <= 0;
  const eloColor = game.host ? getEloColor(game.host.elo_rating, isRated) : Colors.textMuted;

  // Animated progress bar
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: Math.min(spotsPercent, 100),
      duration: 700,
      delay: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [spotsPercent]);

  // Press flash
  const flashAnim = useRef(new Animated.Value(0)).current;
  function handlePress() {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.06, duration: 60, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    onPress();
  }

  // Join fill
  const joinFillAnim = useRef(new Animated.Value(game.my_rsvp === 'in' ? 1 : 0)).current;
  function handleJoin() {
    Animated.timing(joinFillAnim, {
      toValue: 1, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: false,
    }).start();
    onJoin();
  }
  const joinBg = joinFillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${formatColor}00`, formatColor],
  });
  const progressWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.9}
      style={[
        styles.wrapper,
        {
          borderColor: `${formatColor}40`,
          shadowColor: formatColor,
          shadowOpacity: 0.18,
          shadowRadius: 10,
          elevation: 6,
        },
      ]}
    >
      {/* Corner brackets */}
      <View style={[styles.bracket, styles.bracketTL, { borderColor: `${formatColor}70` }]} />
      <View style={[styles.bracket, styles.bracketTR, { borderColor: `${formatColor}70` }]} />
      <View style={[styles.bracket, styles.bracketBL, { borderColor: `${formatColor}70` }]} />
      <View style={[styles.bracket, styles.bracketBR, { borderColor: `${formatColor}70` }]} />

      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: flashAnim, zIndex: 10 }]} pointerEvents="none" />

      {/* ── TOP BAND: court photo with scoreboard overlay ── */}
      <ImageBackground source={{ uri: courtPhoto }} style={styles.photoBand} imageStyle={styles.photoImage}>
        <View style={styles.photoBandScrim} />

        {/* Left: countdown / time */}
        <View style={[styles.timeBlock, timeInfo.isUrgent && styles.timeBlockUrgent]}>
          <Text style={[styles.timeLine1, timeInfo.isUrgent && { color: Colors.secondary }]}>{timeInfo.line1}</Text>
          <Text style={[styles.timeLine2, timeInfo.isUrgent && { color: Colors.secondary }]}>{timeInfo.line2}</Text>
        </View>

        {/* Center: court name */}
        <View style={styles.courtBlock}>
          <Text style={styles.courtName} numberOfLines={1}>{game.court?.name ?? 'Unknown'}</Text>
          <View style={styles.neighborhoodRow}>
            <View style={[styles.neighborhoodDot, { backgroundColor: neighborhoodColor }]} />
            <Text style={styles.neighborhoodText}>{game.court?.neighborhood ?? '—'}</Text>
          </View>
        </View>

        {/* Right: format badge */}
        <View style={[styles.formatBadge, { borderColor: formatColor, backgroundColor: `${formatColor}15` }]}>
          <Text style={[styles.formatText, { color: formatColor }]}>{game.format}</Text>
          {game.is_womens_only && <Ionicons name="female" size={9} color={Colors.secondary} style={{ marginTop: 1 }} />}
        </View>
      </ImageBackground>

      {/* ── BOTTOM BAND: scoreboard-style info ── */}
      <View style={styles.infoBar}>
        {/* Spots / capacity */}
        <View style={styles.capacityBlock}>
          <Text style={[styles.capacityNum, isFull && { color: Colors.error }]}>
            {isFull ? 'FULL' : `${game.player_count ?? 0}`}
          </Text>
          {!isFull && (
            <Text style={styles.capacityDenom}>/{game.max_players}</Text>
          )}
        </View>

        {/* Animated progress bar */}
        <View style={styles.progressWrap}>
          <View style={styles.progressBg}>
            <Animated.View style={[
              styles.progressFill,
              {
                width: progressWidth,
                backgroundColor: isFull ? Colors.error : formatColor,
                shadowColor: isFull ? Colors.error : formatColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 4,
              },
            ]} />
          </View>
          <Text style={styles.spotsLabel}>
            {isFull ? 'GAME FULL' : `${spotsLeft} SPOT${spotsLeft !== 1 ? 'S' : ''} LEFT`}
          </Text>
        </View>

        {/* ELO band */}
        <View style={styles.eloBandChip}>
          <Text style={[styles.eloBandText, { color: eloColor }]}>
            {game.elo_band.toUpperCase()}
          </Text>
        </View>

        {/* Join button */}
        {!isFull && (
          <TouchableOpacity onPress={handleJoin} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Animated.View style={[styles.joinBtn, {
              borderColor: game.my_rsvp === 'in' ? Colors.success : formatColor,
              backgroundColor: joinBg,
            }]}>
              <Text style={[styles.joinText, {
                color: joinTextColor,
              }]}>
                {game.my_rsvp === 'in' ? '✓ IN' : 'RUN'}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        )}
      </View>

      {/* ── HOST ROW ── */}
      {game.host && (
        <View style={styles.hostRow}>
          <Avatar user={game.host} size={18} />
          <Text style={styles.hostName}>{game.host.display_name}</Text>
          <EloBadge rating={game.host.elo_rating} rated={(game.host.games_until_rated ?? 3) <= 0} size="sm" />
          {isFull && (
            <View style={styles.fullBadge}>
              <Text style={styles.fullBadgeText}>GAME FULL</Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#070707',
    marginBottom: 8,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },

  // Corner brackets
  bracket: { position: 'absolute', width: 10, height: 10, zIndex: 5 },
  bracketTL: { top: 0, left: 0, borderTopWidth: 1, borderLeftWidth: 1 },
  bracketTR: { top: 0, right: 0, borderTopWidth: 1, borderRightWidth: 1 },
  bracketBL: { bottom: 0, left: 0, borderBottomWidth: 1, borderLeftWidth: 1 },
  bracketBR: { bottom: 0, right: 0, borderBottomWidth: 1, borderRightWidth: 1 },

  // Court photo top band
  photoBand: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: 10,
  },
  photoImage: { resizeMode: 'cover' },
  photoBandScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
  },

  // Time block
  timeBlock: {
    alignItems: 'center',
    minWidth: 38,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  timeBlockUrgent: {
    borderColor: `${Colors.secondary}60`,
    backgroundColor: `${Colors.secondary}12`,
  },
  timeLine1: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22, color: '#FFFFFF', lineHeight: 22, letterSpacing: 1,
  },
  timeLine2: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 8, color: Colors.textMuted, letterSpacing: 2,
  },

  courtBlock: { flex: 1 },
  courtName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18, color: '#FFFFFF', letterSpacing: 0.5, lineHeight: 20,
  },
  neighborhoodRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  neighborhoodDot: { width: 5, height: 5, borderRadius: 3 },
  neighborhoodText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: 2,
  },

  formatBadge: {
    alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderRadius: 2,
    gap: 2,
  },
  formatText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20, letterSpacing: 1,
  },

  // Info bar
  infoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: '#0A0A0A',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  capacityBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 1, minWidth: 32 },
  capacityNum: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22, color: Colors.success, lineHeight: 22,
  },
  capacityDenom: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 10, color: Colors.textMuted,
  },
  progressWrap: { flex: 1, gap: 3 },
  progressBg: { height: 4, backgroundColor: '#1A1A1A', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 2 },
  spotsLabel: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 7, color: Colors.textMuted, letterSpacing: 1.5,
  },
  eloBandChip: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 2,
  },
  eloBandText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 8, color: Colors.textMuted, letterSpacing: 1,
  },
  joinBtn: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1.5, borderRadius: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  joinText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16, letterSpacing: 1,
  },

  // Host row
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.04)',
    backgroundColor: '#050505',
  },
  hostName: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs, color: Colors.textMuted, flex: 1,
  },
  fullBadge: {
    backgroundColor: `${Colors.error}15`,
    borderWidth: 1,
    borderColor: Colors.borderRed,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 2,
  },
  fullBadgeText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 8, color: Colors.error, letterSpacing: 1.5,
  },
});

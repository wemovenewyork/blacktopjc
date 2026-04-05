import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { format, isToday, isTomorrow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';
import { Game, Court, User } from '@/types';
import { Avatar } from './Avatar';
import { EloBadge } from './EloBadge';

interface Props {
  game: Game & { court?: Court; host?: User; player_count?: number };
  onJoin: () => void;
  onPress: () => void;
}

function formatGameTime(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  if (isToday(date)) return `TODAY · ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `TOMORROW · ${format(date, 'h:mm a')}`;
  return format(date, 'EEE MMM d · h:mm a').toUpperCase();
}

const FORMAT_COLORS: Record<string, string> = {
  '5v5': Colors.primary,
  '3v3': '#3B82F6',
  '21': Colors.secondary,
  'Open': Colors.success,
};

export function GameCard({ game, onJoin, onPress }: Props) {
  const spotsLeft = game.max_players - (game.player_count ?? 0);
  const isFull = game.status === 'full' || spotsLeft <= 0;
  const formatColor = FORMAT_COLORS[game.format] ?? Colors.primary;
  const spotsPercent = ((game.player_count ?? 0) / game.max_players) * 100;

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

  // Press flash overlay
  const flashAnim = useRef(new Animated.Value(0)).current;
  function handlePress() {
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.07, duration: 70, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    onPress();
  }

  // Join button fill
  const joinFillAnim = useRef(new Animated.Value(game.my_rsvp === 'in' ? 1 : 0)).current;
  function handleJoin() {
    Animated.timing(joinFillAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
    onJoin();
  }

  const joinBg = joinFillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', `${formatColor}28`],
  });

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.85}>
      {/* Corner brackets */}
      <View style={[styles.bracket, styles.bracketTL, { borderColor: `${formatColor}60` }]} />
      <View style={[styles.bracket, styles.bracketTR, { borderColor: `${formatColor}60` }]} />
      <View style={[styles.bracket, styles.bracketBL, { borderColor: `${formatColor}60` }]} />
      <View style={[styles.bracket, styles.bracketBR, { borderColor: `${formatColor}60` }]} />

      {/* Flash overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: '#FFFFFF', opacity: flashAnim, borderRadius: 0 }]}
        pointerEvents="none"
      />

      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: formatColor, shadowColor: formatColor }]} />

      <View style={styles.inner}>
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={styles.courtBlock}>
            <Text style={styles.courtName} numberOfLines={1}>
              {game.court?.name ?? 'Unknown Court'}
            </Text>
            <View style={styles.courtMeta}>
              <Ionicons name="location" size={10} color={Colors.textMuted} />
              <Text style={styles.neighborhood}>{game.court?.neighborhood ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.formatBlock}>
            <Text style={[styles.formatText, { color: formatColor, textShadowColor: formatColor, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }]}>
              {game.format}
            </Text>
            {game.is_womens_only && (
              <View style={styles.womensBadge}>
                <Ionicons name="female" size={9} color={Colors.secondary} />
              </View>
            )}
          </View>
        </View>

        {/* Time + ELO band */}
        <View style={styles.midRow}>
          <View style={[styles.timeChip, { borderColor: `${Colors.primary}25` }]}>
            <Ionicons name="time" size={10} color={Colors.primary} />
            <Text style={styles.timeText}>{formatGameTime(game.scheduled_at)}</Text>
          </View>
          <View style={styles.eloBandChip}>
            <Text style={styles.eloBandText}>{game.elo_band.toUpperCase()}</Text>
          </View>
        </View>

        {/* Animated progress bar */}
        <View style={styles.progressBg}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth,
                backgroundColor: isFull ? Colors.error : formatColor,
                shadowColor: isFull ? Colors.error : formatColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 4,
              },
            ]}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.hostRow}>
            {game.host && (
              <>
                <Avatar user={game.host} size={22} />
                <Text style={styles.hostName}>{game.host.display_name}</Text>
                <EloBadge rating={game.host.elo_rating} rated={(game.host.games_until_rated ?? 3) <= 0} size="sm" />
              </>
            )}
          </View>

          <View style={styles.rightFooter}>
            <Text style={[styles.spotsText, isFull && styles.spotsTextFull]}>
              {isFull ? 'FULL' : `${game.player_count ?? 0}/${game.max_players}`}
            </Text>
            {!isFull && (
              <TouchableOpacity
                onPress={handleJoin}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Animated.View
                  style={[
                    styles.joinBtn,
                    {
                      borderColor: game.my_rsvp === 'in' ? Colors.success : formatColor,
                      backgroundColor: joinBg,
                    },
                  ]}
                >
                  <Text style={[
                    styles.joinText,
                    { color: game.my_rsvp === 'in' ? Colors.success : formatColor },
                  ]}>
                    {game.my_rsvp === 'in' ? '✓ IN' : 'RUN'}
                  </Text>
                </Animated.View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#070707',
    borderRadius: 0,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },

  // Corner brackets
  bracket: {
    position: 'absolute',
    width: 10,
    height: 10,
    zIndex: 2,
  },
  bracketTL: { top: 0, left: 0, borderTopWidth: 1, borderLeftWidth: 1 },
  bracketTR: { top: 0, right: 0, borderTopWidth: 1, borderRightWidth: 1 },
  bracketBL: { bottom: 0, left: 0, borderBottomWidth: 1, borderLeftWidth: 1 },
  bracketBR: { bottom: 0, right: 0, borderBottomWidth: 1, borderRightWidth: 1 },

  accentBar: {
    width: 4,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 4,
  },
  inner: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courtBlock: { flex: 1, marginRight: Spacing.sm },
  courtName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  courtMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  neighborhood: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  formatBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  formatText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: FontSize.xxl,
    letterSpacing: 1,
  },
  womensBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: `${Colors.secondary}20`,
    borderWidth: 1,
    borderColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${Colors.primary}08`,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
  },
  timeText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  eloBandChip: {
    backgroundColor: Colors.cardElevated,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eloBandText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  progressBg: {
    height: 2,
    backgroundColor: '#1A1A1A',
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  hostName: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  rightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  spotsText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.success,
    letterSpacing: 0.5,
  },
  spotsTextFull: {
    color: Colors.error,
  },
  joinBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: FontSize.md,
    letterSpacing: 1,
  },
});

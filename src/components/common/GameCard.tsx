import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  'Open': Colors.successBright,
};

export function GameCard({ game, onJoin, onPress }: Props) {
  const spotsLeft = game.max_players - (game.player_count ?? 0);
  const isFull = game.status === 'full' || spotsLeft <= 0;
  const formatColor = FORMAT_COLORS[game.format] ?? Colors.primary;
  const spotsPercent = ((game.player_count ?? 0) / game.max_players) * 100;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
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
            <Text style={[styles.formatText, { color: formatColor }]}>{game.format}</Text>
            {game.is_womens_only && (
              <View style={styles.womensBadge}>
                <Ionicons name="female" size={9} color={Colors.secondary} />
              </View>
            )}
          </View>
        </View>

        {/* Time + ELO band */}
        <View style={styles.midRow}>
          <View style={styles.timeChip}>
            <Ionicons name="time" size={10} color={Colors.primary} />
            <Text style={styles.timeText}>{formatGameTime(game.scheduled_at)}</Text>
          </View>
          <View style={styles.eloBandChip}>
            <Text style={styles.eloBandText}>{game.elo_band.toUpperCase()}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${Math.min(spotsPercent, 100)}%` as any, backgroundColor: isFull ? Colors.error : formatColor }]} />
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
                style={[styles.joinBtn, game.my_rsvp === 'in' && styles.joinBtnActive, { borderColor: formatColor }]}
                onPress={onJoin}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.joinText, { color: game.my_rsvp === 'in' ? Colors.successBright : formatColor }]}>
                  {game.my_rsvp === 'in' ? '✓ IN' : 'RUN'}
                </Text>
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
  },
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
    backgroundColor: `${Colors.primary}10`,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${Colors.primary}25`,
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
    backgroundColor: Colors.cardElevated,
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
    color: Colors.successBright,
    letterSpacing: 0.5,
  },
  spotsTextFull: {
    color: Colors.error,
  },
  joinBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.sm,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  joinBtnActive: {
    borderColor: Colors.successBright,
  },
  joinText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: FontSize.md,
    letterSpacing: 1,
  },
});

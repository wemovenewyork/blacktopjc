import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { format, isToday, isTomorrow } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '@/theme';
import { Game, Court, User } from '@/types';
import { Avatar } from './Avatar';
import { EloBadge } from './EloBadge';
import { HooperScore } from './HooperScore';

interface Props {
  game: Game & { court?: Court; host?: User; player_count?: number };
  onJoin: () => void;
  onPress: () => void;
}

function formatGameTime(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  if (isToday(date)) return `Today ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow ${format(date, 'h:mm a')}`;
  return format(date, 'EEE MMM d, h:mm a');
}

export function GameCard({ game, onJoin, onPress }: Props) {
  const spotsLeft = game.max_players - (game.player_count ?? 0);
  const isFull = game.status === 'full' || spotsLeft <= 0;
  const isRated = game.host && (game.host.games_until_rated ?? 3) <= 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.courtInfo}>
          <Text style={styles.courtName} numberOfLines={1}>
            {game.court?.name ?? 'Unknown Court'}
          </Text>
          <Text style={styles.neighborhood}>{game.court?.neighborhood}</Text>
        </View>
        {game.is_womens_only && (
          <View style={styles.womensBadge}>
            <Ionicons name="female" size={12} color={Colors.secondary} />
            <Text style={styles.womensText}>W's Only</Text>
          </View>
        )}
      </View>

      {/* Badges row */}
      <View style={styles.badgesRow}>
        <View style={[styles.formatBadge]}>
          <Text style={styles.formatText}>{game.format}</Text>
        </View>
        <EloBadge rating={0} rated={false} size="sm" />
        <View style={styles.badgeOverride}>
          <Text style={[styles.eloBandText]}>{game.elo_band}</Text>
        </View>
        <View style={styles.spotsContainer}>
          <Text style={[styles.spotsText, isFull && styles.spotsTextFull]}>
            {isFull ? 'FULL' : `${game.player_count ?? 0}/${game.max_players} spots`}
          </Text>
        </View>
      </View>

      {/* Time */}
      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.timeText}>{formatGameTime(game.scheduled_at)}</Text>
      </View>

      {/* Host + Join */}
      <View style={styles.footer}>
        {game.host && (
          <View style={styles.hostRow}>
            <Avatar user={game.host} size={28} />
            <Text style={styles.hostName}>{game.host.display_name}</Text>
            <HooperScore
              punctuality={game.host.hooper_score_punctuality}
              sportsmanship={game.host.hooper_score_sportsmanship}
              skill={game.host.hooper_score_skill}
              compact
            />
          </View>
        )}

        {!isFull && (
          <TouchableOpacity
            style={[styles.joinButton, game.my_rsvp === 'in' && styles.joinButtonActive]}
            onPress={onJoin}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.joinText}>
              {game.my_rsvp === 'in' ? 'JOINED' : 'JOIN'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  courtInfo: { flex: 1, marginRight: Spacing.sm },
  courtName: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.lg,
    color: Colors.textPrimary,
  },
  neighborhood: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 1,
  },
  womensBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: `${Colors.secondary}15`,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.secondary,
  },
  womensText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.secondary,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  formatBadge: {
    backgroundColor: `${Colors.primary}20`,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  formatText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  badgeOverride: {
    backgroundColor: Colors.cardElevated,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  eloBandText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
  spotsContainer: {
    marginLeft: 'auto',
  },
  spotsText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.success,
  },
  spotsTextFull: { color: Colors.error },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  timeText: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  hostName: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  joinButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  joinButtonActive: {
    backgroundColor: Colors.success,
  },
  joinText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    letterSpacing: 1,
  },
});

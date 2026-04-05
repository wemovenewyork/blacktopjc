import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { User, PlayerStats } from '@/types';
import { Colors, FontSize, Spacing, getEloColor } from '@/theme';
import { PlayerCard } from '@/components/common/PlayerCard';
import { EloGraph } from '@/components/common/EloGraph';
import { HooperScore } from '@/components/common/HooperScore';
import { HomeStackParamList } from '@/navigation/MainNavigator';

type Route = RouteProp<HomeStackParamList, 'PlayerProfile'>;

export function PlayerProfileScreen() {
  const route = useRoute<Route>();
  const { userId } = route.params;

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('users').select('*, home_court:courts(name)').eq('id', userId).single(),
      supabase.from('player_stats').select('*').eq('user_id', userId).order('logged_at', { ascending: true }).limit(30),
    ]).then(([userRes, statsRes]) => {
      if (userRes.data) setUser(userRes.data);
      if (statsRes.data) setStats(statsRes.data);
      setLoading(false);
    });
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }
  if (!user) return null;

  const isRated = user.games_until_rated <= 0;
  const tierColor = getEloColor(user.elo_rating, isRated);
  const winRate = user.total_games > 0 ? Math.round((user.wins / user.total_games) * 100) : 0;

  // Per-game averages
  const avgPts = stats.length ? stats.reduce((s, g) => s + g.points, 0) / stats.length : 0;
  const avgAst = stats.length ? stats.reduce((s, g) => s + g.assists, 0) / stats.length : 0;
  const avgReb = stats.length ? stats.reduce((s, g) => s + g.rebounds, 0) / stats.length : 0;
  const avgStl = stats.length ? stats.reduce((s, g) => s + g.steals, 0) / stats.length : 0;

  // ELO history for graph (use per-game results to approximate)
  const eloHistory = stats.length >= 2
    ? stats.map((s, i) => ({ rating: Math.round(user.elo_rating + (i - stats.length) * 8 + (s.result === 'win' ? 12 : -8)) }))
    : [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* No-show warning */}
      {user.noshow_warning && (
        <View style={styles.noshowBanner}>
          <Ionicons name="warning" size={14} color={Colors.warning} />
          <Text style={styles.noshowText}>This player has recent no-show reports.</Text>
        </View>
      )}

      {/* ── TRADING CARD HERO ── */}
      <View style={styles.cardSection}>
        <PlayerCard
          user={user}
          stats={stats.length >= 3 ? { pts: avgPts, ast: avgAst, reb: avgReb, stl: avgStl } : undefined}
        />
      </View>

      {/* ── WIN / LOSS BAR ── */}
      {user.total_games > 0 && (
        <View style={styles.card}>
          <View style={styles.wlHeader}>
            <Text style={styles.cardLabel}>WIN / LOSS</Text>
            <Text style={styles.wlRate}>{winRate}<Text style={styles.wlRateSuffix}>% WIN</Text></Text>
          </View>
          <View style={styles.wlBar}>
            <View style={[styles.wlFillW, { flex: user.wins }]} />
            <View style={[styles.wlFillL, { flex: user.losses || 0.01 }]} />
          </View>
          <View style={styles.wlLabels}>
            <Text style={[styles.wlLabel, { color: Colors.success }]}>{user.wins}W</Text>
            <Text style={[styles.wlLabel, { color: Colors.error }]}>{user.losses}L</Text>
          </View>
        </View>
      )}

      {/* ── ELO GRAPH ── */}
      <View style={styles.card}>
        <EloGraph
          data={eloHistory.length >= 2 ? eloHistory : [{ rating: user.elo_rating - 50 }, { rating: user.elo_rating }]}
          color={tierColor}
          height={110}
        />
      </View>

      {/* ── HOOPER SCORE ── */}
      <View style={styles.card}>
        <HooperScore
          punctuality={user.hooper_score_punctuality}
          sportsmanship={user.hooper_score_sportsmanship}
          skill={user.hooper_score_skill}
        />
      </View>

      {/* ── BROADCAST STATS ── */}
      {stats.length >= 3 && (
        <View style={styles.card}>
          <View style={styles.cardLabelRow}>
            <View style={styles.cardLabelAccent} />
            <Text style={styles.cardLabel}>PER GAME AVERAGES</Text>
          </View>
          <View style={styles.broadcastGrid}>
            <BroadcastStat label="PTS" value={avgPts.toFixed(1)} color={Colors.primary} />
            <BroadcastStat label="AST" value={avgAst.toFixed(1)} color={Colors.success} />
            <BroadcastStat label="REB" value={avgReb.toFixed(1)} color={Colors.secondary} />
            <BroadcastStat label="STL" value={avgStl.toFixed(1)} color={Colors.cyan} />
          </View>
        </View>
      )}

    </ScrollView>
  );
}

function BroadcastStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.broadcastStat, { borderTopColor: color }]}>
      <Text style={[styles.broadcastValue, { color, textShadowColor: color, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }]}>
        {value}
      </Text>
      <Text style={styles.broadcastLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { paddingBottom: 48 },
  loader: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },

  noshowBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: `${Colors.warning}15`,
    padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: `${Colors.warning}40`,
  },
  noshowText: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.sm, color: Colors.warning, flex: 1,
  },

  cardSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderRed,
  },

  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    padding: Spacing.md,
  },

  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  cardLabelAccent: {
    width: 3, height: 12,
    backgroundColor: Colors.primary, borderRadius: 1,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 4,
  },
  cardLabel: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 9, color: Colors.textMuted, letterSpacing: 3,
  },

  // Win/loss bar
  wlHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  wlRate: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28, color: Colors.success,
    textShadowColor: Colors.success,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  wlRateSuffix: { fontSize: 14, color: Colors.textMuted },
  wlBar: { flexDirection: 'row', height: 8, borderRadius: 1, overflow: 'hidden', gap: 2 },
  wlFillW: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 4,
  },
  wlFillL: {
    backgroundColor: Colors.error,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 4,
  },
  wlLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  wlLabel: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18, letterSpacing: 1,
  },

  // Broadcast stats
  broadcastGrid: { flexDirection: 'row', gap: 8 },
  broadcastStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 2,
  },
  broadcastValue: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 32, lineHeight: 32,
  },
  broadcastLabel: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 8, color: Colors.textMuted, letterSpacing: 2, marginTop: 3,
  },
});

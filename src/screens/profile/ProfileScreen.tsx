import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { User, PlayerStats } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius, getEloTier, getEloColor } from '@/theme';
import { Avatar } from '@/components/common/Avatar';
import { EloBadge } from '@/components/common/EloBadge';
import { HooperScore } from '@/components/common/HooperScore';
import { PlayerCard } from '@/components/common/PlayerCard';
import { EloGraph } from '@/components/common/EloGraph';
import { BallLoader } from '@/components/common/BallLoader';
import { ProfileStackParamList } from '@/navigation/MainNavigator';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const [user, setUser] = useState<User | null>(null);
  const [recentStats, setRecentStats] = useState<PlayerStats[]>([]);
  const [crewName, setCrewName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statTab, setStatTab] = useState<'alltime' | 'season'>('alltime');

  const fetchProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: userData } = await supabase
      .from('users')
      .select('*, home_court:courts(name)')
      .eq('auth_id', session.user.id)
      .single();

    if (userData) setUser(userData);

    const { data: stats } = await supabase
      .from('player_stats')
      .select('*, game:games(court:courts(name), format, scheduled_at)')
      .eq('user_id', userData?.id ?? '')
      .order('logged_at', { ascending: false })
      .limit(userData?.is_pro ? 100 : 10);

    if (stats) setRecentStats(stats);

    const { data: crewMember } = await supabase
      .from('crew_members')
      .select('crew:crews(name)')
      .eq('user_id', userData?.id ?? '')
      .limit(1)
      .single();

    if (crewMember?.crew) setCrewName((crewMember.crew as any).name);

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <BallLoader label="LOADING PROFILE..." />
      </View>
    );
  }

  if (!user) return null;

  const isRated = user.games_until_rated <= 0;
  const tier = getEloTier(user.elo_rating, isRated);
  const tierColor = getEloColor(user.elo_rating, isRated);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfile(); }} tintColor={Colors.primary} />}
    >
      {/* ── TRADING CARD HERO ── */}
      <View style={styles.cardHeroSection}>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={styles.editBtn}>
          <Ionicons name="pencil" size={14} color={Colors.textMuted} />
          <Text style={styles.editBtnText}>EDIT</Text>
        </TouchableOpacity>
        <PlayerCard
          user={user}
          stats={recentStats.length >= 3 ? {
            pts: recentStats.reduce((s, g) => s + g.points, 0) / recentStats.length,
            ast: recentStats.reduce((s, g) => s + g.assists, 0) / recentStats.length,
            reb: recentStats.reduce((s, g) => s + g.rebounds, 0) / recentStats.length,
            stl: recentStats.reduce((s, g) => s + g.steals, 0) / recentStats.length,
          } : undefined}
        />
      </View>

      {/* ── WIN / LOSS BAR ── */}
      {user.total_games > 0 && (
        <View style={styles.card}>
          <View style={styles.wlHeader}>
            <View style={styles.cardLabelRow}>
              <View style={styles.cardLabelAccent} />
              <Text style={styles.cardLabel}>WIN / LOSS</Text>
            </View>
            <Text style={styles.wlRate}>
              {user.total_games > 0 ? Math.round((user.wins / user.total_games) * 100) : 0}
              <Text style={styles.wlRateSuffix}>% WIN</Text>
            </Text>
          </View>
          <View style={styles.wlBar}>
            <View style={[styles.wlFillW, { flex: user.wins || 0.01 }]} />
            <View style={[styles.wlFillL, { flex: user.losses || 0.01 }]} />
          </View>
          <View style={styles.wlLabels}>
            <Text style={[styles.wlLabel, { color: Colors.success }]}>{user.wins}W</Text>
            <Text style={[styles.wlLabel, { color: Colors.error }]}>{user.losses}L</Text>
          </View>
        </View>
      )}

      {/* ── ELO GRAPH ── */}
      {isRated && (
        <View style={styles.card}>
          <EloGraph
            data={recentStats.length >= 2
              ? recentStats.map((s, i) => ({ rating: Math.round(user.elo_rating + (i - recentStats.length) * 8 + (s.result === 'win' ? 12 : -8)) }))
              : [{ rating: user.elo_rating - 50 }, { rating: user.elo_rating }]
            }
            color={tierColor}
            height={110}
          />
        </View>
      )}

      {/* Hooper Score */}
      <View style={styles.card}>
        <HooperScore
          punctuality={user.hooper_score_punctuality}
          sportsmanship={user.hooper_score_sportsmanship}
          skill={user.hooper_score_skill}
        />
      </View>

      {/* ── BROADCAST STATS ── */}
      <View style={styles.card}>
        <View style={styles.cardLabelRow}>
          <View style={styles.cardLabelAccent} />
          <Text style={styles.cardLabel}>CAREER STATS</Text>
          <View style={styles.tabToggle}>
            {(['alltime', 'season'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, statTab === t && styles.tabBtnActive]}
                onPress={() => setStatTab(t)}
              >
                <Text style={[styles.tabBtnText, statTab === t && styles.tabBtnTextActive]}>
                  {t === 'alltime' ? 'ALL-TIME' : 'SEASON'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.broadcastGrid}>
          <BroadcastStat label="GP" value={user.total_games} color={Colors.textSecondary} />
          <BroadcastStat label="W" value={user.wins} color={Colors.success} />
          <BroadcastStat label="L" value={user.losses} color={Colors.error} />
          <BroadcastStat
            label="PPG"
            value={recentStats.length > 0 ? (recentStats.reduce((s, g) => s + g.points, 0) / recentStats.length).toFixed(1) : '—'}
            color={Colors.primary}
          />
          <BroadcastStat
            label="APG"
            value={recentStats.length > 0 ? (recentStats.reduce((s, g) => s + g.assists, 0) / recentStats.length).toFixed(1) : '—'}
            color={Colors.success}
          />
          <BroadcastStat
            label="RPG"
            value={recentStats.length > 0 ? (recentStats.reduce((s, g) => s + g.rebounds, 0) / recentStats.length).toFixed(1) : '—'}
            color={Colors.secondary}
          />
        </View>

        {!user.is_pro && statTab === 'season' && (
          <TouchableOpacity style={styles.proCta} onPress={() => navigation.navigate('BlacktopPro')}>
            <Ionicons name="lock-closed" size={14} color={Colors.secondary} />
            <Text style={styles.proCtaText}>Unlock season stats with Blacktop Pro</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Crew */}
      {crewName && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>MY CREW</Text>
          <View style={styles.crewBadge}>
            <View style={styles.crewDot} />
            <Text style={styles.crewName}>{crewName}</Text>
          </View>
        </View>
      )}

      {/* Recent Games */}
      {recentStats.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>RECENT GAMES</Text>
          {recentStats.slice(0, 5).map((stat) => (
            <View key={stat.id} style={styles.recentGameRow}>
              <View>
                <Text style={styles.recentGameCourt}>{(stat.game as any)?.court?.name ?? 'Unknown'}</Text>
                <Text style={styles.recentGameDate}>
                  {stat.logged_at ? format(new Date(stat.logged_at), 'MMM d') : ''}
                </Text>
              </View>
              <View style={styles.recentGameStats}>
                <Text style={styles.recentGameStatText}>{stat.points}pts · {stat.assists}ast · {stat.rebounds}reb</Text>
                <View style={[
                  styles.resultPill,
                  { backgroundColor: stat.result === 'win' ? `${Colors.success}20` : stat.result === 'loss' ? `${Colors.error}20` : Colors.card }
                ]}>
                  <Text style={[
                    styles.resultPillText,
                    { color: stat.result === 'win' ? Colors.success : stat.result === 'loss' ? Colors.error : Colors.textMuted }
                  ]}>
                    {stat.result === 'win' ? 'W' : stat.result === 'loss' ? 'L' : '—'}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Settings + Pro links */}
      <View style={styles.settingsRow}>
        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={20} color={Colors.textMuted} />
          <Text style={styles.settingsButtonText}>Settings</Text>
        </TouchableOpacity>
        {!user.is_pro && (
          <TouchableOpacity style={styles.proButton} onPress={() => navigation.navigate('BlacktopPro')}>
            <Ionicons name="star" size={16} color={Colors.secondary} />
            <Text style={styles.proButtonText}>Go Pro</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function BroadcastStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.broadcastStat, { borderTopColor: color }]}>
      <Text style={[styles.broadcastValue, { color, textShadowColor: color, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }]}>
        {value}
      </Text>
      <Text style={styles.broadcastLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loader: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },

  cardHeroSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderRed,
  },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-end', marginRight: Spacing.md, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 2,
  },
  editBtnText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 9, color: Colors.textMuted, letterSpacing: 2,
  },

  // Win/loss bar
  wlHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  wlRate: { fontFamily: 'BebasNeue_400Regular', fontSize: 26, color: Colors.success },
  wlRateSuffix: { fontSize: 12, color: Colors.textMuted },
  wlBar: { flexDirection: 'row', height: 8, overflow: 'hidden', gap: 2, borderRadius: 1 },
  wlFillW: { backgroundColor: Colors.success, shadowColor: Colors.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4 },
  wlFillL: { backgroundColor: Colors.error, shadowColor: Colors.error, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 4 },
  wlLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  wlLabel: { fontFamily: 'BebasNeue_400Regular', fontSize: 18, letterSpacing: 1 },

  // Broadcast grid
  broadcastGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },

  avatarWrap: { position: 'relative', width: 92, height: 92, alignItems: 'center', justifyContent: 'center' },
  avatarGlowRing: {
    position: 'absolute', width: 80, height: 80,
    transform: [{ rotate: '45deg' }], borderWidth: 1,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 14,
  },
  avatarRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 2, padding: 2, alignItems: 'center', justifyContent: 'center' },
  nameSection: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  displayName: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: Colors.textPrimary, letterSpacing: 1 },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: `${Colors.secondary}20`, borderRadius: BorderRadius.full, paddingHorizontal: 7, paddingVertical: 1, borderWidth: 1, borderColor: Colors.secondary },
  proText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.secondary },
  tagsRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  posTag: { backgroundColor: `${Colors.secondary}15`, borderRadius: BorderRadius.full, paddingHorizontal: 7, paddingVertical: 1, borderWidth: 1, borderColor: Colors.secondary },
  posTagText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.secondary },
  neighborhood: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },
  card: { marginHorizontal: Spacing.md, marginTop: Spacing.md, backgroundColor: '#080808', borderRadius: 0, padding: Spacing.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  cardLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: Colors.textMuted, letterSpacing: 3 },
  cardLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  cardLabelAccent: {
    width: 3, height: 12, backgroundColor: Colors.primary, borderRadius: 1,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  broadcastStat: {
    flex: 1, minWidth: '30%',
    alignItems: 'center', paddingVertical: 12,
    backgroundColor: '#0A0A0A',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 2,
  },
  broadcastValue: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 28, lineHeight: 28,
  },
  broadcastLabel: {
    fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, color: Colors.textMuted, letterSpacing: 2, marginTop: 3,
  },
  eloRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  eloNumber: { fontFamily: 'BebasNeue_400Regular', fontSize: 48 },
  tierBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  tierText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, letterSpacing: 1 },
  unratedNote: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },
  tabToggle: { flexDirection: 'row', backgroundColor: '#111', borderRadius: 2, padding: 2, gap: 2, marginLeft: 'auto' as any },
  tabBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 2 },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabBtnText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1 },
  tabBtnTextActive: { color: '#000000' },
  proCta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.md, backgroundColor: `${Colors.secondary}10`, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.secondary },
  proCtaText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: Colors.secondary, flex: 1 },
  crewBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  crewDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.primary },
  crewName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.lg, color: Colors.textPrimary },
  recentGameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  recentGameCourt: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: Colors.textPrimary },
  recentGameDate: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  recentGameStats: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  recentGameStatText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  resultPill: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  resultPillText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs },
  settingsRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, paddingTop: 0 },
  settingsButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 12, paddingHorizontal: Spacing.md, backgroundColor: Colors.card, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  settingsButtonText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textMuted },
  proButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 12, paddingHorizontal: Spacing.md, backgroundColor: `${Colors.secondary}15`, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.secondary },
  proButtonText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.secondary },
});

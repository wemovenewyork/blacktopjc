import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { useRealtime } from '@/hooks/useRealtime';
import { Game, Court, GameFilters } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';
import { GameCard } from '@/components/common/GameCard';
import { FilterBar } from '@/components/common/FilterBar';
import { HomeStackParamList } from '@/navigation/MainNavigator';
import { isToday, isThisWeek } from 'date-fns';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const DEFAULT_FILTERS: GameFilters = {
  format: 'All',
  eloBand: 'Any',
  location: 'any',
  time: 'any',
  womensOnly: false,
};

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [games, setGames] = useState<Game[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [filters, setFilters] = useState<GameFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courtActivity, setCourtActivity] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<'games' | 'courts'>('games');

  const fetchData = useCallback(async () => {
    const [gamesRes, courtsRes, checkinsRes] = await Promise.all([
      supabase
        .from('games')
        .select('*, court:courts(*), host:users(*), game_players(count)')
        .in('status', ['open', 'full'])
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true }),
      supabase.from('courts').select('*'),
      supabase
        .from('court_checkins')
        .select('court_id')
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()),
    ]);

    if (gamesRes.data) {
      setGames(gamesRes.data.map((g: any) => ({ ...g, player_count: g.game_players?.[0]?.count ?? 0 })));
    }
    if (courtsRes.data) setCourts(courtsRes.data);
    if (checkinsRes.data) {
      const counts: Record<string, number> = {};
      for (const c of checkinsRes.data) counts[c.court_id] = (counts[c.court_id] ?? 0) + 1;
      setCourtActivity(counts);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useRealtime({ table: 'game_players', event: '*', onData: () => fetchData() });
  useRealtime({
    table: 'court_checkins',
    event: 'INSERT',
    onData: (payload) => {
      setCourtActivity((prev) => ({ ...prev, [payload.new.court_id]: (prev[payload.new.court_id] ?? 0) + 1 }));
    },
  });

  const filteredGames = games.filter((g) => {
    if (filters.format !== 'All' && g.format !== filters.format) return false;
    if (filters.eloBand !== 'Any' && g.elo_band !== filters.eloBand) return false;
    if (filters.location === 'indoor' && !(g.court as any)?.is_indoor) return false;
    if (filters.location === 'outdoor' && (g.court as any)?.is_indoor) return false;
    if (filters.time === 'today' && !isToday(new Date(g.scheduled_at))) return false;
    if (filters.time === 'week' && !isThisWeek(new Date(g.scheduled_at))) return false;
    if (filters.womensOnly && !g.is_womens_only) return false;
    return true;
  });

  function getCourtStatus(courtId: string): { color: string; label: string } {
    const hasGame = games.some((g) => g.court_id === courtId && g.status === 'open');
    if (hasGame) return { color: Colors.successBright, label: 'GAME ON' };
    const checkins = courtActivity[courtId] ?? 0;
    if (checkins >= 2) return { color: Colors.warningBright, label: `${checkins} HERE` };
    return { color: Colors.textMuted, label: 'QUIET' };
  }

  async function handleJoin(game: Game) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single();
    if (!user) return;
    await supabase.from('game_players').upsert({ game_id: game.id, user_id: user.id, rsvp_status: 'in' });
    fetchData();
  }

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color={Colors.primary} size="large" />
      <Text style={styles.loaderText}>LOADING COURTS...</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── HERO ── */}
      <View style={styles.hero}>
        <View style={styles.heroNav}>
          <View style={styles.logoWrap}>
            <View style={styles.logoBall} />
            <Text style={styles.logoText}>BLACKTOP JC</Text>
          </View>
          <View style={styles.liveChip}>
            <View style={styles.livePulse} />
            <Text style={styles.liveLabel}>LIVE</Text>
          </View>
        </View>

        <View style={styles.heroBody}>
          <Text style={styles.heroEyebrow}>The City's Game</Text>
          <Text style={styles.heroTitle}>FIND YOUR{'\n'}
            <Text style={styles.heroTitleRed}>RUN.</Text>
          </Text>
          <Text style={styles.heroSub}>
            Jersey City pickup basketball — real courts, real players, right now.
          </Text>

          <View style={styles.heroCTA}>
            <View style={styles.ctaDot} />
            <Text style={styles.ctaText}>
              {games.length} GAMES OPEN · {courts.length} COURTS
            </Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          <StatPill value={games.length} label="OPEN GAMES" color={Colors.primary} />
          <View style={styles.statsSep} />
          <StatPill value={courts.filter(c => games.some(g => g.court_id === c.id)).length} label="COURTS ACTIVE" color={Colors.successBright} />
          <View style={styles.statsSep} />
          <StatPill value={courts.length} label="TOTAL COURTS" color={Colors.textMuted} />
        </View>
      </View>

      {/* ── SECTION LABEL + TABS ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionLabelRow}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionLabel}>
            {tab === 'games' ? 'ACTIVE GAMES' : 'JC COURTS'}
          </Text>
        </View>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'games' && styles.tabBtnActive]}
            onPress={() => setTab('games')}
          >
            <Text style={[styles.tabBtnText, tab === 'games' && styles.tabBtnTextActive]}>GAMES</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'courts' && styles.tabBtnActive]}
            onPress={() => setTab('courts')}
          >
            <Text style={[styles.tabBtnText, tab === 'courts' && styles.tabBtnTextActive]}>COURTS</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── GAMES LIST ── */}
      {tab === 'games' && (
        <FlatList
          data={filteredGames}
          keyExtractor={(g) => g.id}
          ListHeaderComponent={<FilterBar filters={filters} onChange={setFilters} />}
          renderItem={({ item }) => (
            <GameCard
              game={item as any}
              onJoin={() => handleJoin(item)}
              onPress={() => navigation.navigate('GameDetail', { gameId: item.id })}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏀</Text>
              <Text style={styles.emptyTitle}>NO GAMES RIGHT NOW</Text>
              <Text style={styles.emptySub}>Be the first to run one</Text>
            </View>
          }
        />
      )}

      {/* ── COURTS LIST ── */}
      {tab === 'courts' && (
        <FlatList
          data={courts}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => {
            const { color, label } = getCourtStatus(item.id);
            const checkins = courtActivity[item.id] ?? 0;
            const gameCount = games.filter(g => g.court_id === item.id).length;
            return (
              <TouchableOpacity
                style={styles.courtCard}
                onPress={() => navigation.navigate('CourtDetail', { courtId: item.id })}
                activeOpacity={0.75}
              >
                <View style={[styles.courtBar, { backgroundColor: color }]} />
                <View style={styles.courtCardBody}>
                  <View style={styles.courtCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courtCardName}>{item.name}</Text>
                      <Text style={styles.courtCardMeta}>
                        {item.neighborhood.toUpperCase()} · {item.is_indoor ? 'INDOOR' : 'OUTDOOR'}
                        {item.has_lighting ? ' · LIT' : ''}
                      </Text>
                    </View>
                    <View style={[styles.courtStatus, { borderColor: color }]}>
                      <Text style={[styles.courtStatusText, { color }]}>{label}</Text>
                    </View>
                  </View>
                  {(gameCount > 0 || checkins > 0) && (
                    <View style={styles.courtCardFooter}>
                      {gameCount > 0 && (
                        <View style={styles.courtPill}>
                          <View style={[styles.courtPillDot, { backgroundColor: Colors.primary }]} />
                          <Text style={styles.courtPillText}>{gameCount} GAME{gameCount > 1 ? 'S' : ''}</Text>
                        </View>
                      )}
                      {checkins > 0 && (
                        <View style={styles.courtPill}>
                          <View style={[styles.courtPillDot, { backgroundColor: Colors.warningBright }]} />
                          <Text style={styles.courtPillText}>{checkins} CHECKED IN</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} style={{ alignSelf: 'center', marginRight: Spacing.md }} />
              </TouchableOpacity>
            );
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

function StatPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statPillNum, { color }]}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  loader: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loaderText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.sm, color: Colors.textMuted, letterSpacing: 4 },

  // ── Hero
  hero: {
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBall: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  logoText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 20,
    color: '#FFFFFF',
    letterSpacing: 3,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.4)',
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  livePulse: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.successBright },
  liveLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 10, color: Colors.successBright, letterSpacing: 2 },

  heroBody: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  heroEyebrow: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 56,
    color: '#FFFFFF',
    letterSpacing: 2,
    lineHeight: 54,
    marginBottom: Spacing.sm,
  },
  heroTitleRed: {
    color: Colors.primary,
  },
  heroSub: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.md,
    color: Colors.textMuted,
    lineHeight: 20,
    maxWidth: 300,
    marginBottom: Spacing.md,
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  ctaText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    letterSpacing: 2,
  },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  statPillNum: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    lineHeight: 28,
  },
  statPillLabel: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  statsSep: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 8,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionAccent: {
    width: 3,
    height: 14,
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
  sectionLabel: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
    letterSpacing: 3,
  },
  tabs: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 2,
    padding: 2,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 2,
  },
  tabBtnActive: {
    backgroundColor: Colors.primary,
  },
  tabBtnText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },

  list: { padding: Spacing.md, paddingBottom: 40 },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 60, gap: Spacing.sm },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: Colors.textPrimary,
    letterSpacing: 3,
  },
  emptySub: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    letterSpacing: 1,
  },

  // Court cards
  courtCard: {
    flexDirection: 'row',
    backgroundColor: '#0D0D0D',
    borderRadius: 2,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },
  courtBar: { width: 3 },
  courtCardBody: {
    flex: 1,
    padding: Spacing.md,
    gap: 6,
  },
  courtCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  courtCardName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: FontSize.xl,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  courtCardMeta: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginTop: 2,
  },
  courtStatus: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  courtStatusText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 9,
    letterSpacing: 1.5,
  },
  courtCardFooter: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  courtPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  courtPillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  courtPillText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
});

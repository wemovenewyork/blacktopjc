import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
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

  const activeCourts = courts.filter(c => (courtActivity[c.id] ?? 0) > 0 || games.some(g => g.court_id === c.id)).length;

  if (loading) return (
    <View style={styles.loader}>
      <ActivityIndicator color={Colors.primary} size="large" />
      <Text style={styles.loaderText}>LOADING COURTS...</Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>BLACKTOP</Text>
          <Text style={styles.logoSub}>JERSEY CITY</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </View>

      {/* Hero stats bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{games.length}</Text>
          <Text style={styles.statLabel}>OPEN GAMES</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{courts.length}</Text>
          <Text style={styles.statLabel}>COURTS</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: Colors.successBright }]}>{activeCourts}</Text>
          <Text style={styles.statLabel}>ACTIVE NOW</Text>
        </View>
      </View>

      {/* Tab nav */}
      <View style={styles.tabNav}>
        {(['games', 'courts'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabNavBtn, tab === t && styles.tabNavBtnActive]}
            onPress={() => setTab(t)}
          >
            <Ionicons
              name={t === 'games' ? 'basketball' : 'location'}
              size={14}
              color={tab === t ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.tabNavText, tab === t && styles.tabNavTextActive]}>
              {t === 'games' ? `GAMES (${filteredGames.length})` : `COURTS (${courts.length})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Games tab */}
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
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🏀</Text>
              <Text style={styles.emptyTitle}>NO GAMES RIGHT NOW</Text>
              <Text style={styles.emptySubtitle}>Be the first to run one</Text>
            </View>
          }
        />
      )}

      {/* Courts tab */}
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
                <View style={[styles.courtAccent, { backgroundColor: color }]} />
                <View style={styles.courtCardInner}>
                  <View style={styles.courtCardTop}>
                    <View style={styles.courtCardInfo}>
                      <Text style={styles.courtCardName}>{item.name}</Text>
                      <View style={styles.courtCardMeta}>
                        <Ionicons name="location" size={10} color={Colors.textMuted} />
                        <Text style={styles.courtCardNeighborhood}>{item.neighborhood}</Text>
                        <Text style={styles.courtCardDot}>·</Text>
                        <Text style={styles.courtCardType}>{item.is_indoor ? 'INDOOR' : 'OUTDOOR'}</Text>
                        {item.has_lighting && (
                          <>
                            <Text style={styles.courtCardDot}>·</Text>
                            <Ionicons name="flashlight" size={10} color={Colors.textMuted} />
                          </>
                        )}
                      </View>
                    </View>
                    <View style={[styles.courtStatusBadge, { borderColor: color, backgroundColor: `${color}15` }]}>
                      <Text style={[styles.courtStatusText, { color }]}>{label}</Text>
                    </View>
                  </View>
                  <View style={styles.courtCardStats}>
                    {gameCount > 0 && (
                      <View style={styles.courtStat}>
                        <Ionicons name="basketball" size={10} color={Colors.primary} />
                        <Text style={[styles.courtStatText, { color: Colors.primary }]}>{gameCount} game{gameCount > 1 ? 's' : ''}</Text>
                      </View>
                    )}
                    {checkins > 0 && (
                      <View style={styles.courtStat}>
                        <Ionicons name="people" size={10} color={Colors.warningBright} />
                        <Text style={[styles.courtStatText, { color: Colors.warningBright }]}>{checkins} checked in</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ marginLeft: 'auto' as any }} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loaderText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.md, color: Colors.textMuted, letterSpacing: 3 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  logo: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 36,
    color: Colors.primary,
    letterSpacing: 4,
    lineHeight: 36,
  },
  logoSub: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 4,
    marginTop: -2,
  },
  headerRight: { alignItems: 'flex-end' },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: `${Colors.successBright}15`,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: `${Colors.successBright}30`,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.successBright,
  },
  liveText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.successBright,
    letterSpacing: 1,
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 32,
    color: Colors.primary,
    lineHeight: 32,
  },
  statLabel: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },

  // Tab nav
  tabNav: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tabNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabNavBtnActive: {
    borderBottomColor: Colors.primary,
  },
  tabNavText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1.5,
  },
  tabNavTextActive: {
    color: Colors.primary,
  },

  listContent: { padding: Spacing.md, paddingBottom: 40 },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: Spacing.sm,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  emptySubtitle: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },

  // Court cards
  courtCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  courtAccent: {
    width: 3,
  },
  courtCardInner: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  courtCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courtCardInfo: { flex: 1, marginRight: Spacing.sm },
  courtCardName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  courtCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  courtCardNeighborhood: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  courtCardDot: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  courtCardType: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  courtStatusBadge: {
    borderRadius: BorderRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  courtStatusText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    letterSpacing: 1,
  },
  courtCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  courtStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  courtStatText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
  },
});

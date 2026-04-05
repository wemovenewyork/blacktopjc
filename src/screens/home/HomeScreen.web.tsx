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
    if (hasGame) return { color: Colors.success, label: 'Game on' };
    const checkins = courtActivity[courtId] ?? 0;
    if (checkins >= 2) return { color: Colors.warning, label: `${checkins} here` };
    return { color: Colors.textMuted, label: 'Quiet' };
  }

  async function handleJoin(game: Game) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single();
    if (!user) return;
    await supabase.from('game_players').upsert({ game_id: game.id, user_id: user.id, rsvp_status: 'in' });
    fetchData();
  }

  if (loading) return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>BLACKTOP JC</Text>
        <View style={styles.tabRow}>
          {(['games', 'courts'] as const).map((t) => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>{t.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {tab === 'games' && (
        <>
          <FilterBar filters={filters} onChange={setFilters} />
          <FlatList
            data={filteredGames}
            keyExtractor={(g) => g.id}
            renderItem={({ item }) => (
              <GameCard game={item as any} onJoin={() => handleJoin(item)} onPress={() => navigation.navigate('GameDetail', { gameId: item.id })} />
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="basketball-outline" size={48} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No games match your filters</Text>
                <TouchableOpacity onPress={() => setFilters(DEFAULT_FILTERS)}>
                  <Text style={styles.clearText}>Clear filters</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </>
      )}

      {tab === 'courts' && (
        <FlatList
          data={courts}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => {
            const { color, label } = getCourtStatus(item.id);
            return (
              <TouchableOpacity style={styles.courtRow} onPress={() => navigation.navigate('CourtDetail', { courtId: item.id })}>
                <View style={[styles.courtDot, { backgroundColor: color }]} />
                <View style={styles.courtInfo}>
                  <Text style={styles.courtName}>{item.name}</Text>
                  <Text style={styles.courtMeta}>{item.neighborhood} · {item.is_indoor ? 'Indoor' : 'Outdoor'}</Text>
                </View>
                <Text style={[styles.courtStatus, { color }]}>{label}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
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
  loader: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.background },
  logo: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: Colors.primary, letterSpacing: 3 },
  tabRow: { flexDirection: 'row', gap: 4, backgroundColor: Colors.card, borderRadius: BorderRadius.sm, padding: 2 },
  tabBtn: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: 4 },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabBtnText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1 },
  tabBtnTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 20 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: Spacing.sm },
  emptyText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textMuted },
  clearText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: Colors.primary },
  courtRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Spacing.sm },
  courtDot: { width: 10, height: 10, borderRadius: 5 },
  courtInfo: { flex: 1 },
  courtName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.textPrimary },
  courtMeta: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  courtStatus: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs },
});

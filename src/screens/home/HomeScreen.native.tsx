import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { useLocation } from '@/hooks/useLocation';
import { useRealtime } from '@/hooks/useRealtime';
import { Game, Court, GameFilters, EloBand, Format } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '@/theme';
import { GameCard } from '@/components/common/GameCard';
import { FilterBar } from '@/components/common/FilterBar';
import { HomeStackParamList } from '@/navigation/MainNavigator';
import { isToday, isThisWeek } from 'date-fns';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

const DEFAULT_REGION = {
  latitude: 40.7282,
  longitude: -74.0776,
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

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
  const { location } = useLocation();
  const mapRef = useRef<MapView>(null);

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [games, setGames] = useState<Game[]>([]);
  const [courts, setCourts] = useState<Court[]>([]);
  const [filters, setFilters] = useState<GameFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courtActivity, setCourtActivity] = useState<Record<string, number>>({});

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
      const processed = gamesRes.data.map((g: any) => ({
        ...g,
        player_count: g.game_players?.[0]?.count ?? 0,
      }));
      setGames(processed);
    }

    if (courtsRes.data) setCourts(courtsRes.data);

    if (checkinsRes.data) {
      const counts: Record<string, number> = {};
      for (const c of checkinsRes.data) {
        counts[c.court_id] = (counts[c.court_id] ?? 0) + 1;
      }
      setCourtActivity(counts);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: update game player counts
  useRealtime({
    table: 'game_players',
    event: '*',
    onData: () => fetchData(),
  });

  useRealtime({
    table: 'court_checkins',
    event: 'INSERT',
    onData: (payload) => {
      setCourtActivity((prev) => ({
        ...prev,
        [payload.new.court_id]: (prev[payload.new.court_id] ?? 0) + 1,
      }));
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

  function getCourtPinColor(courtId: string): string {
    const hasActiveGame = games.some((g) => g.court_id === courtId && g.status === 'open');
    if (hasActiveGame) return Colors.success;
    const checkins = courtActivity[courtId] ?? 0;
    if (checkins >= 2) return Colors.warning;
    return Colors.textMuted;
  }

  async function handleJoin(game: Game) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', session.user.id)
      .single();
    if (!user) return;
    await supabase.from('game_players').upsert({
      game_id: game.id,
      user_id: user.id,
      rsvp_status: 'in',
    });
    fetchData();
  }

  function centerOnUser() {
    if (location) {
      mapRef.current?.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>BLACKTOP JC</Text>
        <View style={styles.viewToggle}>
          {(['map', 'list'] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.toggleBtn, viewMode === m && styles.toggleBtnActive]}
              onPress={() => setViewMode(m)}
            >
              <Ionicons
                name={m === 'map' ? 'map' : 'list'}
                size={16}
                color={viewMode === m ? Colors.textPrimary : Colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Map view */}
      {viewMode === 'map' && (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={DEFAULT_REGION}
            userInterfaceStyle="dark"
            showsUserLocation
          >
            {courts.map((court) => (
              <Marker
                key={court.id}
                coordinate={{ latitude: court.lat, longitude: court.lng }}
                onPress={() => navigation.navigate('CourtDetail', { courtId: court.id })}
              >
                <View style={[styles.pin, { backgroundColor: getCourtPinColor(court.id) }]}>
                  <Ionicons name="basketball" size={14} color="#fff" />
                </View>
              </Marker>
            ))}
          </MapView>

          {/* Locate button */}
          <TouchableOpacity style={styles.locateButton} onPress={centerOnUser}>
            <Ionicons name="locate" size={20} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <View style={styles.courtList}>
          <FlatList
            data={courts}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.courtRow}
                onPress={() => navigation.navigate('CourtDetail', { courtId: item.id })}
              >
                <View style={[styles.courtDot, { backgroundColor: getCourtPinColor(item.id) }]} />
                <View style={styles.courtRowInfo}>
                  <Text style={styles.courtRowName}>{item.name}</Text>
                  <Text style={styles.courtRowMeta}>
                    {item.neighborhood} · {item.is_indoor ? 'Indoor' : 'Outdoor'}
                  </Text>
                </View>
                <View style={styles.courtRowStats}>
                  <Text style={styles.courtRowCheckins}>
                    {courtActivity[item.id] ?? 0} here
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </View>
              </TouchableOpacity>
            )}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
            contentContainerStyle={styles.courtListContent}
          />
        </View>
      )}

      {/* Game feed */}
      <View style={styles.feedContainer}>
        <View style={styles.feedHeader}>
          <Text style={styles.feedTitle}>LIVE GAMES</Text>
          <View style={styles.gameCountBadge}>
            <Text style={styles.gameCount}>{filteredGames.length}</Text>
          </View>
        </View>

        <FilterBar filters={filters} onChange={setFilters} />

        <FlatList
          data={filteredGames}
          keyExtractor={(g) => g.id}
          renderItem={({ item }) => (
            <GameCard
              game={item as any}
              onJoin={() => handleJoin(item)}
              onPress={() => navigation.navigate('GameDetail', { gameId: item.id })}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
          contentContainerStyle={styles.gameList}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="basketball-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No games match your filters</Text>
              <TouchableOpacity onPress={() => setFilters(DEFAULT_FILTERS)}>
                <Text style={styles.clearFilters}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  logo: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24,
    color: Colors.primary,
    letterSpacing: 2,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.sm,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    padding: 6,
    borderRadius: 4,
  },
  toggleBtnActive: { backgroundColor: Colors.primary },
  mapContainer: { height: 220, position: 'relative' },
  map: { flex: 1 },
  pin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    ...Shadow.md,
  },
  locateButton: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadow.md,
  },
  courtList: { height: 220 },
  courtListContent: { paddingHorizontal: Spacing.md },
  courtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  courtDot: { width: 10, height: 10, borderRadius: 5 },
  courtRowInfo: { flex: 1 },
  courtRowName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.textPrimary },
  courtRowMeta: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted },
  courtRowStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  courtRowCheckins: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted },
  feedContainer: { flex: 1, borderTopWidth: 1, borderTopColor: Colors.border },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  feedTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
    letterSpacing: 2,
  },
  gameCountBadge: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 1,
  },
  gameCount: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.textPrimary,
  },
  gameList: { paddingHorizontal: Spacing.md, paddingBottom: 20 },
  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
  emptyText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textMuted },
  clearFilters: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: Colors.primary },
});

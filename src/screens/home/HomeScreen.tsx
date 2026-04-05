import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Animated,
  Easing,
  Image,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { useRealtime } from '@/hooks/useRealtime';
import { getCourtPhoto } from '@/lib/courtPhotos';
import { Game, Court, GameFilters } from '@/types';
import { Colors, FontSize, Spacing } from '@/theme';
import { GameCard } from '@/components/common/GameCard';
import { FilterBar } from '@/components/common/FilterBar';
import { SkeletonCard } from '@/components/common/SkeletonCard';
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

// ── Count-up hook ──────────────────────────────────────────────
function useCountUp(target: number, duration = 900): number {
  const [display, setDisplay] = useState(0);
  const anim = useRef(new Animated.Value(0));
  useEffect(() => {
    const id = anim.current.addListener(({ value }) => setDisplay(Math.round(value)));
    Animated.timing(anim.current, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => anim.current.removeListener(id);
  }, [target, duration]);
  return display;
}

// ── Staggered card wrapper ────────────────────────────────────
function FadeSlideIn({ index, children }: { index: number; children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      delay: index * 55,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

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

  // ── Animations ────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.15,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

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

  const activeCourtsCount = courts.filter(c => games.some(g => g.court_id === c.id)).length;

  // Count-up stats
  const displayGames = useCountUp(games.length);
  const displayActiveCourts = useCountUp(activeCourtsCount);
  const displayTotalCourts = useCountUp(courts.length);

  function getCourtStatus(courtId: string): { color: string; label: string } {
    const hasGame = games.some((g) => g.court_id === courtId && g.status === 'open');
    if (hasGame) return { color: Colors.success, label: 'GAME ON' };
    const checkins = courtActivity[courtId] ?? 0;
    if (checkins >= 2) return { color: Colors.secondary, label: `${checkins} HERE` };
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

  // Skeleton loading state
  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <SkeletonHeader />
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── HERO ── */}
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=900&q=80&fit=crop' }}
        style={styles.heroOuter}
        imageStyle={styles.heroBgImage}
      >
        {/* Dark scrim */}
        <View style={styles.heroBgScrim} />

        {/* Nav row — logo + live badge */}
        <View style={styles.headerInner}>
          <View style={styles.logoWrap}>
            <View style={styles.logoDiamond} />
            <Text style={styles.logoText}>BLACKTOP</Text>
            <Text style={styles.logoTextRed}>JC</Text>
          </View>
          <View style={styles.liveWrap}>
            <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        {/* Hero copy */}
        <View style={styles.heroBody}>
          <Text style={styles.heroEyebrow}>JERSEY CITY · PICKUP BASKETBALL</Text>
          <Text style={styles.heroTitle}>
            FIND YOUR{'\n'}<Text style={styles.heroRed}>RUN.</Text>
          </Text>
          <View style={styles.heroRule} />
          <Text style={styles.heroSub}>Real courts · Real players · Right now</Text>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <StatBox value={displayGames} label="GAMES OPEN" color={Colors.primary} />
          <View style={styles.statsDivider} />
          <StatBox value={displayActiveCourts} label="COURTS HOT" color={Colors.success} />
          <View style={styles.statsDivider} />
          <StatBox value={displayTotalCourts} label="TOTAL COURTS" color={Colors.textSecondary} />
        </View>
      </ImageBackground>

      {/* ── TAB BAR ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('games')} activeOpacity={0.7}>
          <Text style={[styles.tabLabel, tab === 'games' && styles.tabLabelActive]}>GAMES</Text>
          {tab === 'games' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabItem} onPress={() => setTab('courts')} activeOpacity={0.7}>
          <Text style={[styles.tabLabel, tab === 'courts' && styles.tabLabelActive]}>COURTS</Text>
          {tab === 'courts' && <View style={styles.tabUnderline} />}
        </TouchableOpacity>
        <View style={styles.tabFlex} />
        <View style={styles.sectionTag}>
          <View style={styles.sectionTagAccent} />
          <Text style={styles.sectionTagText}>
            {tab === 'games' ? `${filteredGames.length} RUNS` : `${courts.length} SPOTS`}
          </Text>
        </View>
      </View>

      {/* ── GAMES LIST ── */}
      {tab === 'games' && (
        <FlatList
          data={filteredGames}
          keyExtractor={(g) => g.id}
          ListHeaderComponent={<FilterBar filters={filters} onChange={setFilters} />}
          renderItem={({ item, index }) => (
            <FadeSlideIn index={index}>
              <GameCard
                game={item as any}
                onJoin={() => handleJoin(item)}
                onPress={() => navigation.navigate('GameDetail', { gameId: item.id })}
              />
            </FadeSlideIn>
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyIcon}>🏀</Text>
              </View>
              <Text style={styles.emptyTitle}>NO RUNS RIGHT NOW</Text>
              <Text style={styles.emptySub}>Be the first to call one</Text>
            </View>
          }
        />
      )}

      {/* ── COURTS LIST ── */}
      {tab === 'courts' && (
        <FlatList
          data={courts}
          keyExtractor={(c) => c.id}
          renderItem={({ item, index }) => {
            const { color, label } = getCourtStatus(item.id);
            const checkins = courtActivity[item.id] ?? 0;
            const gameCount = games.filter(g => g.court_id === item.id).length;
            return (
              <FadeSlideIn index={index}>
                <TouchableOpacity
                  style={styles.courtCard}
                  onPress={() => navigation.navigate('CourtDetail', { courtId: item.id })}
                  activeOpacity={0.75}
                >
                  {/* Photo thumbnail */}
                  <View style={styles.courtThumbWrap}>
                    <Image
                      source={{ uri: getCourtPhoto(item.name) }}
                      style={styles.courtThumb}
                      resizeMode="cover"
                    />
                    <View style={[styles.courtThumbOverlay, { backgroundColor: `${color}25` }]} />
                  </View>

                  <View style={[styles.courtGlowBar, { backgroundColor: color, shadowColor: color }]} />

                  <View style={styles.courtBody}>
                    <View style={styles.courtTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.courtName}>{item.name}</Text>
                        <Text style={styles.courtMeta}>
                          {item.neighborhood.toUpperCase()} · {item.is_indoor ? 'INDOOR' : 'OUTDOOR'}
                          {item.has_lighting ? ' · LIT' : ''}
                        </Text>
                      </View>
                      <View style={[styles.courtBadge, { borderColor: color }]}>
                        <View style={[styles.courtBadgeDot, { backgroundColor: color }]} />
                        <Text style={[styles.courtBadgeText, { color }]}>{label}</Text>
                      </View>
                    </View>

                    {(gameCount > 0 || checkins > 0) && (
                      <View style={styles.courtFooter}>
                        {gameCount > 0 && (
                          <View style={styles.courtChip}>
                            <Text style={[styles.courtChipText, { color: Colors.primary }]}>
                              {gameCount} GAME{gameCount > 1 ? 'S' : ''}
                            </Text>
                          </View>
                        )}
                        {checkins > 0 && (
                          <View style={styles.courtChip}>
                            <Text style={[styles.courtChipText, { color: Colors.secondary }]}>
                              {checkins} HERE
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} style={{ alignSelf: 'center', marginRight: 14 }} />
                </TouchableOpacity>
              </FadeSlideIn>
            );
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchData(); }}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statNum, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SkeletonHeader() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.5] });

  return (
    <View style={[styles.heroOuter, { backgroundColor: '#0A0A0A' }]}>
      <View style={styles.headerInner}>
        <View style={styles.logoWrap}>
          <View style={styles.logoDiamond} />
          <Text style={styles.logoText}>BLACKTOP</Text>
          <Text style={styles.logoTextRed}>JC</Text>
        </View>
        <View style={styles.liveWrap}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      <View style={styles.heroBody}>
        <Text style={styles.heroEyebrow}>JERSEY CITY · PICKUP BASKETBALL</Text>
        <Text style={styles.heroTitle}>
          FIND YOUR{'\n'}<Text style={styles.heroRed}>RUN.</Text>
        </Text>
        <View style={styles.heroRule} />
        <Text style={styles.heroSub}>Real courts · Real players · Right now</Text>
      </View>
      <View style={styles.statsBar}>
        {[Colors.primary, Colors.success, Colors.textSecondary].map((color, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={styles.statsDivider} />}
            <View style={styles.statBox}>
              <Animated.View style={{ width: 32, height: 28, backgroundColor: color, opacity, borderRadius: 2 }} />
              <Animated.View style={{ width: 60, height: 8, backgroundColor: '#333', opacity, borderRadius: 2, marginTop: 4 }} />
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  skeletonList: { padding: Spacing.md, paddingBottom: 40 },

  // ── Hero with photo background
  heroOuter: {
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderRed,
    overflow: 'hidden',
  },
  heroBgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroBgScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // heavy scrim so text stays legible — dark at top, near-black at bottom
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  headerInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    position: 'relative',
  },
  logoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoDiamond: {
    width: 9,
    height: 9,
    backgroundColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  logoText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  logoTextRed: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 22,
    color: Colors.primary,
    letterSpacing: 4,
    marginLeft: -2,
  },
  liveWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: `${Colors.success}60`,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 2,
    backgroundColor: `${Colors.success}08`,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  liveText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 10,
    color: Colors.success,
    letterSpacing: 2,
  },
  heroBody: {
    paddingHorizontal: Spacing.md,
    paddingTop: 4,
    paddingBottom: Spacing.md,
    position: 'relative',
  },
  heroEyebrow: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 3,
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 64,
    color: '#FFFFFF',
    letterSpacing: 2,
    lineHeight: 60,
    marginBottom: Spacing.sm,
  },
  heroRed: {
    color: Colors.primary,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  heroRule: {
    width: 40,
    height: 2,
    backgroundColor: Colors.primary,
    marginBottom: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  heroSub: {
    fontFamily: 'RobotoCondensed_400Regular',
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    letterSpacing: 1,
  },

  // Stats bar
  statsBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  statNum: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 32,
    lineHeight: 30,
  },
  statLabel: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 8,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginTop: 3,
  },
  statsDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 10,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: Spacing.md,
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginRight: 20,
    position: 'relative',
  },
  tabLabel: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: 2.5,
  },
  tabLabelActive: {
    color: '#FFFFFF',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  tabFlex: { flex: 1 },
  sectionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTagAccent: {
    width: 3,
    height: 12,
    backgroundColor: Colors.primary,
    borderRadius: 1,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  sectionTagText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 2,
  },

  list: { padding: Spacing.md, paddingBottom: 40 },

  empty: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: Spacing.md,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    backgroundColor: `${Colors.primary}10`,
    borderWidth: 1,
    borderColor: Colors.borderRed,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '45deg' }],
    marginBottom: 8,
  },
  emptyIcon: {
    fontSize: 28,
    transform: [{ rotate: '-45deg' }],
  },
  emptyTitle: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 24,
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
    backgroundColor: '#080808',
    borderRadius: 0,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  courtThumbWrap: {
    width: 70,
    position: 'relative',
  },
  courtThumb: {
    width: 70,
    height: '100%' as any,
  },
  courtThumbOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  courtGlowBar: {
    width: 4,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  courtBody: {
    flex: 1,
    padding: Spacing.md,
    gap: 8,
  },
  courtTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  courtName: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: FontSize.xl,
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  courtMeta: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 8,
    color: Colors.textMuted,
    letterSpacing: 2,
    marginTop: 2,
  },
  courtBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  courtBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  courtBadgeText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 8,
    letterSpacing: 1.5,
  },
  courtFooter: {
    flexDirection: 'row',
    gap: 10,
  },
  courtChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  courtChipText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 8,
    letterSpacing: 1.5,
  },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { Court } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';
import { CourtsStackParamList } from '@/navigation/MainNavigator';

type Nav = NativeStackNavigationProp<CourtsStackParamList, 'Courts'>;
type Filter = 'All' | 'Indoor' | 'Outdoor' | 'Lights';

export function CourtsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [courts, setCourts] = useState<Court[]>([]);
  const [checkinCounts, setCheckinCounts] = useState<Record<string, number>>({});
  const [gameCounts, setGameCounts] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [refreshing, setRefreshing] = useState(false);

  const fetchCourts = useCallback(async () => {
    const [courtsRes, checkinsRes, gamesRes, favRes] = await Promise.all([
      supabase.from('courts').select('*').order('name'),
      supabase
        .from('court_checkins')
        .select('court_id')
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()),
      supabase
        .from('games')
        .select('court_id')
        .in('status', ['open', 'full'])
        .gte('scheduled_at', new Date().toISOString()),
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session) return { data: [] };
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', session.user.id)
          .single();
        if (!user) return { data: [] };
        return supabase.from('court_favorites').select('court_id').eq('user_id', user.id);
      }),
    ]);

    if (courtsRes.data) setCourts(courtsRes.data);

    if (checkinsRes.data) {
      const counts: Record<string, number> = {};
      for (const c of checkinsRes.data) counts[c.court_id] = (counts[c.court_id] ?? 0) + 1;
      setCheckinCounts(counts);
    }

    if (gamesRes.data) {
      const counts: Record<string, number> = {};
      for (const g of gamesRes.data) counts[g.court_id] = (counts[g.court_id] ?? 0) + 1;
      setGameCounts(counts);
    }

    const favData = await favRes;
    if (favData?.data) setFavorites(new Set(favData.data.map((f: any) => f.court_id)));

    setRefreshing(false);
  }, []);

  useEffect(() => { fetchCourts(); }, [fetchCourts]);

  async function toggleFavorite(courtId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: user } = await supabase
      .from('users').select('id').eq('auth_id', session.user.id).single();
    if (!user) return;

    if (favorites.has(courtId)) {
      await supabase.from('court_favorites').delete()
        .eq('user_id', user.id).eq('court_id', courtId);
      setFavorites((prev) => { const n = new Set(prev); n.delete(courtId); return n; });
    } else {
      await supabase.from('court_favorites').insert({ user_id: user.id, court_id: courtId });
      setFavorites((prev) => new Set([...prev, courtId]));
    }
  }

  const filtered = courts.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
      !c.neighborhood?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'Indoor' && !c.is_indoor) return false;
    if (filter === 'Outdoor' && c.is_indoor) return false;
    if (filter === 'Lights' && !c.has_lighting) return false;
    return true;
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>COURTS</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search courts..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {(['All', 'Indoor', 'Outdoor', 'Lights'] as Filter[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlashList
        data={filtered}
        estimatedItemSize={80}
        keyExtractor={(c) => c.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCourts(); }} tintColor={Colors.primary} />
        }
        renderItem={({ item: court }) => {
          const checkins = checkinCounts[court.id] ?? 0;
          const games = gameCounts[court.id] ?? 0;
          const isActive = games > 0;
          const hasCheckins = checkins > 0;

          return (
            <TouchableOpacity
              style={styles.courtCard}
              onPress={() => navigation.navigate('CourtDetail', { courtId: court.id })}
              activeOpacity={0.8}
            >
              <View style={styles.courtInfo}>
                <View style={styles.courtNameRow}>
                  <Text style={styles.courtName}>{court.name}</Text>
                  {games > 0 && (
                    <View style={styles.gameBadge}>
                      <Text style={styles.gameBadgeText}>{games} game{games > 1 ? 's' : ''}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.courtMeta}>
                  {court.neighborhood} · {court.is_indoor ? 'Indoor' : 'Outdoor'} · {court.surface_type}
                </Text>
                <View style={styles.iconsRow}>
                  {court.has_lighting && (
                    <View style={styles.iconBadge}>
                      <Ionicons name="bulb" size={12} color={Colors.secondary} />
                      <Text style={styles.iconBadgeText}>Lights</Text>
                    </View>
                  )}
                  {court.is_indoor && (
                    <View style={styles.iconBadge}>
                      <Ionicons name="home" size={12} color={Colors.textMuted} />
                      <Text style={styles.iconBadgeText}>Indoor</Text>
                    </View>
                  )}
                  {checkins > 0 && (
                    <View style={styles.checkinBadge}>
                      <View style={[styles.liveDot, { backgroundColor: isActive ? Colors.success : Colors.warning }]} />
                      <Text style={styles.checkinText}>{checkins} here now</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.rightColumn}>
                <TouchableOpacity onPress={() => toggleFavorite(court.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons
                    name={favorites.has(court.id) ? 'heart' : 'heart-outline'}
                    size={20}
                    color={favorites.has(court.id) ? Colors.primary : Colors.textMuted}
                  />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: Colors.textPrimary, letterSpacing: 2, paddingHorizontal: Spacing.md, paddingTop: Spacing.sm, paddingBottom: Spacing.xs },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, backgroundColor: Colors.card, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textPrimary },
  filterRow: { flexDirection: 'row', gap: Spacing.xs, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  filterChipText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted },
  filterChipTextActive: { color: Colors.primary },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 20 },
  courtCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  courtInfo: { flex: 1 },
  courtNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  courtName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.textPrimary },
  gameBadge: { backgroundColor: `${Colors.primary}20`, borderRadius: BorderRadius.full, paddingHorizontal: 7, paddingVertical: 1, borderWidth: 1, borderColor: Colors.primary },
  gameBadgeText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.primary },
  courtMeta: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: 4 },
  iconsRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  iconBadgeText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  checkinBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  checkinText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  rightColumn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingLeft: Spacing.sm },
});

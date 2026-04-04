import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { Crew } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';
import { CrewsStackParamList } from '@/navigation/MainNavigator';

type Nav = NativeStackNavigationProp<CrewsStackParamList, 'Crews'>;
type LeaderboardTab = 'wl' | 'rep' | 'games';

export function CrewsScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [myCrew, setMyCrew] = useState<Crew | null>(null);
  const [crews, setCrews] = useState<Crew[]>([]);
  const [tab, setTab] = useState<LeaderboardTab>('wl');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    let uid: string | null = null;
    if (session?.user) {
      const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single();
      uid = user?.id ?? null;
      setUserId(uid);
    }

    const [allCrewsRes, myCrewRes] = await Promise.all([
      supabase.from('crews').select('*, home_court:courts(name), crew_members(count)').order('wins', { ascending: false }).limit(10),
      uid ? supabase.from('crew_members').select('crew:crews(*, home_court:courts(name))').eq('user_id', uid).limit(1).single() : Promise.resolve({ data: null }),
    ]);

    if (allCrewsRes.data) {
      setCrews(allCrewsRes.data.map((c: any) => ({ ...c, member_count: c.crew_members?.[0]?.count ?? 0 })));
    }

    if ((myCrewRes as any)?.data?.crew) {
      setMyCrew((myCrewRes as any).data.crew);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sortedCrews = [...crews].sort((a, b) => {
    if (tab === 'wl') return (b.wins - b.losses) - (a.wins - a.losses);
    if (tab === 'rep') return b.rep_score - a.rep_score;
    return (b.wins + b.losses) - (a.wins + a.losses);
  });

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>CREWS</Text>
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateCrew')}>
          <Ionicons name="add" size={18} color={Colors.textPrimary} />
          <Text style={styles.createBtnText}>NEW CREW</Text>
        </TouchableOpacity>
      </View>

      {/* My Crew card */}
      {myCrew && (
        <TouchableOpacity
          style={[styles.myCrewCard, { borderColor: myCrew.color_hex }]}
          onPress={() => navigation.navigate('CrewDetail', { crewId: myCrew.id })}
        >
          <View style={[styles.myCrewBanner, { backgroundColor: myCrew.color_hex }]}>
            <Text style={styles.myCrewLabel}>MY CREW</Text>
          </View>
          <View style={styles.myCrewContent}>
            <Text style={styles.myCrewName}>{myCrew.name}</Text>
            <Text style={styles.myCrewCourt}>{(myCrew.home_court as any)?.name ?? 'No home court'}</Text>
            <View style={styles.myCrewStats}>
              <Text style={styles.myCrewStatText}>{myCrew.wins}-{myCrew.losses} W-L</Text>
              <Text style={styles.myCrewStatText}>Rep: {myCrew.rep_score.toFixed(0)}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Leaderboard */}
      <Text style={styles.sectionTitle}>TOP CREWS IN JC</Text>
      <View style={styles.tabRow}>
        {([
          { value: 'wl', label: 'W-L RECORD' },
          { value: 'rep', label: 'REP SCORE' },
          { value: 'games', label: 'TOTAL GAMES' },
        ] as { value: LeaderboardTab; label: string }[]).map(({ value, label }) => (
          <TouchableOpacity
            key={value}
            style={[styles.tabBtn, tab === value && styles.tabBtnActive]}
            onPress={() => setTab(value)}
          >
            <Text style={[styles.tabBtnText, tab === value && styles.tabBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlashList
        data={sortedCrews}
        estimatedItemSize={72}
        keyExtractor={(c) => c.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        renderItem={({ item: crew, index }) => (
          <TouchableOpacity
            style={styles.crewRow}
            onPress={() => navigation.navigate('CrewDetail', { crewId: crew.id })}
          >
            <Text style={styles.rank}>#{index + 1}</Text>
            <View style={[styles.crewColorDot, { backgroundColor: crew.color_hex }]} />
            <View style={styles.crewInfo}>
              <Text style={styles.crewName}>{crew.name}</Text>
              <Text style={styles.crewCourt}>{(crew.home_court as any)?.name ?? '—'}</Text>
            </View>
            <Text style={styles.crewStatValue}>
              {tab === 'wl' ? `${crew.wins}-${crew.losses}` :
               tab === 'rep' ? crew.rep_score.toFixed(0) :
               crew.wins + crew.losses}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: Colors.textPrimary, letterSpacing: 2 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.card, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 7, borderWidth: 1, borderColor: Colors.border },
  createBtnText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textPrimary, letterSpacing: 1 },
  myCrewCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, borderWidth: 1.5, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  myCrewBanner: { width: 8, alignSelf: 'stretch' },
  myCrewLabel: { display: 'none' },
  myCrewContent: { flex: 1, padding: Spacing.md },
  myCrewName: { fontFamily: 'BebasNeue_400Regular', fontSize: 20, color: Colors.textPrimary, letterSpacing: 1 },
  myCrewCourt: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted },
  myCrewStats: { flexDirection: 'row', gap: Spacing.md, marginTop: 4 },
  myCrewStatText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: Colors.textSecondary },
  sectionTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 16, color: Colors.textMuted, letterSpacing: 2, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  tabRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, gap: Spacing.xs },
  tabBtn: { flex: 1, paddingVertical: 7, borderRadius: BorderRadius.full, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  tabBtnActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  tabBtnText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 10, color: Colors.textMuted, letterSpacing: 0.5 },
  tabBtnTextActive: { color: Colors.primary },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 20 },
  crewRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rank: { fontFamily: 'BebasNeue_400Regular', fontSize: 20, color: Colors.textMuted, width: 30 },
  crewColorDot: { width: 14, height: 14, borderRadius: 7 },
  crewInfo: { flex: 1 },
  crewName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.textPrimary },
  crewCourt: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  crewStatValue: { fontFamily: 'BebasNeue_400Regular', fontSize: 20, color: Colors.secondary, width: 50, textAlign: 'right' },
});

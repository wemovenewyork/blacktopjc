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
    return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;
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
      {/* Avatar + Name */}
      <View style={styles.profileHeader}>
        <View style={[styles.avatarRing, { borderColor: tierColor }]}>
          <Avatar user={user} size={80} />
        </View>
        <View style={styles.nameSection}>
          <View style={styles.nameRow}>
            <Text style={styles.displayName}>{user.display_name}</Text>
            {user.is_pro && (
              <View style={styles.proBadge}>
                <Ionicons name="star" size={10} color={Colors.secondary} />
                <Text style={styles.proText}>PRO</Text>
              </View>
            )}
          </View>
          <View style={styles.tagsRow}>
            {user.position?.map((pos) => (
              <View key={pos} style={styles.posTag}>
                <Text style={styles.posTagText}>{pos}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.neighborhood}>
            {user.neighborhood}{user.home_court ? ` · ${(user.home_court as any).name}` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
          <Ionicons name="pencil" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ELO Card */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>ELO RATING</Text>
        <View style={styles.eloRow}>
          <Text style={[styles.eloNumber, { color: tierColor }]}>
            {isRated ? user.elo_rating : '—'}
          </Text>
          <View style={[styles.tierBadge, { backgroundColor: `${tierColor}20`, borderColor: tierColor }]}>
            <Text style={[styles.tierText, { color: tierColor }]}>{tier.toUpperCase()}</Text>
          </View>
        </View>
        {!isRated && (
          <Text style={styles.unratedNote}>
            Play {user.games_until_rated} more game{user.games_until_rated > 1 ? 's' : ''} to get your ELO rating
          </Text>
        )}
      </View>

      {/* Hooper Score */}
      <View style={styles.card}>
        <HooperScore
          punctuality={user.hooper_score_punctuality}
          sportsmanship={user.hooper_score_sportsmanship}
          skill={user.hooper_score_skill}
        />
      </View>

      {/* Career Stats */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
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

        <View style={styles.statsGrid}>
          <StatBox label="Games" value={user.total_games} />
          <StatBox label="W-L" value={`${user.wins}-${user.losses}`} />
          <StatBox
            label="Pts Avg"
            value={recentStats.length > 0
              ? (recentStats.reduce((s, g) => s + g.points, 0) / recentStats.length).toFixed(1)
              : '—'}
          />
          <StatBox
            label="Ast Avg"
            value={recentStats.length > 0
              ? (recentStats.reduce((s, g) => s + g.assists, 0) / recentStats.length).toFixed(1)
              : '—'}
          />
          <StatBox
            label="Reb Avg"
            value={recentStats.length > 0
              ? (recentStats.reduce((s, g) => s + g.rebounds, 0) / recentStats.length).toFixed(1)
              : '—'}
          />
          <StatBox
            label="Stl Avg"
            value={recentStats.length > 0
              ? (recentStats.reduce((s, g) => s + g.steals, 0) / recentStats.length).toFixed(1)
              : '—'}
          />
        </View>

        {!user.is_pro && statTab === 'season' && (
          <TouchableOpacity style={styles.proCta} onPress={() => navigation.navigate('BlacktopPro')}>
            <Ionicons name="lock-closed" size={16} color={Colors.secondary} />
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

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statBoxValue}>{value}</Text>
      <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  profileHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, padding: Spacing.md },
  avatarRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 2.5, padding: 2, alignItems: 'center', justifyContent: 'center' },
  nameSection: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  displayName: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: Colors.textPrimary, letterSpacing: 1 },
  proBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: `${Colors.secondary}20`, borderRadius: BorderRadius.full, paddingHorizontal: 7, paddingVertical: 1, borderWidth: 1, borderColor: Colors.secondary },
  proText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.secondary },
  tagsRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  posTag: { backgroundColor: `${Colors.secondary}15`, borderRadius: BorderRadius.full, paddingHorizontal: 7, paddingVertical: 1, borderWidth: 1, borderColor: Colors.secondary },
  posTagText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.secondary },
  neighborhood: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },
  card: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  cardLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  eloRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  eloNumber: { fontFamily: 'BebasNeue_400Regular', fontSize: 48 },
  tierBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  tierText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, letterSpacing: 1 },
  unratedNote: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 4 },
  tabToggle: { flexDirection: 'row', backgroundColor: Colors.cardElevated, borderRadius: BorderRadius.sm, padding: 2, gap: 2 },
  tabBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  tabBtnActive: { backgroundColor: Colors.primary },
  tabBtnText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted },
  tabBtnTextActive: { color: Colors.textPrimary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  statBox: { flex: 1, minWidth: '30%', alignItems: 'center', paddingVertical: Spacing.sm, backgroundColor: Colors.cardElevated, borderRadius: BorderRadius.md },
  statBoxValue: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: Colors.textPrimary },
  statBoxLabel: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
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

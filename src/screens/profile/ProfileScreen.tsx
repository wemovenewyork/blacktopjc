import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { User, PlayerStats, Crew } from '@/types';
import { Colors, FontSize, Spacing, getEloColor, getEloTier } from '@/theme';
import { EloBadge } from '@/components/common/EloBadge';
import { EloGraph } from '@/components/common/EloGraph';
import { BallLoader } from '@/components/common/BallLoader';
import { getCourtPhoto } from '@/lib/courtPhotos';
import { getNeighborhoodColor } from '@/lib/neighborhoods';
import { ProfileStackParamList } from '@/navigation/MainNavigator';

const { width: SCREEN_W } = Dimensions.get('window');
type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

type ContentTab = 'highlights' | 'stats' | 'record' | 'leagues';

// ── Position badge ─────────────────────────────────────────────────────────
function PositionBadge({ position }: { position: string }) {
  return (
    <View style={styles.posBadge}>
      <Text style={styles.posBadgeText}>{position}</Text>
    </View>
  );
}

// ── Top 5 hoopers slot ─────────────────────────────────────────────────────
function Top5Slot({ rank, player, onPress }: { rank: number; player: any | null; onPress?: () => void }) {
  const tierColor = player ? getEloColor(player.elo_rating ?? 0, (player.games_until_rated ?? 3) <= 0) : Colors.textMuted;
  return (
    <TouchableOpacity style={styles.top5Row} onPress={onPress} disabled={!player} activeOpacity={0.75}>
      <Text style={styles.top5Rank}>{rank}</Text>
      {player ? (
        <>
          <View style={[styles.top5AvatarWrap, { borderColor: tierColor }]}>
            {player.avatar_url ? (
              <Image source={{ uri: player.avatar_url }} style={styles.top5Avatar} />
            ) : (
              <View style={[styles.top5AvatarFallback, { backgroundColor: tierColor + '20' }]}>
                <Text style={[styles.top5AvatarInitial, { color: tierColor }]}>{player.display_name?.[0]}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.top5Name}>{player.display_name}</Text>
            <Text style={styles.top5Meta}>{player.neighborhood}</Text>
          </View>
          <EloBadge rating={player.elo_rating ?? 0} rated={(player.games_until_rated ?? 3) <= 0} size="sm" />
        </>
      ) : (
        <>
          <View style={styles.top5EmptyAvatar}><Ionicons name="person-add-outline" size={14} color={Colors.textMuted} /></View>
          <Text style={styles.top5Empty}>Add a hooper</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

// ── Stat tile ──────────────────────────────────────────────────────────────
function StatTile({ label, value, color = Colors.textPrimary }: { label: string; value: string; color?: string }) {
  return (
    <View style={[styles.statTile, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Game result row ────────────────────────────────────────────────────────
function GameResultRow({ stat }: { stat: PlayerStats & { game?: any } }) {
  const isWin = stat.result === 'win';
  return (
    <View style={styles.resultRow}>
      <View style={[styles.resultBadge, { backgroundColor: isWin ? Colors.success + '20' : Colors.error + '20' }]}>
        <Text style={[styles.resultBadgeLetter, { color: isWin ? Colors.success : Colors.error }]}>
          {isWin ? 'W' : 'L'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.resultCourt}>{stat.game?.court?.name ?? 'Unknown Court'}</Text>
        <Text style={styles.resultMeta}>{stat.game?.format ?? '—'}</Text>
      </View>
      <View style={styles.resultStats}>
        <Text style={styles.resultStatNum}>{stat.points}<Text style={styles.resultStatUnit}>pts</Text></Text>
        <Text style={styles.resultStatNum}>{stat.assists}<Text style={styles.resultStatUnit}>ast</Text></Text>
        <Text style={styles.resultStatNum}>{stat.rebounds}<Text style={styles.resultStatUnit}>reb</Text></Text>
      </View>
    </View>
  );
}

// ── Main ProfileScreen ─────────────────────────────────────────────────────

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();

  const [user, setUser] = useState<User | null>(null);
  const [recentStats, setRecentStats] = useState<PlayerStats[]>([]);
  const [crew, setCrew] = useState<Crew | null>(null);
  const [top5, setTop5] = useState<any[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contentTab, setContentTab] = useState<ContentTab>('stats');

  const fetchProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: userData } = await supabase
      .from('users')
      .select('*, home_court:courts(name)')
      .eq('auth_id', session.user.id)
      .single();

    if (userData) setUser(userData);

    const [statsRes, crewRes] = await Promise.all([
      supabase
        .from('player_stats')
        .select('*, game:games(format, court:courts(name))')
        .eq('user_id', userData?.id ?? '')
        .order('logged_at', { ascending: false })
        .limit(20),
      supabase
        .from('crew_members')
        .select('crew:crews(*)')
        .eq('user_id', userData?.id ?? '')
        .limit(1)
        .single(),
    ]);

    if (statsRes.data) setRecentStats(statsRes.data);
    if (crewRes.data?.crew) setCrew((crewRes.data.crew as any));

    // Top 5: players this user has played with most (from game_players overlap)
    try {
      const { data: myGames } = await supabase
        .from('game_players')
        .select('game_id')
        .eq('user_id', userData?.id ?? '')
        .eq('rsvp_status', 'in')
        .limit(20);

      if (myGames && myGames.length > 0) {
        const gameIds = myGames.map((g) => g.game_id);
        const { data: coPlayers } = await supabase
          .from('game_players')
          .select('user_id, user:users(id, display_name, avatar_url, neighborhood, elo_rating, games_until_rated)')
          .in('game_id', gameIds)
          .neq('user_id', userData?.id ?? '')
          .eq('rsvp_status', 'in')
          .limit(20);

        if (coPlayers) {
          // Count appearances per player
          const counts: Record<string, { user: any; count: number }> = {};
          for (const cp of coPlayers) {
            const u = (cp as any).user;
            if (!u) continue;
            if (!counts[u.id]) counts[u.id] = { user: u, count: 0 };
            counts[u.id].count++;
          }
          const sorted = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
          setTop5(sorted.map((s) => s.user));
        }
      }
    } catch {}

    // Followers/Following — graceful if table doesn't exist
    try {
      const [{ count: fwrs }, { count: fwng }] = await Promise.all([
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', userData?.id ?? ''),
        supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', userData?.id ?? ''),
      ]);
      setFollowers(fwrs ?? 0);
      setFollowing(fwng ?? 0);
    } catch {}

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  if (loading) {
    return <View style={styles.loader}><BallLoader label="LOADING PROFILE..." /></View>;
  }
  if (!user) return null;

  const isRated = user.games_until_rated <= 0;
  const tierColor = getEloColor(user.elo_rating, isRated);
  const tier = getEloTier(user.elo_rating, isRated);
  const nColor = getNeighborhoodColor(user.neighborhood ?? '');
  const bannerPhoto = getCourtPhoto(user.neighborhood ?? user.display_name);
  const winPct = user.total_games > 0 ? Math.round((user.wins / user.total_games) * 100) : 0;

  // Avg stats
  const avgPts = recentStats.length ? (recentStats.reduce((s, g) => s + g.points, 0) / recentStats.length).toFixed(1) : '—';
  const avgAst = recentStats.length ? (recentStats.reduce((s, g) => s + g.assists, 0) / recentStats.length).toFixed(1) : '—';
  const avgReb = recentStats.length ? (recentStats.reduce((s, g) => s + g.rebounds, 0) / recentStats.length).toFixed(1) : '—';
  const avgStl = recentStats.length ? (recentStats.reduce((s, g) => s + g.steals, 0) / recentStats.length).toFixed(1) : '—';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchProfile(); }} tintColor={Colors.primary} />}
    >
      {/* ── BANNER / HERO ─────────────────────────────────────────── */}
      <ImageBackground source={{ uri: bannerPhoto }} style={styles.banner}>
        <View style={styles.bannerScrim} />

        {/* Nav row */}
        <View style={styles.bannerNav}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditProfile')}>
            <Ionicons name="settings-outline" size={16} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* Avatar + identity */}
        <View style={styles.bannerIdentity}>
          <View style={[styles.avatarRing, { borderColor: tierColor, shadowColor: tierColor }]}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: tierColor + '25' }]}>
                <Text style={[styles.avatarInitial, { color: tierColor }]}>{user.display_name[0]}</Text>
              </View>
            )}
            {/* Tier badge */}
            <View style={[styles.tierBadge, { backgroundColor: tierColor, shadowColor: tierColor }]}>
              <Text style={styles.tierBadgeText}>{tier.toUpperCase()}</Text>
            </View>
          </View>

          <View style={styles.identityInfo}>
            <Text style={styles.displayName}>{user.display_name}</Text>
            <View style={styles.posRow}>
              {(user.position ?? []).map((p) => <PositionBadge key={p} position={p} />)}
            </View>
            <Text style={styles.neighborhoodLabel}>
              <Ionicons name="location" size={10} color={nColor} /> {user.neighborhood?.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Social counts */}
        <View style={styles.socialRow}>
          <View style={styles.socialBlock}>
            <Text style={styles.socialNum}>{user.total_games}</Text>
            <Text style={styles.socialLabel}>RUNS</Text>
          </View>
          <View style={styles.socialDivider} />
          <View style={styles.socialBlock}>
            <Text style={styles.socialNum}>{followers}</Text>
            <Text style={styles.socialLabel}>FOLLOWERS</Text>
          </View>
          <View style={styles.socialDivider} />
          <View style={styles.socialBlock}>
            <Text style={styles.socialNum}>{following}</Text>
            <Text style={styles.socialLabel}>FOLLOWING</Text>
          </View>
        </View>
      </ImageBackground>

      {/* ── ELO BADGE + PRO banner ─────────────────────────────────── */}
      <View style={styles.eloBanner}>
        <EloBadge rating={user.elo_rating} rated={isRated} size="lg" />
        <View style={{ flex: 1 }}>
          {!isRated ? (
            <Text style={styles.eloNote}>{user.games_until_rated} more games to get rated</Text>
          ) : (
            <Text style={styles.eloNote}>ELO {user.elo_rating} · {tier}</Text>
          )}
        </View>
        {user.is_pro && (
          <View style={styles.proBadge}>
            <Ionicons name="star" size={10} color={Colors.secondary} />
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        )}
        <TouchableOpacity style={styles.proBtn} onPress={() => navigation.navigate('BlacktopPro')}>
          <Text style={styles.proBtnText}>UPGRADE</Text>
        </TouchableOpacity>
      </View>

      {/* ── CREW ──────────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>MY CREW</Text>
        </View>
        {crew ? (
          <TouchableOpacity
            style={[styles.crewCard, { borderLeftColor: crew.color_hex || Colors.primary, borderLeftWidth: 3 }]}
            onPress={() => {}} // navigate to crew
            activeOpacity={0.8}
          >
            <View style={[styles.crewColorDot, { backgroundColor: crew.color_hex || Colors.primary, shadowColor: crew.color_hex }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.crewName}>{crew.name}</Text>
              <Text style={styles.crewMeta}>{crew.wins}W – {crew.losses}L · REP {crew.rep_score}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.joinCrewBtn} onPress={() => {}}>
            <Ionicons name="people-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.joinCrewText}>Join or create a crew</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── TOP 5 HOOPERS ─────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionAccent, { backgroundColor: Colors.secondary }]} />
          <Text style={styles.sectionTitle}>TOP 5 HOOPERS</Text>
          <Text style={styles.sectionSub}>Players you run with most</Text>
        </View>
        <View style={styles.top5List}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Top5Slot
              key={i}
              rank={i + 1}
              player={top5[i] ?? null}
              onPress={() => top5[i] && navigation.navigate('PlayerProfile', { userId: top5[i].id })}
            />
          ))}
        </View>
      </View>

      {/* ── W/L RECORD ────────────────────────────────────────────────── */}
      {user.total_games > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: Colors.success }]} />
            <Text style={styles.sectionTitle}>RECORD</Text>
            <Text style={[styles.sectionSub, { color: Colors.success }]}>{winPct}% WIN RATE</Text>
          </View>
          <View style={styles.wlRow}>
            <View style={styles.wlBlock}>
              <Text style={[styles.wlBig, { color: Colors.success }]}>{user.wins}</Text>
              <Text style={styles.wlSmall}>WINS</Text>
            </View>
            <View style={styles.wlBar}>
              <View style={[styles.wlFillW, { flex: user.wins || 0.01 }]} />
              <View style={[styles.wlFillL, { flex: user.losses || 0.01 }]} />
            </View>
            <View style={styles.wlBlock}>
              <Text style={[styles.wlBig, { color: Colors.error }]}>{user.losses}</Text>
              <Text style={styles.wlSmall}>LOSSES</Text>
            </View>
          </View>
        </View>
      )}

      {/* ── CONTENT TABS ──────────────────────────────────────────────── */}
      <View style={styles.contentTabBar}>
        {(['highlights', 'stats', 'record', 'leagues'] as ContentTab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.contentTab, contentTab === t && styles.contentTabActive]}
            onPress={() => setContentTab(t)}
          >
            <Text style={[styles.contentTabLabel, contentTab === t && styles.contentTabLabelActive]}>
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── TAB: STATS ────────────────────────────────────────────────── */}
      {contentTab === 'stats' && (
        <View style={styles.tabContent}>
          {recentStats.length === 0 ? (
            <View style={styles.emptyTab}>
              <Ionicons name="stats-chart-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyTabText}>Play games to see your stats</Text>
            </View>
          ) : (
            <>
              <View style={styles.statGrid}>
                <StatTile label="PPG" value={avgPts as string} color={Colors.primary} />
                <StatTile label="APG" value={avgAst as string} color={Colors.accent} />
                <StatTile label="RPG" value={avgReb as string} color={Colors.secondary} />
                <StatTile label="SPG" value={avgStl as string} color={Colors.success} />
              </View>
              {isRated && (
                <View style={styles.graphWrap}>
                  <EloGraph
                    data={recentStats.slice(0, 10).map((s, i, arr) => ({
                      rating: Math.round(user.elo_rating + (i - arr.length) * 8 + (s.result === 'win' ? 12 : -8)),
                    }))}
                  />
                </View>
              )}
            </>
          )}
        </View>
      )}

      {/* ── TAB: RECORD ───────────────────────────────────────────────── */}
      {contentTab === 'record' && (
        <View style={styles.tabContent}>
          {recentStats.length === 0 ? (
            <View style={styles.emptyTab}>
              <Text style={styles.emptyTabText}>No game history yet</Text>
            </View>
          ) : (
            recentStats.map((s) => <GameResultRow key={s.id} stat={s as any} />)
          )}
        </View>
      )}

      {/* ── TAB: HIGHLIGHTS ───────────────────────────────────────────── */}
      {contentTab === 'highlights' && (
        <View style={styles.tabContent}>
          <View style={styles.emptyTab}>
            <Ionicons name="videocam-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyTabText}>No highlights posted yet</Text>
            <Text style={styles.emptyTabSub}>Post from the feed to showcase your runs</Text>
          </View>
        </View>
      )}

      {/* ── TAB: LEAGUES ──────────────────────────────────────────────── */}
      {contentTab === 'leagues' && (
        <View style={styles.tabContent}>
          <View style={styles.emptyTab}>
            <Ionicons name="trophy-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyTabText}>No leagues joined</Text>
            <Text style={styles.emptyTabSub}>League support coming soon</Text>
          </View>
        </View>
      )}

      {/* Bottom padding */}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },

  // Banner
  banner: { width: '100%' },
  bannerScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.72)' },
  bannerNav: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: 52, paddingBottom: 6,
  },
  editBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  bannerIdentity: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, paddingHorizontal: Spacing.md, paddingBottom: 14 },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44, borderWidth: 3,
    position: 'relative',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 16,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 44 },
  avatarFallback: { width: '100%', height: '100%', borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: 'BebasNeue_400Regular', fontSize: 36 },
  tierBadge: {
    position: 'absolute', bottom: -4, left: '50%', transform: [{ translateX: -20 }],
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 8,
  },
  tierBadgeText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 7, color: '#000', letterSpacing: 1 },
  identityInfo: { flex: 1, gap: 5, paddingBottom: 6 },
  displayName: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: '#fff', letterSpacing: 1, lineHeight: 28 },
  posRow: { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  posBadge: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2,
  },
  posBadgeText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 },
  neighborhoodLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 },
  socialRow: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 10,
  },
  socialBlock: { flex: 1, alignItems: 'center' },
  socialNum: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: '#fff' },
  socialLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, color: Colors.textMuted, letterSpacing: 1.5, marginTop: 1 },
  socialDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 4 },

  // ELO banner
  eloBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    backgroundColor: '#070707',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  eloNote: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  proBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.secondary + '20', borderWidth: 1, borderColor: Colors.secondary,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2,
  },
  proBadgeText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, color: Colors.secondary, letterSpacing: 1 },
  proBtn: {
    borderWidth: 1, borderColor: Colors.primary,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 2,
  },
  proBtnText: { fontFamily: 'BebasNeue_400Regular', fontSize: 14, color: Colors.primary, letterSpacing: 1 },

  // Sections
  section: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionAccent: { width: 3, height: 14, backgroundColor: Colors.primary, borderRadius: 1, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
  sectionTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 18, color: '#fff', letterSpacing: 1.5 },
  sectionSub: { fontFamily: 'RobotoCondensed_400Regular', fontSize: 10, color: Colors.textMuted, marginLeft: 4 },

  // Crew
  crewCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#0A0A0A',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: 12, borderRadius: 2,
  },
  crewColorDot: {
    width: 28, height: 28, borderRadius: 14,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8,
  },
  crewName: { fontFamily: 'BebasNeue_400Regular', fontSize: 20, color: '#fff', letterSpacing: 1 },
  crewMeta: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  joinCrewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed',
    padding: 14, borderRadius: 2,
  },
  joinCrewText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted },

  // Top 5
  top5List: { gap: 2 },
  top5Row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  top5Rank: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: Colors.textMuted, width: 20, textAlign: 'center' },
  top5AvatarWrap: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, overflow: 'hidden' },
  top5Avatar: { width: '100%', height: '100%' },
  top5AvatarFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  top5AvatarInitial: { fontFamily: 'BebasNeue_400Regular', fontSize: 18 },
  top5Name: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: '#fff' },
  top5Meta: { fontFamily: 'RobotoCondensed_400Regular', fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  top5EmptyAvatar: {
    width: 42, height: 42, borderRadius: 21,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  top5Empty: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: 'rgba(255,255,255,0.2)', flex: 1 },

  // W/L
  wlRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  wlBlock: { alignItems: 'center' },
  wlBig: { fontFamily: 'BebasNeue_400Regular', fontSize: 36, lineHeight: 34 },
  wlSmall: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, color: Colors.textMuted, letterSpacing: 1.5, marginTop: 2 },
  wlBar: { flex: 1, height: 6, borderRadius: 3, flexDirection: 'row', overflow: 'hidden', backgroundColor: '#111' },
  wlFillW: { backgroundColor: Colors.success, height: '100%' },
  wlFillL: { backgroundColor: Colors.error, height: '100%' },

  // Content tabs
  contentTabBar: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#050505',
  },
  contentTab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  contentTabActive: { borderBottomColor: Colors.primary },
  contentTabLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 },
  contentTabLabelActive: { color: '#fff' },
  tabContent: { minHeight: 200 },

  // Stat grid
  statGrid: { flexDirection: 'row', padding: Spacing.md, gap: 8 },
  statTile: {
    flex: 1, backgroundColor: '#0A0A0A',
    borderTopWidth: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    padding: 10, alignItems: 'center', gap: 3, borderRadius: 2,
  },
  statValue: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, lineHeight: 28 },
  statLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, color: Colors.textMuted, letterSpacing: 1.5 },
  graphWrap: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },

  // Result rows
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  resultBadge: { width: 32, height: 32, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  resultBadgeLetter: { fontFamily: 'BebasNeue_400Regular', fontSize: 22 },
  resultCourt: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: '#fff' },
  resultMeta: { fontFamily: 'RobotoCondensed_400Regular', fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  resultStats: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  resultStatNum: { fontFamily: 'BebasNeue_400Regular', fontSize: 18, color: '#fff' },
  resultStatUnit: { fontSize: 9, color: Colors.textMuted },

  // Empty
  emptyTab: { padding: 40, alignItems: 'center', gap: 8 },
  emptyTabText: { fontFamily: 'BebasNeue_400Regular', fontSize: 18, color: Colors.textMuted, letterSpacing: 1, textAlign: 'center' },
  emptyTabSub: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: 'rgba(255,255,255,0.2)', textAlign: 'center' },
});

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  ImageBackground,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useRealtime } from '@/hooks/useRealtime';
import { getCourtPhoto } from '@/lib/courtPhotos';
import { getNeighborhoodColor } from '@/lib/neighborhoods';
import { Colors, FontSize, Spacing } from '@/theme';
import { EloBadge } from '@/components/common/EloBadge';
import { HomeStackParamList } from '@/navigation/MainNavigator';

const { width: SCREEN_W } = Dimensions.get('window');
const POST_WIDTH = Math.min(SCREEN_W, 500); // cap on web

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

// ── Types ───────────────────────────────────────────────────────────────────

type StoryUser = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  neighborhood: string;
  hasNew: boolean; // unseen story / recent activity
};

type FeedPost = {
  id: string;
  type: 'game_open' | 'game_result' | 'highlight' | 'court_hot';
  user: { id: string; display_name: string; avatar_url: string | null; elo_rating: number; games_until_rated: number };
  courtName: string;
  courtPhoto: string;
  caption: string;
  likesCount: number;
  commentsCount: number;
  gameId?: string;
  courtId?: string;
  format?: string;
  spotsLeft?: number;
  result?: 'W' | 'L';
  points?: number;
  createdAt: string;
};

// ── Story Ring ──────────────────────────────────────────────────────────────

function StoryRing({ story, onPress }: { story: StoryUser; onPress: () => void }) {
  const nColor = getNeighborhoodColor(story.neighborhood);
  return (
    <TouchableOpacity style={styles.storyWrap} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.storyRingOuter, { borderColor: story.hasNew ? nColor : 'rgba(255,255,255,0.15)' }]}>
        {story.avatar_url ? (
          <Image source={{ uri: story.avatar_url }} style={styles.storyAvatar} />
        ) : (
          <View style={[styles.storyAvatarFallback, { backgroundColor: nColor + '30' }]}>
            <Text style={[styles.storyAvatarInitial, { color: nColor }]}>
              {story.display_name[0]?.toUpperCase()}
            </Text>
          </View>
        )}
        {story.hasNew && <View style={[styles.storyNewDot, { backgroundColor: nColor }]} />}
      </View>
      <Text style={styles.storyName} numberOfLines={1}>{story.display_name.split(' ')[0]}</Text>
    </TouchableOpacity>
  );
}

// ── Feed Post Card ──────────────────────────────────────────────────────────

function PostCard({ post, onPressUser, onPressGame }: {
  post: FeedPost;
  onPressUser: () => void;
  onPressGame: () => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount);
  const heartScale = useRef(new Animated.Value(1)).current;

  function handleLike() {
    if (!liked) {
      Animated.sequence([
        Animated.timing(heartScale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
        Animated.timing(heartScale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
      setLikesCount((n) => n + 1);
    } else {
      setLikesCount((n) => Math.max(0, n - 1));
    }
    setLiked((v) => !v);
  }

  const typeColor = post.type === 'game_open'
    ? Colors.primary
    : post.type === 'game_result'
      ? (post.result === 'W' ? Colors.success : Colors.error)
      : post.type === 'court_hot'
        ? Colors.secondary
        : Colors.accent;

  const typeLabel = post.type === 'game_open'
    ? `${post.format} · ${post.spotsLeft} spots left`
    : post.type === 'game_result'
      ? post.result === 'W' ? `WIN · ${post.points ?? 0} PTS` : `L · ${post.points ?? 0} PTS`
      : post.type === 'court_hot'
        ? 'COURT IS HOT'
        : 'HIGHLIGHT';

  return (
    <View style={styles.post}>
      {/* Post header */}
      <View style={styles.postHeader}>
        <TouchableOpacity style={styles.postHeaderLeft} onPress={onPressUser} activeOpacity={0.75}>
          <View style={[styles.postAvatarWrap, { borderColor: typeColor }]}>
            {post.user.avatar_url ? (
              <Image source={{ uri: post.user.avatar_url }} style={styles.postAvatar} />
            ) : (
              <View style={[styles.postAvatarFallback, { backgroundColor: typeColor + '20' }]}>
                <Text style={[styles.postAvatarInitial, { color: typeColor }]}>
                  {post.user.display_name[0]?.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.postUsername}>{post.user.display_name}</Text>
              <EloBadge rating={post.user.elo_rating} rated={post.user.games_until_rated <= 0} size="sm" />
            </View>
            <Text style={styles.postMeta}>{post.courtName} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="ellipsis-horizontal" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Court photo with type overlay */}
      <TouchableOpacity onPress={onPressGame} activeOpacity={0.92}>
        <ImageBackground
          source={{ uri: post.courtPhoto }}
          style={styles.postPhoto}
          imageStyle={{ resizeMode: 'cover' }}
        >
          <View style={styles.postPhotoScrim} />

          {/* Type badge */}
          <View style={[styles.postTypeBadge, { borderColor: typeColor, backgroundColor: `${typeColor}20` }]}>
            <View style={[styles.postTypeDot, { backgroundColor: typeColor }]} />
            <Text style={[styles.postTypeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>

          {/* Game result overlay */}
          {post.type === 'game_result' && (
            <View style={[styles.postResultBig, { borderColor: typeColor }]}>
              <Text style={[styles.postResultLetter, { color: typeColor, textShadowColor: typeColor }]}>
                {post.result}
              </Text>
            </View>
          )}

          {/* Game open: join CTA */}
          {post.type === 'game_open' && (
            <TouchableOpacity
              style={[styles.pullUpBtn, { backgroundColor: Colors.primary, shadowColor: Colors.primary }]}
              onPress={onPressGame}
            >
              <Text style={styles.pullUpBtnText}>PULL UP →</Text>
            </TouchableOpacity>
          )}
        </ImageBackground>
      </TouchableOpacity>

      {/* Actions row */}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.postAction} onPress={handleLike}>
          <Animated.View style={{ transform: [{ scale: heartScale }] }}>
            <Ionicons name={liked ? 'heart' : 'heart-outline'} size={22} color={liked ? Colors.primary : Colors.textSecondary} />
          </Animated.View>
          {likesCount > 0 && <Text style={[styles.postActionCount, liked && { color: Colors.primary }]}>{likesCount}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.postAction} onPress={onPressGame}>
          <Ionicons name="chatbubble-outline" size={21} color={Colors.textSecondary} />
          {post.commentsCount > 0 && <Text style={styles.postActionCount}>{post.commentsCount}</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="paper-plane-outline" size={21} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity style={styles.postAction}>
          <Ionicons name="bookmark-outline" size={21} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      <View style={styles.postCaption}>
        <Text style={styles.postCaptionText}>
          <Text style={styles.postCaptionUser}>{post.user.display_name} </Text>
          {post.caption}
        </Text>
      </View>
    </View>
  );
}

// ── Discover: trending players ───────────────────────────────────────────────

function DiscoverView({ players, onPressPlayer, refreshing, onRefresh }: {
  players: any[];
  onPressPlayer: (userId: string) => void;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.discoverContent}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      <Text style={styles.discoverSection}>TRENDING PLAYERS</Text>
      {players.map((p, i) => {
        const nColor = getNeighborhoodColor(p.neighborhood ?? '');
        return (
          <TouchableOpacity
            key={p.id}
            style={styles.discoverPlayerRow}
            onPress={() => onPressPlayer(p.id)}
            activeOpacity={0.75}
          >
            <Text style={styles.discoverRank}>{i + 1}</Text>
            <View style={[styles.discoverAvatarWrap, { borderColor: nColor }]}>
              {p.avatar_url ? (
                <Image source={{ uri: p.avatar_url }} style={styles.discoverAvatar} />
              ) : (
                <View style={[styles.discoverAvatarFallback, { backgroundColor: nColor + '20' }]}>
                  <Text style={[styles.discoverAvatarInitial, { color: nColor }]}>
                    {p.display_name?.[0]?.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.discoverPlayerName}>{p.display_name}</Text>
              <Text style={styles.discoverPlayerMeta}>
                {p.neighborhood} · {p.total_games ?? 0} runs
              </Text>
            </View>
            <EloBadge rating={p.elo_rating ?? 0} rated={(p.games_until_rated ?? 3) <= 0} size="sm" />
          </TouchableOpacity>
        );
      })}

      {/* Live activity section */}
      <Text style={[styles.discoverSection, { marginTop: 24 }]}>LIVE ACTIVITY</Text>
      <View style={styles.discoverLiveCard}>
        <View style={styles.discoverLiveDot} />
        <Text style={styles.discoverLiveText}>Players checking in, games filling up — tap the Map tab to see what's popping.</Text>
      </View>
    </ScrollView>
  );
}

// ── Main FeedScreen ──────────────────────────────────────────────────────────

export function FeedScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<'feed' | 'discover'>('feed');
  const [stories, setStories] = useState<StoryUser[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [discoverPlayers, setDiscoverPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Pulse dot for LIVE badge
  const pulseDot = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseDot, { toValue: 0.2, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseDot, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // Stories: active players (checked in today)
      const { data: checkinData } = await supabase
        .from('court_checkins')
        .select('user_id, user:users(id, display_name, avatar_url, neighborhood)')
        .gte('created_at', since24h)
        .order('created_at', { ascending: false })
        .limit(20);

      if (checkinData) {
        const seen = new Set<string>();
        const storyList: StoryUser[] = [];
        for (const c of checkinData) {
          const u = (c as any).user;
          if (u && !seen.has(u.id)) {
            seen.add(u.id);
            storyList.push({
              id: u.id,
              display_name: u.display_name,
              avatar_url: u.avatar_url,
              neighborhood: u.neighborhood ?? '',
              hasNew: true,
            });
          }
        }
        setStories(storyList.slice(0, 12));
      }

      // Feed: Open games as posts + recent game results
      const [gamesRes, statsRes] = await Promise.all([
        supabase
          .from('games')
          .select('*, court:courts(id, name, neighborhood), host:users(id, display_name, avatar_url, elo_rating, games_until_rated), game_players(count)')
          .in('status', ['open', 'full'])
          .gte('scheduled_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('player_stats')
          .select('*, user:users(id, display_name, avatar_url, elo_rating, games_until_rated), game:games(court:courts(name, neighborhood), format)')
          .order('logged_at', { ascending: false })
          .limit(6),
      ]);

      const newPosts: FeedPost[] = [];

      // Game open posts
      if (gamesRes.data) {
        for (const g of gamesRes.data) {
          const host = (g as any).host;
          if (!host) continue;
          const court = (g as any).court;
          const playerCount = g.game_players?.[0]?.count ?? 0;
          newPosts.push({
            id: `game-${g.id}`,
            type: 'game_open',
            user: { id: host.id, display_name: host.display_name, avatar_url: host.avatar_url, elo_rating: host.elo_rating ?? 0, games_until_rated: host.games_until_rated ?? 3 },
            courtName: court?.name ?? 'Unknown Court',
            courtPhoto: getCourtPhoto(court?.name ?? ''),
            caption: `Running a ${g.format} at ${court?.name ?? 'the court'}. Come out!`,
            likesCount: Math.floor(Math.random() * 18),
            commentsCount: g.game_players?.[0]?.count ?? 0,
            gameId: g.id,
            courtId: court?.id,
            format: g.format,
            spotsLeft: Math.max(0, g.max_players - playerCount),
            createdAt: g.created_at,
          });
        }
      }

      // Game result posts
      if (statsRes.data) {
        for (const s of statsRes.data) {
          const user = (s as any).user;
          const game = (s as any).game;
          if (!user || !game) continue;
          const court = game.court;
          newPosts.push({
            id: `result-${s.id}`,
            type: 'game_result',
            user: { id: user.id, display_name: user.display_name, avatar_url: user.avatar_url, elo_rating: user.elo_rating ?? 0, games_until_rated: user.games_until_rated ?? 3 },
            courtName: court?.name ?? 'The Court',
            courtPhoto: getCourtPhoto(court?.name ?? ''),
            caption: s.result === 'win'
              ? `Ran it today at ${court?.name ?? 'the court'}. ${s.points} points, ${s.assists} dimes. We ball.`
              : `Tough one at ${court?.name ?? 'the court'}. We run it back.`,
            likesCount: Math.floor(Math.random() * 32),
            commentsCount: Math.floor(Math.random() * 6),
            result: s.result === 'win' ? 'W' : 'L',
            points: s.points,
            createdAt: s.logged_at,
          });
        }
      }

      // Sort by date
      newPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPosts(newPosts);

      // Discover: top players by ELO
      const { data: topPlayers } = await supabase
        .from('users')
        .select('id, display_name, avatar_url, neighborhood, elo_rating, games_until_rated, total_games')
        .gt('total_games', 0)
        .order('elo_rating', { ascending: false })
        .limit(10);

      if (topPlayers) setDiscoverPlayers(topPlayers);
    } catch {}

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useRealtime({
    table: 'game_players',
    event: '*',
    onData: () => fetchData(),
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerLogo}>
          <View style={styles.logoDiamond} />
          <Text style={styles.logoText}>BLACKTOP<Text style={styles.logoRed}>JC</Text></Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.livePill}>
            <Animated.View style={[styles.liveDot, { opacity: pulseDot }]} />
            <Text style={styles.liveLabel}>LIVE</Text>
          </View>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="paper-plane-outline" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── HIGHLIGHTS ── */}
      <View style={styles.storiesOuter}>
        <Text style={styles.highlightsLabel}>HIGHLIGHTS</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesRow}
        >
          {/* Add highlight slot */}
          <TouchableOpacity style={styles.storyWrap}>
            <View style={[styles.storyRingOuter, styles.storyRingAdd]}>
              <View style={styles.storyAddInner}>
                <Ionicons name="add" size={22} color={Colors.primary} />
              </View>
            </View>
            <Text style={styles.storyName}>Add</Text>
          </TouchableOpacity>

          {stories.map((s) => (
            <StoryRing
              key={s.id}
              story={s}
              onPress={() => navigation.navigate('PlayerProfile', { userId: s.id })}
            />
          ))}

          {/* Placeholder rings while loading or empty */}
          {stories.length === 0 && [1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.storyWrap}>
              <View style={[styles.storyRingOuter, { borderColor: 'rgba(255,255,255,0.08)' }]}>
                <View style={[styles.storyAvatarFallback, { backgroundColor: '#1A1A1A' }]} />
              </View>
              <View style={styles.storyNamePlaceholder} />
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ── TAB BAR ── */}
      <View style={styles.feedTabBar}>
        <TouchableOpacity
          style={[styles.feedTab, tab === 'feed' && styles.feedTabActive]}
          onPress={() => setTab('feed')}
        >
          <Text style={[styles.feedTabLabel, tab === 'feed' && styles.feedTabLabelActive]}>FEED</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.feedTab, tab === 'discover' && styles.feedTabActive]}
          onPress={() => setTab('discover')}
        >
          <Text style={[styles.feedTabLabel, tab === 'discover' && styles.feedTabLabelActive]}>DISCOVER</Text>
        </TouchableOpacity>
      </View>

      {/* ── CONTENT ── */}
      {tab === 'feed' ? (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onPressUser={() => navigation.navigate('PlayerProfile', { userId: item.user.id })}
              onPressGame={() => {
                if (item.gameId) navigation.navigate('GameDetail', { gameId: item.gameId });
                else if (item.courtId) navigation.navigate('CourtDetail', { courtId: item.courtId });
              }}
            />
          )}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyFeed}>
                <Ionicons name="basketball-outline" size={40} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>NO ACTIVITY YET</Text>
                <Text style={styles.emptySub}>Create a game to get the feed going</Text>
              </View>
            )
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <DiscoverView
          players={discoverPlayers}
          onPressPlayer={(userId) => navigation.navigate('PlayerProfile', { userId })}
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); fetchData(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerLogo: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  logoDiamond: {
    width: 8, height: 8,
    backgroundColor: Colors.primary,
    transform: [{ rotate: '45deg' }],
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 6,
  },
  logoText: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: '#fff', letterSpacing: 3 },
  logoRed: { color: Colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: `${Colors.primary}60`,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2,
    backgroundColor: `${Colors.primary}10`,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.primary },
  liveLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: Colors.primary, letterSpacing: 2 },

  // Stories
  storiesOuter: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  highlightsLabel: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 2.5,
    paddingHorizontal: Spacing.md,
    paddingTop: 10,
  },
  storiesRow: { paddingHorizontal: Spacing.sm, paddingVertical: 8, gap: 4 },
  storyWrap: { alignItems: 'center', width: 68, gap: 4 },
  storyRingOuter: {
    width: 58, height: 58, borderRadius: 29,
    borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  storyRingAdd: { borderColor: Colors.primary, borderStyle: 'dashed' },
  storyAddInner: { width: 50, height: 50, borderRadius: 25, backgroundColor: `${Colors.primary}15`, alignItems: 'center', justifyContent: 'center' },
  storyAvatar: { width: 52, height: 52, borderRadius: 26 },
  storyAvatarFallback: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  storyAvatarInitial: { fontFamily: 'BebasNeue_400Regular', fontSize: 22 },
  storyNewDot: { position: 'absolute', bottom: 2, right: 2, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: '#000' },
  storyName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: Colors.textMuted, textAlign: 'center', letterSpacing: 0.5 },
  storyNamePlaceholder: { width: 40, height: 8, backgroundColor: '#1A1A1A', borderRadius: 4 },

  // Feed tabs
  feedTabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  feedTab: { flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  feedTabActive: { borderBottomColor: Colors.primary },
  feedTabLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: 2.5 },
  feedTabLabelActive: { color: '#fff' },

  // Posts
  post: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 4, marginBottom: 4 },
  postHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
  },
  postHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  postAvatarWrap: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, overflow: 'hidden' },
  postAvatar: { width: '100%', height: '100%' },
  postAvatarFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  postAvatarInitial: { fontFamily: 'BebasNeue_400Regular', fontSize: 18 },
  postUsername: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: '#fff' },
  postMeta: { fontFamily: 'RobotoCondensed_400Regular', fontSize: 10, color: Colors.textMuted, marginTop: 1 },

  // Photo
  postPhoto: {
    width: '100%',
    height: Math.min(SCREEN_W * 0.75, 380),
    justifyContent: 'space-between',
    padding: 12,
  },
  postPhotoScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.32)' },
  postTypeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3,
  },
  postTypeDot: { width: 5, height: 5, borderRadius: 3 },
  postTypeText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, letterSpacing: 1.5 },
  postResultBig: {
    alignSelf: 'center',
    width: 72, height: 72,
    borderRadius: 2, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  postResultLetter: {
    fontFamily: 'BebasNeue_400Regular', fontSize: 56, lineHeight: 58,
    textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
  },
  pullUpBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 999,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 12,
  },
  pullUpBtnText: { fontFamily: 'BebasNeue_400Regular', fontSize: 16, color: '#fff', letterSpacing: 1 },

  // Actions
  postActions: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, gap: 4,
  },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4, paddingVertical: 4 },
  postActionCount: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textSecondary },

  // Caption
  postCaption: { paddingHorizontal: Spacing.md, paddingBottom: 10 },
  postCaptionUser: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: '#fff' },
  postCaptionText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },

  // Empty
  emptyFeed: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: Colors.textMuted, letterSpacing: 2 },
  emptySub: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: 'rgba(255,255,255,0.2)' },

  // Discover
  discoverContent: { padding: Spacing.md, paddingBottom: 40 },
  discoverSection: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: Colors.textMuted, letterSpacing: 3, marginBottom: 12 },
  discoverPlayerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  discoverRank: { fontFamily: 'BebasNeue_400Regular', fontSize: 20, color: Colors.textMuted, width: 22, textAlign: 'center' },
  discoverAvatarWrap: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, overflow: 'hidden' },
  discoverAvatar: { width: '100%', height: '100%' },
  discoverAvatarFallback: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  discoverAvatarInitial: { fontFamily: 'BebasNeue_400Regular', fontSize: 20 },
  discoverPlayerName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: '#fff' },
  discoverPlayerMeta: { fontFamily: 'RobotoCondensed_400Regular', fontSize: 10, color: Colors.textMuted, marginTop: 1 },
  discoverLiveCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#0A0A0A', borderWidth: 1, borderColor: `${Colors.success}30`,
    padding: 14, borderRadius: 2,
  },
  discoverLiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success, marginTop: 3 },
  discoverLiveText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
});

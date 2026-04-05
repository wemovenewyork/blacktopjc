import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ImageBackground,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, differenceInMinutes } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { shareGame } from '@/lib/sharing';
import { Game, GamePlayer, GameMessage, RsvpStatus } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';
import { Avatar } from '@/components/common/Avatar';
import { EloBadge } from '@/components/common/EloBadge';
import { HooperScore } from '@/components/common/HooperScore';
import { useRealtime } from '@/hooks/useRealtime';
import { getCourtPhoto } from '@/lib/courtPhotos';
import { HomeStackParamList } from '@/navigation/MainNavigator';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'GameDetail'>;
type Route = RouteProp<HomeStackParamList, 'GameDetail'>;

const FORMAT_COLORS: Record<string, string> = {
  '5v5': Colors.primary,
  '3v3': '#3B82F6',
  '21': Colors.secondary,
  'Open': Colors.success,
};

export function GameDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { gameId } = route.params;
  const chatRef = useRef<FlatList>(null);

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [myRsvp, setMyRsvp] = useState<RsvpStatus | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showRoster, setShowRoster] = useState(false);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    let userId: string | null = null;

    if (session?.user) {
      const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single();
      userId = user?.id ?? null;
      setCurrentUserId(userId);
    }

    const [gameRes, playersRes, messagesRes] = await Promise.all([
      supabase.from('games').select('*, court:courts(*), host:users(*)').eq('id', gameId).single(),
      supabase.from('game_players').select('*, user:users(*)').eq('game_id', gameId).eq('rsvp_status', 'in'),
      supabase.from('game_messages').select('*, user:users(display_name, avatar_url, elo_rating, games_until_rated)').eq('game_id', gameId).order('created_at', { ascending: true }),
    ]);

    if (gameRes.data) setGame(gameRes.data);
    if (playersRes.data) setPlayers(playersRes.data);
    if (messagesRes.data) setMessages(messagesRes.data);

    if (userId && playersRes.data) {
      const myEntry = playersRes.data.find((p: any) => p.user_id === userId);
      setMyRsvp(myEntry?.rsvp_status ?? null);
    }

    setLoading(false);
  }, [gameId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useRealtime({
    table: 'game_players',
    filter: `game_id=eq.${gameId}`,
    event: '*',
    onData: fetchData,
  });

  useRealtime({
    table: 'game_messages',
    filter: `game_id=eq.${gameId}`,
    event: 'INSERT',
    onData: (payload) => {
      setMessages((prev) => [...prev, payload.new as GameMessage]);
      setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  async function handleRsvp(status: RsvpStatus) {
    if (!currentUserId || !game) return;
    await supabase.from('game_players').upsert({
      game_id: game.id,
      user_id: currentUserId,
      rsvp_status: status,
    });
    setMyRsvp(status);
    fetchData();
  }

  async function sendMessage() {
    if (!message.trim() || !currentUserId || !game) return;
    setSending(true);
    await supabase.from('game_messages').insert({
      game_id: game.id,
      user_id: currentUserId,
      message: message.trim(),
    });
    setMessage('');
    setSending(false);
  }

  async function updateGameStatus(status: Game['status']) {
    if (!game) return;
    await supabase.from('games').update({ status }).eq('id', game.id);
    setGame({ ...game, status });
    if (status === 'completed') {
      Alert.alert(
        'Game Complete!',
        'Time to rate your players.',
        [{ text: 'Rate Players', onPress: () => navigation.navigate('PlayerProfile', { userId: currentUserId! }) }]
      );
    }
  }

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }
  if (!game) return null;

  const isHost = game.host_id === currentUserId;
  const inPlayers = players.filter((p) => p.rsvp_status === 'in');
  const courtPhoto = getCourtPhoto((game.court as any)?.name ?? '');
  const formatColor = FORMAT_COLORS[game.format] ?? Colors.primary;
  const spotsLeft = game.max_players - inPlayers.length;
  const minsUntil = differenceInMinutes(new Date(game.scheduled_at), new Date());
  const isLive = minsUntil <= 30 && minsUntil > -120;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* ── SCOREBOARD HEADER ── */}
      <ImageBackground source={{ uri: courtPhoto }} style={styles.scoreboard} imageStyle={styles.scoreboardImg}>
        <View style={styles.scoreboardScrim} />

        {/* Top bar: format + share */}
        <View style={styles.scoreboardTop}>
          <View style={[styles.formatChip, { borderColor: formatColor, backgroundColor: `${formatColor}20` }]}>
            <Text style={[styles.formatChipText, { color: formatColor }]}>{game.format}</Text>
            {game.is_womens_only && <Ionicons name="female" size={9} color={Colors.secondary} />}
          </View>
          {isLive && (
            <View style={styles.liveChip}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => shareGame(game as any)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="share-outline" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* Court name */}
        <Text style={styles.courtName}>{(game.court as any)?.name ?? 'Unknown Court'}</Text>
        <Text style={styles.neighborhood}>{(game.court as any)?.neighborhood?.toUpperCase()}</Text>

        {/* Scoreboard row */}
        <View style={[styles.scoreRow, { borderTopColor: `${formatColor}50` }]}>
          {/* Time */}
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreValue}>
              {minsUntil > 0 && minsUntil <= 60
                ? `${minsUntil}m`
                : format(new Date(game.scheduled_at), 'h:mm')}
            </Text>
            <Text style={styles.scoreLabel}>
              {minsUntil > 0 && minsUntil <= 60
                ? 'AWAY'
                : format(new Date(game.scheduled_at), 'a').toUpperCase()}
            </Text>
          </View>
          <View style={styles.scoreDivider} />
          {/* Capacity */}
          <View style={styles.scoreBlock}>
            <Text style={[styles.scoreValue, { color: spotsLeft === 0 ? Colors.error : Colors.success }]}>
              {inPlayers.length}<Text style={styles.scoreValueSub}>/{game.max_players}</Text>
            </Text>
            <Text style={styles.scoreLabel}>PLAYERS</Text>
          </View>
          <View style={styles.scoreDivider} />
          {/* ELO band */}
          <View style={styles.scoreBlock}>
            <Text style={styles.scoreValue}>{game.elo_band}</Text>
            <Text style={styles.scoreLabel}>ELO BAND</Text>
          </View>
        </View>
      </ImageBackground>

      {/* ── RSVP BAR ── */}
      <View style={[styles.rsvpBar, { borderBottomColor: `${formatColor}30` }]}>
        {(['in', 'maybe', 'out'] as RsvpStatus[]).map((s) => {
          const active = myRsvp === s;
          const color = s === 'in' ? Colors.success : s === 'maybe' ? Colors.warning : Colors.error;
          return (
            <TouchableOpacity
              key={s}
              style={[styles.rsvpButton, active && { borderBottomColor: color, borderBottomWidth: 2 }]}
              onPress={() => handleRsvp(s)}
            >
              <Text style={[styles.rsvpText, active && { color }]}>
                {s === 'in' ? '✓ IN' : s === 'maybe' ? '? MAYBE' : '✗ OUT'}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[styles.rsvpButton, showRoster && { borderBottomColor: formatColor, borderBottomWidth: 2 }]}
          onPress={() => setShowRoster((v) => !v)}
        >
          <Text style={[styles.rsvpText, showRoster && { color: formatColor }]}>
            ROSTER ({inPlayers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── ROSTER DRAWER ── */}
      {showRoster && (
        <View style={styles.rosterDrawer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rosterScroll}>
            {inPlayers.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={styles.rosterCard}
                onPress={() => navigation.navigate('PlayerProfile', { userId: (player as any).user?.id })}
              >
                <Avatar user={(player as any).user} size={36} showBadge />
                <Text style={styles.rosterName} numberOfLines={1}>{(player as any).user?.display_name}</Text>
                <EloBadge rating={(player as any).user?.elo_rating ?? 0} rated={(player as any).user?.games_until_rated <= 0} size="sm" />
              </TouchableOpacity>
            ))}
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, game.max_players - inPlayers.length) }, (_, i) => (
              <View key={`empty-${i}`} style={[styles.rosterCard, styles.rosterCardEmpty]}>
                <View style={styles.rosterSlotIcon}>
                  <Ionicons name="person-add-outline" size={16} color={Colors.textMuted} />
                </View>
                <Text style={styles.rosterSlotText}>OPEN</Text>
              </View>
            ))}
          </ScrollView>

          {/* Slot bar */}
          <View style={styles.slotBar}>
            {Array.from({ length: game.max_players }, (_, i) => (
              <View key={i} style={[styles.slot, i < inPlayers.length && { backgroundColor: formatColor, shadowColor: formatColor, shadowOpacity: 0.6, shadowRadius: 3, shadowOffset: { width: 0, height: 0 } }]} />
            ))}
          </View>
        </View>
      )}

      {/* ── CHAT (primary content) ── */}
      <View style={styles.chatWrap}>
        <View style={styles.chatHeader}>
          <View style={styles.chatHeaderAccent} />
          <Text style={styles.chatHeaderText}>GAME CHAT</Text>
          {messages.length > 0 && (
            <View style={styles.msgCountBadge}>
              <Text style={styles.msgCountText}>{messages.length}</Text>
            </View>
          )}
        </View>

        <FlatList
          ref={chatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.chatList}
          onLayout={() => chatRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            const isOwn = item.user_id === currentUserId;
            const rated = ((item as any).user?.games_until_rated ?? 3) <= 0;
            return (
              <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
                {!isOwn && (
                  <Avatar user={(item as any).user} size={28} />
                )}
                <View style={[styles.msgBubble, isOwn ? [styles.msgBubbleOwn, { borderColor: `${formatColor}60`, shadowColor: formatColor }] : styles.msgBubbleOther]}>
                  {!isOwn && (
                    <View style={styles.msgMeta}>
                      <Text style={styles.msgSender}>{(item as any).user?.display_name}</Text>
                      <EloBadge rating={(item as any).user?.elo_rating ?? 0} rated={rated} size="sm" />
                    </View>
                  )}
                  <Text style={styles.msgText}>{item.message}</Text>
                  <Text style={[styles.msgTime, isOwn && { color: `${formatColor}80` }]}>
                    {format(new Date(item.created_at), 'h:mm a')}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChatWrap}>
              <Ionicons name="chatbubbles-outline" size={32} color={Colors.textMuted} />
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatSub}>Be the first to say something</Text>
            </View>
          }
        />
      </View>

      {/* ── HOST CONTROLS (collapsed) ── */}
      {isHost && game.status === 'open' && (
        <View style={styles.hostBar}>
          <TouchableOpacity style={styles.hostBtn} onPress={() => updateGameStatus('full')}>
            <Text style={styles.hostBtnText}>CLOSE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.hostBtn, { borderColor: Colors.success }]} onPress={() => updateGameStatus('completed')}>
            <Text style={[styles.hostBtnText, { color: Colors.success }]}>DONE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.hostBtn, { borderColor: Colors.error }]} onPress={() =>
            Alert.alert('Cancel Game?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Yes, Cancel', style: 'destructive', onPress: () => updateGameStatus('cancelled') },
            ])
          }>
            <Text style={[styles.hostBtnText, { color: Colors.error }]}>CANCEL</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── CHAT INPUT ── */}
      <View style={[styles.inputBar, { borderTopColor: `${formatColor}25` }]}>
        <TextInput
          style={styles.input}
          placeholder="Say something..."
          placeholderTextColor={Colors.textMuted}
          value={message}
          onChangeText={setMessage}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: formatColor, shadowColor: formatColor }]}
          onPress={sendMessage}
          disabled={sending || !message.trim()}
        >
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },

  // Scoreboard header
  scoreboard: { width: '100%' },
  scoreboardImg: { resizeMode: 'cover' },
  scoreboardScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.78)' },
  scoreboardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: 6 },
  formatChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderRadius: 2 },
  formatChipText: { fontFamily: 'BebasNeue_400Regular', fontSize: 16, letterSpacing: 1 },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.success}20`, borderWidth: 1, borderColor: Colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.success },
  liveText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, color: Colors.success, letterSpacing: 2 },
  courtName: { fontFamily: 'BebasNeue_400Regular', fontSize: 30, color: '#fff', letterSpacing: 1, paddingHorizontal: Spacing.md, lineHeight: 32 },
  neighborhood: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, paddingHorizontal: Spacing.md, marginBottom: 10 },
  scoreRow: { flexDirection: 'row', borderTopWidth: 1, marginHorizontal: Spacing.md, paddingTop: 10, paddingBottom: 12 },
  scoreBlock: { flex: 1, alignItems: 'center' },
  scoreValue: { fontFamily: 'BebasNeue_400Regular', fontSize: 26, color: '#fff', lineHeight: 26 },
  scoreValueSub: { fontSize: 16, color: 'rgba(255,255,255,0.4)' },
  scoreLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginTop: 2 },
  scoreDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 2 },

  // RSVP bar
  rsvpBar: { flexDirection: 'row', backgroundColor: '#080808', borderBottomWidth: 1 },
  rsvpButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  rsvpText: { fontFamily: 'BebasNeue_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.5 },

  // Roster drawer
  rosterDrawer: { backgroundColor: '#070707', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  rosterScroll: { paddingHorizontal: Spacing.md, paddingVertical: 10, gap: 8 },
  rosterCard: { alignItems: 'center', width: 64, gap: 4 },
  rosterCardEmpty: { opacity: 0.4 },
  rosterSlotIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  rosterSlotText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 },
  rosterName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: 'rgba(255,255,255,0.6)', textAlign: 'center', width: '100%' },
  slotBar: { flexDirection: 'row', gap: 3, paddingHorizontal: Spacing.md, paddingBottom: 8 },
  slot: { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1 },

  // Chat
  chatWrap: { flex: 1, backgroundColor: '#000' },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.md, paddingTop: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  chatHeaderAccent: { width: 3, height: 10, backgroundColor: Colors.primary, borderRadius: 1, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 4 },
  chatHeaderText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: Colors.textMuted, letterSpacing: 3 },
  msgCountBadge: { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1 },
  msgCountText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: '#fff' },
  chatList: { padding: Spacing.md, gap: 10, flexGrow: 1, justifyContent: 'flex-end' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  msgRowOwn: { flexDirection: 'row-reverse' },
  msgBubble: { maxWidth: '75%', borderWidth: 1, borderRadius: 2, padding: 10, gap: 2 },
  msgBubbleOwn: {
    backgroundColor: '#0D0D0D',
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  msgBubbleOther: { backgroundColor: '#0A0A0A', borderColor: 'rgba(255,255,255,0.08)' },
  msgMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  msgSender: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.secondary },
  msgText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: '#fff', lineHeight: 18 },
  msgTime: { fontFamily: 'RobotoCondensed_400Regular', fontSize: 9, color: 'rgba(255,255,255,0.3)', alignSelf: 'flex-end' },
  emptyChatWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 8 },
  emptyChatText: { fontFamily: 'BebasNeue_400Regular', fontSize: 20, color: Colors.textMuted, letterSpacing: 1 },
  emptyChatSub: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: 'rgba(255,255,255,0.2)' },

  // Host controls
  hostBar: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 8, backgroundColor: '#050505', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  hostBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 2, alignItems: 'center' },
  hostBtnText: { fontFamily: 'BebasNeue_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },

  // Input bar
  inputBar: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 10, backgroundColor: '#050505', borderTopWidth: 1, alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#111', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 2, paddingHorizontal: 12, paddingVertical: 9, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: '#fff' },
  sendBtn: { width: 40, height: 40, borderRadius: 2, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 8 },
});

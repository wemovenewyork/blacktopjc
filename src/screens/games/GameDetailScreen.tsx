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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { shareGame } from '@/lib/sharing';
import { Game, GamePlayer, GameMessage, RsvpStatus } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '@/theme';
import { Avatar } from '@/components/common/Avatar';
import { EloBadge } from '@/components/common/EloBadge';
import { HooperScore } from '@/components/common/HooperScore';
import { useRealtime } from '@/hooks/useRealtime';
import { HomeStackParamList } from '@/navigation/MainNavigator';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'GameDetail'>;
type Route = RouteProp<HomeStackParamList, 'GameDetail'>;

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

  // Realtime: players
  useRealtime({
    table: 'game_players',
    filter: `game_id=eq.${gameId}`,
    event: '*',
    onData: fetchData,
  });

  // Realtime: chat
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
  const isRated = game.host && (game.host as any).games_until_rated <= 0;
  const inPlayers = players.filter((p) => p.rsvp_status === 'in');

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.courtName}>{(game.court as any)?.name}</Text>
            <Text style={styles.neighborhood}>{(game.court as any)?.neighborhood}</Text>
          </View>
          <TouchableOpacity onPress={() => shareGame(game as any)}>
            <Ionicons name="share-outline" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Badges */}
        <View style={styles.badgesRow}>
          <View style={styles.formatBadge}><Text style={styles.formatText}>{game.format}</Text></View>
          <View style={styles.eloBandBadge}><Text style={styles.eloBandText}>{game.elo_band}</Text></View>
          <View style={[styles.statusBadge, { backgroundColor: game.status === 'open' ? `${Colors.success}20` : `${Colors.error}20` }]}>
            <Text style={[styles.statusText, { color: game.status === 'open' ? Colors.success : Colors.error }]}>
              {game.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
            <Text style={styles.infoText}>{format(new Date(game.scheduled_at), 'EEEE, MMMM d · h:mm a')}</Text>
          </View>
          {game.host && (
            <View style={styles.hostRow}>
              <Avatar user={game.host as any} size={36} />
              <View>
                <Text style={styles.hostLabel}>Host</Text>
                <Text style={styles.hostName}>{(game.host as any).display_name}</Text>
              </View>
              <HooperScore
                punctuality={(game.host as any).hooper_score_punctuality}
                sportsmanship={(game.host as any).hooper_score_sportsmanship}
                skill={(game.host as any).hooper_score_skill}
                compact
              />
            </View>
          )}
        </View>

        {/* Spots counter */}
        <View style={styles.spotsCard}>
          <Text style={styles.spotsText}>
            {inPlayers.length}<Text style={styles.spotsMax}>/{game.max_players}</Text>
          </Text>
          <Text style={styles.spotsLabel}>PLAYERS</Text>
          <View style={styles.slotsRow}>
            {Array.from({ length: game.max_players }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.slot,
                  i < inPlayers.length && styles.slotFilled,
                ]}
              />
            ))}
          </View>
        </View>

        {/* RSVP buttons */}
        <View style={styles.rsvpRow}>
          {(['in', 'maybe', 'out'] as RsvpStatus[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.rsvpButton, myRsvp === s && styles.rsvpButtonActive(s)]}
              onPress={() => handleRsvp(s)}
            >
              <Text style={[styles.rsvpText, myRsvp === s && styles.rsvpTextActive]}>
                {s === 'in' ? 'IN' : s === 'maybe' ? 'MAYBE' : 'OUT'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Roster */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PLAYERS IN ({inPlayers.length})</Text>
          {inPlayers.map((player) => (
            <View key={player.id} style={styles.playerRow}>
              <Avatar user={(player as any).user} size={36} showBadge />
              <Text style={styles.playerName}>{(player as any).user?.display_name}</Text>
              <EloBadge rating={(player as any).user?.elo_rating ?? 0} rated={(player as any).user?.games_until_rated <= 0} size="sm" />
            </View>
          ))}
        </View>

        {/* Chat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GAME CHAT</Text>
          <View style={styles.chatContainer}>
            <FlatList
              ref={chatRef}
              data={messages}
              keyExtractor={(m) => m.id}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const isOwn = item.user_id === currentUserId;
                return (
                  <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
                    {!isOwn && <Text style={styles.messageSender}>{(item as any).user?.display_name}</Text>}
                    <Text style={styles.messageText}>{item.message}</Text>
                    <Text style={styles.messageTime}>{format(new Date(item.created_at), 'h:mm a')}</Text>
                  </View>
                );
              }}
              ListEmptyComponent={<Text style={styles.noChatText}>No messages yet. Say something!</Text>}
            />
          </View>
        </View>

        {/* Host controls */}
        {isHost && game.status === 'open' && (
          <View style={styles.hostControls}>
            <Text style={styles.sectionTitle}>HOST CONTROLS</Text>
            <TouchableOpacity style={styles.hostButton} onPress={() => updateGameStatus('full')}>
              <Text style={styles.hostButtonText}>CLOSE ROSTER</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.hostButton, styles.hostButtonSuccess]}
              onPress={() => updateGameStatus('completed')}
            >
              <Text style={styles.hostButtonText}>MARK COMPLETE</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.hostButton, styles.hostButtonDanger]}
              onPress={() => Alert.alert('Cancel Game?', 'This cannot be undone.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes, Cancel', style: 'destructive', onPress: () => updateGameStatus('cancelled') },
              ])}
            >
              <Text style={styles.hostButtonText}>CANCEL GAME</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Chat input */}
      <View style={styles.chatInputRow}>
        <TextInput
          style={styles.chatInput}
          placeholder="Say something..."
          placeholderTextColor={Colors.textMuted}
          value={message}
          onChangeText={setMessage}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage} disabled={sending}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.md },
  courtName: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: Colors.textPrimary, letterSpacing: 1 },
  neighborhood: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted },
  badgesRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  formatBadge: { backgroundColor: `${Colors.primary}20`, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: Colors.primary },
  formatText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.primary },
  eloBandBadge: { backgroundColor: Colors.card, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: Colors.border },
  eloBandText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textSecondary },
  statusBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs },
  infoCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  infoText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textSecondary },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  hostLabel: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  hostName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.textPrimary },
  spotsCard: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  spotsText: { fontFamily: 'BebasNeue_400Regular', fontSize: 48, color: Colors.textPrimary },
  spotsMax: { fontSize: 28, color: Colors.textMuted },
  spotsLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm },
  slotsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'center' },
  slot: { width: 16, height: 16, borderRadius: 2, borderWidth: 1, borderColor: Colors.border, backgroundColor: 'transparent' },
  slotFilled: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  rsvpRow: { flexDirection: 'row', gap: Spacing.sm, marginHorizontal: Spacing.md, marginBottom: Spacing.md },
  rsvpButton: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, alignItems: 'center', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  rsvpButtonActive: (s: string) => ({
    backgroundColor: s === 'in' ? `${Colors.success}20` : s === 'maybe' ? `${Colors.warning}20` : `${Colors.error}20`,
    borderColor: s === 'in' ? Colors.success : s === 'maybe' ? Colors.warning : Colors.error,
  }),
  rsvpText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.lg, color: Colors.textMuted, letterSpacing: 1 },
  rsvpTextActive: { color: Colors.textPrimary },
  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  sectionTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 16, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  playerName: { flex: 1, fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.textPrimary },
  chatContainer: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.sm, minHeight: 100, borderWidth: 1, borderColor: Colors.border },
  messageBubble: { padding: Spacing.sm, borderRadius: BorderRadius.md, marginBottom: Spacing.xs, maxWidth: '80%' },
  ownBubble: { alignSelf: 'flex-end', backgroundColor: Colors.primary },
  otherBubble: { alignSelf: 'flex-start', backgroundColor: Colors.cardElevated },
  messageSender: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.secondary, marginBottom: 2 },
  messageText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textPrimary },
  messageTime: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2, alignSelf: 'flex-end' },
  noChatText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },
  hostControls: { paddingHorizontal: Spacing.md, marginBottom: Spacing.xl, gap: Spacing.sm },
  hostButton: { backgroundColor: Colors.card, paddingVertical: 12, borderRadius: BorderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  hostButtonSuccess: { borderColor: Colors.success, backgroundColor: `${Colors.success}15` },
  hostButtonDanger: { borderColor: Colors.error, backgroundColor: `${Colors.error}15` },
  hostButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.lg, color: Colors.textPrimary, letterSpacing: 1 },
  chatInputRow: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.border },
  chatInput: { flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 10, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
});

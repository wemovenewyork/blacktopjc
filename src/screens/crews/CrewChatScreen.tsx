import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { CrewMessage } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';
import { Avatar } from '@/components/common/Avatar';
import { useRealtime } from '@/hooks/useRealtime';
import { CrewsStackParamList } from '@/navigation/MainNavigator';

type Route = RouteProp<CrewsStackParamList, 'CrewChat'>;

export function CrewChatScreen() {
  const route = useRoute<Route>();
  const { crewId, crewName, crewColor } = route.params;
  const chatRef = useRef<FlatList>(null);

  const [messages, setMessages] = useState<CrewMessage[]>([]);
  const [text, setText] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single();
      setUserId(user?.id ?? null);

      const { data: msgs } = await supabase
        .from('crew_messages')
        .select('*, user:users(display_name, avatar_url, elo_rating, games_until_rated)')
        .eq('crew_id', crewId)
        .order('created_at', { ascending: true });

      if (msgs) setMessages(msgs);
      setLoading(false);
    })();
  }, [crewId]);

  useRealtime({
    table: 'crew_messages',
    filter: `crew_id=eq.${crewId}`,
    event: 'INSERT',
    onData: (payload) => {
      setMessages((prev) => [...prev, payload.new as CrewMessage]);
      setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100);
    },
  });

  async function sendMessage() {
    if (!text.trim() || !userId) return;
    await supabase.from('crew_messages').insert({ crew_id: crewId, user_id: userId, message: text.trim() });
    setText('');
  }

  if (loading) return <View style={styles.loader}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={chatRef}
        data={messages}
        keyExtractor={(m) => m.id}
        onContentSizeChange={() => chatRef.current?.scrollToEnd({ animated: false })}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          const isOwn = item.user_id === userId;
          const user = (item as any).user;
          return (
            <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
              {!isOwn && user && <Avatar user={user} size={28} />}
              <View style={[styles.bubble, isOwn ? [styles.ownBubble, { backgroundColor: crewColor }] : styles.otherBubble]}>
                {!isOwn && user && <Text style={styles.senderName}>{user.display_name}</Text>}
                <Text style={styles.msgText}>{item.message}</Text>
                <Text style={styles.msgTime}>{format(new Date(item.created_at), 'h:mm a')}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Start the conversation!</Text>}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message your crew..."
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: crewColor }]} onPress={sendMessage}>
          <Ionicons name="send" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  messageList: { padding: Spacing.md, paddingBottom: 20, gap: Spacing.sm },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  msgRowOwn: { flexDirection: 'row-reverse' },
  bubble: { maxWidth: '75%', padding: Spacing.sm, borderRadius: BorderRadius.md },
  ownBubble: {},
  otherBubble: { backgroundColor: Colors.card },
  senderName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.secondary, marginBottom: 2 },
  msgText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textPrimary },
  msgTime: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2, alignSelf: 'flex-end' },
  emptyText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
  inputRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  input: { flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.md, paddingVertical: 10, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

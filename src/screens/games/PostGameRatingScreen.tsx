import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { User, PunctualityStatus } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';
import { Avatar } from '@/components/common/Avatar';
import { EloBadge } from '@/components/common/EloBadge';

interface RatingState {
  skill: number;
  sportsmanship: number;
  punctuality: PunctualityStatus;
}

export function PostGameRatingScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { gameId } = route.params ?? {};

  const [players, setPlayers] = useState<User[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingState>>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: gamePlayers } = await supabase
        .from('game_players')
        .select('user:users(*)')
        .eq('game_id', gameId)
        .eq('rsvp_status', 'in')
        .neq('user_id', user.id);

      if (gamePlayers) {
        const playerList = gamePlayers.map((gp: any) => gp.user).filter(Boolean);
        setPlayers(playerList);
        const initialRatings: Record<string, RatingState> = {};
        for (const p of playerList) {
          initialRatings[p.id] = { skill: 3, sportsmanship: 3, punctuality: 'ontime' };
        }
        setRatings(initialRatings);
      }
      setLoading(false);
    }
    load();
  }, [gameId]);

  function updateRating(playerId: string, field: keyof RatingState, value: any) {
    setRatings((prev) => ({
      ...prev,
      [playerId]: { ...prev[playerId], [field]: value },
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const ratingRows = Object.entries(ratings).map(([playerId, r]) => ({
        game_id: gameId,
        rater_id: currentUserId,
        rated_user_id: playerId,
        skill_rating: r.skill,
        sportsmanship_rating: r.sportsmanship,
        punctuality_status: r.punctuality,
      }));

      await supabase.from('game_ratings').insert(ratingRows);

      // Trigger ELO recalculation for each rated player
      for (const playerId of Object.keys(ratings)) {
        await supabase.functions.invoke('recalculate-elo', {
          body: { game_id: gameId, rated_user_id: playerId },
        });
      }

      navigation.navigate('StatLogger', { gameId });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>RATE YOUR PLAYERS</Text>
      <Text style={styles.subtitle}>Help build the community — rate each player honestly</Text>

      {players.map((player) => {
        const r = ratings[player.id];
        if (!r) return null;
        const isRated = player.games_until_rated <= 0;

        return (
          <View key={player.id} style={styles.playerCard}>
            <View style={styles.playerHeader}>
              <Avatar user={player} size={44} />
              <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{player.display_name}</Text>
                <EloBadge rating={player.elo_rating} rated={isRated} size="sm" />
              </View>
            </View>

            {/* Skill */}
            <Text style={styles.ratingLabel}>SKILL ACCURACY</Text>
            <Text style={styles.ratingQuestion}>Was this player at the level they claimed?</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => updateRating(player.id, 'skill', s)}>
                  <Ionicons
                    name={r.skill >= s ? 'star' : 'star-outline'}
                    size={32}
                    color={Colors.secondary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Sportsmanship */}
            <Text style={styles.ratingLabel}>SPORTSMANSHIP</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => updateRating(player.id, 'sportsmanship', s)}>
                  <Ionicons
                    name={r.sportsmanship >= s ? 'star' : 'star-outline'}
                    size={32}
                    color={Colors.success}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Punctuality */}
            <Text style={styles.ratingLabel}>PUNCTUALITY</Text>
            <View style={styles.punctRow}>
              {([
                { value: 'ontime', label: 'ON TIME', icon: 'checkmark-circle', color: Colors.success },
                { value: 'late', label: 'LATE', icon: 'time', color: Colors.warning },
                { value: 'noshow', label: 'NO-SHOW', icon: 'close-circle', color: Colors.error },
              ] as const).map(({ value, label, icon, color }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.punctButton, r.punctuality === value && { backgroundColor: `${color}20`, borderColor: color }]}
                  onPress={() => updateRating(player.id, 'punctuality', value)}
                >
                  <Ionicons name={icon} size={20} color={r.punctuality === value ? color : Colors.textMuted} />
                  <Text style={[styles.punctText, r.punctuality === value && { color }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>SUBMIT ALL RATINGS</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={() => navigation.navigate('StatLogger', { gameId })}>
        <Text style={styles.skipText}>Skip ratings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  content: { padding: Spacing.md, paddingBottom: 40 },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: Colors.textPrimary, letterSpacing: 2 },
  subtitle: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textMuted, marginBottom: Spacing.xl, marginTop: 4 },
  playerCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  playerHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  playerInfo: { gap: 4 },
  playerName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.lg, color: Colors.textPrimary },
  ratingLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: 2, marginTop: Spacing.sm },
  ratingQuestion: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm },
  starsRow: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.sm },
  punctRow: { flexDirection: 'row', gap: Spacing.xs },
  punctButton: { flex: 1, flexDirection: 'column', alignItems: 'center', gap: 4, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.cardElevated },
  punctText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted },
  submitButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.lg },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.xl, color: '#fff', letterSpacing: 2 },
  skipButton: { alignItems: 'center', paddingVertical: Spacing.md },
  skipText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted },
});

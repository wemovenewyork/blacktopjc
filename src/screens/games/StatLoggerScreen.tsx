import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';
import { GameResult } from '@/types';

type StatField = 'points' | 'assists' | 'rebounds' | 'steals';
const STAT_FIELDS: { field: StatField; label: string; icon: string }[] = [
  { field: 'points', label: 'Points', icon: 'basketball' },
  { field: 'assists', label: 'Assists', icon: 'people' },
  { field: 'rebounds', label: 'Rebounds', icon: 'refresh-circle' },
  { field: 'steals', label: 'Steals', icon: 'hand-left' },
];

export function StatLoggerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { gameId } = route.params ?? {};

  const [stats, setStats] = useState<Record<StatField, number>>({
    points: 0, assists: 0, rebounds: 0, steals: 0,
  });
  const [result, setResult] = useState<GameResult>('none');
  const [loading, setLoading] = useState(false);

  function changestat(field: StatField, delta: number) {
    setStats((prev) => ({ ...prev, [field]: Math.max(0, prev[field] + delta) }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data: user } = await supabase.from('users').select('id, total_games, wins, losses').eq('auth_id', session.user.id).single();
      if (!user) throw new Error('No user');

      await supabase.from('player_stats').insert({
        user_id: user.id,
        game_id: gameId,
        ...stats,
        result,
      });

      // Update user totals
      await supabase.from('users').update({
        total_games: user.total_games + 1,
        wins: result === 'win' ? user.wins + 1 : user.wins,
        losses: result === 'loss' ? user.losses + 1 : user.losses,
      }).eq('id', user.id);

      navigation.reset({ index: 0, routes: [{ name: 'HomeTab' }] });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Header with Skip */}
      <View style={styles.header}>
        <Text style={styles.title}>LOG YOUR STATS</Text>
        <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'HomeTab' }] })}>
          <Text style={styles.skipText}>SKIP</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Optional — logged to your career history</Text>

      {/* Stat counters */}
      <View style={styles.statsGrid}>
        {STAT_FIELDS.map(({ field, label, icon }) => (
          <View key={field} style={styles.statCard}>
            <Ionicons name={icon as any} size={24} color={Colors.primary} />
            <Text style={styles.statLabel}>{label}</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity style={styles.counterBtn} onPress={() => changestat(field, -1)}>
                <Ionicons name="remove" size={18} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.statValue}>{stats[field]}</Text>
              <TouchableOpacity style={styles.counterBtn} onPress={() => changestat(field, 1)}>
                <Ionicons name="add" size={18} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Result */}
      <Text style={styles.sectionLabel}>GAME RESULT</Text>
      <View style={styles.resultRow}>
        {([
          { value: 'win', label: 'WIN', color: Colors.success },
          { value: 'loss', label: 'LOSS', color: Colors.error },
          { value: 'none', label: 'NO RESULT', color: Colors.textMuted },
        ] as { value: GameResult; label: string; color: string }[]).map(({ value, label, color }) => (
          <TouchableOpacity
            key={value}
            style={[styles.resultButton, result === value && { backgroundColor: `${color}20`, borderColor: color }]}
            onPress={() => setResult(value)}
          >
            <Text style={[styles.resultText, result === value && { color }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>SAVE STATS</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: Colors.textPrimary, letterSpacing: 2 },
  skipText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: Colors.primary },
  subtitle: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.xl },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.xl },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border, gap: Spacing.xs },
  statLabel: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted },
  counterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  counterBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.cardElevated, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  statValue: { fontFamily: 'BebasNeue_400Regular', fontSize: 36, color: Colors.textPrimary, minWidth: 40, textAlign: 'center' },
  sectionLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm },
  resultRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl },
  resultButton: { flex: 1, paddingVertical: 12, borderRadius: BorderRadius.md, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.card },
  resultText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.lg, color: Colors.textMuted, letterSpacing: 1 },
  saveButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center' },
  saveButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.xl, color: '#fff', letterSpacing: 2 },
});

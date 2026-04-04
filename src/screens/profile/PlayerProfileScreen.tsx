import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { User } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius, getEloTier, getEloColor } from '@/theme';
import { Avatar } from '@/components/common/Avatar';
import { EloBadge } from '@/components/common/EloBadge';
import { HooperScore } from '@/components/common/HooperScore';
import { HomeStackParamList } from '@/navigation/MainNavigator';

type Route = RouteProp<HomeStackParamList, 'PlayerProfile'>;

export function PlayerProfileScreen() {
  const route = useRoute<Route>();
  const { userId } = route.params;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('users')
      .select('*, home_court:courts(name)')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        setUser(data);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }
  if (!user) return null;

  const isRated = user.games_until_rated <= 0;
  const tierColor = getEloColor(user.elo_rating, isRated);

  return (
    <ScrollView style={styles.container}>
      {/* No-show warning */}
      {user.noshow_warning && (
        <View style={styles.noshowBanner}>
          <Ionicons name="warning" size={16} color={Colors.warning} />
          <Text style={styles.noshowText}>
            This player has been marked as a no-show in recent games.
          </Text>
        </View>
      )}

      {/* Header */}
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
            {user.neighborhood}
          </Text>
        </View>
      </View>

      {/* ELO + Hooper Score */}
      <View style={styles.card}>
        <EloBadge rating={user.elo_rating} rated={isRated} size="lg" />
      </View>

      <View style={styles.card}>
        <HooperScore
          punctuality={user.hooper_score_punctuality}
          sportsmanship={user.hooper_score_sportsmanship}
          skill={user.hooper_score_skill}
        />
      </View>

      {/* Career Stats */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>CAREER STATS</Text>
        <View style={styles.statsGrid}>
          <StatBox label="Games" value={user.total_games} />
          <StatBox label="W-L" value={`${user.wins}-${user.losses}`} />
          <StatBox label="Win %" value={user.total_games > 0 ? `${Math.round((user.wins / user.total_games) * 100)}%` : '—'} />
        </View>
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
  noshowBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: `${Colors.warning}20`, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.warning },
  noshowText: { flex: 1, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.warning },
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
  statsGrid: { flexDirection: 'row', gap: Spacing.sm },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, backgroundColor: Colors.cardElevated, borderRadius: BorderRadius.md },
  statBoxValue: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: Colors.textPrimary },
  statBoxLabel: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
});

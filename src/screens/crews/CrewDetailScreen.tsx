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
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Crew, CrewMember } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';
import { Avatar } from '@/components/common/Avatar';
import { EloBadge } from '@/components/common/EloBadge';
import { CrewsStackParamList } from '@/navigation/MainNavigator';

type Nav = NativeStackNavigationProp<CrewsStackParamList, 'CrewDetail'>;
type Route = RouteProp<CrewsStackParamList, 'CrewDetail'>;

export function CrewDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { crewId } = route.params;

  const [crew, setCrew] = useState<Crew | null>(null);
  const [members, setMembers] = useState<CrewMember[]>([]);
  const [isMember, setIsMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canChallenge, setCanChallenge] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      let uid: string | null = null;
      if (session?.user) {
        const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single();
        uid = user?.id ?? null;
        setCurrentUserId(uid);
      }

      const [crewRes, membersRes] = await Promise.all([
        supabase.from('crews').select('*, home_court:courts(name)').eq('id', crewId).single(),
        supabase.from('crew_members').select('*, user:users(*)').eq('crew_id', crewId),
      ]);

      if (crewRes.data) setCrew(crewRes.data);
      if (membersRes.data) {
        setMembers(membersRes.data);
        if (uid) {
          const myMembership = membersRes.data.find((m: any) => m.user_id === uid);
          setIsMember(!!myMembership);
          setIsAdmin(myMembership?.role === 'admin');
        }
      }

      // Check if current user is admin of a different crew (can challenge)
      if (uid) {
        const { data: myCrewMembership } = await supabase
          .from('crew_members')
          .select('crew_id, role')
          .eq('user_id', uid)
          .eq('role', 'admin')
          .neq('crew_id', crewId)
          .limit(1);
        setCanChallenge((myCrewMembership?.length ?? 0) > 0);
      }

      setLoading(false);
    }
    load();
  }, [crewId]);

  async function handleChallenge() {
    if (!currentUserId) return;
    const { data: myMembership } = await supabase
      .from('crew_members')
      .select('crew_id')
      .eq('user_id', currentUserId)
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (!myMembership) return;

    await supabase.from('crew_challenges').insert({
      challenger_crew_id: myMembership.crew_id,
      challenged_crew_id: crewId,
    });

    Alert.alert('Challenge Sent!', 'The other crew admin will receive a notification.');
  }

  async function handleJoin() {
    if (!currentUserId) return;
    await supabase.from('crew_members').insert({ crew_id: crewId, user_id: currentUserId, role: 'member' });
    setIsMember(true);
  }

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>;
  }
  if (!crew) return null;

  return (
    <ScrollView style={styles.container}>
      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: crew.color_hex }]}>
        <Text style={styles.crewName}>{crew.name}</Text>
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        {crew.home_court && (
          <View style={styles.metaChip}>
            <Ionicons name="location" size={12} color={Colors.textMuted} />
            <Text style={styles.metaChipText}>{(crew.home_court as any).name}</Text>
          </View>
        )}
        <View style={styles.metaChip}>
          <Text style={styles.metaChipText}>Since {format(new Date(crew.created_at), 'MMM yyyy')}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox label="W-L" value={`${crew.wins}-${crew.losses}`} />
        <StatBox label="Rep Score" value={crew.rep_score.toFixed(0)} />
        <StatBox label="Members" value={members.length} />
        <StatBox label="Games" value={crew.wins + crew.losses} />
      </View>

      {/* Action buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('CrewChat', { crewId, crewName: crew.name, crewColor: crew.color_hex })}
        >
          <Ionicons name="chatbubbles" size={16} color={Colors.textPrimary} />
          <Text style={styles.chatButtonText}>CREW CHAT</Text>
        </TouchableOpacity>

        {canChallenge && (
          <TouchableOpacity style={styles.challengeButton} onPress={handleChallenge}>
            <Ionicons name="flash" size={16} color={Colors.textPrimary} />
            <Text style={styles.challengeButtonText}>CHALLENGE</Text>
          </TouchableOpacity>
        )}

        {!isMember && (
          <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
            <Text style={styles.joinButtonText}>JOIN CREW</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Roster */}
      <Text style={styles.sectionTitle}>ROSTER ({members.length})</Text>
      {members.map((member) => {
        const user = (member as any).user;
        if (!user) return null;
        const isRated = user.games_until_rated <= 0;
        return (
          <View key={member.id} style={styles.memberRow}>
            <Avatar user={user} size={40} showBadge />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{user.display_name}</Text>
              <Text style={styles.memberNeighborhood}>{user.neighborhood}</Text>
            </View>
            <EloBadge rating={user.elo_rating} rated={isRated} size="sm" />
            {member.role === 'admin' && (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
        );
      })}
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
  banner: { height: 100, justifyContent: 'flex-end', padding: Spacing.md },
  crewName: { fontFamily: 'BebasNeue_400Regular', fontSize: 32, color: '#fff', letterSpacing: 2 },
  metaRow: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, paddingBottom: 0 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.card, borderRadius: BorderRadius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  metaChipText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  statsRow: { flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm },
  statBox: { flex: 1, backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statBoxValue: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: Colors.textPrimary },
  statBoxLabel: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  actionsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.md, marginBottom: Spacing.md },
  chatButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: 12, backgroundColor: Colors.card, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  chatButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.md, color: Colors.textPrimary, letterSpacing: 1 },
  challengeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: 12, backgroundColor: `${Colors.warning}20`, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.warning },
  challengeButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.md, color: Colors.warning, letterSpacing: 1 },
  joinButton: { flex: 1, paddingVertical: 12, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, alignItems: 'center' },
  joinButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.md, color: '#fff', letterSpacing: 1 },
  sectionTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 16, color: Colors.textMuted, letterSpacing: 2, paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  memberInfo: { flex: 1 },
  memberName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.textPrimary },
  memberNeighborhood: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  adminBadge: { backgroundColor: `${Colors.secondary}20`, borderRadius: BorderRadius.full, paddingHorizontal: 7, paddingVertical: 1, borderWidth: 1, borderColor: Colors.secondary },
  adminBadgeText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.secondary },
});

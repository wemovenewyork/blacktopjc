import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';
import { NetStatus, SurfaceCondition, CrowdLevel } from '@/types';
import { CourtsStackParamList } from '@/navigation/MainNavigator';

type Route = RouteProp<CourtsStackParamList, 'SubmitCondition'>;

// Milestone badge labels by report count
function getScoutBadge(count: number): { label: string; color: string; next: number } | null {
  if (count === 0) return null;
  if (count >= 25) return { label: 'COURT EXPERT', color: '#FFD700', next: Infinity };
  if (count >= 10) return { label: 'SCOUT PRO', color: Colors.secondary, next: 25 };
  if (count >= 5)  return { label: 'SCOUT', color: Colors.success, next: 10 };
  if (count >= 1)  return { label: 'SPOTTER', color: '#3B82F6', next: 5 };
  return null;
}

export function SubmitConditionScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const { courtId, courtName } = route.params;

  const [net, setNet] = useState<NetStatus | null>(null);
  const [surface, setSurface] = useState<SurfaceCondition | null>(null);
  const [crowd, setCrowd] = useState<CrowdLevel | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportCount, setReportCount] = useState(0);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single();
        if (!user) return;

        const { count } = await supabase
          .from('court_conditions')
          .select('*', { count: 'exact', head: true })
          .eq('reported_by', user.id);
        setReportCount(count ?? 0);

        // Streak: count distinct days with a report in the last 30 days
        const { data: recent } = await supabase
          .from('court_conditions')
          .select('created_at')
          .eq('reported_by', user.id)
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false });

        if (recent && recent.length > 0) {
          const days = new Set(recent.map((r: any) => r.created_at.slice(0, 10)));
          // Simple consecutive-day streak from today backwards
          let s = 0;
          const today = new Date();
          for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            if (days.has(d.toISOString().slice(0, 10))) s++;
            else if (i > 0) break;
          }
          setStreak(s);
        }
      } catch {}
    })();
  }, []);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  }

  async function handleSubmit() {
    if (!net || !surface || !crowd) {
      Alert.alert('Missing info', 'Please select net status, surface, and crowd level.');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single();

      let photoUrl: string | null = null;
      if (photoUri && user) {
        const ext = photoUri.split('.').pop() ?? 'jpg';
        const path = `court-conditions/${courtId}/${Date.now()}.${ext}`;
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const { error } = await supabase.storage.from('court-photos').upload(path, blob);
        if (!error) {
          const { data } = supabase.storage.from('court-photos').getPublicUrl(path);
          photoUrl = data.publicUrl;
        }
      }

      await supabase.from('court_conditions').insert({
        court_id: courtId,
        reported_by: user?.id,
        net_status: net,
        surface_condition: surface,
        crowd_level: crowd,
        photo_url: photoUrl,
      });

      const newCount = reportCount + 1;
      const prevBadge = getScoutBadge(reportCount);
      const newBadge = getScoutBadge(newCount);
      const unlockedNew = newBadge && (!prevBadge || newBadge.label !== prevBadge.label);

      Alert.alert(
        unlockedNew ? `🏅 ${newBadge!.label} UNLOCKED!` : 'Report Submitted!',
        unlockedNew
          ? `You've reached ${newCount} reports and earned the ${newBadge!.label} badge. The court thanks you.`
          : `Report #${newCount} logged. ${newBadge ? `${newBadge.next - newCount} more to reach ${getNextLabel(newBadge.label)}.` : 'Keep it up!'}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  const badge = getScoutBadge(reportCount);
  const progressToNext = badge ? Math.min((reportCount - getBadgeMin(badge.label)) / (badge.next - getBadgeMin(badge.label)), 1) : reportCount / 1;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── SCOUT INCENTIVE BANNER ── */}
      <View style={styles.incentiveCard}>
        <View style={styles.incentiveLeft}>
          {badge ? (
            <>
              <View style={[styles.badgePill, { borderColor: badge.color, backgroundColor: `${badge.color}15` }]}>
                <Ionicons name="ribbon" size={12} color={badge.color} />
                <Text style={[styles.badgePillText, { color: badge.color }]}>{badge.label}</Text>
              </View>
              <Text style={styles.reportCountText}>{reportCount} <Text style={styles.reportCountSub}>REPORTS</Text></Text>
              {badge.next < Infinity && (
                <View style={styles.progressBarWrap}>
                  <View style={[styles.progressBarFill, { width: `${progressToNext * 100}%` as any, backgroundColor: badge.color }]} />
                </View>
              )}
              {badge.next < Infinity && (
                <Text style={styles.progressLabel}>{badge.next - reportCount} more to next badge</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.noBadgeTitle}>EARN YOUR BADGE</Text>
              <Text style={styles.noBadgeSub}>Submit your first report to unlock Spotter status and build court cred.</Text>
            </>
          )}
        </View>

        {streak > 1 && (
          <View style={styles.streakBlock}>
            <Text style={styles.streakNum}>{streak}</Text>
            <Text style={styles.streakLabel}>DAY{'\n'}STREAK</Text>
            <Ionicons name="flame" size={14} color={Colors.secondary} />
          </View>
        )}
      </View>

      <Text style={styles.title}>REPORT CONDITIONS</Text>
      <Text style={styles.subtitle}>{courtName}</Text>

      {/* Net Status */}
      <Text style={styles.label}>NET STATUS</Text>
      <View style={styles.chipRow}>
        {(['Up', 'Down', 'Torn'] as NetStatus[]).map((v) => (
          <Chip key={v} label={v} active={net === v} onPress={() => setNet(v)}
            color={v === 'Up' ? Colors.success : v === 'Down' ? Colors.error : Colors.warning} />
        ))}
      </View>

      {/* Surface */}
      <Text style={styles.label}>SURFACE CONDITION</Text>
      <View style={styles.chipRow}>
        {(['Dry', 'Wet', 'Damaged'] as SurfaceCondition[]).map((v) => (
          <Chip key={v} label={v} active={surface === v} onPress={() => setSurface(v)}
            color={v === 'Dry' ? Colors.success : v === 'Wet' ? Colors.warning : Colors.error} />
        ))}
      </View>

      {/* Crowd */}
      <Text style={styles.label}>CROWD LEVEL</Text>
      <View style={styles.chipRow}>
        {(['Empty', 'Light', 'Moderate', 'Packed'] as CrowdLevel[]).map((v) => (
          <Chip key={v} label={v} active={crowd === v} onPress={() => setCrowd(v)}
            color={v === 'Empty' ? Colors.textMuted : v === 'Light' ? Colors.success : v === 'Moderate' ? Colors.warning : Colors.error} />
        ))}
      </View>

      {/* Photo */}
      <Text style={styles.label}>PHOTO (OPTIONAL)</Text>
      <TouchableOpacity style={styles.photoArea} onPress={pickPhoto}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera" size={28} color={Colors.textMuted} />
            <Text style={styles.photoPlaceholderText}>Add a photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.submitButton, (!net || !surface || !crowd) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading || !net || !surface || !crowd}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>SUBMIT REPORT</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

function getBadgeMin(label: string): number {
  if (label === 'COURT EXPERT') return 25;
  if (label === 'SCOUT PRO') return 10;
  if (label === 'SCOUT') return 5;
  return 1;
}

function getNextLabel(label: string): string {
  if (label === 'SPOTTER') return 'Scout';
  if (label === 'SCOUT') return 'Scout Pro';
  if (label === 'SCOUT PRO') return 'Court Expert';
  return '';
}

function Chip({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color: string }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && { backgroundColor: `${color}20`, borderColor: color }]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: 40 },

  // Incentive banner
  incentiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  incentiveLeft: { flex: 1, gap: 6 },
  badgePill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', borderWidth: 1, borderRadius: 2, paddingHorizontal: 8, paddingVertical: 3 },
  badgePillText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, letterSpacing: 1.5 },
  reportCountText: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: '#fff', lineHeight: 28 },
  reportCountSub: { fontSize: 14, color: Colors.textMuted },
  progressBarWrap: { height: 3, backgroundColor: '#1A1A1A', borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: 3, borderRadius: 2 },
  progressLabel: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  noBadgeTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 20, color: '#fff', letterSpacing: 1 },
  noBadgeSub: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 18 },
  streakBlock: { alignItems: 'center', gap: 2, paddingLeft: Spacing.md, borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.08)' },
  streakNum: { fontFamily: 'BebasNeue_400Regular', fontSize: 32, color: Colors.secondary, lineHeight: 32, textShadowColor: Colors.secondary, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  streakLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, color: Colors.textMuted, letterSpacing: 1, textAlign: 'center' },

  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: Colors.textPrimary, letterSpacing: 2 },
  subtitle: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textMuted, marginBottom: Spacing.xl },
  label: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm, marginTop: Spacing.md },
  chipRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: 2, borderWidth: 1.5, borderColor: Colors.border, flex: 1, alignItems: 'center' },
  chipText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.textMuted },
  photoArea: { marginTop: Spacing.sm, borderRadius: 2, overflow: 'hidden', height: 160 },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 2, height: 160 },
  photoPlaceholderText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted },
  submitButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: 2, alignItems: 'center', marginTop: Spacing.xl, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12 },
  submitButtonDisabled: { opacity: 0.4 },
  submitButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.xl, color: '#fff', letterSpacing: 2 },
});

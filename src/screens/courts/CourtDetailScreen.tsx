import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { getJCWeather } from '@/lib/weather';
import { Court, CourtCondition, Game, WeatherData } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius, Shadow } from '@/theme';
import { GameCard } from '@/components/common/GameCard';
import { useRealtime } from '@/hooks/useRealtime';
import { CourtsStackParamList } from '@/navigation/MainNavigator';

type Nav = NativeStackNavigationProp<CourtsStackParamList, 'CourtDetail'>;
type Route = RouteProp<CourtsStackParamList, 'CourtDetail'>;

export function CourtDetailScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { courtId } = route.params;

  const [court, setCourt] = useState<Court | null>(null);
  const [conditions, setConditions] = useState<CourtCondition[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [checkinCount, setCheckinCount] = useState(0);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    let userId: string | null = null;

    if (session?.user) {
      const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single();
      userId = user?.id ?? null;
      setCurrentUserId(userId);
    }

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);

    const [courtRes, condRes, gamesRes, checkinsRes, todayCheckinsRes, weatherData] = await Promise.all([
      supabase.from('courts').select('*').eq('id', courtId).single(),
      supabase.from('court_conditions').select('*, reporter:users(display_name, avatar_url)').eq('court_id', courtId).order('created_at', { ascending: false }).limit(10),
      supabase.from('games').select('*, court:courts(*), host:users(*), game_players(count)').eq('court_id', courtId).in('status', ['open', 'full']).gte('scheduled_at', new Date().toISOString()),
      supabase.from('court_checkins').select('user_id').eq('court_id', courtId).gte('created_at', twoHoursAgo),
      userId ? supabase.from('court_checkins').select('id').eq('court_id', courtId).eq('user_id', userId).gte('created_at', todayStart.toISOString()).limit(1) : Promise.resolve({ data: [] }),
      getJCWeather(),
    ]);

    if (courtRes.data) setCourt(courtRes.data);
    if (condRes.data) setConditions(condRes.data);
    if (gamesRes.data) setGames(gamesRes.data.map((g: any) => ({ ...g, player_count: g.game_players?.[0]?.count ?? 0 })));
    setCheckinCount(checkinsRes.data?.length ?? 0);
    setIsCheckedIn((todayCheckinsRes.data?.length ?? 0) > 0);
    setWeather(weatherData);
    setLoading(false);
    setRefreshing(false);
  }, [courtId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useRealtime({
    table: 'court_checkins',
    filter: `court_id=eq.${courtId}`,
    event: 'INSERT',
    onData: () => setCheckinCount((c) => c + 1),
  });

  async function handleCheckin() {
    if (isCheckedIn || !currentUserId) return;
    await supabase.from('court_checkins').insert({ court_id: courtId, user_id: currentUserId });
    setIsCheckedIn(true);
    setCheckinCount((c) => c + 1);
  }

  async function uploadCourtPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !currentUserId) return;
    const uri = result.assets[0].uri;
    const ext = uri.split('.').pop() ?? 'jpg';
    const path = `court-photos/${courtId}/${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error } = await supabase.storage.from('court-photos').upload(path, blob);
    if (!error) {
      const { data } = supabase.storage.from('court-photos').getPublicUrl(path);
      setPhotos((prev) => [data.publicUrl, ...prev]);
    }
  }

  if (loading) {
    return (
      <View style={styles.loader}><ActivityIndicator color={Colors.primary} size="large" /></View>
    );
  }

  if (!court) return null;

  const latestCondition = conditions[0];

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.courtName}>{court.name}</Text>
          <View style={styles.typeBadges}>
            <View style={styles.typeBadge}>
              <Ionicons name={court.is_indoor ? 'home' : 'sunny'} size={12} color={Colors.textMuted} />
              <Text style={styles.typeBadgeText}>{court.is_indoor ? 'Indoor' : 'Outdoor'}</Text>
            </View>
            <Text style={styles.neighborhoodText}>{court.neighborhood}</Text>
          </View>
        </View>

        {/* Live Conditions Panel */}
        <View style={[styles.livePanel, styles.card]}>
          <Text style={styles.sectionTitle}>LIVE CONDITIONS</Text>

          {/* Weather */}
          {weather && (
            <View style={styles.weatherRow}>
              <Text style={styles.weatherTemp}>{weather.temp}°F</Text>
              <Text style={styles.weatherDesc}>{weather.description}</Text>
              <View style={[styles.ballBadge, { backgroundColor: weather.isGoodForBball ? `${Colors.success}20` : `${Colors.error}20` }]}>
                <Text style={[styles.ballBadgeText, { color: weather.isGoodForBball ? Colors.success : Colors.error }]}>
                  {weather.isGoodForBball ? '✓ Good for ball' : '⚠ Rough conditions'}
                </Text>
              </View>
            </View>
          )}

          {/* Checkin count */}
          <View style={styles.checkinRow}>
            <View style={styles.liveDotGreen} />
            <Text style={styles.checkinCountText}>{checkinCount} Players Here Now</Text>
          </View>

          {/* Latest condition report */}
          {latestCondition && (
            <View style={styles.conditionSummary}>
              <ConditionPill label="Net" value={latestCondition.net_status} />
              <ConditionPill label="Surface" value={latestCondition.surface_condition} />
              <ConditionPill label="Crowd" value={latestCondition.crowd_level} />
            </View>
          )}

          <TouchableOpacity
            style={[styles.checkinButton, isCheckedIn && styles.checkinButtonDone]}
            onPress={handleCheckin}
            disabled={isCheckedIn}
          >
            <Ionicons name={isCheckedIn ? 'checkmark-circle' : 'location'} size={16} color="#fff" />
            <Text style={styles.checkinButtonText}>
              {isCheckedIn ? 'CHECKED IN' : 'CHECK IN'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Games */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>GAMES AT THIS COURT</Text>
          {games.length === 0 ? (
            <View style={styles.emptyGames}>
              <Text style={styles.emptyText}>No games scheduled</Text>
            </View>
          ) : (
            games.map((game) => (
              <GameCard
                key={game.id}
                game={game as any}
                onJoin={() => {}}
                onPress={() => {}}
              />
            ))
          )}
        </View>

        {/* Recent Condition Reports */}
        {conditions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECENT REPORTS</Text>
            {conditions.map((c) => (
              <View key={c.id} style={styles.reportRow}>
                <View style={styles.reportLeft}>
                  <Text style={styles.reporterName}>{(c as any).reporter?.display_name ?? 'Anonymous'}</Text>
                  <Text style={styles.reportTime}>{format(new Date(c.created_at), 'MMM d, h:mm a')}</Text>
                </View>
                <View style={styles.reportBadges}>
                  <ConditionPill label="" value={c.net_status} />
                  <ConditionPill label="" value={c.surface_condition} />
                  <ConditionPill label="" value={c.crowd_level} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Photo Gallery */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COURT PHOTOS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoGallery}>
            {photos.map((url, i) => (
              <Image key={i} source={{ uri: url }} style={styles.photo} />
            ))}
            <TouchableOpacity style={styles.addPhotoButton} onPress={uploadCourtPhoto}>
              <Ionicons name="camera" size={24} color={Colors.textMuted} />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </ScrollView>

      {/* FAB - Report Conditions */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('SubmitCondition', { courtId, courtName: court.name })}
      >
        <Ionicons name="flag" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

function ConditionPill({ label, value }: { label: string; value: string }) {
  const color = {
    Up: Colors.success, Down: Colors.error, Torn: Colors.warning,
    Dry: Colors.success, Wet: Colors.warning, Damaged: Colors.error,
    Empty: Colors.textMuted, Light: Colors.success, Moderate: Colors.warning, Packed: Colors.error,
  }[value] ?? Colors.textMuted;

  return (
    <View style={[{ backgroundColor: `${color}20`, borderColor: color }, styles.condPill]}>
      <Text style={[styles.condPillText, { color }]}>{label ? `${label}: ` : ''}{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loader: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  courtName: { fontFamily: 'BebasNeue_400Regular', fontSize: 32, color: Colors.textPrimary, letterSpacing: 1 },
  typeBadges: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: 4 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.card, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  typeBadgeText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  neighborhoodText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted },
  card: { marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary + '40', ...Shadow.lg },
  livePanel: {},
  sectionTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 16, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  weatherTemp: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: Colors.textPrimary },
  weatherDesc: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textSecondary, flex: 1, textTransform: 'capitalize' },
  ballBadge: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  ballBadgeText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs },
  checkinRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  liveDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  checkinCountText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.success },
  conditionSummary: { flexDirection: 'row', gap: Spacing.xs, marginBottom: Spacing.md, flexWrap: 'wrap' },
  condPill: { borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  condPillText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs },
  checkinButton: { backgroundColor: Colors.success, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: 10, borderRadius: BorderRadius.md },
  checkinButtonDone: { backgroundColor: Colors.textMuted },
  checkinButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.lg, color: '#fff', letterSpacing: 1 },
  section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
  emptyGames: { paddingVertical: Spacing.md },
  emptyText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textMuted },
  reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  reportLeft: {},
  reporterName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: Colors.textSecondary },
  reportTime: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  reportBadges: { flexDirection: 'row', gap: 4 },
  photoGallery: { gap: Spacing.sm, paddingVertical: Spacing.xs },
  photo: { width: 120, height: 90, borderRadius: BorderRadius.md },
  addPhotoButton: { width: 120, height: 90, borderRadius: BorderRadius.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  fab: { position: 'absolute', bottom: 24, right: Spacing.md, width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadow.lg },
});

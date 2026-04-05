import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Dimensions,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '@/lib/supabase';
import { getCourtPhoto } from '@/lib/courtPhotos';
import { getNeighborhoodColor } from '@/lib/neighborhoods';
import { Court, Game } from '@/types';
import { Colors, FontSize, Spacing } from '@/theme';
import { CourtsStackParamList } from '@/navigation/MainNavigator';

// react-native-maps is native only — web falls back to list
let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
}

type Nav = NativeStackNavigationProp<CourtsStackParamList, 'Courts'>;

const JC_CENTER = { latitude: 40.7178, longitude: -74.0431 };
const INITIAL_REGION = { ...JC_CENTER, latitudeDelta: 0.045, longitudeDelta: 0.035 };

// Star rating display
function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.round(rating) ? 'star' : 'star-outline'}
          size={11}
          color={i <= Math.round(rating) ? Colors.secondary : Colors.textMuted}
        />
      ))}
      <Text style={{ fontFamily: 'RobotoCondensed_400Regular', fontSize: 10, color: Colors.textMuted, marginLeft: 2 }}>
        ({count})
      </Text>
    </View>
  );
}

// Court bottom sheet / detail card
function CourtSheet({
  court,
  games,
  checkins,
  onClose,
  onViewDetail,
}: {
  court: Court;
  games: Game[];
  checkins: number;
  onClose: () => void;
  onViewDetail: () => void;
}) {
  const nColor = getNeighborhoodColor(court.neighborhood);
  const activeGames = games.filter((g) => g.court_id === court.id);
  const totalGames = activeGames.length;
  const spotsLeft = activeGames.reduce((s, g) => s + (g.max_players - (g.player_count ?? 0)), 0);

  // Simulated star rating (4.1–4.8 range per court, deterministic)
  const rating = 3.5 + ((court.name.length % 6) * 0.25);
  const reviewCount = 12 + (court.name.length % 80);

  return (
    <View style={sheet.container}>
      {/* Drag handle */}
      <View style={sheet.handle} />

      {/* Hero photo */}
      <View style={sheet.photoWrap}>
        <Image source={{ uri: getCourtPhoto(court.name) }} style={sheet.photo} resizeMode="cover" />
        <View style={sheet.photoScrim} />
        <View style={sheet.photoContent}>
          <View style={[sheet.neighborhoodBadge, { backgroundColor: nColor + '25', borderColor: nColor }]}>
            <Text style={[sheet.neighborhoodText, { color: nColor }]}>{court.neighborhood.toUpperCase()}</Text>
          </View>
          <Text style={sheet.courtName}>{court.name}</Text>
          <StarRating rating={rating} count={reviewCount} />
        </View>
        <TouchableOpacity style={sheet.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* Live stats */}
      <View style={sheet.statsRow}>
        <View style={sheet.statBlock}>
          <Text style={sheet.statNum}>{checkins}</Text>
          <Text style={sheet.statLabel}>HERE NOW</Text>
        </View>
        <View style={sheet.statDivider} />
        <View style={sheet.statBlock}>
          <Text style={[sheet.statNum, { color: totalGames > 0 ? Colors.primary : Colors.textMuted }]}>{totalGames}</Text>
          <Text style={sheet.statLabel}>ACTIVE GAMES</Text>
        </View>
        <View style={sheet.statDivider} />
        <View style={sheet.statBlock}>
          <Text style={sheet.statNum}>{spotsLeft}</Text>
          <Text style={sheet.statLabel}>SPOTS OPEN</Text>
        </View>
      </View>

      {/* Court info chips */}
      <View style={sheet.chips}>
        <View style={sheet.chip}>
          <Ionicons name={court.is_indoor ? 'home-outline' : 'sunny-outline'} size={10} color={Colors.textMuted} />
          <Text style={sheet.chipText}>{court.is_indoor ? 'INDOOR' : 'OUTDOOR'}</Text>
        </View>
        {court.has_lighting && (
          <View style={sheet.chip}>
            <Ionicons name="flashlight-outline" size={10} color={Colors.secondary} />
            <Text style={[sheet.chipText, { color: Colors.secondary }]}>NIGHT COURT</Text>
          </View>
        )}
        {court.surface_type && (
          <View style={sheet.chip}>
            <Text style={sheet.chipText}>{court.surface_type.toUpperCase()}</Text>
          </View>
        )}
      </View>

      {/* Leaderboard preview */}
      <View style={sheet.leaderboardSection}>
        <Text style={sheet.sectionLabel}>COURT LEADERBOARDS</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sheet.leaderboardScroll}>
          {['1v1', '3v3', '5v5', '21'].map((format) => (
            <View key={format} style={sheet.leaderboardCard}>
              <Text style={sheet.leaderboardFormat}>{format}</Text>
              <Text style={sheet.leaderboardEmpty}>—</Text>
              <Text style={sheet.leaderboardSub}>Play a {format} to rank</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Active games */}
      {activeGames.length > 0 && (
        <View style={sheet.gamesSection}>
          <Text style={sheet.sectionLabel}>ACTIVE GAMES</Text>
          {activeGames.slice(0, 2).map((g) => (
            <View key={g.id} style={sheet.gameRow}>
              <View style={[sheet.gameFormat, { borderColor: Colors.primary, backgroundColor: Colors.primary + '15' }]}>
                <Text style={[sheet.gameFormatText, { color: Colors.primary }]}>{g.format}</Text>
              </View>
              <Text style={sheet.gameSpots}>{g.player_count ?? 0}/{g.max_players} players</Text>
              <View style={[sheet.gameStatus, { backgroundColor: g.status === 'open' ? Colors.success + '20' : Colors.error + '20' }]}>
                <Text style={[sheet.gameStatusText, { color: g.status === 'open' ? Colors.success : Colors.error }]}>
                  {g.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* CTA */}
      <TouchableOpacity style={sheet.cta} onPress={onViewDetail}>
        <Text style={sheet.ctaText}>VIEW FULL COURT PAGE →</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main MapScreen ─────────────────────────────────────────────────────────

export function MapScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [courts, setCourts] = useState<Court[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [courtActivity, setCourtActivity] = useState<Record<string, number>>({});
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(true);
  const [listView, setListView] = useState(Platform.OS === 'web');

  const fetchData = useCallback(async () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const [courtsRes, gamesRes, checkinsRes] = await Promise.all([
      supabase.from('courts').select('*'),
      supabase
        .from('games')
        .select('*, game_players(count)')
        .in('status', ['open', 'full'])
        .gte('scheduled_at', new Date().toISOString()),
      supabase.from('court_checkins').select('court_id').gte('created_at', twoHoursAgo),
    ]);

    if (courtsRes.data) setCourts(courtsRes.data);
    if (gamesRes.data) {
      setGames(gamesRes.data.map((g: any) => ({ ...g, player_count: g.game_players?.[0]?.count ?? 0 })));
    }
    if (checkinsRes.data) {
      const counts: Record<string, number> = {};
      for (const c of checkinsRes.data) counts[c.court_id] = (counts[c.court_id] ?? 0) + 1;
      setCourtActivity(counts);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function getMarkerColor(courtId: string) {
    if (games.some((g) => g.court_id === courtId)) return Colors.primary;
    if ((courtActivity[courtId] ?? 0) >= 2) return Colors.secondary;
    return Colors.textMuted;
  }

  function getCourtStatus(courtId: string) {
    const hasGame = games.some((g) => g.court_id === courtId);
    const checkins = courtActivity[courtId] ?? 0;
    if (hasGame) return { color: Colors.primary, label: 'GAME ON' };
    if (checkins >= 2) return { color: Colors.secondary, label: `${checkins} HERE` };
    return { color: Colors.textMuted, label: 'QUIET' };
  }

  if (loading) {
    return (
      <View style={[styles.loader, { paddingTop: insets.top }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  // ── WEB: List fallback ──────────────────────────────────────────
  if (listView) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>COURTS</Text>
          <View style={styles.headerRight}>
            <View style={styles.livePill}>
              <View style={[styles.liveDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.liveLabel}>{courts.length} SPOTS</Text>
            </View>
          </View>
        </View>

        <FlatList
          data={courts}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40, gap: 10 }}
          renderItem={({ item }) => {
            const { color, label } = getCourtStatus(item.id);
            const nColor = getNeighborhoodColor(item.neighborhood);
            const rating = 3.5 + ((item.name.length % 6) * 0.25);
            return (
              <TouchableOpacity
                style={[styles.listCard, { borderLeftColor: color, borderLeftWidth: 3 }]}
                onPress={() => navigation.navigate('CourtDetail', { courtId: item.id })}
                activeOpacity={0.75}
              >
                <Image source={{ uri: getCourtPhoto(item.name) }} style={styles.listThumb} resizeMode="cover" />
                <View style={styles.listBody}>
                  <Text style={styles.listCourtName}>{item.name}</Text>
                  <StarRating rating={rating} count={12 + (item.name.length % 80)} />
                  <Text style={styles.listMeta}>{item.neighborhood} · {item.is_indoor ? 'Indoor' : 'Outdoor'}</Text>
                  <View style={styles.listFooter}>
                    <View style={[styles.listBadge, { borderColor: color, backgroundColor: color + '15' }]}>
                      <View style={[styles.listBadgeDot, { backgroundColor: color }]} />
                      <Text style={[styles.listBadgeText, { color }]}>{label}</Text>
                    </View>
                    {(courtActivity[item.id] ?? 0) > 0 && (
                      <Text style={styles.listCheckins}>{courtActivity[item.id]} here</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  }

  // ── NATIVE: Map view ──────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={INITIAL_REGION}
        customMapStyle={darkMapStyle}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={() => setSelectedCourt(null)}
      >
        {courts.map((court) => {
          if (!court.lat || !court.lng) return null;
          const markerColor = getMarkerColor(court.id);
          const isSelected = selectedCourt?.id === court.id;
          return (
            <Marker
              key={court.id}
              coordinate={{ latitude: court.lat, longitude: court.lng }}
              onPress={() => setSelectedCourt(court)}
            >
              <View style={[
                styles.markerWrap,
                { borderColor: markerColor, shadowColor: markerColor },
                isSelected && styles.markerWrapSelected,
              ]}>
                <Ionicons name="basketball" size={isSelected ? 18 : 13} color={markerColor} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Top header overlay */}
      <View style={[styles.mapHeader, { paddingTop: insets.top + 8 }]}>
        <View style={styles.mapHeaderCard}>
          <Text style={styles.mapTitle}>COURTS</Text>
          <View style={styles.mapLegend}>
            <View style={styles.mapLegendItem}>
              <View style={[styles.mapLegendDot, { backgroundColor: Colors.primary }]} />
              <Text style={styles.mapLegendLabel}>GAME</Text>
            </View>
            <View style={styles.mapLegendItem}>
              <View style={[styles.mapLegendDot, { backgroundColor: Colors.secondary }]} />
              <Text style={styles.mapLegendLabel}>ACTIVE</Text>
            </View>
            <View style={styles.mapLegendItem}>
              <View style={[styles.mapLegendDot, { backgroundColor: Colors.textMuted }]} />
              <Text style={styles.mapLegendLabel}>QUIET</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Court detail sheet */}
      {selectedCourt && (
        <View style={styles.sheetOuter}>
          <CourtSheet
            court={selectedCourt}
            games={games}
            checkins={courtActivity[selectedCourt.id] ?? 0}
            onClose={() => setSelectedCourt(null)}
            onViewDetail={() => {
              setSelectedCourt(null);
              navigation.navigate('CourtDetail', { courtId: selectedCourt.id });
            }}
          />
        </View>
      )}
    </View>
  );
}

// Dark map style (Google Maps)
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#555' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#000' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212121' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1c1c1c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#000d14' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

// ── Court sheet styles ────────────────────────────────────────────────────

const sheet = StyleSheet.create({
  container: { backgroundColor: '#070707', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'center', marginTop: 8, marginBottom: 0 },
  photoWrap: { height: 150, position: 'relative' },
  photo: { width: '100%', height: '100%' },
  photoScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  photoContent: { position: 'absolute', bottom: 12, left: 14, gap: 4 },
  neighborhoodBadge: { alignSelf: 'flex-start', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  neighborhoodText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, letterSpacing: 1.5 },
  courtName: { fontFamily: 'BebasNeue_400Regular', fontSize: 26, color: '#fff', letterSpacing: 1 },
  closeBtn: { position: 'absolute', top: 10, right: 10, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  statBlock: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  statNum: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: '#fff' },
  statLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, color: Colors.textMuted, letterSpacing: 1.5, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 8 },
  chips: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.md, paddingVertical: 10, flexWrap: 'wrap' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2 },
  chipText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, color: Colors.textMuted, letterSpacing: 1 },
  leaderboardSection: { paddingHorizontal: Spacing.md, paddingTop: 4, paddingBottom: 10 },
  sectionLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: Colors.textMuted, letterSpacing: 2.5, marginBottom: 8 },
  leaderboardScroll: { gap: 8 },
  leaderboardCard: { width: 90, backgroundColor: '#0F0F0F', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 10, borderRadius: 2, alignItems: 'center', gap: 3 },
  leaderboardFormat: { fontFamily: 'BebasNeue_400Regular', fontSize: 18, color: Colors.primary },
  leaderboardEmpty: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: 'rgba(255,255,255,0.2)' },
  leaderboardSub: { fontFamily: 'RobotoCondensed_400Regular', fontSize: 8, color: Colors.textMuted, textAlign: 'center' },
  gamesSection: { paddingHorizontal: Spacing.md, paddingBottom: 10 },
  gameRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  gameFormat: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  gameFormatText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 10 },
  gameSpots: { flex: 1, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textSecondary },
  gameStatus: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  gameStatusText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 8 },
  cta: {
    margin: Spacing.md, marginTop: 4,
    backgroundColor: Colors.primary,
    paddingVertical: 14, borderRadius: 2, alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12,
  },
  ctaText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.xl, color: '#fff', letterSpacing: 1 },
});

// ── MapScreen outer styles ────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loader: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },

  // Map overlay header
  mapHeader: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: Spacing.md, paddingBottom: 8 },
  mapHeaderCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 2,
  },
  mapTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 20, color: '#fff', letterSpacing: 2 },
  mapLegend: { flexDirection: 'row', gap: 12 },
  mapLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  mapLegendDot: { width: 7, height: 7, borderRadius: 4 },
  mapLegendLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, color: Colors.textMuted, letterSpacing: 1 },

  // Map markers
  markerWrap: {
    width: 30, height: 30, borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 10,
  },
  markerWrapSelected: { width: 38, height: 38, borderWidth: 2 },

  // Court sheet container
  sheetOuter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.5, shadowRadius: 20,
  },

  // Web list fallback
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  headerTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: '#fff', letterSpacing: 2 },
  headerRight: { flexDirection: 'row', gap: 10 },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: Colors.textMuted, letterSpacing: 1.5 },
  listCard: {
    flexDirection: 'row', backgroundColor: '#080808',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 2, overflow: 'hidden',
  },
  listThumb: { width: 90, height: 80 },
  listBody: { flex: 1, padding: 10, gap: 4, justifyContent: 'center' },
  listCourtName: { fontFamily: 'BebasNeue_400Regular', fontSize: 18, color: '#fff', letterSpacing: 0.5 },
  listMeta: { fontFamily: 'RobotoCondensed_400Regular', fontSize: 10, color: Colors.textMuted },
  listFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  listBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
  listBadgeDot: { width: 4, height: 4, borderRadius: 2 },
  listBadgeText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 8, letterSpacing: 1 },
  listCheckins: { fontFamily: 'RobotoCondensed_400Regular', fontSize: 10, color: Colors.textMuted },
});

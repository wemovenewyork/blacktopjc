import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';

type AdminTab = 'users' | 'courts' | 'games' | 'crews';

export function AdminScreen() {
  const [tab, setTab] = useState<AdminTab>('users');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsAdmin(false); return; }
      const { data } = await supabase.from('users').select('is_admin').eq('auth_id', session.user.id).single();
      setIsAdmin(data?.is_admin ?? false);
    })();
  }, []);

  if (isAdmin === null) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;
  if (!isAdmin) return (
    <View style={styles.center}>
      <Ionicons name="lock-closed" size={48} color={Colors.textMuted} />
      <Text style={styles.deniedText}>Admin access required</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {(['users', 'courts', 'games', 'crews'] as AdminTab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'users'  && <UsersTab />}
      {tab === 'courts' && <CourtsTab />}
      {tab === 'games'  && <GamesTab />}
      {tab === 'crews'  && <CrewsTab />}
    </View>
  );
}

// ─── USERS TAB ───────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function togglePro(user: any) {
    await supabase.from('users').update({ is_pro: !user.is_pro }).eq('id', user.id);
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_pro: !u.is_pro } : u));
  }

  async function toggleAdmin(user: any) {
    await supabase.from('users').update({ is_admin: !user.is_admin }).eq('id', user.id);
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_admin: !u.is_admin } : u));
  }

  async function resetElo(user: any) {
    Alert.alert('Reset ELO', `Reset ${user.display_name}'s ELO to 1000?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        await supabase.from('users').update({ elo_rating: 1000, games_until_rated: 3 }).eq('id', user.id);
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, elo_rating: 1000 } : u));
      }},
    ]);
  }

  async function deleteUser(user: any) {
    Alert.alert('Delete User', `Permanently delete ${user.display_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('users').delete().eq('id', user.id);
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
      }},
    ]);
  }

  const filtered = search ? users.filter((u) => u.display_name?.toLowerCase().includes(search.toLowerCase())) : users;

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
    >
      <TextInput
        style={styles.searchInput}
        placeholder="Search users..."
        placeholderTextColor={Colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />
      <Text style={styles.countLabel}>{filtered.length} users</Text>
      {filtered.map((user) => (
        <View key={user.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{user.display_name}</Text>
            <View style={styles.badgeRow}>
              {user.is_pro && <View style={styles.proBadge}><Text style={styles.proBadgeText}>PRO</Text></View>}
              {user.is_admin && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>}
            </View>
          </View>
          <Text style={styles.cardMeta}>
            ELO: {user.elo_rating} · {user.total_games} games · {user.neighborhood ?? 'No neighborhood'}
          </Text>
          <Text style={styles.cardMeta}>Joined {user.created_at ? format(new Date(user.created_at), 'MMM d, yyyy') : '—'}</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => togglePro(user)}>
              <Text style={styles.actionBtnText}>{user.is_pro ? 'Remove Pro' : 'Grant Pro'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => toggleAdmin(user)}>
              <Text style={styles.actionBtnText}>{user.is_admin ? 'Remove Admin' : 'Make Admin'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => resetElo(user)}>
              <Text style={styles.actionBtnText}>Reset ELO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => deleteUser(user)}>
              <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── COURTS TAB ──────────────────────────────────────────────

function CourtsTab() {
  const [courts, setCourts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', neighborhood: '', lat: '', lng: '', surface_type: 'asphalt', has_lighting: false, is_indoor: false });

  const load = useCallback(async () => {
    const { data } = await supabase.from('courts').select('*').order('name');
    if (data) setCourts(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addCourt() {
    if (!form.name.trim() || !form.lat || !form.lng) { Alert.alert('Name, lat, and lng are required'); return; }
    const { data, error } = await supabase.from('courts').insert({
      name: form.name.trim(),
      neighborhood: form.neighborhood.trim(),
      lat: parseFloat(form.lat),
      lng: parseFloat(form.lng),
      surface_type: form.surface_type,
      has_lighting: form.has_lighting,
      is_indoor: form.is_indoor,
    }).select().single();
    if (error) { Alert.alert('Error', error.message); return; }
    setCourts((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setAdding(false);
    setForm({ name: '', neighborhood: '', lat: '', lng: '', surface_type: 'asphalt', has_lighting: false, is_indoor: false });
  }

  async function deleteCourt(court: any) {
    Alert.alert('Delete Court', `Delete ${court.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('courts').delete().eq('id', court.id);
        setCourts((prev) => prev.filter((c) => c.id !== court.id));
      }},
    ]);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
    >
      <TouchableOpacity style={styles.addButton} onPress={() => setAdding(!adding)}>
        <Ionicons name={adding ? 'close' : 'add'} size={18} color="#fff" />
        <Text style={styles.addButtonText}>{adding ? 'CANCEL' : 'ADD COURT'}</Text>
      </TouchableOpacity>

      {adding && (
        <View style={styles.formCard}>
          <Text style={styles.formLabel}>COURT NAME *</Text>
          <TextInput style={styles.formInput} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholderTextColor={Colors.textMuted} placeholder="e.g. Lincoln Park Court 1" />
          <Text style={styles.formLabel}>NEIGHBORHOOD</Text>
          <TextInput style={styles.formInput} value={form.neighborhood} onChangeText={(v) => setForm({ ...form, neighborhood: v })} placeholderTextColor={Colors.textMuted} placeholder="e.g. West Side" />
          <View style={styles.formRow}>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>LATITUDE *</Text>
              <TextInput style={styles.formInput} value={form.lat} onChangeText={(v) => setForm({ ...form, lat: v })} placeholderTextColor={Colors.textMuted} placeholder="40.7178" keyboardType="decimal-pad" />
            </View>
            <View style={styles.formHalf}>
              <Text style={styles.formLabel}>LONGITUDE *</Text>
              <TextInput style={styles.formInput} value={form.lng} onChangeText={(v) => setForm({ ...form, lng: v })} placeholderTextColor={Colors.textMuted} placeholder="-74.0776" keyboardType="decimal-pad" />
            </View>
          </View>
          <View style={styles.toggleRow}>
            <TouchableOpacity style={[styles.toggleBtn, form.has_lighting && styles.toggleBtnOn]} onPress={() => setForm({ ...form, has_lighting: !form.has_lighting })}>
              <Text style={styles.toggleBtnText}>Lighting</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toggleBtn, form.is_indoor && styles.toggleBtnOn]} onPress={() => setForm({ ...form, is_indoor: !form.is_indoor })}>
              <Text style={styles.toggleBtnText}>Indoor</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.submitBtn} onPress={addCourt}>
            <Text style={styles.submitBtnText}>ADD COURT</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.countLabel}>{courts.length} courts</Text>
      {courts.map((court) => (
        <View key={court.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{court.name}</Text>
            <TouchableOpacity onPress={() => deleteCourt(court)}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardMeta}>
            {court.neighborhood} · {court.surface_type} · {court.is_indoor ? 'Indoor' : 'Outdoor'} · {court.has_lighting ? 'Lit' : 'No lighting'}
          </Text>
          <Text style={styles.cardMeta}>{court.lat}, {court.lng}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── GAMES TAB ───────────────────────────────────────────────

function GamesTab() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'completed' | 'cancelled'>('all');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('games')
      .select('*, court:courts(name), host:users(display_name)')
      .order('scheduled_at', { ascending: false });
    if (data) setGames(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function cancelGame(game: any) {
    Alert.alert('Cancel Game', `Cancel this game at ${(game.court as any)?.name}?`, [
      { text: 'Back', style: 'cancel' },
      { text: 'Cancel Game', style: 'destructive', onPress: async () => {
        await supabase.from('games').update({ status: 'cancelled' }).eq('id', game.id);
        setGames((prev) => prev.map((g) => g.id === game.id ? { ...g, status: 'cancelled' } : g));
      }},
    ]);
  }

  async function deleteGame(game: any) {
    Alert.alert('Delete Game', 'Permanently delete this game?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('games').delete().eq('id', game.id);
        setGames((prev) => prev.filter((g) => g.id !== game.id));
      }},
    ]);
  }

  const filtered = filter === 'all' ? games : games.filter((g) => g.status === filter);
  const statusColor = (s: string) => ({ open: Colors.success, full: Colors.warning, completed: Colors.textMuted, cancelled: Colors.error }[s] ?? Colors.textMuted);

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
    >
      <View style={styles.filterRow}>
        {(['all', 'open', 'completed', 'cancelled'] as const).map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>{f.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.countLabel}>{filtered.length} games</Text>
      {filtered.map((game) => (
        <View key={game.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{(game.court as any)?.name ?? '—'}</Text>
            <View style={[styles.statusDot, { backgroundColor: statusColor(game.status) }]} />
          </View>
          <Text style={styles.cardMeta}>
            {game.format} · {game.elo_band} · Host: {(game.host as any)?.display_name ?? '—'}
          </Text>
          <Text style={styles.cardMeta}>{game.scheduled_at ? format(new Date(game.scheduled_at), 'MMM d, yyyy h:mm a') : '—'}</Text>
          <View style={styles.actionRow}>
            {game.status === 'open' && (
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => cancelGame(game)}>
                <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Cancel Game</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => deleteGame(game)}>
              <Text style={[styles.actionBtnText, styles.actionBtnTextDanger]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── CREWS TAB ───────────────────────────────────────────────

function CrewsTab() {
  const [crews, setCrews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('crews')
      .select('*, home_court:courts(name), crew_members(count)')
      .order('rep_score', { ascending: false });
    if (data) setCrews(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteCrew(crew: any) {
    Alert.alert('Delete Crew', `Delete "${crew.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        await supabase.from('crews').delete().eq('id', crew.id);
        setCrews((prev) => prev.filter((c) => c.id !== crew.id));
      }},
    ]);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color={Colors.primary} /></View>;

  return (
    <ScrollView
      style={styles.tabContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
    >
      <Text style={styles.countLabel}>{crews.length} crews</Text>
      {crews.map((crew) => (
        <View key={crew.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.crewNameRow}>
              <View style={[styles.crewDot, { backgroundColor: crew.color_hex }]} />
              <Text style={styles.cardTitle}>{crew.name}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteCrew(crew)}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardMeta}>
            {crew.wins}W-{crew.losses}L · Rep: {crew.rep_score?.toFixed(0)} · {crew.crew_members?.[0]?.count ?? 0} members
          </Text>
          <Text style={styles.cardMeta}>Home: {(crew.home_court as any)?.name ?? 'None'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── STYLES ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, gap: Spacing.md },
  deniedText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textMuted },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  tabBtnText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 10, color: Colors.textMuted, letterSpacing: 1 },
  tabBtnTextActive: { color: Colors.primary },
  tabContent: { flex: 1, padding: Spacing.md },
  countLabel: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm },
  searchInput: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textPrimary, marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.textPrimary, flex: 1 },
  cardMeta: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 4 },
  proBadge: { backgroundColor: `${Colors.secondary}20`, borderRadius: BorderRadius.full, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: Colors.secondary },
  proBadgeText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: Colors.secondary },
  adminBadge: { backgroundColor: `${Colors.primary}20`, borderRadius: BorderRadius.full, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: Colors.primary },
  adminBadgeText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: Colors.primary },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.background },
  actionBtnDanger: { borderColor: Colors.error },
  actionBtnText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 11, color: Colors.textMuted },
  actionBtnTextDanger: { color: Colors.error },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 10, paddingHorizontal: Spacing.md, marginBottom: Spacing.md, alignSelf: 'flex-start' },
  addButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.md, color: '#fff', letterSpacing: 1 },
  formCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md, marginBottom: Spacing.md },
  formLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1, marginBottom: 4, marginTop: Spacing.sm },
  formInput: { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 8, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textPrimary },
  formRow: { flexDirection: 'row', gap: Spacing.sm },
  formHalf: { flex: 1 },
  toggleRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: BorderRadius.sm, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  toggleBtnOn: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  toggleBtnText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textPrimary },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 12, alignItems: 'center', marginTop: Spacing.md },
  submitBtnText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.lg, color: '#fff', letterSpacing: 1 },
  filterRow: { flexDirection: 'row', gap: 4, marginBottom: Spacing.sm },
  filterBtn: { flex: 1, paddingVertical: 6, borderRadius: BorderRadius.full, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  filterBtnActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  filterBtnText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: 9, color: Colors.textMuted },
  filterBtnTextActive: { color: Colors.primary },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  crewNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  crewDot: { width: 12, height: 12, borderRadius: 6 },
});

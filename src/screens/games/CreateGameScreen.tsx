import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { format, addDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Court, Format, EloBand } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';
import { getGameWebLink } from '@/lib/sharing';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FORMATS: Format[] = ['3v3', '5v5', '21', 'Open'];
const ELO_BANDS: EloBand[] = ['Unrated', 'Beginner', 'Intermediate', 'Advanced', 'Elite'];
const QUICK_DATES = [
  { label: 'Today', date: new Date() },
  { label: 'Tomorrow', date: addDays(new Date(), 1) },
  { label: 'In 2 Days', date: addDays(new Date(), 2) },
  { label: 'In 3 Days', date: addDays(new Date(), 3) },
];
const QUICK_TIMES = ['6:00 AM', '9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM', '8:00 PM'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function CreateGameScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const [courts, setCourts] = useState<Court[]>([]);
  const [courtSearch, setCourtSearch] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [selectedDate, setSelectedDate] = useState(QUICK_DATES[0].date);
  const [selectedTime, setSelectedTime] = useState('6:00 PM');
  const [format_, setFormat] = useState<Format>('5v5');
  const [eloBand, setEloBand] = useState<EloBand>('Intermediate');
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'weekly' | 'biweekly'>('weekly');
  const [recurringDays, setRecurringDays] = useState<string[]>([]);
  const [isWomensOnly, setIsWomensOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createdGame, setCreatedGame] = useState<any>(null);
  const [step, setStep] = useState<'form' | 'share'>('form');

  useEffect(() => {
    supabase.from('courts').select('*').order('name').then(({ data }) => {
      if (data) setCourts(data);
    });
  }, []);

  const filteredCourts = courtSearch
    ? courts.filter((c) => c.name.toLowerCase().includes(courtSearch.toLowerCase()))
    : courts;

  function parseScheduledAt(): string {
    const base = new Date(selectedDate);
    const [time, meridiem] = selectedTime.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    base.setHours(hours, minutes, 0, 0);
    return base.toISOString();
  }

  async function handleCreate() {
    if (!selectedCourt) { Alert.alert('Select a court first'); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single();
      if (!user) throw new Error('No user profile');

      const { data: game, error } = await supabase
        .from('games')
        .insert({
          court_id: selectedCourt.id,
          host_id: user.id,
          format: format_,
          elo_band: eloBand,
          max_players: maxPlayers,
          scheduled_at: parseScheduledAt(),
          is_recurring: isRecurring,
          recurrence_pattern: isRecurring ? recurrencePattern : null,
          description: description.trim() || null,
          is_womens_only: isWomensOnly,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join as host
      await supabase.from('game_players').insert({ game_id: game.id, user_id: user.id, rsvp_status: 'in' });

      setCreatedGame(game);
      setStep('share');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    const link = getGameWebLink(createdGame.share_token);
    await Share.share({
      message: `🏀 Join my pickup run!\n\n${format_} @ ${selectedCourt?.name}\n${format(new Date(createdGame.scheduled_at), 'EEE MMM d, h:mm a')}\nELO: ${eloBand}\n\n${link}`,
      url: link,
    });
  }

  if (step === 'share' && createdGame) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.shareScreen}>
          <Ionicons name="checkmark-circle" size={72} color={Colors.success} />
          <Text style={styles.shareTitle}>YOUR RUN IS LIVE!</Text>
          <Text style={styles.shareSubtitle}>
            {format_} @ {selectedCourt?.name}
          </Text>
          <Text style={styles.shareTime}>
            {format(new Date(createdGame.scheduled_at), 'EEEE, MMMM d · h:mm a')}
          </Text>

          <View style={styles.linkBox}>
            <Text style={styles.linkText} numberOfLines={1}>
              {getGameWebLink(createdGame.share_token)}
            </Text>
          </View>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-social" size={18} color="#fff" />
            <Text style={styles.shareButtonText}>SHARE THIS RUN</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewGameButton}
            onPress={() => {
              setStep('form');
              navigation.navigate('HomeTab', { screen: 'GameDetail', params: { gameId: createdGame.id } });
            }}
          >
            <Text style={styles.viewGameText}>VIEW GAME</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>CREATE A RUN</Text>

      {/* Court Selection */}
      <Text style={styles.sectionLabel}>COURT</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search courts..."
        placeholderTextColor={Colors.textMuted}
        value={courtSearch}
        onChangeText={setCourtSearch}
      />
      {!selectedCourt ? (
        <View style={styles.courtList}>
          {filteredCourts.slice(0, 6).map((c) => (
            <TouchableOpacity key={c.id} style={styles.courtOption} onPress={() => { setSelectedCourt(c); setCourtSearch(c.name); }}>
              <Ionicons name="location" size={16} color={Colors.textMuted} />
              <View>
                <Text style={styles.courtOptionName}>{c.name}</Text>
                <Text style={styles.courtOptionMeta}>{c.neighborhood} · {c.is_indoor ? 'Indoor' : 'Outdoor'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.selectedCourt}>
          <Ionicons name="location" size={16} color={Colors.primary} />
          <Text style={styles.selectedCourtName}>{selectedCourt.name}</Text>
          <TouchableOpacity onPress={() => { setSelectedCourt(null); setCourtSearch(''); }}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Date */}
      <Text style={styles.sectionLabel}>DATE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
        {QUICK_DATES.map((d) => (
          <TouchableOpacity
            key={d.label}
            style={[styles.dateChip, selectedDate.toDateString() === d.date.toDateString() && styles.dateChipActive]}
            onPress={() => setSelectedDate(d.date)}
          >
            <Text style={[styles.dateChipLabel, selectedDate.toDateString() === d.date.toDateString() && styles.dateChipLabelActive]}>{d.label}</Text>
            <Text style={[styles.dateChipDate, selectedDate.toDateString() === d.date.toDateString() && styles.dateChipLabelActive]}>
              {format(d.date, 'MMM d')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Time */}
      <Text style={styles.sectionLabel}>TIME</Text>
      <View style={styles.timeGrid}>
        {QUICK_TIMES.map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.timeChip, selectedTime === t && styles.timeChipActive]}
            onPress={() => setSelectedTime(t)}
          >
            <Text style={[styles.timeChipText, selectedTime === t && styles.timeChipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Format */}
      <Text style={styles.sectionLabel}>FORMAT</Text>
      <View style={styles.chipRow}>
        {FORMATS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, format_ === f && styles.chipActive]}
            onPress={() => setFormat(f)}
          >
            <Text style={[styles.chipText, format_ === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ELO Band */}
      <Text style={styles.sectionLabel}>ELO BAND</Text>
      <View style={styles.chipRow}>
        {ELO_BANDS.map((b) => (
          <TouchableOpacity
            key={b}
            style={[styles.chip, eloBand === b && styles.chipActive]}
            onPress={() => setEloBand(b)}
          >
            <Text style={[styles.chipText, eloBand === b && styles.chipTextActive]}>{b}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Max Players */}
      <Text style={styles.sectionLabel}>MAX PLAYERS: {maxPlayers}</Text>
      <View style={styles.sliderRow}>
        <TouchableOpacity onPress={() => setMaxPlayers(Math.max(4, maxPlayers - 1))} style={styles.sliderBtn}>
          <Ionicons name="remove" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.sliderTrack}>
          <View style={[styles.sliderFill, { width: `${((maxPlayers - 4) / 16) * 100}%` }]} />
        </View>
        <TouchableOpacity onPress={() => setMaxPlayers(Math.min(20, maxPlayers + 1))} style={styles.sliderBtn}>
          <Ionicons name="add" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.sliderValue}>{maxPlayers}</Text>
      </View>

      {/* Description */}
      <Text style={styles.sectionLabel}>DESCRIPTION (OPTIONAL)</Text>
      <TextInput
        style={styles.descriptionInput}
        placeholder="Add context, house rules, or anything useful..."
        placeholderTextColor={Colors.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      {/* Recurring */}
      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>RECURRING RUN</Text>
          <Text style={styles.toggleDesc}>Schedule this run on repeat</Text>
        </View>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={Colors.textPrimary}
        />
      </View>

      {isRecurring && (
        <>
          <View style={styles.chipRow}>
            {(['weekly', 'biweekly'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, recurrencePattern === r && styles.chipActive]}
                onPress={() => setRecurrencePattern(r)}
              >
                <Text style={[styles.chipText, recurrencePattern === r && styles.chipTextActive]}>
                  {r === 'weekly' ? 'Weekly' : 'Biweekly'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.dayRow}>
            {DAYS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.dayChip, recurringDays.includes(d) && styles.dayChipActive]}
                onPress={() => setRecurringDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}
              >
                <Text style={[styles.dayText, recurringDays.includes(d) && styles.dayTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Women's Only */}
      <View style={styles.toggleRow}>
        <View>
          <Text style={styles.toggleLabel}>WOMEN'S ONLY</Text>
          <Text style={styles.toggleDesc}>Visible to users with Women's First Mode</Text>
        </View>
        <Switch
          value={isWomensOnly}
          onValueChange={setIsWomensOnly}
          trackColor={{ false: Colors.border, true: Colors.secondary }}
          thumbColor={Colors.textPrimary}
        />
      </View>

      {/* Create button */}
      <TouchableOpacity
        style={[styles.createButton, !selectedCourt && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={loading || !selectedCourt}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>CREATE RUN</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: 60 },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 32, color: Colors.textPrimary, letterSpacing: 2, marginBottom: Spacing.lg },
  sectionLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm, marginTop: Spacing.md },
  searchInput: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textPrimary, marginBottom: Spacing.sm },
  courtList: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  courtOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  courtOptionName: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.textPrimary },
  courtOptionMeta: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  selectedCourt: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: `${Colors.primary}15`, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.primary },
  selectedCourtName: { flex: 1, fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.primary },
  dateRow: { gap: Spacing.sm, paddingBottom: Spacing.xs },
  dateChip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card, alignItems: 'center' },
  dateChipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  dateChipLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: Colors.textMuted },
  dateChipDate: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  dateChipLabelActive: { color: Colors.primary },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  timeChip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  timeChipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  timeChipText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: Colors.textMuted },
  timeChipTextActive: { color: Colors.primary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  chipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}15` },
  chipText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: Colors.textMuted },
  chipTextActive: { color: Colors.primary },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  sliderBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  sliderTrack: { flex: 1, height: 6, backgroundColor: Colors.card, borderRadius: BorderRadius.full, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  sliderFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: BorderRadius.full },
  sliderValue: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: Colors.primary, width: 32, textAlign: 'center' },
  descriptionInput: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textPrimary, minHeight: 80, textAlignVertical: 'top' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  toggleLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.textPrimary },
  toggleDesc: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  dayRow: { flexDirection: 'row', gap: Spacing.xs, flexWrap: 'wrap', marginTop: Spacing.sm },
  dayChip: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.card },
  dayChipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}20` },
  dayText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted },
  dayTextActive: { color: Colors.primary },
  createButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.xl },
  createButtonDisabled: { opacity: 0.4 },
  createButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.xl, color: '#fff', letterSpacing: 2 },
  shareScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  shareTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 36, color: Colors.textPrimary, letterSpacing: 2, textAlign: 'center' },
  shareSubtitle: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.lg, color: Colors.secondary, textAlign: 'center' },
  shareTime: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textMuted, textAlign: 'center' },
  linkBox: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, width: '100%' },
  linkText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted },
  shareButton: { backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 14, paddingHorizontal: Spacing.xl, borderRadius: BorderRadius.md, width: '100%', justifyContent: 'center' },
  shareButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.xl, color: '#fff', letterSpacing: 2 },
  viewGameButton: { paddingVertical: 10 },
  viewGameText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.primary },
});

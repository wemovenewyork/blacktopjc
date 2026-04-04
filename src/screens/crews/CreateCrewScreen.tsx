import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { Court } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius, CrewColors } from '@/theme';

export function CreateCrewScreen() {
  const navigation = useNavigation<any>();
  const [name, setName] = useState('');
  const [color, setColor] = useState(Colors.primary);
  const [courts, setCourts] = useState<Court[]>([]);
  const [courtSearch, setCourtSearch] = useState('');
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('courts').select('*').order('name').then(({ data }) => { if (data) setCourts(data); });
  }, []);

  const filteredCourts = courtSearch
    ? courts.filter((c) => c.name.toLowerCase().includes(courtSearch.toLowerCase()))
    : courts;

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('Enter a crew name'); return; }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const { data: user } = await supabase.from('users').select('id').eq('auth_id', session.user.id).single();
      if (!user) throw new Error('No profile');

      const { data: crew, error } = await supabase
        .from('crews')
        .insert({ name: name.trim(), color_hex: color, home_court_id: selectedCourt?.id, created_by: user.id })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('crew_members').insert({ crew_id: crew.id, user_id: user.id, role: 'admin' });

      navigation.replace('CrewDetail', { crewId: crew.id });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>CREATE CREW</Text>

      <Text style={styles.label}>CREW NAME</Text>
      <TextInput
        style={styles.input}
        placeholder="Heights Crew, Downtown Squad..."
        placeholderTextColor={Colors.textMuted}
        value={name}
        onChangeText={setName}
        autoFocus
        maxLength={40}
      />

      <Text style={styles.label}>CREW COLOR</Text>
      <View style={styles.colorGrid}>
        {CrewColors.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchActive]}
            onPress={() => setColor(c)}
          >
            {color === c && (
              <View style={styles.colorCheck}>
                <Text style={styles.colorCheckText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>HOME COURT (OPTIONAL)</Text>
      <TextInput
        style={styles.input}
        placeholder="Search courts..."
        placeholderTextColor={Colors.textMuted}
        value={selectedCourt ? selectedCourt.name : courtSearch}
        onChangeText={(t) => { setCourtSearch(t); if (selectedCourt) setSelectedCourt(null); }}
      />
      {!selectedCourt && courtSearch.length > 0 && (
        <View style={styles.courtDropdown}>
          {filteredCourts.slice(0, 5).map((c) => (
            <TouchableOpacity key={c.id} style={styles.courtOption} onPress={() => { setSelectedCourt(c); setCourtSearch(c.name); }}>
              <Text style={styles.courtOptionText}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.createButton, !name.trim() && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={loading || !name.trim()}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createButtonText}>CREATE CREW</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: 40 },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 28, color: Colors.textPrimary, letterSpacing: 2, marginBottom: Spacing.lg },
  label: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm, marginTop: Spacing.md },
  input: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 14, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textPrimary },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  colorSwatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  colorSwatchActive: { borderWidth: 3, borderColor: '#fff' },
  colorCheck: { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  colorCheckText: { color: '#fff', fontSize: 12 },
  courtDropdown: { backgroundColor: Colors.card, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border, marginTop: 4, overflow: 'hidden' },
  courtOption: { paddingVertical: 12, paddingHorizontal: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  courtOptionText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textPrimary },
  createButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.xl },
  createButtonDisabled: { opacity: 0.4 },
  createButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.xl, color: '#fff', letterSpacing: 2 },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { User, Position } from '@/types';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C', 'Multiple'];
const NEIGHBORHOODS = ['Heights', 'Journal Square', 'Downtown', 'Bergen-Lafayette', 'Greenville', 'West Side', 'Pavonia', 'McGinley Square', 'Bayonne border', 'Other'];

export function EditProfileScreen() {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [neighborhood, setNeighborhood] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('users').select('*').eq('auth_id', session.user.id).single();
      if (data) {
        setUser(data);
        setDisplayName(data.display_name);
        setPositions(data.position ?? []);
        setNeighborhood(data.neighborhood ?? '');
        setAvatarUri(data.avatar_url);
      }
    })();
  }, []);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  }

  async function handleSave() {
    if (!user) return;
    setLoading(true);
    try {
      let avatarUrl = user.avatar_url;
      if (avatarUri && avatarUri !== user.avatar_url) {
        const ext = avatarUri.split('.').pop() ?? 'jpg';
        const path = `avatars/${user.id}.${ext}`;
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        await supabase.storage.from('avatars').upload(path, blob, { upsert: true });
        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = data.publicUrl;
      }

      await supabase.from('users').update({
        display_name: displayName.trim(),
        position: positions,
        neighborhood,
        avatar_url: avatarUrl,
      }).eq('id', user.id);

      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Avatar */}
      <TouchableOpacity style={styles.avatarArea} onPress={pickAvatar}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitials}>{displayName[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        )}
        <View style={styles.avatarEdit}>
          <Text style={styles.avatarEditText}>Change</Text>
        </View>
      </TouchableOpacity>

      <Text style={styles.label}>DISPLAY NAME</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholderTextColor={Colors.textMuted} maxLength={30} />

      <Text style={styles.label}>POSITION</Text>
      <View style={styles.chipRow}>
        {POSITIONS.map((pos) => (
          <TouchableOpacity
            key={pos}
            style={[styles.chip, positions.includes(pos) && styles.chipActive]}
            onPress={() => setPositions((prev) => prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos])}
          >
            <Text style={[styles.chipText, positions.includes(pos) && styles.chipTextActive]}>{pos}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>NEIGHBORHOOD</Text>
      <View style={styles.neighborhoodList}>
        {NEIGHBORHOODS.map((n) => (
          <TouchableOpacity
            key={n}
            style={[styles.neighborhoodRow, neighborhood === n && styles.neighborhoodRowActive]}
            onPress={() => setNeighborhood(n)}
          >
            <Text style={[styles.neighborhoodText, neighborhood === n && styles.neighborhoodTextActive]}>{n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>SAVE CHANGES</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: 40 },
  avatarArea: { alignSelf: 'center', marginBottom: Spacing.xl },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { fontFamily: 'BebasNeue_400Regular', fontSize: 40, color: '#fff' },
  avatarEdit: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.card, borderRadius: BorderRadius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: Colors.border },
  avatarEditText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.primary },
  label: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm, marginTop: Spacing.md },
  input: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 14, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textPrimary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { borderColor: Colors.primary, backgroundColor: `${Colors.primary}10` },
  chipText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.sm, color: Colors.textMuted },
  chipTextActive: { color: Colors.primary },
  neighborhoodList: { gap: Spacing.xs },
  neighborhoodRow: { paddingVertical: 12, paddingHorizontal: Spacing.md, backgroundColor: Colors.card, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  neighborhoodRowActive: { borderColor: Colors.primary },
  neighborhoodText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textSecondary },
  neighborhoodTextActive: { color: Colors.primary },
  saveButton: { backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center', marginTop: Spacing.xl },
  saveButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.xl, color: '#fff', letterSpacing: 2 },
});

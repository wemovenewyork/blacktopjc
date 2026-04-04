import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';
import { Position } from '@/types';

const POSITIONS: Position[] = ['PG', 'SG', 'SF', 'PF', 'C', 'Multiple'];
const NEIGHBORHOODS = [
  'Heights', 'Journal Square', 'Downtown', 'Bergen-Lafayette',
  'Greenville', 'West Side', 'Pavonia', 'McGinley Square',
  'Bayonne border', 'Other',
];

const STEPS = 4;

export function CreateProfileScreen() {
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [positions, setPositions] = useState<Position[]>([]);
  const [neighborhood, setNeighborhood] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function togglePosition(pos: Position) {
    setPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
  }

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  }

  function canAdvance() {
    if (step === 1) return displayName.trim().length >= 2;
    if (step === 2) return positions.length > 0;
    if (step === 3) return neighborhood.length > 0;
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      let avatarUrl: string | null = null;

      if (avatarUri) {
        const ext = avatarUri.split('.').pop() ?? 'jpg';
        const path = `avatars/${session.user.id}.${ext}`;
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, blob, { upsert: true });
        if (!uploadError) {
          const { data } = supabase.storage.from('avatars').getPublicUrl(path);
          avatarUrl = data.publicUrl;
        }
      }

      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          auth_id: session.user.id,
          display_name: displayName.trim(),
          position: positions,
          neighborhood,
          avatar_url: avatarUrl,
          games_until_rated: 3,
        })
        .eq('auth_id', session.user.id);

      if (upsertError) throw upsertError;
      // Auth state listener will redirect to main app
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Progress dots */}
      <View style={styles.progressRow}>
        {Array.from({ length: STEPS }, (_, i) => (
          <View key={i} style={[styles.dot, i + 1 === step && styles.dotActive, i + 1 < step && styles.dotDone]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Step 1: Name */}
        {step === 1 && (
          <>
            <Text style={styles.stepLabel}>STEP 1 OF 4</Text>
            <Text style={styles.title}>WHAT'S YOUR NAME?</Text>
            <Text style={styles.subtitle}>This is how you'll appear to other players</Text>
            <TextInput
              style={styles.input}
              placeholder="Display name (e.g. The General)"
              placeholderTextColor={Colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
              maxLength={30}
            />
          </>
        )}

        {/* Step 2: Position */}
        {step === 2 && (
          <>
            <Text style={styles.stepLabel}>STEP 2 OF 4</Text>
            <Text style={styles.title}>WHAT DO YOU PLAY?</Text>
            <Text style={styles.subtitle}>Select all that apply</Text>
            <View style={styles.chipGrid}>
              {POSITIONS.map((pos) => (
                <TouchableOpacity
                  key={pos}
                  style={[styles.chip, positions.includes(pos) && styles.chipActive]}
                  onPress={() => togglePosition(pos)}
                >
                  <Text style={[styles.chipText, positions.includes(pos) && styles.chipTextActive]}>
                    {pos}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Step 3: Neighborhood */}
        {step === 3 && (
          <>
            <Text style={styles.stepLabel}>STEP 3 OF 4</Text>
            <Text style={styles.title}>WHERE YOU REP?</Text>
            <Text style={styles.subtitle}>Your JC neighborhood</Text>
            <View style={styles.neighborhoodList}>
              {NEIGHBORHOODS.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.neighborhoodRow, neighborhood === n && styles.neighborhoodRowActive]}
                  onPress={() => setNeighborhood(n)}
                >
                  <Text style={[styles.neighborhoodText, neighborhood === n && styles.neighborhoodTextActive]}>
                    {n}
                  </Text>
                  {neighborhood === n && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Step 4: Photo */}
        {step === 4 && (
          <>
            <Text style={styles.stepLabel}>STEP 4 OF 4</Text>
            <Text style={styles.title}>ADD YOUR PHOTO</Text>
            <Text style={styles.subtitle}>Help teammates recognize you on the court</Text>
            <TouchableOpacity style={styles.avatarPicker} onPress={pickImage}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera" size={36} color={Colors.textMuted} />
                  <Text style={styles.avatarPlaceholderText}>Add Photo</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage}>
              <Text style={styles.changePhotoText}>
                {avatarUri ? 'Change photo' : 'Choose from library'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.navButtons}>
        {step > 1 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(step - 1)}>
            <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, !canAdvance() && styles.nextButtonDisabled]}
          onPress={step < STEPS ? () => setStep(step + 1) : handleSubmit}
          disabled={!canAdvance() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.nextButtonText}>
              {step < STEPS ? 'NEXT' : 'CREATE PROFILE'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {step === 4 && (
        <TouchableOpacity onPress={handleSubmit} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  progressRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.xl, paddingTop: 60, marginBottom: Spacing.xl, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 24 },
  dotDone: { backgroundColor: Colors.primary },
  content: { paddingHorizontal: Spacing.xl, flexGrow: 1, paddingBottom: 120 },
  stepLabel: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 36, color: Colors.textPrimary, letterSpacing: 2, marginBottom: Spacing.sm },
  subtitle: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textMuted, marginBottom: Spacing.xl },
  input: { backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 16, fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.lg, color: Colors.textPrimary },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border },
  chipActive: { borderColor: Colors.primary, backgroundColor: 'rgba(201,8,42,0.1)' },
  chipText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.textMuted },
  chipTextActive: { color: Colors.primary },
  neighborhoodList: { gap: Spacing.sm },
  neighborhoodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: Spacing.md, backgroundColor: Colors.card, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: Colors.border },
  neighborhoodRowActive: { borderColor: Colors.primary },
  neighborhoodText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.md, color: Colors.textSecondary },
  neighborhoodTextActive: { color: Colors.primary, fontFamily: 'RobotoCondensed_700Bold' },
  avatarPicker: { width: 140, height: 140, borderRadius: 70, alignSelf: 'center', marginBottom: Spacing.lg, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed', borderRadius: 70 },
  avatarPlaceholderText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted, marginTop: Spacing.xs },
  changePhotoText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.primary, textAlign: 'center' },
  error: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.error, textAlign: 'center', marginTop: Spacing.md },
  navButtons: { position: 'absolute', bottom: 40, left: Spacing.xl, right: Spacing.xl, flexDirection: 'row', gap: Spacing.sm },
  backBtn: { width: 48, height: 52, backgroundColor: Colors.card, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  nextButton: { flex: 1, backgroundColor: Colors.primary, paddingVertical: 16, borderRadius: BorderRadius.md, alignItems: 'center' },
  nextButtonDisabled: { opacity: 0.4 },
  nextButtonText: { fontFamily: 'BebasNeue_400Regular', fontSize: FontSize.xl, color: Colors.textPrimary, letterSpacing: 2 },
  skipButton: { position: 'absolute', bottom: 12, alignSelf: 'center' },
  skipText: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.sm, color: Colors.textMuted },
});

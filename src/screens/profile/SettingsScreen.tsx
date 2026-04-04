import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const [womensFirstMode, setWomensFirstMode] = useState(false);
  const [gameReminders, setGameReminders] = useState(true);
  const [courtAlerts, setCourtAlerts] = useState(true);
  const [crewNotifs, setCrewNotifs] = useState(true);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from('users').select('id, womens_first_mode, expo_push_token').eq('auth_id', session.user.id).single();
      if (data) {
        setUserId(data.id);
        setWomensFirstMode(data.womens_first_mode ?? false);
        setPushToken(data.expo_push_token);
      }
    })();
  }, []);

  async function updateSetting(field: string, value: boolean) {
    if (!userId) return;
    await supabase.from('users').update({ [field]: value }).eq('id', userId);
  }

  async function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => supabase.auth.signOut() },
      ]
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Women's First Mode */}
      <Text style={styles.sectionHeader}>GAME DISCOVERY</Text>
      <View style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Women's First Mode</Text>
            <Text style={styles.settingDesc}>Filter discovery to Women's and All-Welcome games</Text>
          </View>
          <Switch
            value={womensFirstMode}
            onValueChange={(v) => { setWomensFirstMode(v); updateSetting('womens_first_mode', v); }}
            trackColor={{ false: Colors.border, true: Colors.secondary }}
            thumbColor={Colors.textPrimary}
          />
        </View>
      </View>

      {/* Notifications */}
      <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
      <View style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Game Reminders</Text>
            <Text style={styles.settingDesc}>2 hours before games you RSVPd In</Text>
          </View>
          <Switch
            value={gameReminders}
            onValueChange={setGameReminders}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.textPrimary}
          />
        </View>
        <View style={[styles.settingRow, styles.settingRowBorder]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Court Activity Alerts</Text>
            <Text style={styles.settingDesc}>When favorited courts reach your threshold</Text>
          </View>
          <Switch
            value={courtAlerts}
            onValueChange={setCourtAlerts}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.textPrimary}
          />
        </View>
        <View style={[styles.settingRow, styles.settingRowBorder]}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingTitle}>Crew Notifications</Text>
            <Text style={styles.settingDesc}>Challenges, messages, and updates</Text>
          </View>
          <Switch
            value={crewNotifs}
            onValueChange={setCrewNotifs}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={Colors.textPrimary}
          />
        </View>
      </View>

      {/* Account */}
      <Text style={styles.sectionHeader}>ACCOUNT</Text>
      <View style={styles.settingCard}>
        {pushToken && (
          <View style={styles.tokenRow}>
            <Text style={styles.tokenLabel}>Push Token</Text>
            <Text style={styles.tokenValue}>{pushToken.slice(0, 22)}...</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.settingRow, { borderTopWidth: pushToken ? 1 : 0, borderTopColor: Colors.border }]}
          onPress={() => navigation.navigate('BlacktopPro')}
        >
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: Colors.secondary }]}>Blacktop Pro</Text>
            <Text style={styles.settingDesc}>Unlock advanced stats and features</Text>
          </View>
          <Ionicons name="star" size={18} color={Colors.secondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: 40 },
  sectionHeader: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 2, marginBottom: Spacing.sm, marginTop: Spacing.md },
  settingCard: { backgroundColor: Colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: Spacing.sm },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md },
  settingRowBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  settingInfo: { flex: 1, marginRight: Spacing.md },
  settingTitle: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.textPrimary },
  settingDesc: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  tokenRow: { padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tokenLabel: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1 },
  tokenValue: { fontFamily: 'RobotoCondensed_400Regular', fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  signOutButton: { marginTop: Spacing.lg, paddingVertical: 14, borderRadius: BorderRadius.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.error },
  signOutText: { fontFamily: 'RobotoCondensed_700Bold', fontSize: FontSize.md, color: Colors.error },
});

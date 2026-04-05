import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius } from '@/theme';
import { GameFilters, Format, EloBand } from '@/types';

interface Props {
  filters: GameFilters;
  onChange: (f: GameFilters) => void;
}

const FORMATS: (Format | 'All')[] = ['All', '3v3', '5v5', '21', 'Open'];
const ELO_BANDS: (EloBand | 'Any')[] = ['Any', 'Beginner', 'Intermediate', 'Advanced', 'Elite'];
const TIMES: { label: string; value: GameFilters['time'] }[] = [
  { label: 'Any Time', value: 'any' },
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
];

export function FilterBar({ filters, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scroll}
    >
      {/* Format chips */}
      {FORMATS.map((f) => (
        <Chip
          key={f}
          label={f}
          active={filters.format === f}
          onPress={() => onChange({ ...filters, format: f as any })}
        />
      ))}

      <View style={styles.separator} />

      {/* ELO band chips */}
      {ELO_BANDS.map((b) => (
        <Chip
          key={b}
          label={b}
          active={filters.eloBand === b}
          onPress={() => onChange({ ...filters, eloBand: b as any })}
        />
      ))}

      <View style={styles.separator} />

      {/* Indoor/Outdoor */}
      {(['any', 'indoor', 'outdoor'] as const).map((loc) => (
        <Chip
          key={loc}
          label={loc === 'any' ? 'All Venues' : loc.charAt(0).toUpperCase() + loc.slice(1)}
          active={filters.location === loc}
          onPress={() => onChange({ ...filters, location: loc })}
        />
      ))}

      <View style={styles.separator} />

      {/* Time */}
      {TIMES.map(({ label, value }) => (
        <Chip
          key={value}
          label={label}
          active={filters.time === value}
          onPress={() => onChange({ ...filters, time: value })}
        />
      ))}

      {/* Women's First */}
      <View style={styles.separator} />
      <Chip
        label="W's Only"
        active={filters.womensOnly}
        onPress={() => onChange({ ...filters, womensOnly: !filters.womensOnly })}
        accent
      />
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
  accent = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  accent?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        active && (accent ? styles.chipAccentActive : styles.chipActive),
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: Colors.card,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  chipAccentActive: {
    borderColor: Colors.secondary,
    backgroundColor: `${Colors.secondary}12`,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  chipText: {
    fontFamily: 'RobotoCondensed_700Bold',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  chipTextActive: {
    color: Colors.textPrimary,
  },
  separator: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.xs,
  },
});

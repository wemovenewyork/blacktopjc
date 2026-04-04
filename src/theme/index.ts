import { EloTier, EloTierInfo } from '@/types';

export const Colors = {
  background: '#0A0E17',
  card: '#0F1926',
  cardElevated: '#152232',
  primary: '#C9082A',
  secondary: '#C8A94A',
  textPrimary: '#FFFFFF',
  textSecondary: '#C8CDD6',
  textMuted: '#7E8A9A',
  border: 'rgba(255,255,255,0.07)',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  overlay: 'rgba(10,14,23,0.85)',
  green: '#22C55E',
  yellow: '#F59E0B',
} as const;

export const EloColors: Record<EloTier, string> = {
  Unrated: '#64748B',
  Rookie: '#94A3B8',
  Starter: '#3B82F6',
  'All-Star': '#22C55E',
  MVP: '#C8A94A',
  Legend: '#C9082A',
};

export const EloTiers: EloTierInfo[] = [
  { label: 'Unrated', min: 0, max: 0, color: EloColors.Unrated },
  { label: 'Rookie', min: 1, max: 999, color: EloColors.Rookie },
  { label: 'Starter', min: 1000, max: 1199, color: EloColors.Starter },
  { label: 'All-Star', min: 1200, max: 1399, color: EloColors['All-Star'] },
  { label: 'MVP', min: 1400, max: 1599, color: EloColors.MVP },
  { label: 'Legend', min: 1600, max: 9999, color: EloColors.Legend },
];

export function getEloTier(rating: number, rated: boolean): EloTier {
  if (!rated) return 'Unrated';
  if (rating < 1000) return 'Rookie';
  if (rating < 1200) return 'Starter';
  if (rating < 1400) return 'All-Star';
  if (rating < 1600) return 'MVP';
  return 'Legend';
}

export function getEloColor(rating: number, rated: boolean): string {
  return EloColors[getEloTier(rating, rated)];
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  xxl: 24,
  display: 32,
  hero: 48,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#C9082A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  gold: {
    shadowColor: '#C8A94A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
} as const;

export const CrewColors = [
  '#C9082A',
  '#C8A94A',
  '#3B82F6',
  '#22C55E',
  '#8B5CF6',
  '#F97316',
  '#EC4899',
  '#14B8A6',
  '#64748B',
  '#FFFFFF',
  '#1E293B',
  '#DC2626',
];

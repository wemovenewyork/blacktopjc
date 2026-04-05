import { EloTier, EloTierInfo } from '@/types';

export const Colors = {
  background: '#080B12',
  card: '#0D1117',
  cardElevated: '#111720',
  cardBright: '#161D28',
  primary: '#E8042F',
  primaryDim: '#C9082A',
  secondary: '#D4A843',
  textPrimary: '#FFFFFF',
  textSecondary: '#B8C0CC',
  textMuted: '#606878',
  border: 'rgba(255,255,255,0.06)',
  borderBright: 'rgba(255,255,255,0.12)',
  borderRed: 'rgba(232,4,47,0.3)',
  success: '#16A34A',
  successBright: '#22C55E',
  warning: '#D97706',
  warningBright: '#F59E0B',
  error: '#DC2626',
  overlay: 'rgba(8,11,18,0.92)',
  green: '#22C55E',
  yellow: '#F59E0B',
  redGlow: 'rgba(232,4,47,0.15)',
  goldGlow: 'rgba(212,168,67,0.15)',
} as const;

export const EloColors: Record<EloTier, string> = {
  Unrated: '#4B5563',
  Rookie: '#94A3B8',
  Starter: '#3B82F6',
  'All-Star': '#22C55E',
  MVP: '#D4A843',
  Legend: '#E8042F',
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
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  lg: {
    shadowColor: '#E8042F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 14,
  },
  gold: {
    shadowColor: '#D4A843',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
} as const;

export const CrewColors = [
  '#E8042F',
  '#D4A843',
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

import { EloTier, EloTierInfo } from '@/types';

export const Colors = {
  background: '#000000',
  card: '#080808',
  cardElevated: '#0F0F0F',
  cardBright: '#141414',
  primary: '#FF0033',
  primaryDim: '#CC0029',
  primaryGlow: 'rgba(255,0,51,0.2)',
  secondary: '#FFB800',
  secondaryGlow: 'rgba(255,184,0,0.2)',
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#555555',
  border: 'rgba(255,255,255,0.06)',
  borderBright: 'rgba(255,255,255,0.15)',
  borderRed: 'rgba(255,0,51,0.4)',
  borderGold: 'rgba(255,184,0,0.4)',
  success: '#00FF88',
  successBright: '#00FF88',
  successGlow: 'rgba(0,255,136,0.2)',
  warning: '#FFB800',
  warningBright: '#FFB800',
  error: '#FF0033',
  overlay: 'rgba(0,0,0,0.9)',
  green: '#00FF88',
  yellow: '#FFB800',
  redGlow: 'rgba(255,0,51,0.15)',
  goldGlow: 'rgba(255,184,0,0.15)',
  cyan: '#00FFFF',
  cyanGlow: 'rgba(0,255,255,0.15)',
} as const;

export const EloColors: Record<EloTier, string> = {
  Unrated: '#333333',
  Rookie: '#666666',
  Starter: '#0088FF',
  'All-Star': '#00FF88',
  MVP: '#FFB800',
  Legend: '#FF0033',
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
  sm: 2,
  md: 4,
  lg: 8,
  xl: 12,
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
  hero: 56,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#FF0033',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  md: {
    shadowColor: '#FF0033',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  lg: {
    shadowColor: '#FF0033',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 14,
  },
  gold: {
    shadowColor: '#FFB800',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
} as const;

export const CrewColors = [
  '#FF0033',
  '#FFB800',
  '#0088FF',
  '#00FF88',
  '#8B5CF6',
  '#FF6600',
  '#FF00FF',
  '#00FFFF',
  '#666666',
  '#FFFFFF',
  '#111111',
  '#CC0029',
];

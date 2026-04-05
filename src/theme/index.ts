import { EloTier, EloTierInfo } from '@/types';

export const Colors = {
  // ── Backgrounds ────────────────────────────────────────────────
  background: '#0D0D0D',
  card: '#1A1A1A',
  cardElevated: '#222222',
  cardBright: '#2A2A2A',

  // ── Brand ─────────────────────────────────────────────────────
  primary: '#F5A623',           // orange — main CTA, active states
  primaryDim: '#D4891E',
  primaryGlow: 'rgba(245,166,35,0.22)',

  secondary: '#4CAF50',         // green — active / success
  secondaryGlow: 'rgba(76,175,80,0.22)',

  accent: '#2196F3',            // blue — info / discover
  accentGlow: 'rgba(33,150,243,0.18)',

  // ── Text ──────────────────────────────────────────────────────
  textPrimary: '#E8E8E8',
  textSecondary: '#AAAAAA',
  textMuted: '#888888',

  // ── Borders ───────────────────────────────────────────────────
  border: 'rgba(255,255,255,0.08)',
  borderBright: 'rgba(255,255,255,0.15)',
  borderRed: 'rgba(245,166,35,0.30)',   // kept name for compatibility — now orange
  borderGold: 'rgba(245,166,35,0.40)',
  borderCyan: 'rgba(33,150,243,0.35)',

  // ── Semantic ──────────────────────────────────────────────────
  success: '#4CAF50',
  successBright: '#56C568',
  successGlow: 'rgba(76,175,80,0.25)',
  warning: '#F5A623',
  warningBright: '#FFBB45',
  error: '#EF4444',
  overlay: 'rgba(0,0,0,0.92)',

  // ── Aliases ───────────────────────────────────────────────────
  green: '#4CAF50',
  yellow: '#F5A623',
  redGlow: 'rgba(239,68,68,0.18)',
  goldGlow: 'rgba(245,166,35,0.18)',
  cyan: '#2196F3',
  cyanGlow: 'rgba(33,150,243,0.18)',
} as const;

export const EloColors: Record<EloTier, string> = {
  Unrated:  '#444444',
  Rookie:   '#6B7280',
  Starter:  '#2196F3',
  'All-Star': '#4CAF50',
  MVP:      '#F5A623',
  Legend:   '#FFD700',
};

export const EloTiers: EloTierInfo[] = [
  { label: 'Unrated',  min: 0,    max: 0,    color: EloColors.Unrated },
  { label: 'Rookie',   min: 1,    max: 999,  color: EloColors.Rookie },
  { label: 'Starter',  min: 1000, max: 1199, color: EloColors.Starter },
  { label: 'All-Star', min: 1200, max: 1399, color: EloColors['All-Star'] },
  { label: 'MVP',      min: 1400, max: 1599, color: EloColors.MVP },
  { label: 'Legend',   min: 1600, max: 9999, color: EloColors.Legend },
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
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const FontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  display: 36,
  hero: 60,
} as const;

// Black-based shadows per design spec
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 16,
  },
  // Orange glow — used sparingly for active elements
  gold: {
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 14,
  },
  cyan: {
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
} as const;

export const CrewColors = [
  '#F5A623',
  '#4CAF50',
  '#2196F3',
  '#E91E63',
  '#9C27B0',
  '#FF6F00',
  '#00BCD4',
  '#CDDC39',
  '#607D8B',
  '#FFFFFF',
  '#333333',
  '#EF4444',
];

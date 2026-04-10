// ─────────────────────────────────────────────────────────────
//  DJHINA — THÈME CLAIR  (Bleu #0000FF · Tchad)
// ─────────────────────────────────────────────────────────────

export const Colors = {
  // ── Primaires
  primary:       '#0000FF',
  primaryLight:  '#4D6FFF',
  primaryDark:   '#0000CC',
  primaryPale:   '#EEF0FF',   // bg très clair pour chips/badges

  // ── Accent (or ambre)
  accent:        '#F59E0B',
  accentLight:   '#FCD34D',
  accentDark:    '#D97706',

  // ── Backgrounds CLAIRS
  background:    '#F4F6FF',   // fond principal — blanc bleuté
  surface:       '#FFFFFF',   // cartes, modals
  surfaceAlt:    '#EEF2FF',   // second plan, inputs
  overlay:       'rgba(10,17,60,0.72)',

  // ── Textes
  text:          '#0A1128',   // noir profond
  textSecondary: '#3A5FC8',   // bleu moyen
  textMuted:     '#7B90C4',   // gris-bleu
  textLight:     '#B0BEDD',   // très clair
  textDark:      '#0A1128',

  // ── Status
  success:       '#059669',
  successBg:     'rgba(5,150,105,.12)',
  error:         '#DC2626',
  errorBg:       'rgba(220,38,38,.12)',
  warning:       '#D97706',
  warningBg:     'rgba(217,119,6,.12)',
  info:          '#2563EB',
  infoBg:        'rgba(37,99,235,.12)',

  // ── UI
  border:        'rgba(0,0,255,.12)',
  borderActive:  '#0000FF',
  divider:       'rgba(0,0,255,.08)',
  inputBg:       '#F0F4FF',
  shadow:        'rgba(0,0,255,.15)',
  cardShadow:    'rgba(0,0,120,.08)',

  // ── Drapeau du Tchad
  tchadBlue:     '#003082',
  tchadYellow:   '#FECB00',
  tchadRed:      '#C60C30',

  // ── Catégories
  music:         '#DB2777',
  sport:         '#0D9488',
  culture:       '#2563EB',
  business:      '#1D4ED8',
  food:          '#EA580C',
  festival:      '#D97706',
  fashion:       '#7C3AED',
  conference:    '#0891B2',

  // ── Mobile Money
  airtelMoney:   '#E40520',
  moovMoney:     '#0055A4',
};

export const Typography = {
  xs:       11,
  sm:       13,
  base:     15,
  md:       17,
  lg:       20,
  xl:       24,
  xxl:      30,
  xxxl:     38,

  regular:  '400',
  medium:   '500',
  semibold: '600',
  bold:     '700',
  extrabold:'800',

  tight:    1.2,
  normal:   1.5,
  relaxed:  1.7,
};

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
};

export const Radius = {
  sm:   6,
  md:   10,
  lg:   16,
  xl:   24,
  xxl:  32,
  full: 999,
};

export const Shadow = {
  soft: {
    shadowColor:   '#0000AA',
    shadowOffset:  { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius:  10,
    elevation:     4,
  },
  medium: {
    shadowColor:   '#0000AA',
    shadowOffset:  { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius:  18,
    elevation:     8,
  },
  strong: {
    shadowColor:   '#0000AA',
    shadowOffset:  { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius:  24,
    elevation:     14,
  },
};

// Export default pour les composants qui importent `theme`
export default {
  colors:     Colors,
  typography: Typography,
  spacing:    Spacing,
  radius:     Radius,
  shadow:     Shadow,
};

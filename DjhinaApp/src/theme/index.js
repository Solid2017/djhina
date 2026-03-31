export const Colors = {
  // Core palette — Bleu Tchad
  primary: '#0000FF',
  primaryLight: '#4D6FFF',
  primaryDark: '#0000CC',
  accent: '#F59E0B',          // Or ambre
  accentLight: '#FCD34D',
  accentDark: '#D97706',

  // Backgrounds — Navy profond
  background: '#00071A',
  surface: '#000F30',
  surfaceAlt: '#001247',
  overlay: 'rgba(0,7,26,0.88)',

  // Texts
  text: '#F0F4FF',
  textSecondary: '#7BA3FF',
  textMuted: '#3D5FA8',
  textDark: '#00071A',

  // Status
  success: '#10B981',
  successBg: 'rgba(16,185,129,0.15)',
  error: '#EF4444',
  errorBg: 'rgba(239,68,68,0.15)',
  warning: '#F59E0B',
  warningBg: 'rgba(245,158,11,0.15)',
  info: '#3B82F6',
  infoBg: 'rgba(59,130,246,0.15)',

  // UI
  border: 'rgba(77,111,255,0.25)',
  borderActive: '#0000FF',
  divider: 'rgba(77,111,255,0.12)',
  inputBg: 'rgba(0,15,48,0.9)',
  shadow: 'rgba(0,0,255,0.3)',

  // Drapeau du Tchad (bleu, jaune, rouge)
  tchadBlue: '#003082',
  tchadYellow: '#FECB00',
  tchadRed: '#C60C30',

  // Catégories
  music: '#EC4899',
  sport: '#14B8A6',
  culture: '#0000FF',
  business: '#3B82F6',
  food: '#F97316',
  festival: '#F59E0B',
  fashion: '#A855F7',
  conference: '#06B6D4',

  // Mobile Money Tchad
  airtelMoney: '#E40520',
  moovMoney: '#0055A4',
};

export const Typography = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 38,

  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',

  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const Shadow = {
  soft: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  medium: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  strong: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 16,
  },
};

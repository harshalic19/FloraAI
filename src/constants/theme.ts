export const Colors = {
  // ── Brand greens ────────────────────────────────────
  primary:        '#2D6A4F',
  primaryMid:     '#40916C',   // header gradient middle step
  primaryLight:   '#52B788',
  primaryDark:    '#1B4332',
  accent:         '#74C69D',
  accentLight:    '#B7E4C7',

  // ── Surfaces ────────────────────────────────────────
  background:      '#F8FFF9',
  surface:         '#FFFFFF',
  surfaceSecondary:'#EDF7EF',
  darkSurface:     '#0d1f1a',  // stats health card + AI sheet

  // ── Text ────────────────────────────────────────────
  text:          '#1B1B1B',
  textSecondary: '#4A6C52',
  textMuted:     '#95B8A0',

  // ── Semantic ────────────────────────────────────────
  warning: '#E9C46A',
  danger:  '#E76F51',
  success: '#52B788',
  border:  '#C7E6CF',
  shadow:  'rgba(45, 106, 79, 0.12)',

  // ── Danger palette ───────────────────────────────────
  dangerBg:      '#FFE5DC',    // overdue badge / pill bg
  dangerBgAlt:   '#FFF0EE',    // overdue section header bg
  dangerBorder:  '#FFCCC4',    // delete button border
  dangerSurface: '#FFF5F3',    // delete button background

  // ── Warning palette ──────────────────────────────────
  warningBg:      '#FFF3CD',   // warning badge / pill bg
  warningBgAlt:   '#FFF8E1',   // today section header bg
  warningBgFaint: '#FFFBEB',   // soon section header bg
  warningDark:    '#C8860A',   // today section text/icon
  warningSoon:    '#A07A00',   // coming-up-soon section
  warningText:    '#856404',   // watering-badge dark text
  warningDot:     '#E9A800',   // warning pill dot

  // ── Accent colors ────────────────────────────────────
  water:          '#2196F3',   // water droplet icon
  streakOrange:   '#FF6B35',   // flame / streak icon
  notificationBadge: '#FF3B30', // red badge on bell icon

  // ── Pure tones ───────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',

  // ── On-dark text (for dark-surface cards/headers) ────
  onDarkSubtle: 'rgba(255,255,255,0.88)',  // body text on dark
  headerSubtitle: 'rgba(255,255,255,0.75)', // subtitle in gradient header
  headerIconTint: 'rgba(255,255,255,0.8)',  // icons in gradient header
  onDarkMuted:  'rgba(255,255,255,0.4)',   // dismiss / secondary on dark
  onDarkFaint:  'rgba(255,255,255,0.35)',  // labels / ring subtext on dark
  onDarkHandle: 'rgba(255,255,255,0.15)',  // drag handle, circle overlays

  // ── Ring / Stats ─────────────────────────────────────
  ringTrack:    'rgba(255,255,255,0.09)',  // SVG ring track stroke

  // ── AI Sheet ─────────────────────────────────────────
  sheetBorder:  'rgba(82,183,136,0.45)',  // glowing border + shimmer
  sheetGlow:    'rgba(82,183,136,0.35)',  // glow divider
  sheetFreqText:'rgba(116,198,157,0.9)', // frequency label text

  // ── Overlay ──────────────────────────────────────────
  overlayDark:  'rgba(0,0,0,0.55)',       // dark modal overlay
};

export const Typography = {
  // ── Font sizes ───────────────────────────────────────
  fontSizeTiny:     9,   // tiny badge counts, bar labels
  fontSizeXXS:      10,  // small badge text, button sub-labels
  fontSizeXS:       11,
  fontSizeSM:       13,
  fontSizeMD:       15,
  fontSizeLG:       17,
  fontSizeXL:       20,
  fontSizeXXL:      26,
  fontSizeDisplay:  32,

  // ── Emoji / decorative text sizes ────────────────────
  fontSizeEmoji:     22,  // small emoji in lists / taglines
  fontSizeEmojiMD:   24,  // medium emoji in reminder cards
  fontSizeEmojiLG:   28,  // large emoji in plant cards / FAB label
  fontSizeEmojiHero: 46,  // hero emoji in AddPlant screen
  fontSizeEmojiXL:   54,  // hero emoji in PlantDetail screen

  // ── Large display numbers ────────────────────────────
  fontSizeStat:  42,  // streak / total stats, splash wordmark
  fontSizeScore: 48,  // health ring score

  // ── Font weights ─────────────────────────────────────
  fontWeightRegular:  '400' as const,
  fontWeightMedium:   '500' as const,
  fontWeightSemiBold: '600' as const,
  fontWeightBold:     '700' as const,
};

export const Spacing = {
  xxs:          2,   // hairline gaps, tiny margins
  xs:           4,
  sm:           8,
  md:           12,
  lg:           16,
  xl:           20,
  xxl:          24,
  xxxl:         32,
  btnVertical:  18,  // standard button paddingVertical
  tabClearance: 100, // bottom list padding to clear FAB + tab bar
};

export const BorderRadius = {
  xs:   2,    // handles, progress track caps, tiny dots
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,   // bottom sheet top corners
  full: 9999,
};

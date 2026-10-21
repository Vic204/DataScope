import '@/global.css'

import { Platform, type TextStyle, type ViewStyle } from 'react-native'

/**
 * The look: a high-school diary. Cream ruled paper, gel-pen ink, highlighter
 * swipes, washi tape holding cards down, and handwriting for every title.
 *
 * Everything visual lives here so a screen never hard-codes a hex value or a
 * font name, and the whole theme can be retuned from one file.
 */

export const palette = {
  /** The page itself. */
  paper: '#FFFDF6',
  /** Slightly dimmer paper, for headers and the bottom bar. */
  paperShade: '#FBF5E8',
  /** Cards sit *on* the paper, so they get to be brighter than it. */
  card: '#FFFFFF',
  /** Ruled lines and the pink margin line of a school notebook. */
  rule: '#D9E4F0',
  marginLine: '#F2A9BC',

  /** Gel-pen ink. */
  ink: '#3B3444',
  inkSoft: '#6C6377',
  inkFaint: '#A39CAC',

  accent: '#E8698E',
  accentDeep: '#C64C71',
  good: '#3FAE8F',
  warn: '#E39B2E',
  bad: '#D1564F',

  white: '#FFFFFF',
  shadow: '#8A7C93',
} as const

export type HighlighterName = 'yellow' | 'pink' | 'mint' | 'lilac' | 'sky'

/**
 * Highlighter colours are named exactly like the survey `accent` values the API
 * stores, so a survey's accent can be fed straight into the UI.
 */
export const highlighter: Record<HighlighterName, { bar: string; solid: string }> = {
  yellow: { bar: 'rgba(255, 224, 102, 0.58)', solid: '#FFE066' },
  pink: { bar: 'rgba(255, 170, 193, 0.52)', solid: '#FFAAC1' },
  mint: { bar: 'rgba(150, 226, 199, 0.52)', solid: '#96E2C7' },
  lilac: { bar: 'rgba(205, 180, 219, 0.55)', solid: '#CDB4DB' },
  sky: { bar: 'rgba(160, 214, 218, 0.55)', solid: '#A0D6DA' },
}

export const HIGHLIGHTERS = Object.keys(highlighter) as HighlighterName[]

export const tapeColors = [
  'rgba(255, 224, 102, 0.55)',
  'rgba(255, 170, 193, 0.5)',
  'rgba(150, 226, 199, 0.5)',
  'rgba(205, 180, 219, 0.5)',
  'rgba(160, 214, 218, 0.5)',
] as const

/** Same input, same colour - so a survey keeps its washi tape across screens. */
export function tapeFor(seed: string): string {
  let hash = 0
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 100000
  }
  return tapeColors[hash % tapeColors.length] as string
}

export function highlighterFor(accent: string | undefined | null): HighlighterName {
  return HIGHLIGHTERS.includes(accent as HighlighterName) ? (accent as HighlighterName) : 'yellow'
}

const systemFont = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'system-ui',
}) as string

export const fonts = {
  /** Big, flouncy handwriting. Titles only. */
  title: 'Caveat',
  /** Legible handwriting. Everything else. */
  hand: 'PatrickHand',
  /** For numerals in charts, where handwriting hurts readability. */
  system: systemFont,
} as const

/** A cheerful rotation for "stuck on by hand" elements. */
export function tilt(degrees: number): ViewStyle {
  return { transform: [{ rotate: `${degrees}deg` }] }
}

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const

export const radius = {
  sm: 8,
  card: 16,
  field: 10,
  pill: 999,
} as const

/**
 * React Native 0.76+ supports the `boxShadow` style string on every platform,
 * so one declaration works on iOS, Android and web.
 */
export const shadow = {
  card: { boxShadow: '0px 6px 16px rgba(138, 124, 147, 0.16)' } as ViewStyle,
  lift: { boxShadow: '0px 10px 22px rgba(138, 124, 147, 0.22)' } as ViewStyle,
  sticky: { boxShadow: '0px 3px 8px rgba(138, 124, 147, 0.2)' } as ViewStyle,
  none: {} as ViewStyle,
}

export const layout = {
  /** Web gets a centred column so it does not become a 2000px wide diary. */
  maxWidth: 700,
  gutter: 20,
  bottomBar: 68,
  /** Distance between ruled lines, and the height of one writing row. */
  ruled: 30,
  /** How far the pink margin line sits from the left edge. */
  marginLine: 32,
}

export const type: Record<
  'display' | 'h1' | 'h2' | 'h3' | 'body' | 'bodyLarge' | 'small' | 'tiny' | 'label' | 'number',
  TextStyle
> = {
  display: { fontFamily: fonts.title, fontSize: 42, lineHeight: 46 },
  h1: { fontFamily: fonts.title, fontSize: 34, lineHeight: 38 },
  h2: { fontFamily: fonts.title, fontSize: 27, lineHeight: 32 },
  h3: { fontFamily: fonts.title, fontSize: 22, lineHeight: 27 },
  body: { fontFamily: fonts.hand, fontSize: 17, lineHeight: 25 },
  bodyLarge: { fontFamily: fonts.hand, fontSize: 19, lineHeight: 28 },
  small: { fontFamily: fonts.hand, fontSize: 15, lineHeight: 22 },
  tiny: { fontFamily: fonts.hand, fontSize: 13, lineHeight: 19 },
  label: { fontFamily: fonts.hand, fontSize: 13, lineHeight: 18, letterSpacing: 1.1 },
  number: { fontFamily: fonts.system, fontSize: 19, lineHeight: 24, fontWeight: '700' },
}

export const tones = {
  ink: palette.ink,
  soft: palette.inkSoft,
  faint: palette.inkFaint,
  accent: palette.accent,
  accentDeep: palette.accentDeep,
  good: palette.good,
  warn: palette.warn,
  bad: palette.bad,
  white: palette.white,
} as const

export type Tone = keyof typeof tones

export type Variant = keyof typeof type

import type { ReactNode } from 'react'
import {
  Text as RNText,
  View,
  type StyleProp,
  type TextProps as RNTextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native'

import {
  highlighter,
  palette,
  tilt,
  tones,
  type,
  type HighlighterName,
  type Tone,
  type Variant,
} from '@/theme/tokens'

export type TextProps = RNTextProps & {
  variant?: Variant
  tone?: Tone
  align?: 'left' | 'center' | 'right'
  /** Rotate the text a touch, the way handwriting never sits quite straight. */
  tiltDeg?: number
  style?: StyleProp<TextStyle>
}

/**
 * Every piece of text in the app goes through here, so a screen can say
 * `variant="h2" tone="accent"` instead of naming a font and a hex code.
 */
export function Text({
  variant = 'body',
  tone = 'ink',
  align,
  tiltDeg,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      {...rest}
      style={[
        type[variant],
        { color: tones[tone] },
        align ? { textAlign: align } : null,
        tiltDeg ? tilt(tiltDeg) : null,
        style,
      ]}
    />
  )
}

export type HighlighterProps = {
  children: ReactNode
  color?: HighlighterName
  /** Two swipes look more like a real marker than one clean rectangle. */
  double?: boolean
  style?: StyleProp<ViewStyle>
  barStyle?: StyleProp<ViewStyle>
}

/**
 * A highlighter swipe drawn *behind* its children.
 *
 * It is a real view rather than a background colour so the mark can overshoot
 * the text, sit at an angle, and be translucent - the three things that make it
 * read as a marker stroke instead of a padded label.
 */
export function Highlighter({ children, color = 'yellow', double = false, style, barStyle }: HighlighterProps) {
  const fill = highlighter[color].bar

  return (
    <View style={[{ alignSelf: 'flex-start' }, style]}>
      <View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: -6,
            right: -7,
            top: '24%',
            bottom: '22%',
            backgroundColor: fill,
            borderRadius: 4,
          },
          tilt(-1.3),
          barStyle,
        ]}
      />
      {double ? (
        <View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              left: -3,
              right: -10,
              top: '46%',
              bottom: '14%',
              backgroundColor: fill,
              opacity: 0.7,
              borderRadius: 3,
            },
            tilt(0.8),
          ]}
        />
      ) : null}
      {children}
    </View>
  )
}

export type TitleProps = {
  children: ReactNode
  variant?: 'display' | 'h1' | 'h2' | 'h3'
  /** Draw a highlighter mark behind the title in this colour. */
  mark?: HighlighterName | null
  tone?: Tone
  align?: 'left' | 'center' | 'right'
  tiltDeg?: number
  style?: StyleProp<TextStyle>
  /** A little doodle in front of the words, e.g. "✎" or "♡". */
  lead?: string
}

/** A cutely written heading, optionally marked with a highlighter. */
export function Title({
  children,
  variant = 'h1',
  mark = null,
  tone = 'ink',
  align = 'left',
  tiltDeg = -0.7,
  style,
  lead,
}: TitleProps) {
  const inner = (
    <Text variant={variant} tone={tone} style={style}>
      {lead ? `${lead} ` : ''}
      {children}
    </Text>
  )

  return (
    <View style={[{ alignSelf: align === 'center' ? 'center' : 'flex-start' }, tilt(tiltDeg)]}>
      {mark ? <Highlighter color={mark}>{inner}</Highlighter> : inner}
    </View>
  )
}

/** The "~~~~~" flourish used under headings. */
export function Squiggle({
  count = 11,
  tone = 'accent',
  size = 20,
  style,
}: {
  count?: number
  tone?: Tone
  size?: number
  style?: StyleProp<TextStyle>
}) {
  return (
    <Text variant="h3" tone={tone} style={[{ fontSize: size, lineHeight: size + 6, opacity: 0.75 }, style]}>
      {'~'.repeat(count)}
    </Text>
  )
}

/** An inline highlighted word inside a sentence. */
export function Mark({ children, color = 'yellow' }: { children: ReactNode; color?: HighlighterName }) {
  return <Highlighter color={color} double>{children}</Highlighter>
}

/** Terminal-style monospace label, e.g. for a share slug. */
export function Mono({ children, tone = 'soft', style }: { children: ReactNode; tone?: Tone; style?: StyleProp<TextStyle> }) {
  return (
    <RNText
      style={[
        { fontFamily: undefined, fontSize: 14, letterSpacing: 0.4, color: tones[tone] },
        style,
      ]}
    >
      {children}
    </RNText>
  )
}

export { palette }

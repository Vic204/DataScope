import type { ReactNode } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@/components/text'
import { fonts, layout, palette, radius, shadow, space, tapeColors, tilt } from '@/theme/tokens'

/**
 * Ruled lines are drawn as one fixed layer behind the content instead of per
 * element. 220 lines x 30pt covers roughly 6,600pt of scrolling - far more than
 * any screen here needs - and static views are cheap.
 */
const RULE_COUNT = 220
const RULES = Array.from({ length: RULE_COUNT }, (_, index) => index)

export type PaperScreenProps = {
  children: ReactNode
  /** Off for screens that manage their own scrolling (e.g. a long list). */
  scroll?: boolean
  /** Space kept clear at the bottom, normally for the bottom bar. */
  bottomInset?: number
  /** Hide the ruled lines on dense screens. */
  rules?: boolean
  /** Pull-to-refresh, wired through to the ScrollView. */
  refreshing?: boolean
  onRefresh?: () => void
  style?: StyleProp<ViewStyle>
  contentStyle?: StyleProp<ViewStyle>
}

/**
 * The page every screen is written on: cream paper, ruled lines, a pink margin
 * line, and a centred column so the diary does not become 2000px wide on a
 * desktop browser.
 */
export function PaperScreen({
  children,
  scroll = true,
  bottomInset = space.xxl,
  rules = true,
  refreshing,
  onRefresh,
  style,
  contentStyle,
}: PaperScreenProps) {
  const insets = useSafeAreaInsets()

  const ruledLayer = rules ? (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.ruledLayer]}>
      {RULES.map((index) => (
        <View key={index} style={[styles.rule, { top: (index + 1) * layout.ruled }]} />
      ))}
      <View style={styles.marginLine} />
      <View style={styles.binding} />
    </View>
  ) : null

  const column = (
    <View style={[styles.column, { paddingBottom: bottomInset + insets.bottom }, contentStyle]}>
      {children}
    </View>
  )

  return (
    <SafeAreaView style={[styles.page, style]} edges={['top']}>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(refreshing)}
                onRefresh={onRefresh}
                tintColor={palette.accent}
                colors={[palette.accent]}
              />
            ) : undefined
          }
        >
          {ruledLayer}
          {column}
        </ScrollView>
      ) : (
        <View style={styles.scroll}>
          {ruledLayer}
          {column}
        </View>
      )}
    </SafeAreaView>
  )
}

export type CardProps = {
  children: ReactNode
  /** Which washi tape to stick it down with. `null` leaves the card bare. */
  tape?: number | null
  tiltDeg?: number
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  /** Draws a thin highlighter bar along the top edge. */
  accent?: string
}

/** A card that looks taped into the diary. */
export function Card({ children, tape = null, tiltDeg = 0, onPress, style, accent }: CardProps) {
  const body = (
    <>
      {accent ? <View style={[styles.accentBar, { backgroundColor: accent }]} /> : null}
      {tape !== null ? <Tape color={tapeColors[tape % tapeColors.length]} /> : null}
      {children}
    </>
  )

  if (!onPress) {
    return <View style={[styles.card, tiltDeg ? tilt(tiltDeg) : null, style]}>{body}</View>
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressableWrap,
        tiltDeg ? tilt(tiltDeg) : null,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <View style={styles.card}>{body}</View>
    </Pressable>
  )
}

/** A strip of translucent washi tape, stuck across the top edge of a card. */
export function Tape({
  color = tapeColors[0],
  side = 'left',
  width = 84,
  tiltDeg = -4.5,
}: {
  color?: string
  side?: 'left' | 'right' | 'center'
  width?: number
  tiltDeg?: number
}) {
  const position: ViewStyle =
    side === 'center' ? { alignSelf: 'center' } : side === 'left' ? { left: 18 } : { right: 18 }

  return (
    <View
      pointerEvents="none"
      style={[styles.tape, { backgroundColor: color, width }, position, tilt(tiltDeg)]}
    >
      <View style={styles.tapeEdge} />
      <View style={[styles.tapeEdge, { top: undefined, bottom: 0 }]} />
    </View>
  )
}

/** A dashed divider, like a page torn along a perforation. */
export function Rule({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.ruleDashed, style]} />
}

/**
 * A decorative glyph. Text instead of image assets, so there is nothing to
 * download and nothing to break at build time.
 */
export function Doodle({
  children = '✦',
  size = 18,
  color = palette.accent,
  tiltDeg = 0,
  style,
}: {
  children?: ReactNode
  size?: number
  color?: string
  tiltDeg?: number
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View pointerEvents="none" style={[tiltDeg ? tilt(tiltDeg) : null, style]}>
      <RNText style={{ fontSize: size, lineHeight: size + 4, color, fontFamily: fonts.system }}>
        {children}
      </RNText>
    </View>
  )
}

/** A label/value row, aligned like a form. */
export function KeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.keyValue}>
      <View style={styles.keyValueLabel}>
        <Text variant="tiny" tone="soft">
          {label}
        </Text>
      </View>
      <View style={styles.keyValueValue}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: palette.paper,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  ruledLayer: {
    overflow: 'hidden',
  },
  rule: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.rule,
  },
  marginLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: layout.marginLine,
    width: 1.5,
    backgroundColor: palette.marginLine,
    opacity: 0.55,
  },
  /** A hint of spiral binding down the left edge. */
  binding: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 10,
    backgroundColor: 'rgba(138, 124, 147, 0.06)',
  },
  column: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: layout.gutter,
    paddingTop: space.md,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: 'rgba(59, 52, 68, 0.06)',
    padding: space.lg,
    ...shadow.card,
  },
  pressableWrap: {
    borderRadius: radius.card,
  },
  pressed: {
    opacity: 0.92,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: radius.card,
    right: radius.card,
    height: 3,
    borderRadius: 3,
    opacity: 0.85,
  },
  tape: {
    position: 'absolute',
    top: -11,
    height: 24,
    borderRadius: 2,
    opacity: 0.95,
  },
  tapeEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  ruleDashed: {
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    borderBottomColor: 'rgba(59, 52, 68, 0.16)',
    marginVertical: space.lg,
  },
  keyValue: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  keyValueLabel: {
    minWidth: 104,
    paddingTop: 3,
  },
  keyValueValue: {
    flex: 1,
  },
})

import { Pressable, StyleSheet, View } from 'react-native'
import Svg, { Circle } from 'react-native-svg'

import { Text } from '@/components/text'
import { fonts, highlighter, palette, radius, space, type HighlighterName } from '@/theme/tokens'

/**
 * Charts are drawn from plain views and a little SVG. No charting dependency,
 * which keeps the bundle small and lets every mark be styled like a highlighter
 * rather than like a business dashboard.
 */

export type BarDatum = { label: string; count: number; percent: number }

/** Horizontal bars - the clearest way to show "pick one" results on a phone. */
export function Bars({
  data,
  color = 'mint',
  showPercent = true,
  emptyLabel = 'no answers yet',
}: {
  data: BarDatum[]
  color?: HighlighterName
  showPercent?: boolean
  emptyLabel?: string
}) {
  if (data.length === 0) {
    return (
      <Text variant="small" tone="faint">
        {emptyLabel}
      </Text>
    )
  }

  const max = Math.max(...data.map((entry) => entry.count), 1)

  return (
    <View style={styles.bars}>
      {data.map((entry) => {
        const width = `${Math.max((entry.count / max) * 100, entry.count > 0 ? 4 : 0)}%` as const
        return (
          <View key={entry.label} style={styles.barRow}>
            <View style={styles.barHead}>
              <Text variant="small" tone="ink" style={styles.barLabel} numberOfLines={2}>
                {entry.label}
              </Text>
              <Text variant="small" tone="soft">
                {entry.count}
                {showPercent ? `  ·  ${entry.percent}%` : ''}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width, backgroundColor: highlighter[color].bar, borderColor: highlighter[color].solid },
                ]}
              />
            </View>
          </View>
        )
      })}
    </View>
  )
}

/** A donut, for the share of answers an option took. */
export function Donut({
  data,
  size = 150,
  thickness = 20,
  centerLabel,
  centerSub,
}: {
  data: { label: string; value: number; color: string }[]
  size?: number
  thickness?: number
  centerLabel?: string
  centerSub?: string
}) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0)
  const radiusValue = (size - thickness) / 2
  const circumference = 2 * Math.PI * radiusValue

  // A circle's path starts at 3 o'clock and runs clockwise. Beginning the dash
  // pattern a quarter of the way round puts the first slice at 12 o'clock,
  // which reads like a clock face - and needs no group rotation.
  let offset = circumference / 4

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radiusValue}
          stroke="rgba(59, 52, 68, 0.08)"
          strokeWidth={thickness}
          fill="none"
        />
        {total > 0
          ? data.map((entry) => {
              if (entry.value <= 0) return null
              const length = (entry.value / total) * circumference
              const dash = `${length} ${circumference - length}`
              const element = (
                <Circle
                  key={entry.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radiusValue}
                  stroke={entry.color}
                  strokeWidth={thickness}
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  fill="none"
                />
              )
              offset += length
              return element
            })
          : null}
      </Svg>

      <View style={styles.donutCenter}>
        <Text variant="h2" tone="ink" align="center">
          {centerLabel ?? String(total)}
        </Text>
        {centerSub ? (
          <Text variant="tiny" tone="soft" align="center">
            {centerSub}
          </Text>
        ) : null}
      </View>
    </View>
  )
}

/** A legend to sit next to a donut. */
export function Legend({
  items,
}: {
  items: { label: string; value: number; percent: number; color: string }[]
}) {
  return (
    <View style={styles.legend}>
      {items.map((item) => (
        <View key={item.label} style={styles.legendRow}>
          <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
          <Text variant="small" tone="ink" style={styles.legendLabel} numberOfLines={2}>
            {item.label}
          </Text>
          <Text variant="small" tone="soft">
            {item.value} · {item.percent}%
          </Text>
        </View>
      ))}
    </View>
  )
}

/** Vertical columns, used for responses per day. */
export function Columns({
  data,
  color = 'sky',
  height = 84,
}: {
  data: { label: string; value: number }[]
  color?: HighlighterName
  height?: number
}) {
  const max = Math.max(...data.map((entry) => entry.value), 1)

  return (
    <View>
      <View style={[styles.columns, { height }]}>
        {data.map((entry, index) => {
          const barHeight = entry.value === 0 ? 3 : Math.max((entry.value / max) * height, 6)
          return (
            <View key={`${entry.label}-${index}`} style={styles.column}>
              <View
                style={[
                  styles.columnBar,
                  {
                    height: barHeight,
                    backgroundColor: entry.value === 0 ? 'rgba(59,52,68,0.10)' : highlighter[color].bar,
                    borderColor: highlighter[color].solid,
                  },
                ]}
              />
            </View>
          )
        })}
      </View>
      <View style={styles.columnLabels}>
        <Text variant="tiny" tone="faint">
          {data[0]?.label ?? ''}
        </Text>
        <Text variant="tiny" tone="faint">
          today
        </Text>
      </View>
    </View>
  )
}

/** Star average, optionally interactive. */
export function Stars({
  value,
  max = 5,
  size = 26,
  onChange,
}: {
  value: number
  max?: number
  size?: number
  onChange?: (value: number) => void
}) {
  return (
    <View style={styles.stars}>
      {Array.from({ length: max }, (_, index) => {
        const star = index + 1
        // An average is routinely fractional (3.5 stars), so the last star is
        // filled to the fraction rather than rounding the score up.
        const fill = onChange ? (star <= value ? 1 : 0) : Math.max(0, Math.min(1, value - index))

        const starFace = (color: string) => (
          <Text
            style={{
              width: size,
              fontSize: size,
              lineHeight: size + 4,
              color,
              fontFamily: fonts.system,
            }}
          >
            ★
          </Text>
        )

        const glyph = (
          <View style={{ width: size, height: size + 4, overflow: 'hidden' }}>
            {starFace('rgba(59, 52, 68, 0.18)')}
            {fill > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: size + 4,
                  width: size * fill,
                  overflow: 'hidden',
                }}
              >
                {starFace(palette.warn)}
              </View>
            ) : null}
          </View>
        )

        if (!onChange) return <View key={star}>{glyph}</View>

        return (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            hitSlop={4}
            accessibilityLabel={`${star} of ${max}`}
            style={({ pressed }) => (pressed ? styles.pressed : null)}
          >
            {glyph}
          </Pressable>
        )
      })}
    </View>
  )
}

/** A big average number with a small caption. */
export function Average({ value, max, caption }: { value: number | null; max: number; caption: string }) {
  return (
    <View style={styles.average}>
      <Text variant="h1" tone="accent" style={styles.averageValue}>
        {value === null ? '—' : value.toFixed(1)}
      </Text>
      <Text variant="tiny" tone="soft">
        {caption} · out of {max}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  bars: {
    gap: space.md,
  },
  barRow: {
    gap: 5,
  },
  barHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  barLabel: {
    flex: 1,
  },
  track: {
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(59, 52, 68, 0.07)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 7,
    borderWidth: 1,
    opacity: 0.95,
  },
  donutCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flex: 1,
    gap: space.sm,
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    flex: 1,
  },
  columns: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  column: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-end',
  },
  columnBar: {
    borderWidth: 1,
    borderRadius: 4,
  },
  columnLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  average: {
    alignItems: 'center',
    paddingHorizontal: space.md,
  },
  averageValue: {
    lineHeight: 40,
  },
})

export { radius }

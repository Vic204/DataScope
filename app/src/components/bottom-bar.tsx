import { usePathname, useRouter } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Text } from '@/components/text'
import { palette, shadow, space, tilt } from '@/theme/tokens'

/**
 * A four-tab diary index, built by hand instead of with a tab navigator.
 *
 * Reasons: it looks nothing like a platform tab bar (it is a strip of paper
 * with a highlighter on the current tab), it behaves identically on web and
 * native, and it keeps the navigation surface to plain `router.replace` calls.
 */

const TABS = [
  { href: '/', label: 'discover', glyph: '✦' },
  { href: '/mine', label: 'mine', glyph: '✎' },
  { href: '/answered', label: 'answered', glyph: '✓' },
  { href: '/profile', label: 'me', glyph: '♡' },
] as const

export function BottomBar() {
  const pathname = usePathname()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.sm) }]}>
      {TABS.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)

        return (
          <Pressable
            key={tab.href}
            onPress={() => router.replace(tab.href)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [styles.tab, pressed ? styles.pressed : null]}
          >
            <View style={styles.tabInner}>
              {active ? <View style={[styles.mark, tilt(-1.5)]} pointerEvents="none" /> : null}
              <Text
                style={[styles.glyph, { color: active ? palette.accentDeep : palette.inkFaint }]}
              >
                {tab.glyph}
              </Text>
              <Text variant="tiny" tone={active ? 'ink' : 'faint'}>
                {tab.label}
              </Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: palette.paperShade,
    borderTopWidth: 1.5,
    borderTopColor: 'rgba(59, 52, 68, 0.10)',
    borderStyle: 'dashed',
    paddingTop: space.sm,
    paddingHorizontal: space.sm,
    ...shadow.card,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    minWidth: 64,
    gap: 1,
  },
  mark: {
    position: 'absolute',
    left: 2,
    right: 2,
    top: 2,
    bottom: 6,
    backgroundColor: 'rgba(255, 224, 102, 0.55)',
    borderRadius: 8,
  },
  glyph: {
    fontSize: 17,
    lineHeight: 21,
    fontFamily: undefined,
  },
  pressed: {
    opacity: 0.7,
  },
})

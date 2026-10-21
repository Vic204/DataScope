import type { ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { IconButton } from '@/components/controls'
import { Text, Title } from '@/components/text'
import type { HighlighterName } from '@/theme/tokens'
import { space } from '@/theme/tokens'
import { useRouter } from 'expo-router'

/** The header used by every screen inside the app: back arrow, title, actions. */
export function ScreenHeader({
  title,
  subtitle,
  mark = 'yellow',
  onBack,
  right,
  lead,
  style,
}: {
  title: string
  subtitle?: string
  mark?: HighlighterName | null
  /** Defaults to going back in history. Pass a route to leave the screen. */
  onBack?: (() => void) | false
  right?: ReactNode
  lead?: string
  style?: StyleProp<ViewStyle>
}) {
  const router = useRouter()

  const handleBack =
    onBack === false ? undefined : onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))

  return (
    <View style={[styles.header, style]}>
      <View style={styles.row}>
        {handleBack ? <IconButton glyph="←" label="go back" onPress={handleBack} /> : null}
        <View style={styles.titleWrap}>
          <Title variant="h1" mark={mark ?? undefined} lead={lead}>
            {title}
          </Title>
          {subtitle ? (
            <Text variant="small" tone="soft" style={styles.subtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    marginBottom: space.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  titleWrap: {
    flex: 1,
    paddingTop: 2,
  },
  subtitle: {
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingTop: 6,
  },
})

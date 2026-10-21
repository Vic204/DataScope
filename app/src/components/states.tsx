import type { ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'

import { Button } from '@/components/controls'
import { Doodle } from '@/components/paper'
import { Text, Title } from '@/components/text'
import { palette, space } from '@/theme/tokens'

/** Something is loading. */
export function Loading({ caption = 'one moment…' }: { caption?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={palette.accent} />
      <Text variant="small" tone="soft" style={styles.caption}>
        {caption}
      </Text>
    </View>
  )
}

/** A whole screen is loading. */
export function PageLoader({ caption }: { caption?: string }) {
  return (
    <View style={styles.pageCenter}>
      <ActivityIndicator color={palette.accent} size="large" />
      <Text variant="body" tone="soft" style={styles.caption}>
        {caption ?? 'flipping to the right page…'}
      </Text>
    </View>
  )
}

/**
 * Something went wrong. Always shows the real reason from the API - a diary
 * that says "oops" without saying why is useless when you are debugging.
 */
export function ErrorNote({
  message,
  onRetry,
  style,
}: {
  message: string
  onRetry?: () => void
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.errorNote, style]}>
      <View style={styles.errorHead}>
        <Doodle color={palette.bad} size={20}>
          !!
        </Doodle>
        <Text variant="body" tone="bad" style={styles.errorTitle}>
          that did not work
        </Text>
      </View>
      <Text variant="small" tone="soft">
        {message}
      </Text>
      {onRetry ? (
        <Button label="try again" onPress={onRetry} variant="secondary" size="sm" style={styles.retry} />
      ) : null}
    </View>
  )
}

/** Nothing here yet. */
export function EmptyNote({
  title,
  body,
  doodle = '✧',
  action,
  style,
}: {
  title: string
  body?: string
  doodle?: string
  action?: ReactNode
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.empty, style]}>
      <Doodle size={34} color={palette.inkFaint} tiltDeg={-6}>
        {doodle}
      </Doodle>
      <Title variant="h3" tone="soft" align="center" mark="sky">
        {title}
      </Title>
      {body ? (
        <Text variant="small" tone="faint" align="center" style={styles.emptyBody}>
          {body}
        </Text>
      ) : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </View>
  )
}

/** A one-line note under a field. */
export function InlineError({ children }: { children: ReactNode }) {
  return (
    <Text variant="tiny" tone="bad">
      {children}
    </Text>
  )
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xxl,
    gap: space.sm,
  },
  pageCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.paper,
    gap: space.md,
  },
  caption: {
    marginTop: space.xs,
  },
  errorNote: {
    backgroundColor: 'rgba(255, 170, 193, 0.28)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(209, 86, 79, 0.25)',
    padding: space.lg,
    gap: space.sm,
  },
  errorHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  errorTitle: {
    marginLeft: 2,
  },
  retry: {
    alignSelf: 'flex-start',
    marginTop: space.xs,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xxl,
    gap: space.sm,
  },
  emptyBody: {
    maxWidth: 320,
  },
  emptyAction: {
    marginTop: space.md,
  },
})

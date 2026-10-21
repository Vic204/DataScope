import { useEffect, useState, type ReactNode } from 'react'
import { Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native'

/**
 * Small entrance animations. Deliberately built on React Native's own Animated
 * API rather than Reanimated: the movement is simple (fade + a tiny rise), it
 * needs no worklets or extra build config, and it behaves identically on web.
 */

const NATIVE_DRIVER = Platform.OS !== 'web'

export function FadeIn({
  children,
  delay = 0,
  distance = 12,
  duration = 420,
  style,
}: {
  children: ReactNode
  delay?: number
  distance?: number
  duration?: number
  style?: StyleProp<ViewStyle>
}) {
  // `useState` rather than `useRef`: the value is read while rendering the
  // animated style, and refs must not be read during render.
  const [progress] = useState(() => new Animated.Value(0))

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: NATIVE_DRIVER,
    })
    animation.start()
    return () => animation.stop()
  }, [delay, duration, progress])

  return (
    <Animated.View
      style={[
        {
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [distance, 0],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}

/** Staggers a list of children in, one just after another. */
export function Stagger({
  children,
  step = 70,
  start = 0,
  style,
}: {
  children: ReactNode[]
  step?: number
  start?: number
  style?: StyleProp<ViewStyle>
}) {
  return (
    <>
      {children.map((child, index) => (
        <FadeIn key={index} delay={start + index * step} style={style}>
          {child}
        </FadeIn>
      ))}
    </>
  )
}

/** Gives its child a gentle, endless wiggle. Used sparingly, for delight. */
export function Wiggle({
  children,
  amplitude = 2,
  style,
}: {
  children: ReactNode
  amplitude?: number
  style?: StyleProp<ViewStyle>
}) {
  const [wave] = useState(() => new Animated.Value(0))

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wave, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(wave, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: NATIVE_DRIVER,
        }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [wave])

  return (
    <Animated.View
      style={[
        {
          transform: [
            {
              rotate: wave.interpolate({
                inputRange: [0, 1],
                outputRange: [`-${amplitude}deg`, `${amplitude}deg`],
              }),
            },
          ],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  )
}

import { Stack } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { BottomBar } from '@/components/bottom-bar'
import { palette } from '@/theme/tokens'

/**
 * The four diary sections share one stack and one hand-made index bar along the
 * bottom. The bar sits in normal flow rather than floating, so nothing ever
 * hides behind it.
 */
export default function TabsLayout() {
  return (
    <View style={styles.wrap}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.paper },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="mine" />
        <Stack.Screen name="answered" />
        <Stack.Screen name="profile" />
      </Stack>
      <BottomBar />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: palette.paper,
  },
})

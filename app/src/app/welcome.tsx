import { useRouter } from 'expo-router'
import { StyleSheet, View } from 'react-native'

import { Button, StickyNote } from '@/components/controls'
import { FadeIn, Wiggle } from '@/components/motion'
import { Card, Doodle, PaperScreen, Rule } from '@/components/paper'
import { Squiggle, Text, Title } from '@/components/text'
import { palette, space } from '@/theme/tokens'

/** The first page of the notebook. */
export default function WelcomeScreen() {
  const router = useRouter()

  return (
    <PaperScreen contentStyle={styles.page}>
      <FadeIn>
        <View style={styles.brandRow}>
          <Wiggle amplitude={6}>
            <Doodle size={30} color={palette.accent}>
              ✿
            </Doodle>
          </Wiggle>
          <Text variant="label" tone="soft">
            a small notebook for big questions
          </Text>
        </View>

        <Title variant="display" mark="yellow" tiltDeg={-1.2}>
          DataScope
        </Title>
        <Squiggle count={13} />
      </FadeIn>

      <FadeIn delay={120}>
        <Title variant="h2" tone="accent" tiltDeg={-1.5}>
          dear diary,
        </Title>
        <Text variant="bodyLarge" style={styles.lede}>
          This is where people write down the questions they actually want answered — and where you
          answer the ones that fit <Text variant="bodyLarge" tone="accentDeep">you</Text>.
        </Text>
      </FadeIn>

      <FadeIn delay={220}>
        <Card tape={0} tiltDeg={-0.5} style={styles.card}>
          <ListLine glyph="✎" title="write it your way" body="Six kinds of question, from a quick star rating to a long answer." />
          <Rule />
          <ListLine glyph="✦" title="answer what matches you" body="Your profile decides which surveys find you in the feed." />
          <Rule />
          <ListLine glyph="✓" title="watch the answers appear" body="Charts, averages and response counts, drawn as you collect." />
        </Card>
      </FadeIn>

      <FadeIn delay={320}>
        <View style={styles.actions}>
          <Button label="start my diary" trailing="→" onPress={() => router.push('/sign-up')} fullWidth tiltDeg={-0.4} />
          <Button
            label="i already have one"
            variant="secondary"
            onPress={() => router.push('/sign-in')}
            fullWidth
          />
        </View>
      </FadeIn>

      <FadeIn delay={420}>
        <StickyNote color="sky" style={styles.demo} tiltDeg={0.7}>
          <Text variant="small" tone="soft">
            just looking around? use
          </Text>
          <Text variant="body" tone="ink">
            amal@datascope.dev
          </Text>
          <Text variant="body" tone="ink">
            password123
          </Text>
        </StickyNote>
      </FadeIn>
    </PaperScreen>
  )
}

function ListLine({ glyph, title, body }: { glyph: string; title: string; body: string }) {
  return (
    <View style={styles.line}>
      <Doodle size={20} color={palette.accent}>
        {glyph}
      </Doodle>
      <View style={styles.lineText}>
        <Text variant="body" tone="ink">
          {title}
        </Text>
        <Text variant="small" tone="soft">
          {body}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  page: {
    paddingTop: space.xxl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.xs,
  },
  lede: {
    marginTop: space.sm,
  },
  card: {
    marginTop: space.xl,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
  },
  lineText: {
    flex: 1,
  },
  actions: {
    gap: space.md,
    marginTop: space.xl,
  },
  demo: {
    marginTop: space.xl,
    alignSelf: 'flex-start',
    minWidth: 220,
  },
})

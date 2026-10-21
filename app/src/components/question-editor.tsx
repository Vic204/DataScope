import { Pressable, StyleSheet, View } from 'react-native'

import { Checkbox, Field, IconButton, Segmented } from '@/components/controls'
import { Card, Doodle } from '@/components/paper'
import { Text } from '@/components/text'
import { QUESTION_TYPES, QUESTION_TYPE_LABELS, type QuestionType } from '@/lib/api'
import { draftOption, isChoice, isNumeric, retype, summarise, type DraftQuestion } from '@/lib/drafts'
import { palette, space } from '@/theme/tokens'

/**
 * One question, being written.
 *
 * The editor is the same for every type - only the middle section changes:
 * options for the choice types, a range for the numeric ones, nothing extra for
 * free text.
 */
export function QuestionEditor({
  question,
  index,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  question: DraftQuestion
  index: number
  total: number
  onChange: (next: DraftQuestion) => void
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
}) {
  const update = (patch: Partial<DraftQuestion>) => onChange({ ...question, ...patch })

  return (
    <Card tape={index % 5} tiltDeg={index % 2 === 0 ? -0.25 : 0.25} style={styles.card}>
      <View style={styles.head}>
        <Doodle size={20} color={palette.accent} tiltDeg={-5}>
          {index + 1}
        </Doodle>
        <Text variant="tiny" tone="soft" style={styles.summary}>
          {summarise(question)}
        </Text>
        <View style={styles.controls}>
          <IconButton
            glyph="↑"
            label="move this question up"
            disabled={index === 0}
            onPress={() => onMove(-1)}
          />
          <IconButton
            glyph="↓"
            label="move this question down"
            disabled={index === total - 1}
            onPress={() => onMove(1)}
          />
          <IconButton glyph="✕" label="remove this question" tone="accent" onPress={onRemove} />
        </View>
      </View>

      <Text variant="tiny" tone="faint" style={styles.pickLabel}>
        what kind of answer do you want?
      </Text>
      <Segmented
        options={QUESTION_TYPES.map((type: QuestionType) => ({
          value: type,
          label: QUESTION_TYPE_LABELS[type],
        }))}
        value={question.type}
        onChange={(type) => onChange(retype(question, type))}
        color="sky"
      />

      <Field
        label="the question"
        value={question.label}
        onChangeText={(label) => update({ label })}
        placeholder="What do you actually want to know?"
      />

      <Field
        label="a note underneath, if it helps"
        value={question.helpText}
        onChangeText={(helpText) => update({ helpText })}
        placeholder="No wrong answers here."
        maxLength={200}
      />

      {isChoice(question.type) ? (
        <OptionsEditor question={question} onChange={onChange} />
      ) : null}

      {isNumeric(question.type) ? (
        <RangeEditor question={question} update={update} />
      ) : null}

      <Pressable
        onPress={() => update({ required: !question.required })}
        style={styles.requiredRow}
      >
        <Checkbox checked={question.required} onPress={() => update({ required: !question.required })} />
        <Text variant="small" tone="soft">
          this one is required
        </Text>
      </Pressable>
    </Card>
  )
}

function OptionsEditor({
  question,
  onChange,
}: {
  question: DraftQuestion
  onChange: (next: DraftQuestion) => void
}) {
  const replace = (key: string, label: string) =>
    onChange({
      ...question,
      options: question.options.map((option) => (option.key === key ? { ...option, label } : option)),
    })

  const remove = (key: string) =>
    onChange({ ...question, options: question.options.filter((option) => option.key !== key) })

  const add = () => onChange({ ...question, options: [...question.options, draftOption('')] })

  return (
    <View style={styles.options}>
      {question.options.map((option, index) => (
        <View key={option.key} style={styles.optionRow}>
          <View style={styles.optionBadge}>
            <Text variant="tiny" tone="soft">
              {String.fromCharCode(65 + index)}
            </Text>
          </View>
          <Field
            value={option.label}
            onChangeText={(label) => replace(option.key, label)}
            placeholder={index < 2 ? `option ${index + 1}` : 'another option'}
            maxLength={120}
            style={styles.optionField}
          />
          <IconButton
            glyph="✕"
            label="remove this option"
            disabled={question.options.length <= 2}
            onPress={() => remove(option.key)}
            style={styles.optionRemove}
          />
        </View>
      ))}

      <Pressable
        onPress={add}
        disabled={question.options.length >= 20}
        style={({ pressed }) => [styles.addOption, pressed ? styles.pressed : null]}
      >
        <Text variant="small" tone="accent">
          + add another option
        </Text>
      </Pressable>
    </View>
  )
}

function RangeEditor({
  question,
  update,
}: {
  question: DraftQuestion
  update: (patch: Partial<DraftQuestion>) => void
}) {
  const isRating = question.type === 'rating'

  return (
    <View>
      <View style={styles.rangeRow}>
        <Field
          label={isRating ? 'fewest stars' : 'lowest value'}
          value={question.min}
          onChangeText={(min) => update({ min })}
          keyboardType="number-pad"
          placeholder="1"
          style={styles.rangeField}
        />
        <Field
          label={isRating ? 'most stars' : 'highest value'}
          value={question.max}
          onChangeText={(max) => update({ max })}
          keyboardType="number-pad"
          placeholder={isRating ? '5' : '10'}
          style={styles.rangeField}
        />
      </View>
      <Text variant="tiny" tone="faint">
        {isRating
          ? 'star ratings read best from 1 to 5.'
          : 'a scale can run from 1 up to 10.'}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    marginBottom: space.lg,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.md,
  },
  summary: {
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickLabel: {
    marginBottom: space.sm,
  },
  options: {
    marginBottom: space.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  optionBadge: {
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: 'rgba(59, 52, 68, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 9,
  },
  optionField: {
    flex: 1,
  },
  optionRemove: {
    marginTop: 2,
  },
  addOption: {
    paddingVertical: space.sm,
    alignSelf: 'flex-start',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: space.md,
  },
  rangeField: {
    flex: 1,
  },
  requiredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginTop: space.xs,
  },
  pressed: {
    opacity: 0.7,
  },
})

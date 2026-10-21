import { Pressable, StyleSheet, View } from 'react-native'

import { Checkbox, Field, RadioMark } from '@/components/controls'
import { Stars } from '@/components/charts'
import { Text } from '@/components/text'
import type { AnswerValue, Question, QuestionOption } from '@/lib/api'
import { highlighter, palette, radius, space } from '@/theme/tokens'

/**
 * Renders the input for one survey question and reports back a single value
 * shaped the way the API expects:
 *
 *   short_text / long_text  -> string
 *   single_choice           -> option id (string)
 *   multi_choice            -> option ids (string[])
 *   rating / scale          -> number
 */

function optionIds(value: AnswerValue | undefined): string[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string' && value) return [value]
  return []
}

export function QuestionField({
  question,
  value,
  onChange,
  number,
  disabled = false,
}: {
  question: Question
  value: AnswerValue | undefined
  onChange: (value: AnswerValue) => void
  number?: number
  disabled?: boolean
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        {number !== undefined ? (
          <View style={styles.number}>
            <Text variant="tiny" tone="white">
              {number}
            </Text>
          </View>
        ) : null}
        <View style={styles.headText}>
          <Text variant="bodyLarge" tone="ink">
            {question.label}
            {question.required ? <Text tone="accent"> *</Text> : null}
          </Text>
          {question.helpText ? (
            <Text variant="tiny" tone="faint" style={styles.help}>
              {question.helpText}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.widget}>
        <Widget
          question={question}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      </View>
    </View>
  )
}

function Widget({
  question,
  value,
  onChange,
  disabled,
}: {
  question: Question
  value: AnswerValue | undefined
  onChange: (value: AnswerValue) => void
  disabled: boolean
}) {
  switch (question.type) {
    case 'short_text':
      return (
        <Field
          value={typeof value === 'string' ? value : ''}
          onChangeText={(next) => !disabled && onChange(next)}
          placeholder="type your answer"
          maxLength={300}
          style={styles.fieldTight}
        />
      )

    case 'long_text':
      return (
        <Field
          value={typeof value === 'string' ? value : ''}
          onChangeText={(next) => !disabled && onChange(next)}
          placeholder="take your time…"
          multiline
          numberOfLines={5}
          maxLength={5000}
          style={styles.fieldTight}
        />
      )

    case 'single_choice':
      return (
        <View style={styles.options}>
          {question.options.map((option) => (
            <OptionRow
              key={option.id}
              option={option}
              selected={value === option.id}
              onPress={() => !disabled && onChange(option.id)}
              multi={false}
            />
          ))}
        </View>
      )

    case 'multi_choice': {
      const selected = optionIds(value)
      return (
        <View style={styles.options}>
          {question.options.map((option) => {
            const isOn = selected.includes(option.id)
            return (
              <OptionRow
                key={option.id}
                option={option}
                selected={isOn}
                multi
                onPress={() => {
                  if (disabled) return
                  const next = isOn
                    ? selected.filter((id) => id !== option.id)
                    : [...selected, option.id]
                  onChange(next)
                }}
              />
            )
          })}
          <Text variant="tiny" tone="faint">
            pick as many as you like
          </Text>
        </View>
      )
    }

    case 'rating': {
      const max = question.max ?? 5
      return (
        <View style={styles.ratingRow}>
          <Stars
            value={typeof value === 'number' ? value : 0}
            max={max}
            size={34}
            onChange={disabled ? undefined : onChange}
          />
          {typeof value === 'number' ? (
            <Text variant="small" tone="soft">
              {value} / {max}
            </Text>
          ) : (
            <Text variant="small" tone="faint">
              tap a star
            </Text>
          )}
        </View>
      )
    }

    case 'scale': {
      const min = question.min ?? 1
      const max = question.max ?? 10
      const steps = Array.from({ length: max - min + 1 }, (_, index) => min + index)
      return (
        <View>
          <View style={styles.scaleRow}>
            {steps.map((step) => {
              const active = value === step
              return (
                <Pressable
                  key={step}
                  onPress={() => !disabled && onChange(step)}
                  style={({ pressed }) => [
                    styles.scaleStep,
                    active ? { backgroundColor: highlighter.sky.bar, borderColor: palette.accent } : null,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text variant="small" tone={active ? 'accentDeep' : 'soft'}>
                    {step}
                  </Text>
                </Pressable>
              )
            })}
          </View>
          <View style={styles.scaleLabels}>
            <Text variant="tiny" tone="faint">
              {min} · not really
            </Text>
            <Text variant="tiny" tone="faint">
              absolutely · {max}
            </Text>
          </View>
        </View>
      )
    }

    default:
      return (
        <Text variant="small" tone="bad">
          This question type is not supported by the app yet ({question.type}).
        </Text>
      )
  }
}

function OptionRow({
  option,
  selected,
  onPress,
  multi,
}: {
  option: QuestionOption
  selected: boolean
  onPress: () => void
  multi: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected ? styles.optionOn : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {multi ? <Checkbox checked={selected} onPress={onPress} /> : <RadioMark selected={selected} />}
      <Text variant="body" tone="ink" style={styles.optionLabel}>
        {option.label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.xl,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    marginBottom: space.md,
  },
  number: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  headText: {
    flex: 1,
  },
  help: {
    marginTop: 2,
  },
  widget: {
    paddingLeft: 32,
  },
  fieldTight: {
    marginBottom: 0,
  },
  options: {
    gap: space.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 10,
    paddingHorizontal: space.md,
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  optionOn: {
    borderColor: 'rgba(232, 105, 142, 0.35)',
    backgroundColor: 'rgba(255, 170, 193, 0.16)',
  },
  optionLabel: {
    flex: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    flexWrap: 'wrap',
  },
  scaleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  scaleStep: {
    minWidth: 42,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: 'rgba(59, 52, 68, 0.16)',
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.sm,
  },
  pressed: {
    opacity: 0.8,
  },
})

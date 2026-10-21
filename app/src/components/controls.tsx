import { useState, type ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native'

import { Text } from '@/components/text'
import { fonts, highlighter, palette, radius, shadow, space, tilt } from '@/theme/tokens'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export type ButtonProps = {
  label: string
  onPress?: () => void
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  disabled?: boolean
  leading?: string
  trailing?: string
  fullWidth?: boolean
  tiltDeg?: number
  style?: StyleProp<ViewStyle>
}

const BUTTON_SIZES = {
  sm: { paddingVertical: 8, paddingHorizontal: 14, fontSize: 15 },
  md: { paddingVertical: 12, paddingHorizontal: 20, fontSize: 17 },
  lg: { paddingVertical: 15, paddingHorizontal: 26, fontSize: 19 },
} as const

/** A chunky, satisfying button - the kind you would draw in the margin. */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leading,
  trailing,
  fullWidth = false,
  tiltDeg = 0,
  style,
}: ButtonProps) {
  const dims = BUTTON_SIZES[size]
  const isPrimary = variant === 'primary' || variant === 'danger'

  const variantStyle: ViewStyle =
    variant === 'primary'
      ? { backgroundColor: palette.accent, ...shadow.sticky }
      : variant === 'danger'
        ? { backgroundColor: palette.bad, ...shadow.sticky }
        : variant === 'secondary'
          ? {
              backgroundColor: palette.card,
              borderWidth: 1.5,
              borderColor: 'rgba(59, 52, 68, 0.14)',
            }
          : { backgroundColor: 'transparent' }

  const textTone = isPrimary ? 'white' : variant === 'ghost' ? 'accent' : 'ink'

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variantStyle,
        dims,
        fullWidth ? styles.fullWidth : null,
        tiltDeg ? tilt(tiltDeg) : null,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled || loading ? styles.buttonDisabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={isPrimary ? palette.white : palette.accent} />
      ) : (
        <Text
          variant={size === 'sm' ? 'small' : 'body'}
          tone={textTone}
          style={{ fontSize: dims.fontSize, textAlign: 'center' }}
        >
          {leading ? `${leading}  ` : ''}
          {label}
          {trailing ? `  ${trailing}` : ''}
        </Text>
      )}
    </Pressable>
  )
}

/** A small round-ish pressable for a single glyph, e.g. a back arrow. */
export function IconButton({
  glyph,
  onPress,
  label,
  tone = 'ink',
  disabled = false,
  style,
}: {
  glyph: string
  onPress: () => void
  label?: string
  tone?: 'ink' | 'accent'
  disabled?: boolean
  style?: StyleProp<ViewStyle>
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={10}
      style={({ pressed }) => [
        styles.iconButton,
        pressed && !disabled ? styles.buttonPressed : null,
        disabled ? styles.buttonDisabled : null,
        style,
      ]}
    >
      <Text variant="h2" tone={tone} style={styles.iconGlyph}>
        {glyph}
      </Text>
    </Pressable>
  )
}

/** A tag. Selectable and/or removable, used for interests and filters. */
export function Chip({
  label,
  active = false,
  onPress,
  onRemove,
  color = 'yellow',
  style,
}: {
  label: string
  active?: boolean
  onPress?: () => void
  onRemove?: () => void
  color?: keyof typeof highlighter
  style?: StyleProp<ViewStyle>
}) {
  const content = (
    <View
      style={[
        styles.chip,
        active
          ? { backgroundColor: highlighter[color].bar, borderColor: 'transparent' }
          : { borderColor: 'rgba(59, 52, 68, 0.18)' },
        style,
      ]}
    >
      <Text variant="small" tone="ink">
        {label}
      </Text>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel={`Remove ${label}`}>
          <Text variant="small" tone="soft">
            ✕
          </Text>
        </Pressable>
      ) : null}
    </View>
  )

  if (!onPress) return content

  return (
    <Pressable onPress={onPress} style={({ pressed }) => (pressed ? styles.buttonPressed : null)}>
      {content}
    </Pressable>
  )
}

export type FieldProps = {
  label?: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  error?: string | null
  hint?: string
  secureTextEntry?: boolean
  multiline?: boolean
  numberOfLines?: number
  keyboardType?: KeyboardTypeOptions
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  autoFocus?: boolean
  maxLength?: number
  returnKeyType?: 'done' | 'next' | 'go' | 'search'
  onSubmitEditing?: () => void
  style?: StyleProp<ViewStyle>
  inputStyle?: StyleProp<TextStyle>
}

/**
 * A text input styled as writing on a ruled line: no box, no border-radius,
 * just a rule that turns pink when you are on it.
 */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  secureTextEntry,
  multiline,
  numberOfLines = 4,
  keyboardType,
  autoCapitalize = 'sentences',
  autoFocus,
  maxLength,
  returnKeyType,
  onSubmitEditing,
  style,
  inputStyle,
}: FieldProps) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={[styles.field, style]}>
      {label ? (
        <Text variant="small" tone="soft" style={styles.fieldLabel}>
          {label}
        </Text>
      ) : null}

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.inkFaint}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : undefined}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        autoFocus={autoFocus}
        maxLength={maxLength}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          { borderBottomColor: focused ? palette.accent : palette.rule },
          inputStyle,
        ]}
      />

      {error ? (
        <Text variant="tiny" tone="bad" style={styles.fieldMessage}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="tiny" tone="faint" style={styles.fieldMessage}>
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

/** A row of mutually exclusive choices, drawn as paper pills. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  color = 'sky',
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  color?: keyof typeof highlighter
}) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              active ? { backgroundColor: highlighter[color].bar } : null,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text variant="small" tone={active ? 'ink' : 'soft'}>
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

/** A hand-drawn checkbox. */
export function Checkbox({ checked, onPress }: { checked: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      <View style={[styles.checkbox, checked ? styles.checkboxOn : null]}>
        {checked ? (
          <Text variant="small" tone="white" style={styles.checkboxTick}>
            ✓
          </Text>
        ) : null}
      </View>
    </Pressable>
  )
}

/** A hand-drawn radio dot. */
export function RadioMark({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.radio, selected ? styles.radioOn : null]}>
      {selected ? <View style={styles.radioDot} /> : null}
    </View>
  )
}

/** A sticky note, for hints and gentle warnings. */
export function StickyNote({
  children,
  color = 'yellow',
  tiltDeg = -0.8,
  style,
}: {
  children: ReactNode
  color?: keyof typeof highlighter
  tiltDeg?: number
  style?: StyleProp<ViewStyle>
}) {
  return (
    <View style={[styles.sticky, { backgroundColor: highlighter[color].bar }, tilt(tiltDeg), style]}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  iconGlyph: {
    lineHeight: 30,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  field: {
    marginBottom: space.lg,
  },
  fieldLabel: {
    marginBottom: 2,
  },
  input: {
    fontFamily: fonts.hand,
    fontSize: 18,
    lineHeight: 26,
    color: palette.ink,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 0,
    borderBottomWidth: 1.5,
  },
  inputMultiline: {
    minHeight: 26 * 4,
    textAlignVertical: 'top',
  },
  fieldMessage: {
    marginTop: 4,
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  segment: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(59, 52, 68, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  checkboxOn: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  checkboxTick: {
    lineHeight: 18,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: 'rgba(59, 52, 68, 0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  radioOn: {
    borderColor: palette.accent,
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: palette.accent,
  },
  sticky: {
    padding: space.lg,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(59, 52, 68, 0.06)',
    ...shadow.sticky,
  },
})

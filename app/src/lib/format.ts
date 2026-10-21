/** Date and text helpers, kept in one place so screens stay readable. */

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return `${formatDate(date)} · ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

/** "just now", "3 days ago", "in 2 hours". */
export function relativeTime(value: string | Date | null | undefined): string {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : value
  const diff = Date.now() - date.getTime()
  const minutes = Math.round(diff / 60000)

  if (Math.abs(minutes) < 1) return 'just now'
  if (Math.abs(minutes) < 60) return minutes > 0 ? `${minutes} min ago` : `in ${-minutes} min`

  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return hours > 0 ? `${hours} h ago` : `in ${-hours} h`

  const days = Math.round(hours / 24)
  if (Math.abs(days) < 7) return days > 0 ? `${days} ${days === 1 ? 'day' : 'days'} ago` : `in ${-days} days`

  return formatDate(date)
}

export function plural(count: number, singular: string, pluralForm?: string): string {
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

/** "12 responses" / "no responses yet". */
export function responseLabel(count: number | undefined): string {
  if (!count) return 'no responses yet'
  return plural(count, 'response')
}

export const STATUS_LABELS: Record<string, string> = {
  draft: 'draft',
  published: 'open',
  closed: 'closed',
}

export function surveyStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status
}

/** Splits a comma / newline separated list, the way the interest field works. */
export function splitList(input: string): string[] {
  return input
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export function joinList(values: string[] | undefined | null): string {
  return (values ?? []).join(', ')
}

/** Truncates to a whole number of characters, for card previews. */
export function clamp(text: string, max = 120): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

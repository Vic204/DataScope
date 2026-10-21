/**
 * Matching rules for the discovery feed.
 *
 * The inputs are intentionally loose (plain, optionally-partial objects) rather
 * than mongoose document types: the same rules get called with a saved Survey,
 * a lean query result, a seed fixture and a unit test, and none of those should
 * have to satisfy a document shape to decide whether something matches.
 */

export type MatchableProfile = {
  age?: number | null
  city?: string | null
  interests?: string[] | null
}

export type MatchableTargeting = {
  audience?: 'everyone' | 'matching' | null
  minAge?: number | null
  maxAge?: number | null
  cities?: string[] | null
  interests?: string[] | null
}

const norm = (value: string) => value.trim().toLowerCase()

/**
 * Decides whether a survey should be discoverable by someone with this profile.
 *
 * Rules, in plain language:
 *  - audience "everyone"  -> always visible
 *  - audience "matching"  -> every configured rule must pass
 *  - an age rule needs an age on the profile (we do not guess)
 *  - city matches case-insensitively
 *  - interests need at least one overlap
 *
 * A survey with no targeting rules at all is visible to everyone.
 */
export function matchesProfile(
  profile: MatchableProfile | null | undefined,
  targeting: MatchableTargeting | null | undefined,
): boolean {
  if (!targeting || targeting.audience !== 'matching') return true

  const age = typeof profile?.age === 'number' ? profile.age : null
  const city = profile?.city ? norm(profile.city) : ''
  const interests = new Set((profile?.interests ?? []).map(norm))

  const { minAge, maxAge } = targeting
  const cities = targeting.cities ?? []
  const wanted = targeting.interests ?? []

  if (minAge != null || maxAge != null) {
    if (age == null) return false
    if (minAge != null && age < minAge) return false
    if (maxAge != null && age > maxAge) return false
  }

  if (cities.length > 0) {
    if (!city) return false
    if (!cities.map(norm).includes(city)) return false
  }

  if (wanted.length > 0) {
    const overlap = wanted.map(norm).some((interest) => interests.has(interest))
    if (!overlap) return false
  }

  return true
}

/** Explains *why* a survey does not match, so the UI can nudge the user's profile. */
export function explainMismatch(
  profile: MatchableProfile | null | undefined,
  targeting: MatchableTargeting | null | undefined,
): string[] {
  if (matchesProfile(profile, targeting)) return []

  const reasons: string[] = []
  const age = typeof profile?.age === 'number' ? profile.age : null
  const city = profile?.city ? norm(profile.city) : ''
  const interests = new Set((profile?.interests ?? []).map(norm))
  const { minAge, maxAge } = targeting ?? {}
  const cities = targeting?.cities ?? []
  const wanted = targeting?.interests ?? []

  if ((minAge != null || maxAge != null) && age == null) reasons.push('Add your age to your profile')
  if (minAge != null && age != null && age < minAge) reasons.push(`Open to ages ${minAge}+`)
  if (maxAge != null && age != null && age > maxAge) reasons.push(`Open to ages up to ${maxAge}`)
  if (cities.length > 0 && (!city || !cities.map(norm).includes(city))) {
    reasons.push(`Only for ${cities.join(', ')}`)
  }
  if (wanted.length > 0 && !wanted.map(norm).some((interest) => interests.has(interest))) {
    reasons.push(`Interested in ${wanted.join(', ')}`)
  }

  return reasons
}

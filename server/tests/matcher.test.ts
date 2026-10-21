import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { explainMismatch, matchesProfile } from '../src/services/matcher.js'

const profile = { age: 22, city: 'Kochi', interests: ['Music', 'technology'] }

describe('matchesProfile', () => {
  it('shows everyone-audience surveys to anyone', () => {
    assert.equal(matchesProfile(profile, { audience: 'everyone' }), true)
    assert.equal(matchesProfile(null, { audience: 'everyone' }), true)
  })

  it('shows a survey with no targeting at all', () => {
    assert.equal(matchesProfile(undefined, null), true)
    assert.equal(matchesProfile(profile, undefined), true)
  })

  it('matches when every configured rule passes', () => {
    assert.equal(
      matchesProfile(profile, {
        audience: 'matching',
        minAge: 18,
        maxAge: 30,
        cities: ['kochi'],
        interests: ['music'],
      }),
      true,
    )
  })

  it('ignores city and interest casing and padding', () => {
    assert.equal(
      matchesProfile(
        { age: 20, city: '  kOcHi ', interests: ['  MUSIC'] },
        { audience: 'matching', cities: ['Kochi'], interests: ['music'] },
      ),
      true,
    )
  })

  it('fails an age rule when the profile has no age', () => {
    assert.equal(
      matchesProfile({ interests: ['music'] }, { audience: 'matching', minAge: 18 }),
      false,
    )
  })

  it('fails when the age sits outside the range, at either end', () => {
    const targeting = { audience: 'matching' as const, minAge: 25, maxAge: 30 }
    // 22 is too young
    assert.equal(matchesProfile(profile, targeting), false)
    // 31 is too old
    assert.equal(matchesProfile({ ...profile, age: 31 }, targeting), false)
    // 26 is inside
    assert.equal(matchesProfile({ ...profile, age: 26 }, targeting), true)
  })

  it('fails when the city does not match', () => {
    assert.equal(
      matchesProfile(profile, { audience: 'matching', cities: ['Bengaluru'] }),
      false,
    )
  })

  it('needs at least one overlapping interest', () => {
    assert.equal(
      matchesProfile(profile, { audience: 'matching', interests: ['cricket', 'music'] }),
      true,
    )
    assert.equal(
      matchesProfile(profile, { audience: 'matching', interests: ['cricket', 'painting'] }),
      false,
    )
  })

  it('applies age AND city AND interests together', () => {
    assert.equal(
      matchesProfile(profile, {
        audience: 'matching',
        minAge: 18,
        maxAge: 24,
        cities: ['Kochi'],
        interests: ['music'],
      }),
      true,
    )
    assert.equal(
      matchesProfile(profile, {
        audience: 'matching',
        minAge: 18,
        maxAge: 24,
        cities: ['Bengaluru'],
        interests: ['music'],
      }),
      false,
    )
  })
})

describe('explainMismatch', () => {
  it('says nothing when the survey matches', () => {
    assert.deepEqual(explainMismatch(profile, { audience: 'matching', minAge: 18 }), [])
  })

  it('asks for a missing age', () => {
    const reasons = explainMismatch({}, { audience: 'matching', minAge: 18 })
    assert.ok(reasons.some((reason) => /age/i.test(reason)))
  })

  it('names the city restriction', () => {
    const reasons = explainMismatch(profile, { audience: 'matching', cities: ['Bengaluru'] })
    assert.ok(reasons.some((reason) => reason.includes('Bengaluru')))
  })
})

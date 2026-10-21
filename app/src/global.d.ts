/*
 * Type declarations for things Metro resolves but TypeScript does not know about.
 *
 * Expo generates its own `expo-env.d.ts` when the dev server runs, which covers
 * most of this. Declaring the CSS wildcard here as well means `tsc --noEmit`
 * works on a fresh clone, before `expo start` has ever been run.
 */

declare module '*.css'

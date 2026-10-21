import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export type TokenPayload = {
  sub: string
  email: string
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  })
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret)
    if (typeof decoded === 'string' || !decoded.sub) return null
    return { sub: String(decoded.sub), email: String((decoded as jwt.JwtPayload).email ?? '') }
  } catch {
    return null
  }
}

/** Short, URL-safe, human-friendly id for share links. No dependency needed. */
export function randomSlug(length = 8): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyz23456789'
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const byte of bytes) out += alphabet.charAt(byte % alphabet.length)
  return out
}

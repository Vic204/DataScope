import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { HttpError } from '../lib/http.js'
import { verifyToken } from '../lib/jwt.js'
import { User, type UserDoc } from '../models/User.js'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserDoc
    }
  }
}

const bearer = (header: string | undefined): string | null => {
  if (!header) return null
  const [scheme, token] = header.split(' ')
  if (!scheme || scheme.toLowerCase() !== 'bearer' || !token) return null
  return token
}

/**
 * Verifies the JWT and loads the current user onto the request.
 *
 * The user is re-read from the database on every request rather than trusted
 * from the token body, so profile edits and deletions take effect immediately.
 */
export const requireAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = bearer(req.headers.authorization)
    if (!token) throw HttpError.unauthorized()

    const payload = verifyToken(token)
    if (!payload) throw HttpError.unauthorized('Your session expired, please sign in again')

    const user = await User.findById(payload.sub)
    if (!user) throw HttpError.unauthorized('That account no longer exists')

    req.user = user
    next()
  } catch (error) {
    next(error)
  }
}

/** Same as requireAuth, but sets req.user when a token is present and does not fail otherwise. */
export const optionalAuth: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = bearer(req.headers.authorization)
    if (token) {
      const payload = verifyToken(token)
      if (payload) {
        const user = await User.findById(payload.sub)
        if (user) req.user = user
      }
    }
  } catch {
    // A bad token on an optional route is simply an anonymous request.
  }
  next()
}

export function currentUser(req: Request): UserDoc {
  if (!req.user) throw HttpError.unauthorized()
  return req.user
}

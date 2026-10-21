import type { NextFunction, Request, RequestHandler, Response } from 'express'

/** An error we deliberately throw to produce a specific HTTP response. */
export class HttpError extends Error {
  readonly status: number
  readonly details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.details = details
  }

  static badRequest(message: string, details?: unknown) {
    return new HttpError(400, message, details)
  }

  static unauthorized(message = 'You need to sign in to do that') {
    return new HttpError(401, message)
  }

  static forbidden(message = 'You do not have access to this') {
    return new HttpError(403, message)
  }

  static notFound(message = 'Not found') {
    return new HttpError(404, message)
  }

  static conflict(message: string) {
    return new HttpError(409, message)
  }
}

/**
 * Wraps an async route handler so rejected promises reach the error
 * middleware instead of becoming unhandled rejections.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next)
  }
}

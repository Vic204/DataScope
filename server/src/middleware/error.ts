import type { ErrorRequestHandler, RequestHandler } from 'express'
import { ZodError } from 'zod'
import { env } from '../config/env.js'
import { HttpError } from '../lib/http.js'

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({ error: `No route matches ${req.method} ${req.originalUrl}` })
}

type MongoError = Error & { code?: number; keyValue?: Record<string, unknown>; name?: string }

/**
 * Single place where every failure becomes a predictable JSON shape:
 *   { error: string, details?: unknown }
 * so the client never has to parse an HTML stack trace.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, details: error.details })
    return
  }

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join('.') || '(body)',
      message: issue.message,
    }))
    res.status(422).json({ error: details[0]?.message ?? 'Invalid request', details })
    return
  }

  const mongo = error as MongoError

  if (mongo?.code === 11000) {
    const field = Object.keys(mongo.keyValue ?? {})[0] ?? 'value'
    res.status(409).json({ error: `That ${field} is already taken` })
    return
  }

  if (mongo?.name === 'CastError') {
    res.status(400).json({ error: 'That id is not in the right format' })
    return
  }

  if (mongo?.name === 'ValidationError') {
    res.status(422).json({ error: mongo.message })
    return
  }

  console.error('[error] unhandled:', error)

  res.status(500).json({
    error: 'Something went wrong on our side',
    ...(env.isProduction ? {} : { details: (error as Error)?.message }),
  })
}

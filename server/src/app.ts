import { fileURLToPath } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

import cors from 'cors'
import express from 'express'
import { env } from './config/env.js'
import { isDatabaseHealthy } from './db/connect.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { authRouter } from './routes/auth.routes.js'
import { feedRouter } from './routes/feed.routes.js'
import { publicRouter } from './routes/public.routes.js'
import { surveyRouter } from './routes/survey.routes.js'
import { userRouter } from './routes/user.routes.js'

export function createApp() {
  const app = express()

  app.disable('x-powered-by')
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin / curl / native apps (no Origin header), and the
        // configured browser origins. Expo web moves ports around, so any
        // localhost origin is allowed in development.
        if (!origin) return callback(null, true)
        if (env.corsOrigins.includes(origin)) return callback(null, true)
        if (!env.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin)) {
          return callback(null, true)
        }
        return callback(new Error(`Origin ${origin} is not allowed`))
      },
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '1mb' }))

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      database: isDatabaseHealthy() ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
    })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/users', userRouter)
  app.use('/api/surveys', surveyRouter)
  app.use('/api/feed', feedRouter)
  app.use('/api/public', publicRouter)

  serveWebClient(app)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

/**
 * Serve the Expo web build when one sits next to the server.
 *
 * The production deploy builds `app/dist` and starts this process with it, so
 * the demo is one URL with the API under /api - same origin, no CORS, one
 * deploy. In development the client runs on Metro's own server and this does
 * nothing.
 */
function serveWebClient(app: express.Express): void {
  if (!env.isProduction) return

  const clientDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../app/dist')
  const indexFile = path.join(clientDir, 'index.html')

  if (!fs.existsSync(indexFile)) {
    console.warn(`[web] no web build found at ${clientDir} - serving the API only`)
    return
  }

  app.use(express.static(clientDir, { index: false, maxAge: '1h' }))
  // The client is a single-page app, so any non-API path renders it and the
  // router works out which screen that is (deep links like /s/<slug> need this).
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(indexFile)
  })

  console.log(`[web] serving the built client from ${clientDir}`)
}

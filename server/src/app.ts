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

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}

import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectDatabase, disconnectDatabase } from './db/connect.js'

async function main() {
  await connectDatabase()

  const app = createApp()
  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`[api] listening on http://localhost:${env.port} (${env.nodeEnv})`)
    console.log('[api] try  GET /api/health')
  })

  const shutdown = async (signal: string) => {
    console.log(`\n[api] ${signal} received, shutting down`)
    server.close()
    await disconnectDatabase()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
}

main().catch((error) => {
  console.error('[api] failed to start:', error)
  process.exit(1)
})

import 'dotenv/config'

/**
 * All runtime configuration in one place, validated on boot so the server
 * fails loudly at startup instead of mysteriously later on.
 */

function optional(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim() !== '' ? value.trim() : undefined
}

const nodeEnv = optional('NODE_ENV') ?? 'development'
const port = Number(optional('PORT') ?? 4000)

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  throw new Error(`PORT must be a valid port number, received "${process.env.PORT}"`)
}

const jwtSecret = optional('JWT_SECRET') ?? 'dev-only-change-me'

if (nodeEnv === 'production' && jwtSecret === 'dev-only-change-me') {
  throw new Error(
    'JWT_SECRET is still the development default. Set a real secret before running in production.',
  )
}

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port,
  /** When unset, the server boots its own local mongod (see db/localMongo.ts) */
  mongodbUri: optional('MONGODB_URI'),
  jwtSecret,
  jwtExpiresIn: optional('JWT_EXPIRES_IN') ?? '30d',
  corsOrigins: (optional('CORS_ORIGIN') ?? 'http://localhost:8081,http://localhost:19006')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const

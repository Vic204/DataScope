import mongoose from 'mongoose'
import { env } from '../config/env.js'
import { startLocalMongo, stopLocalMongo } from './localMongo.js'

let usingLocalMongo = false

export async function connectDatabase(): Promise<void> {
  let uri = env.mongodbUri

  if (!uri) {
    if (env.isProduction) {
      throw new Error('MONGODB_URI must be set in production')
    }
    uri = await startLocalMongo()
    usingLocalMongo = true
  }

  mongoose.set('strictQuery', true)
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  })

  const { name, host } = mongoose.connection
  console.log(`[db] connected to "${name}" on ${host}${usingLocalMongo ? ' (bundled dev mongod)' : ''}`)
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect()
  if (usingLocalMongo) await stopLocalMongo()
}

export function isDatabaseHealthy(): boolean {
  return mongoose.connection.readyState === 1
}

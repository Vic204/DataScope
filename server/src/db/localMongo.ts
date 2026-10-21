import fs from 'node:fs'
import path from 'node:path'
import { MongoClient } from 'mongodb'
import { MongoMemoryServer } from 'mongodb-memory-server'

/**
 * Developer convenience: boots a real mongod process against a persistent
 * folder so local data survives restarts, without installing MongoDB as a
 * Windows service or needing admin rights.
 *
 * This is only used when MONGODB_URI is empty and NODE_ENV is not production.
 * Point MONGODB_URI at Atlas (or an installed mongod) and this file is never
 * touched.
 */

const DATA_DIR = path.resolve(process.cwd(), '.mongo-data')
const DEFAULT_PORT = 27017

let instance: MongoMemoryServer | null = null

export async function startLocalMongo(): Promise<string> {
  fs.mkdirSync(DATA_DIR, { recursive: true })

  const baseOptions = {
    instance: {
      dbPath: DATA_DIR,
      storageEngine: 'wiredTiger' as const,
    },
  }

  try {
    instance = await MongoMemoryServer.create({
      ...baseOptions,
      instance: { ...baseOptions.instance, port: DEFAULT_PORT },
    })
    console.log(`[db] local mongod started on port ${DEFAULT_PORT} (data: .mongo-data)`)
  } catch (error) {
    // Port most likely already taken - fall back to whatever is free.
    console.warn(
      `[db] could not bind port ${DEFAULT_PORT}, letting mongod choose a free port instead`,
    )
    if (error instanceof Error) console.warn(`[db] reason: ${error.message.split('\n')[0]}`)
    instance = await MongoMemoryServer.create(baseOptions)
  }

  const uri = instance.getUri('datascope')
  return uri
}

export async function stopLocalMongo(): Promise<void> {
  const target = instance
  if (!target) return
  instance = null

  await requestShutdown(target)

  await target.stop({ doCleanup: false }).catch((error: unknown) => {
    console.warn(`[db] mongod did not stop cleanly: ${firstLine(error)}`)
  })
}

/**
 * Ask mongod to close itself before anything kills it.
 *
 * This matters more than it looks. mongodb-memory-server only performs a
 * graceful shutdown for replica sets; a standalone instance - which is what we
 * start - goes straight to `killProcess`, and on Windows every kill "signal" is
 * an immediate terminate. A mongod that dies with entries still in its journal
 * can come back missing the most recent writes: the data folder is intact and
 * the process starts fine, so nothing complains, but the tail of the last few
 * writes is simply gone.
 *
 * An admin `shutdown` command lets WiredTiger checkpoint and close its files,
 * so there is nothing left to recover when the folder is opened again.
 */
async function requestShutdown(target: MongoMemoryServer): Promise<void> {
  let client: MongoClient | undefined
  try {
    client = new MongoClient(target.getUri('admin'), {
      serverSelectionTimeoutMS: 5_000,
      directConnection: true,
    })
    await client.connect()
    // The server drops the connection on its way down, so this normally throws
    // (ECONNRESET, "connection closed"). That is the success path.
    await client.db('admin').command({ shutdown: 1, force: true, timeoutSecs: 1 })
  } catch {
    // Expected - see above.
  } finally {
    await client?.close().catch(() => undefined)
  }
}

function firstLine(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  return text.split('\n')[0] ?? text
}

import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

/*
 * testPrisma
 * Postgres client for unit tests, isolated in the `test` schema so real data
 * is never touched. Uses TEST_DATABASE_URL when set, else DATABASE_URL.
 */
export async function testPrisma(): Promise<PrismaClient> {
  const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL
  if (!url) throw new Error('TEST_DATABASE_URL or DATABASE_URL must be set to run DB tests')
  const p = new PrismaClient({ adapter: new PrismaPg(url, { schema: 'test' }) })
  await p.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS "test"')
  return p
}

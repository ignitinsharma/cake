import { db } from '@/lib/db'

/*
 * check-seed
 * Smoke check: categories and mappings exist.
 */
async function main() {
  const cats = await db.category.findMany({ include: { mappings: true } })
  console.log(`categories: ${cats.length}`)
  console.log(`mappings: ${cats.reduce((n, c) => n + c.mappings.length, 0)}`)
}

main().finally(() => db.$disconnect())
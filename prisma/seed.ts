import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { CATEGORIES } from '../src/data/taxonomy/categories'

/*
 * seed
 * Creates the category taxonomy and platform mappings from the taxonomy
 * data file. Mapping count depends on how many paths are documented.
 */
async function main() {
  const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })
  let mappings = 0
  for (const c of CATEGORIES) {
    await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: {
        slug: c.slug,
        name: c.name,
        path: c.path,
        defaultHsn: c.defaultHsn,
        defaultGstRate: c.defaultGstRate,
      },
    })
    for (const [platform, path] of Object.entries(c.platformPaths ?? {})) {
      await db.categoryPlatformMapping.upsert({
        where: { id: `map-${c.slug}-${platform}` },
        update: {},
        create: {
          id: `map-${c.slug}-${platform}`,
          categorySlug: c.slug,
          platform,
          platformCategoryId: null,
          platformCategoryPath: path,
        },
      })
      mappings++
    }
  }
  // remove mappings that no longer exist in the taxonomy data (stale paths)
  const validIds = new Set(
    CATEGORIES.flatMap((c) => Object.keys(c.platformPaths ?? {}).map((p) => `map-${c.slug}-${p}`)),
  )
  const stale = await db.categoryPlatformMapping.findMany({ select: { id: true } })
  const staleIds = stale.filter((m) => !validIds.has(m.id)).map((m) => m.id)
  if (staleIds.length > 0) {
    await db.categoryPlatformMapping.deleteMany({ where: { id: { in: staleIds } } })
    console.log(`removed ${staleIds.length} stale mappings`)
  }
  console.log(`seeded ${CATEGORIES.length} categories × ${mappings} mappings`)
  await db.$disconnect()
}

main()

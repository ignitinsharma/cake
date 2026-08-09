import { PrismaClient } from '@/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

/*
 * seed
 * Creates the starter category taxonomy and platform mappings.
 * ponytail: 3 T-shirt categories to prove the loop; add more categories as data later.
 */
async function main() {
  const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
  const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })
  const cats = [
    { slug: 'mens-tshirts', name: 'T-Shirts', path: "Clothing > Men's Wear > T-Shirts", hsn: '6109', gst: 5 },
    { slug: 'womens-tshirts', name: 'T-Shirts', path: "Clothing > Women's Wear > T-Shirts", hsn: '6109', gst: 5 },
    { slug: 'kids-tshirts', name: 'T-Shirts', path: 'Clothing > Kids > T-Shirts', hsn: '6109', gst: 5 },
  ]
  for (const c of cats) {
    const category = await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { slug: c.slug, name: c.name, path: c.path, defaultHsn: c.hsn, defaultGstRate: c.gst },
    })
    const mappings = [
      { platform: 'FLIPKART', path: "Men's T-Shirts", id: null },
      { platform: 'MYNTRA', path: "Men's Wear > T-Shirts", id: null },
      { platform: 'AMAZON', path: 'Apparel > Men > T-Shirts', id: null },
    ]
    for (const m of mappings) {
      await db.categoryPlatformMapping.upsert({
        where: { id: `map-${c.slug}-${m.platform}` },
        update: {},
        create: {
          id: `map-${c.slug}-${m.platform}`,
          categorySlug: c.slug,
          platform: m.platform,
          platformCategoryId: m.id,
          platformCategoryPath: m.path,
        },
      })
    }
  }
  console.log(`seeded ${cats.length} categories × ${'FLIPKART,MYNTRA,AMAZON'.split(',').length} mappings`)
  await db.$disconnect()
}

main()
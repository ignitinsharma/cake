import { db } from '@/lib/db'
import { Platform } from '@/constants/enums'

/*
 * resolveCategoryPath
 * Platform-specific category path for a product's category (from
 * CategoryPlatformMapping), falling back to the taxonomy path, then the slug.
 * @returns the category path value a platform template expects
 */
export async function resolveCategoryPath(categorySlug: string, platform: Platform): Promise<string> {
  const mapping = await db.categoryPlatformMapping.findFirst({
    where: { categorySlug, platform },
  })
  if (mapping?.platformCategoryPath) return mapping.platformCategoryPath
  const category = await db.category.findUnique({ where: { slug: categorySlug } })
  return category?.path ?? categorySlug
}
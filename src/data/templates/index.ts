import { Platform } from '@/constants/enums'
import type { PlatformTemplate } from '@/lib/templates/types'
import { flipkartColumns } from './flipkart-t-shirt'
import { myntraColumns } from './myntra-t-shirt'
import { amazonColumns } from './amazon-t-shirt'
import { meeshoColumns } from './meesho-t-shirt'
import { snapdealColumns } from './snapdeal-t-shirt'
import { nykaaColumns } from './nykaa-t-shirt'
import { ajioColumns } from './ajio-t-shirt'
import { firstcryColumns } from './firstcry-t-shirt'

/*
 * ALL_PLATFORMS
 * Every platform with a registered template.
 */
export const ALL_PLATFORMS: Platform[] = [
  Platform.FLIPKART,
  Platform.MYNTRA,
  Platform.AMAZON,
  Platform.MEESHO,
  Platform.SNAPDEAL,
  Platform.NYKAA,
  Platform.AJIO,
  Platform.FIRSTCRY,
]

/*
 * T_SHIRT_SLUGS
 * Category slugs every platform template supports.
 * ponytail: T-shirts for all 3 seeded categories; more categories are data additions later.
 */
const T_SHIRT_SLUGS = ['mens-tshirts', 'womens-tshirts', 'kids-tshirts'] as const

/*
 * Registry
 * One PlatformTemplate per (platform, category) built from shared column defs.
 */
const REGISTRY: PlatformTemplate[] = [
  { platform: Platform.FLIPKART, columns: flipkartColumns },
  { platform: Platform.MYNTRA, columns: myntraColumns },
  { platform: Platform.AMAZON, columns: amazonColumns },
  { platform: Platform.MEESHO, columns: meeshoColumns },
  { platform: Platform.SNAPDEAL, columns: snapdealColumns },
  { platform: Platform.NYKAA, columns: nykaaColumns },
  { platform: Platform.AJIO, columns: ajioColumns },
  { platform: Platform.FIRSTCRY, columns: firstcryColumns },
].flatMap((p) =>
  T_SHIRT_SLUGS.map((categorySlug) => ({ platform: p.platform, version: '1.0', categorySlug, columns: p.columns })),
)

/*
 * getTemplate
 * @param platform - marketplace platform
 * @param categorySlug - our category slug
 * @returns matching template or null
 */
export function getTemplate(platform: Platform, categorySlug: string): PlatformTemplate | null {
  return REGISTRY.find((t) => t.platform === platform && t.categorySlug === categorySlug) ?? null
}

/*
 * getTemplatesForPlatform
 * All templates for a platform (used by the form's category step).
 */
export function getTemplatesForPlatform(platform: Platform): PlatformTemplate[] {
  return REGISTRY.filter((t) => t.platform === platform)
}

/*
 * getAllTemplates
 * Every registered template.
 */
export function getAllTemplates(): PlatformTemplate[] {
  return REGISTRY
}

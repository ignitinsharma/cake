import { Platform } from '../../constants/enums'

/*
 * TaxonomyCategory
 * One node of the seller-facing category tree (spec §8).
 * platformPaths: paths known from public docs; absent combos simply lack a
 * mapping (generation for that combo shows the existing clear error).
 */
export interface TaxonomyCategory {
  slug: string
  name: string
  path: string
  parent?: string
  defaultHsn: string
  defaultGstRate: number
  platformPaths?: Partial<Record<Platform, string>>
}

const T = Platform

/*
 * CATEGORIES
 * ponytail: apparel-led top ~50; non-tshirt categories carry only confident
 * FLIPKART/MYNTRA/AMAZON paths — extend per public-doc research later.
 */
export const CATEGORIES: TaxonomyCategory[] = [
  { slug: 'mens-tshirts', name: 'T-Shirts', path: "Clothing > Men's Wear > T-Shirts", defaultHsn: '6109', defaultGstRate: 5,
    platformPaths: { [T.FLIPKART]: "Men's T-Shirts", [T.MYNTRA]: "Men's Wear > T-Shirts", [T.AMAZON]: 'Apparel > Men > T-Shirts', [T.MEESHO]: "Men's Wear > T-Shirts", [T.SNAPDEAL]: "Men's Clothing > T-Shirts", [T.NYKAA]: 'Men > T-Shirts', [T.AJIO]: "Men's Wear > T-Shirts", [T.FIRSTCRY]: "Boys > Clothing > T-Shirts" } },
  { slug: 'womens-tshirts', name: 'T-Shirts', path: "Clothing > Women's Wear > T-Shirts", defaultHsn: '6109', defaultGstRate: 5,
    platformPaths: { [T.FLIPKART]: "Women's T-Shirts", [T.MYNTRA]: "Women's Wear > T-Shirts", [T.AMAZON]: 'Apparel > Women > T-Shirts', [T.MEESHO]: "Women's Wear > T-Shirts", [T.SNAPDEAL]: "Women's Clothing > T-Shirts", [T.NYKAA]: 'Women > T-Shirts', [T.AJIO]: "Women's Wear > T-Shirts", [T.FIRSTCRY]: "Girls > Clothing > T-Shirts" } },
  { slug: 'kids-tshirts', name: 'T-Shirts', path: 'Clothing > Kids > T-Shirts', defaultHsn: '6109', defaultGstRate: 5,
    platformPaths: { [T.FLIPKART]: "Men's T-Shirts", [T.MYNTRA]: 'Kids > T-Shirts', [T.AMAZON]: 'Apparel > Kids > T-Shirts', [T.MEESHO]: 'Kids > T-Shirts', [T.SNAPDEAL]: 'Kids Clothing > T-Shirts', [T.NYKAA]: 'Kids > T-Shirts', [T.AJIO]: 'Kids > T-Shirts', [T.FIRSTCRY]: "Boys > Clothing > T-Shirts" } },
  { slug: 'mens-shirts', name: 'Shirts', path: "Clothing > Men's Wear > Shirts", defaultHsn: '6205', defaultGstRate: 5, platformPaths: { [T.FLIPKART]: "Men's Shirts", [T.MYNTRA]: "Men's Wear > Shirts", [T.AMAZON]: 'Apparel > Men > Shirts' } },
  { slug: 'mens-jeans', name: 'Jeans', path: "Clothing > Men's Wear > Jeans", defaultHsn: '6203', defaultGstRate: 5, platformPaths: { [T.FLIPKART]: "Men's Jeans", [T.MYNTRA]: "Men's Wear > Jeans", [T.AMAZON]: 'Apparel > Men > Jeans' } },
  { slug: 'mens-trousers', name: 'Trousers & Chinos', path: "Clothing > Men's Wear > Trousers", defaultHsn: '6203', defaultGstRate: 5 },
  { slug: 'mens-kurtas', name: 'Kurtas', path: "Clothing > Men's Wear > Kurtas", defaultHsn: '6205', defaultGstRate: 5, platformPaths: { [T.MYNTRA]: "Men's Wear > Kurtas", [T.AMAZON]: 'Apparel > Men > Kurtas' } },
  { slug: 'mens-blazers', name: 'Blazers & Suits', path: "Clothing > Men's Wear > Blazers", defaultHsn: '6203', defaultGstRate: 5 },
  { slug: 'mens-sweatshirts', name: 'Sweatshirts & Hoodies', path: "Clothing > Men's Wear > Sweatshirts", defaultHsn: '6110', defaultGstRate: 5 },
  { slug: 'mens-jackets', name: 'Jackets & Coats', path: "Clothing > Men's Wear > Jackets", defaultHsn: '6201', defaultGstRate: 5 },
  { slug: 'mens-shorts', name: 'Shorts', path: "Clothing > Men's Wear > Shorts", defaultHsn: '6203', defaultGstRate: 5 },
  { slug: 'mens-socks', name: 'Socks', path: "Clothing > Men's Wear > Socks", defaultHsn: '6115', defaultGstRate: 5 },
  { slug: 'mens-underwear', name: 'Innerwear', path: "Clothing > Men's Wear > Innerwear", defaultHsn: '6107', defaultGstRate: 5 },
  { slug: 'mens-formal-shoes', name: 'Formal Shoes', path: "Footwear > Men > Formal Shoes", defaultHsn: '6403', defaultGstRate: 5 },
  { slug: 'mens-casual-shoes', name: 'Casual Shoes', path: "Footwear > Men > Casual Shoes", defaultHsn: '6403', defaultGstRate: 5 },
  { slug: 'womens-dresses', name: 'Dresses', path: "Clothing > Women's Wear > Dresses", defaultHsn: '6204', defaultGstRate: 5, platformPaths: { [T.FLIPKART]: "Women's Dresses", [T.MYNTRA]: "Women's Wear > Dresses", [T.AMAZON]: 'Apparel > Women > Dresses' } },
  { slug: 'womens-kurtas', name: 'Kurtas & Kurtis', path: "Clothing > Women's Wear > Kurtas", defaultHsn: '6204', defaultGstRate: 5 },
  { slug: 'womens-sarees', name: 'Sarees', path: "Clothing > Women's Wear > Sarees", defaultHsn: '5407', defaultGstRate: 5, platformPaths: { [T.FLIPKART]: "Women's Sarees", [T.MYNTRA]: "Women's Wear > Sarees", [T.AMAZON]: 'Apparel > Women > Sarees' } },
  { slug: 'womens-jeans', name: 'Jeans', path: "Clothing > Women's Wear > Jeans", defaultHsn: '6204', defaultGstRate: 5 },
  { slug: 'womens-tops', name: 'Tops & Tees', path: "Clothing > Women's Wear > Tops", defaultHsn: '6109', defaultGstRate: 5 },
  { slug: 'womens-skirts', name: 'Skirts', path: "Clothing > Women's Wear > Skirts", defaultHsn: '6204', defaultGstRate: 5 },
  { slug: 'womens-leggings', name: 'Leggings & Jeggings', path: "Clothing > Women's Wear > Leggings", defaultHsn: '6104', defaultGstRate: 5 },
  { slug: 'womens-nightwear', name: 'Nightwear', path: "Clothing > Women's Wear > Nightwear", defaultHsn: '6108', defaultGstRate: 5 },
  { slug: 'womens-ethnic-dresses', name: 'Ethnic Dresses', path: "Clothing > Women's Wear > Ethnic Dresses", defaultHsn: '6204', defaultGstRate: 5 },
  { slug: 'womens-heels', name: 'Heels & Wedges', path: "Footwear > Women > Heels", defaultHsn: '6403', defaultGstRate: 5 },
  { slug: 'womens-flats', name: 'Flats & Sandals', path: "Footwear > Women > Flats", defaultHsn: '6403', defaultGstRate: 5 },
  { slug: 'kids-dresses', name: 'Dresses', path: 'Clothing > Kids > Dresses', defaultHsn: '6204', defaultGstRate: 5 },
  { slug: 'kids-shirts', name: 'Shirts', path: 'Clothing > Kids > Shirts', defaultHsn: '6205', defaultGstRate: 5 },
  { slug: 'kids-jeans', name: 'Jeans', path: 'Clothing > Kids > Jeans', defaultHsn: '6203', defaultGstRate: 5 },
  { slug: 'kids-shoes', name: 'Shoes', path: 'Footwear > Kids > Shoes', defaultHsn: '6403', defaultGstRate: 5 },
  { slug: 'kids-socks', name: 'Socks', path: 'Clothing > Kids > Socks', defaultHsn: '6115', defaultGstRate: 5 },
  { slug: 'kids-pyjamas', name: 'Pyjamas & Sets', path: 'Clothing > Kids > Pyjamas', defaultHsn: '6108', defaultGstRate: 5 },
  { slug: 'kids-sweatshirts', name: 'Sweatshirts & Hoodies', path: 'Clothing > Kids > Sweatshirts', defaultHsn: '6110', defaultGstRate: 5 },
  { slug: 'home-bed-sheets', name: 'Bed Sheets', path: 'Home > Bedding > Bed Sheets', defaultHsn: '6302', defaultGstRate: 12 },
  { slug: 'home-towels', name: 'Towels', path: 'Home > Bath > Towels', defaultHsn: '6302', defaultGstRate: 12 },
  { slug: 'home-curtains', name: 'Curtains', path: 'Home > Furnishing > Curtains', defaultHsn: '6303', defaultGstRate: 12 },
  { slug: 'home-cushions', name: 'Cushions & Covers', path: 'Home > Furnishing > Cushions', defaultHsn: '9404', defaultGstRate: 12 },
  { slug: 'home-blankets', name: 'Blankets & Throws', path: 'Home > Bedding > Blankets', defaultHsn: '6301', defaultGstRate: 12 },
  { slug: 'bags-backpacks', name: 'Backpacks', path: 'Bags > Backpacks', defaultHsn: '4202', defaultGstRate: 18 },
  { slug: 'bags-handbags', name: 'Handbags', path: 'Bags > Handbags', defaultHsn: '4202', defaultGstRate: 18 },
  { slug: 'bags-laptop-bags', name: 'Laptop Bags', path: 'Bags > Laptop Bags', defaultHsn: '4202', defaultGstRate: 18 },
  { slug: 'shoes-sandals', name: 'Sandals', path: 'Footwear > Sandals', defaultHsn: '6403', defaultGstRate: 5 },
  { slug: 'shoes-sneakers', name: 'Sneakers', path: 'Footwear > Sneakers', defaultHsn: '6404', defaultGstRate: 5 },
  { slug: 'shoes-sports-shoes', name: 'Sports Shoes', path: 'Footwear > Sports Shoes', defaultHsn: '6404', defaultGstRate: 5 },
  { slug: 'accessories-belts', name: 'Belts', path: 'Accessories > Belts', defaultHsn: '4203', defaultGstRate: 18 },
  { slug: 'accessories-wallets', name: 'Wallets', path: 'Accessories > Wallets', defaultHsn: '4202', defaultGstRate: 18 },
  { slug: 'accessories-caps', name: 'Caps & Hats', path: 'Accessories > Caps', defaultHsn: '6505', defaultGstRate: 5 },
  { slug: 'accessories-sunglasses', name: 'Sunglasses', path: 'Accessories > Sunglasses', defaultHsn: '9004', defaultGstRate: 18 },
  { slug: 'accessories-scarves', name: 'Scarves & Stoles', path: 'Accessories > Scarves', defaultHsn: '6214', defaultGstRate: 5 },
  { slug: 'jewellery-necklaces', name: 'Necklaces', path: 'Jewellery > Necklaces', defaultHsn: '7113', defaultGstRate: 3 },
  { slug: 'jewellery-earrings', name: 'Earrings', path: 'Jewellery > Earrings', defaultHsn: '7113', defaultGstRate: 3 },
  { slug: 'watches-mens-watches', name: "Men's Watches", path: 'Watches > Men', defaultHsn: '9101', defaultGstRate: 18 },
  { slug: 'watches-womens-watches', name: "Women's Watches", path: 'Watches > Women', defaultHsn: '9101', defaultGstRate: 18 },
  { slug: 'sports-yoga-mats', name: 'Yoga Mats', path: 'Sports > Fitness > Yoga Mats', defaultHsn: '9506', defaultGstRate: 18 },
]

/*
 * getCategory
 * @param slug - category slug
 * @returns the taxonomy category or undefined
 */
export function getCategory(slug: string): TaxonomyCategory | undefined {
  return CATEGORIES.find((c) => c.slug === slug)
}

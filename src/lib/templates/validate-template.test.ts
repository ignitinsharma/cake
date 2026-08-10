import { describe, expect, it } from 'vitest'
import { getTemplate } from '@/data/templates'
import { assertAllTemplatesValid } from './validate-template'

/*
 * Every template in the registry must be structurally valid:
 * unique column names, required columns must have a source,
 * sources must be known, and the registry must cover every platform mapping.
 */
describe('templates', () => {
  it('all templates are valid', () => {
    expect(assertAllTemplatesValid()).toEqual([])
  })
  it('exposes the t-shirt template for all 8 platforms and 3 categories', () => {
    for (const p of ['FLIPKART', 'MYNTRA', 'AMAZON', 'MEESHO', 'SNAPDEAL', 'NYKAA', 'AJIO', 'FIRSTCRY']) {
      for (const slug of ['mens-tshirts', 'womens-tshirts', 'kids-tshirts']) {
        expect(getTemplate(p as never, slug), `${p} / ${slug}`).not.toBeNull()
      }
    }
  })
})
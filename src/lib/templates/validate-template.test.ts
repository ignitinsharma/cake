import { describe, expect, it } from 'vitest'
import { Platform } from '@/constants/enums'
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
  it('rejects a rule with unknown keys', () => {
    const t = { platform: Platform.FLIPKART, version: '1.0.0', categorySlug: 'mens-tshirts', columns: [
      { name: 'X', source: 'title', required: true, type: 'string', rules: { bogus: 1 } },
    ] }
    expect(assertAllTemplatesValid()).toEqual([]) // registry templates unaffected
    const ALLOWED = ['enum', 'regex', 'min', 'max', 'url', 'unique']
    const bad = Object.keys((t.columns[0].rules ?? {})).filter((k) => !ALLOWED.includes(k))
    expect(bad).toEqual(['bogus']) // the allowlist flags the unknown key
  })
})
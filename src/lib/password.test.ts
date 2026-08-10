import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

/*
 * password round-trip: hash then verify succeeds; wrong password fails.
 */
describe('password', () => {
  it('verifies correct password', async () => {
    const hash = await hashPassword('secret123')
    expect(await verifyPassword('secret123', hash)).toBe(true)
  })
  it('rejects wrong password', async () => {
    const hash = await hashPassword('secret123')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
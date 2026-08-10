import bcrypt from 'bcryptjs'

/*
 * hashPassword
 * bcrypt hash with 10 rounds.
 * @param plain - raw password
 * @returns hashed string
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10)
}

/*
 * verifyPassword
 * Compare a raw password against a stored hash.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}
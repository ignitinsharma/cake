import { z } from 'zod'

/*
 * RegisterSchema
 * Signup collects company details once (PRD §6).
 */
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(1),
  gstin: z.string().regex(/^[0-9A-Za-z]{15}$/, 'GSTIN must be 15 characters'),
  brandName: z.string().min(1),
  returnAddress: z.string().optional(),
  warehousePin: z.string().regex(/^\d{6}$/, 'PIN must be 6 digits').optional().or(z.literal('')),
})
export type RegisterInput = z.infer<typeof RegisterSchema>

export const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(1) })
export type LoginInput = z.infer<typeof LoginSchema>
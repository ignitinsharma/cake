import { z } from 'zod'
import type { PlatformTemplate } from '@/lib/templates/types'

/*
 * deriveFormSchema
 * Builds a zod schema from a template: every required column becomes a
 * required field; numeric columns validate as numbers (string input).
 */
export function deriveFormSchema(template: PlatformTemplate) {
  const shape: Record<string, z.ZodTypeAny> = {}
  for (const c of template.columns) {
    // categoryPath is resolved from our taxonomy → never user-entered (PRD §6)
    if (c.source === 'categoryPath') continue
    const isNum = c.type === 'number' || c.type === 'int'
    const base = isNum ? z.coerce.number() : z.string().min(1)
    shape[c.name] = c.required ? base : isNum ? z.coerce.number().optional().or(z.literal('')) : z.string().optional().or(z.literal(''))
  }
  return z.object(shape)
}

/*
 * ProductFormData
 * The form payload shape (string values from inputs).
 */
export type ProductFormData = Record<string, string>
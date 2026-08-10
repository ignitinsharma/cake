import Papa from 'papaparse'
import * as XLSX from 'xlsx'

/*
 * ParsedFile
 * Headers plus data rows; every cell is a string.
 */
export interface ParsedFile {
  headers: string[]
  rows: Record<string, string>[]
}

/*
 * MAX_IMPORT_ROWS
 * Browser-side safety cap (spec §10): big files go through a tool instead.
 */
export const MAX_IMPORT_ROWS = 2000

/*
 * parseCsv
 * RFC 4180 CSV → headers + rows. Empty/headerless files and >2000-row files throw.
 */
export function parseCsv(text: string): ParsedFile {
  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: true,
    transform: (v) => (v == null ? '' : String(v)),
  })
  const rows = result.data.filter((r) => Object.values(r).some((v) => String(v).trim() !== ''))
  if (rows.length === 0) throw new Error('No data rows found — is the file empty or headerless?')
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Too many rows: ${rows.length} (max ${MAX_IMPORT_ROWS})`)
  return { headers: Object.keys(rows[0]), rows: rows as Record<string, string>[] }
}

/*
 * parseXlsx
 * First worksheet → headers + rows (all cells stringified).
 */
export function parseXlsx(buf: ArrayBuffer): ParsedFile {
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw new Error('No sheets found in the workbook')
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  const rows = data.map((r) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v == null ? '' : String(v)])),
  )
  if (rows.length === 0) throw new Error('No data rows found — is the file empty or headerless?')
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Too many rows: ${rows.length} (max ${MAX_IMPORT_ROWS})`)
  return { headers: Object.keys(rows[0]), rows }
}

/*
 * parseFile
 * Browser entry point: sniff by extension (spec D3: CSV + XLSX).
 */
export async function parseFile(file: File): Promise<ParsedFile> {
  if (file.name.toLowerCase().endsWith('.xlsx')) {
    return parseXlsx(await file.arrayBuffer())
  }
  return parseCsv(await file.text())
}

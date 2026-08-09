import * as XLSX from 'xlsx'

/*
 * toCSV
 * RFC 4180 CSV: quote fields containing comma, quote, CR, or LF.
 */
export function toCSV(rows: string[][]): string {
  const esc = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  return rows.map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n'
}

/*
 * toXLSX
 * Writes rows (header + data) to an xlsx buffer.
 */
export function toXLSX(rows: string[][]): Buffer {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
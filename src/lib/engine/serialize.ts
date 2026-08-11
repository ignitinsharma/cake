import * as XLSX from 'xlsx'

/*
 * toCSV
 * RFC 4180 CSV: quote fields containing comma, quote, CR, or LF.
 * Formula-injection neutralization (OWASP): cells starting with = + - @
 * get a leading apostrophe so spreadsheets treat them as text, not formulas.
 */
export function toCSV(rows: string[][]): string {
  const esc = (v: string) => {
    const unsafe = /[",\r\n]/.test(v)
    const formula = /^[=+\-@]/.test(v)
    const value = formula ? `'${v}` : v
    return unsafe || formula ? `"${value.replace(/"/g, '""')}"` : value
  }
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
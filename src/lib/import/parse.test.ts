import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { MAX_IMPORT_ROWS, parseCsv, parseXlsx } from './parse'

describe('parseCsv', () => {
  it('parses headers and quoted commas', () => {
    const f = parseCsv('Title,Description\nTee,"Soft, 100% cotton"\n')
    expect(f.headers).toEqual(['Title', 'Description'])
    expect(f.rows[0]).toEqual({ Title: 'Tee', Description: 'Soft, 100% cotton' })
  })
  it('rejects empty files', () => {
    expect(() => parseCsv('')).toThrow('No data rows')
  })
  it('rejects files over the row cap', () => {
    const text = 'Sku\n' + Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `s${i}`).join('\n') + '\n'
    expect(() => parseCsv(text)).toThrow('Too many rows')
  })
})

describe('parseXlsx', () => {
  it('reads the first sheet to headers + rows', () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Sku', 'Price'], ['s1', '499']]), 'Sheet1')
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
    const f = parseXlsx(buf)
    expect(f.headers).toEqual(['Sku', 'Price'])
    expect(f.rows[0]).toEqual({ Sku: 's1', Price: '499' })
  })
})

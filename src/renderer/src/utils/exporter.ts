import type { LogRow } from '../types'

export function rowsToCsv(rows: LogRow[], fields: string[]): string {
  const escape = (val: unknown) => {
    const s = String(val ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [fields.join(','), ...rows.map(r => fields.map(f => escape(r[f])).join(','))].join('\n')
}

export function rowsToJsonl(rows: LogRow[]): string {
  return rows.map(r => JSON.stringify(
    Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('_')))
  )).join('\n')
}

export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

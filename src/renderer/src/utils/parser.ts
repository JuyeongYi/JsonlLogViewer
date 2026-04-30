import type { LogRow } from '../types'

const REQUIRED_FIELDS = ['timestamp', 'level', 'msg'] as const

export function parseJsonlContent(content: string): LogRow[] {
  const rows: LogRow[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    try {
      const obj = JSON.parse(line) as Record<string, unknown>
      const missing = REQUIRED_FIELDS.filter(f => !(f in obj))
      rows.push({
        _lineNumber: i + 1,
        _raw: line,
        _schemaId: null,
        ...(missing.length > 0 && {
          _parseError: `Missing required fields: ${missing.join(', ')}`
        }),
        ...obj,
      })
    } catch {
      rows.push({
        _lineNumber: i + 1,
        _raw: line,
        _schemaId: null,
        _parseError: 'Invalid JSON',
      })
    }
  }

  return rows
}

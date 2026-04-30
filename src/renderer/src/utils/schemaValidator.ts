import type { SchemaEntry } from '../types'

// CSP-safe validator — no eval / new Function
// Supports: type, required, properties (type-check only)
function validate(schema: Record<string, unknown>, data: Record<string, unknown>): boolean {
  // type check
  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return false
  }

  // required fields
  if (Array.isArray(schema.required)) {
    for (const field of schema.required) {
      if (typeof field === 'string' && !(field in data)) return false
    }
  }

  return true
}

const cache = new Map<string, (data: Record<string, unknown>) => boolean>()

export function findMatchingSchema(
  schemas: SchemaEntry[],
  row: Record<string, unknown>
): SchemaEntry | null {
  // 로그 줄에 schema 필드가 있으면 해당 ID 스키마 우선 시도
  if (typeof row['schema'] === 'string') {
    const hinted = schemas.find(s => s.id === row['schema'])
    if (hinted) {
      if (!cache.has(hinted.id)) {
        const schema = hinted.schema
        cache.set(hinted.id, (data) => validate(schema, data))
      }
      try { if (cache.get(hinted.id)!(row)) return hinted } catch { /* fall through */ }
    }
  }

  for (const entry of schemas) {
    if (!cache.has(entry.id)) {
      const schema = entry.schema
      cache.set(entry.id, (data) => validate(schema, data))
    }
    try {
      if (cache.get(entry.id)!(row)) return entry
    } catch { /* skip malformed schema */ }
  }
  return null
}

export function clearValidatorCache(): void {
  cache.clear()
}

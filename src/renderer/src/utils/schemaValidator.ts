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

import type { SchemaEntry } from '../types'

// CSP-safe validator (no eval / new Function)
// Supports: type, required, properties (recursive), enum, minimum, maximum

function validateType(value: unknown, type: string): boolean {
  switch (type) {
    case 'string':  return typeof value === 'string'
    case 'number':  return typeof value === 'number'
    case 'integer': return typeof value === 'number' && Number.isInteger(value)
    case 'boolean': return typeof value === 'boolean'
    case 'array':   return Array.isArray(value)
    case 'object':  return typeof value === 'object' && value !== null && !Array.isArray(value)
    case 'null':    return value === null
    default:        return true
  }
}

function validateField(value: unknown, schema: Record<string, unknown>): boolean {
  // type
  if (schema.type && !validateType(value, schema.type as string)) return false

  // enum
  if (Array.isArray(schema.enum) && !(schema.enum as unknown[]).includes(value)) return false

  // numeric range
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < (schema.minimum as number)) return false
    if (schema.maximum !== undefined && value > (schema.maximum as number)) return false
  }

  // string pattern / length
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < (schema.minLength as number)) return false
    if (schema.maxLength !== undefined && value.length > (schema.maxLength as number)) return false
    if (schema.pattern) {
      try { if (!new RegExp(schema.pattern as string).test(value)) return false } catch { /* skip */ }
    }
  }

  // nested object properties (recursive)
  if (
    typeof value === 'object' && value !== null && !Array.isArray(value) &&
    schema.properties
  ) {
    const obj = value as Record<string, unknown>
    const props = schema.properties as Record<string, Record<string, unknown>>

    // check required inside nested
    if (Array.isArray(schema.required)) {
      for (const f of schema.required as string[]) {
        if (!(f in obj)) return false
      }
    }
    // validate each defined property
    for (const [key, propSchema] of Object.entries(props)) {
      if (key in obj && !validateField(obj[key], propSchema)) return false
    }
  }

  // array items + uniqueItems (set)
  if (Array.isArray(value)) {
    if (schema.items) {
      const itemSchema = schema.items as Record<string, unknown>
      for (const item of value) {
        if (!validateField(item, itemSchema)) return false
      }
    }
    if (schema.uniqueItems === true) {
      const seen = new Set(value.map(v => JSON.stringify(v)))
      if (seen.size !== value.length) return false
    }
  }

  // additionalProperties (dict value type)
  if (
    typeof value === 'object' && value !== null && !Array.isArray(value) &&
    schema.additionalProperties && typeof schema.additionalProperties === 'object'
  ) {
    const valSchema = schema.additionalProperties as Record<string, unknown>
    for (const v of Object.values(value as Record<string, unknown>)) {
      if (!validateField(v, valSchema)) return false
    }
  }

  return true
}

function validate(schema: Record<string, unknown>, data: Record<string, unknown>): boolean {
  // top-level type
  if (schema.type === 'object') {
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return false
  }

  // top-level required
  if (Array.isArray(schema.required)) {
    for (const field of schema.required as string[]) {
      if (!(field in data)) return false
    }
  }

  // top-level properties validation
  if (schema.properties) {
    const props = schema.properties as Record<string, Record<string, unknown>>
    for (const [key, propSchema] of Object.entries(props)) {
      if (key in data && !validateField(data[key], propSchema)) return false
    }
  }

  return true
}

const cache = new Map<string, (data: Record<string, unknown>) => boolean>()

export function findMatchingSchema(
  schemas: SchemaEntry[],
  row: Record<string, unknown>
): SchemaEntry | null {
  // row.schema 필드 힌트 우선
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

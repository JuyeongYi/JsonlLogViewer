import Ajv from 'ajv'
import type { SchemaEntry } from '../types'

const ajv = new Ajv({ strict: false })
const compiledCache = new Map<string, ReturnType<typeof ajv.compile>>()

function getValidator(entry: SchemaEntry) {
  if (!compiledCache.has(entry.id)) {
    compiledCache.set(entry.id, ajv.compile(entry.schema))
  }
  return compiledCache.get(entry.id)!
}

export function findMatchingSchema(
  schemas: SchemaEntry[],
  row: Record<string, unknown>
): SchemaEntry | null {
  for (const entry of schemas) {
    try {
      if (getValidator(entry)(row)) return entry
    } catch { /* skip bad schema */ }
  }
  return null
}

export function clearValidatorCache(): void {
  compiledCache.clear()
}

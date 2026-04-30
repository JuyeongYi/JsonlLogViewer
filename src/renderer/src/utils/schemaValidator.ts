import type { SchemaEntry } from '../types'

/**
 * $schema URI에서 stem을 추출해 등록 스키마 ID로 사용한다.
 * "https://json.schemastore.org/http-request.json" → "http-request"
 */
export function extractStem(url: string): string {
  const seg = url.split('/').pop() ?? url
  return seg.replace(/\.json$/i, '')
}

// ── 원격 스키마 캐시 ─────────────────────────────────────
// null = 가져오기 실패, 값 있음 = 성공
const remoteSchemaCache = new Map<string, SchemaEntry | null>()
const pendingFetches = new Set<string>()
let onRemoteSchemaFetched: ((schemaId: string) => void) | null = null

/** 원격 스키마 로드 완료 시 행 재매칭 트리거 콜백 */
export function setRemoteSchemaCallback(cb: ((schemaId: string) => void) | null): void {
  onRemoteSchemaFetched = cb
}

export function clearRemoteSchemaCache(): void {
  remoteSchemaCache.clear()
  pendingFetches.clear()
}

async function fetchRemoteSchema(url: string): Promise<void> {
  if (pendingFetches.has(url) || remoteSchemaCache.has(url)) return
  pendingFetches.add(url)
  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const schema = await resp.json()
    const id = extractStem(url)
    remoteSchemaCache.set(url, {
      id,
      displayName: (typeof schema.title === 'string' ? schema.title : null) ?? id,
      schema,
      hasViewer: false,
      viewerPath: null,
    })
    cache.delete(id)
    onRemoteSchemaFetched?.(id)
  } catch {
    remoteSchemaCache.set(url, null)
  } finally {
    pendingFetches.delete(url)
  }
}

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
  const tryEntry = (entry: SchemaEntry) => {
    if (!cache.has(entry.id)) {
      const s = entry.schema
      cache.set(entry.id, (data) => validate(s, data))
    }
    try { return cache.get(entry.id)!(row) ? entry : null } catch { return null }
  }

  // $schema: 로컬 등록 스키마(stem) → 없으면 URI fetch
  if (typeof row['$schema'] === 'string') {
    const url = row['$schema']
    const stem = extractStem(url)

    // 1. 로컬 등록 스키마 확인 (stem 매칭)
    const local = schemas.find(s => s.id === stem)
    if (local) {
      if (local.hasSchema) {
        // schema.json 있음 → 검증 후 반환 (viewer도 있으면 연결)
        const matched = tryEntry(local)
        if (matched) return matched
      } else {
        // viewer-only: stem 매칭만으로 반환, 검증은 원격 schema로
        // 원격 schema fetch 트리거 (있으면 다음 렌더에서 검증)
        const cached = remoteSchemaCache.get(url)
        if (!cached) fetchRemoteSchema(url)
        return local  // viewer 바로 연결
      }
    }

    // 2. 로컬 없음 → 원격 캐시 확인 또는 fetch 트리거
    const cached = remoteSchemaCache.get(url)
    if (cached) {
      const matched = tryEntry(cached)
      if (matched) return matched
    } else if (cached === undefined) {
      fetchRemoteSchema(url)  // 백그라운드 fetch, 완료 시 행 재매칭
    }
  }

  // schema: 등록 스키마 직접 ID 매칭
  if (typeof row['schema'] === 'string') {
    const local = schemas.find(s => s.id === row['schema'])
    if (local) {
      const matched = tryEntry(local)
      if (matched) return matched
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

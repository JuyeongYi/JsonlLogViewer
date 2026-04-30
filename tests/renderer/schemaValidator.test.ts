import { describe, it, expect } from 'vitest'
import { findMatchingSchema } from '@renderer/utils/schemaValidator'
import type { SchemaEntry } from '@renderer/types'

const makeSchema = (id: string, required: string[]): SchemaEntry => ({
  id, displayName: id,
  schema: { type: 'object', required },
  hasViewer: false, viewerPath: null,
})

describe('findMatchingSchema', () => {
  it('매칭 스키마를 반환한다', () => {
    const schemas = [makeSchema('test', ['level', 'msg', 'timestamp', 'event_type'])]
    const row = { level: 'info', msg: 'hi', timestamp: 't', event_type: 'login' }
    expect(findMatchingSchema(schemas, row)?.id).toBe('test')
  })

  it('매칭 없으면 null 반환', () => {
    const schemas = [makeSchema('test', ['does_not_exist'])]
    expect(findMatchingSchema(schemas, { level: 'info' })).toBeNull()
  })

  it('배열 순서(우선순위)대로 첫 번째 매칭을 반환한다', () => {
    const schemas = [
      makeSchema('first',  ['level']),
      makeSchema('second', ['level']),
    ]
    expect(findMatchingSchema(schemas, { level: 'info' })?.id).toBe('first')
  })

  it('specificity와 무관하게 순서 우선 — 앞에 있는 스키마가 이김', () => {
    // required 5개짜리가 앞에 있어도, required 4개짜리가 앞에 있으면 4개짜리 매칭
    const schemas = [
      makeSchema('less-specific',  ['timestamp', 'level', 'msg', 'event_type']),
      makeSchema('more-specific', ['timestamp', 'level', 'msg', 'event_type', 'session_id']),
    ]
    const row = { timestamp: 't', level: 'info', msg: 'm', event_type: 'e', session_id: 's' }
    expect(findMatchingSchema(schemas, row)?.id).toBe('less-specific')
  })

  it('빈 스키마 목록이면 null', () => {
    expect(findMatchingSchema([], { level: 'info' })).toBeNull()
  })
})

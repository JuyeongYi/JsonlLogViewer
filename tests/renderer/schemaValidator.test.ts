import { describe, it, expect } from 'vitest'
import { findMatchingSchema } from '@renderer/utils/schemaValidator'
import type { SchemaEntry } from '@renderer/types'

const makeSchema = (required: string[]): SchemaEntry => ({
  id: 'test', displayName: 'Test',
  schema: { type: 'object', required },
  hasViewer: false, viewerPath: null,
})

describe('findMatchingSchema', () => {
  it('매칭 스키마를 반환한다', () => {
    const schemas = [makeSchema(['level', 'msg', 'timestamp', 'event_type'])]
    const row = { level: 'info', msg: 'hi', timestamp: 't', event_type: 'login' }
    expect(findMatchingSchema(schemas, row)?.id).toBe('test')
  })
  it('매칭 없으면 null 반환', () => {
    const schemas = [makeSchema(['does_not_exist'])]
    expect(findMatchingSchema(schemas, { level: 'info' })).toBeNull()
  })
  it('등록 순서상 첫 매칭을 반환한다', () => {
    const schemas = [
      { ...makeSchema(['level']), id: 'first' },
      { ...makeSchema(['level']), id: 'second' },
    ]
    expect(findMatchingSchema(schemas, { level: 'info' })?.id).toBe('first')
  })
  it('빈 스키마 목록이면 null', () => {
    expect(findMatchingSchema([], { level: 'info' })).toBeNull()
  })
})

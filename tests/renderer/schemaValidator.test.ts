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

  it('row.schema 필드가 있으면 해당 스키마 우선 매칭', () => {
    const schemas = [
      makeSchema('generic', ['level']),
      makeSchema('specific', ['level', 'event_type']),
    ]
    // generic이 앞에 있어도, schema 힌트로 specific 우선
    const row = { level: 'info', event_type: 'login', schema: 'specific' }
    expect(findMatchingSchema(schemas, row)?.id).toBe('specific')
  })

  it('properties 타입 검증 — 타입이 맞지 않으면 매칭 실패', () => {
    const schemas = [{
      id: 'typed', displayName: 'typed',
      schema: {
        type: 'object',
        required: ['status_code'],
        properties: { status_code: { type: 'integer' } }
      },
      hasViewer: false, viewerPath: null,
    }]
    // string이면 매칭 실패
    expect(findMatchingSchema(schemas, { status_code: 'not-a-number' })).toBeNull()
    // integer면 매칭 성공
    expect(findMatchingSchema(schemas, { status_code: 200 })?.id).toBe('typed')
  })

  it('enum 검증 — 허용 값이 아니면 매칭 실패', () => {
    const schemas = [{
      id: 'method', displayName: 'method',
      schema: {
        type: 'object',
        required: ['method'],
        properties: { method: { type: 'string', enum: ['GET','POST','PUT','DELETE'] } }
      },
      hasViewer: false, viewerPath: null,
    }]
    expect(findMatchingSchema(schemas, { method: 'INVALID' })).toBeNull()
    expect(findMatchingSchema(schemas, { method: 'GET' })?.id).toBe('method')
  })

  it('중첩 객체 properties 검증', () => {
    const schemas = [{
      id: 'nested', displayName: 'nested',
      schema: {
        type: 'object',
        required: ['user'],
        properties: {
          user: {
            type: 'object',
            required: ['id'],
            properties: { id: { type: 'integer' } }
          }
        }
      },
      hasViewer: false, viewerPath: null,
    }]
    expect(findMatchingSchema(schemas, { user: { id: 'not-int' } })).toBeNull()
    expect(findMatchingSchema(schemas, { user: { id: 42 } })?.id).toBe('nested')
  })

  it('row.schema 힌트 스키마가 JSON Schema 검증 실패 시 일반 순서로 폴백', () => {
    const schemas = [
      makeSchema('fallback', ['level']),
      makeSchema('strict',   ['level', 'required_missing']),
    ]
    const row = { level: 'info', schema: 'strict' }  // strict 검증 실패
    expect(findMatchingSchema(schemas, row)?.id).toBe('fallback')
  })
})

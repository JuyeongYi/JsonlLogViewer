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

  it('required 필드가 더 많은(구체적인) 스키마를 우선 반환한다', () => {
    // game-event(4개) vs game-session(5개) — session_id 포함 행은 game-session 매칭
    const schemas = [
      makeSchema('game-event',   ['timestamp', 'level', 'msg', 'event_type']),
      makeSchema('game-session', ['timestamp', 'level', 'msg', 'event_type', 'session_id']),
    ]
    const row = { timestamp: 't', level: 'info', msg: 'm', event_type: 'e', session_id: 's' }
    expect(findMatchingSchema(schemas, row)?.id).toBe('game-session')
  })

  it('specificity가 같으면 등록 순서 첫 번째를 반환한다', () => {
    const schemas = [
      makeSchema('first',  ['level']),
      makeSchema('second', ['level']),
    ]
    expect(findMatchingSchema(schemas, { level: 'info' })?.id).toBe('first')
  })

  it('session_id 없는 행은 덜 구체적인 스키마로 매칭된다', () => {
    const schemas = [
      makeSchema('game-event',   ['timestamp', 'level', 'msg', 'event_type']),
      makeSchema('game-session', ['timestamp', 'level', 'msg', 'event_type', 'session_id']),
    ]
    const row = { timestamp: 't', level: 'info', msg: 'm', event_type: 'e' }
    expect(findMatchingSchema(schemas, row)?.id).toBe('game-event')
  })

  it('빈 스키마 목록이면 null', () => {
    expect(findMatchingSchema([], { level: 'info' })).toBeNull()
  })
})

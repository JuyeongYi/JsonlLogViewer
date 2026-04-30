import { describe, it, expect } from 'vitest'
import { rowsToCsv, rowsToJsonl } from '@renderer/utils/exporter'
import type { LogRow } from '@renderer/types'

const rows: LogRow[] = [
  { _lineNumber: 1, _raw: '', _schemaId: null, timestamp: 't1', level: 'info', msg: 'hello', extra: 1 },
  { _lineNumber: 2, _raw: '', _schemaId: null, timestamp: 't2', level: 'error', msg: 'fail,with,comma' },
]

describe('rowsToCsv', () => {
  it('헤더 + 데이터 행을 CSV로 변환한다', () => {
    const csv = rowsToCsv(rows, ['timestamp', 'level', 'msg'])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('timestamp,level,msg')
    expect(lines[1]).toBe('t1,info,hello')
  })

  it('쉼표 포함 값을 따옴표로 감싼다', () => {
    expect(rowsToCsv(rows, ['msg'])).toContain('"fail,with,comma"')
  })
})

describe('rowsToJsonl', () => {
  it('_ 내부 필드를 제외하고 JSONL로 변환한다', () => {
    const jsonl = rowsToJsonl(rows)
    const parsed = JSON.parse(jsonl.split('\n')[0])
    expect(parsed.timestamp).toBe('t1')
    expect(parsed._lineNumber).toBeUndefined()
    expect(parsed._schemaId).toBeUndefined()
  })
})

import { describe, it, expect } from 'vitest'
import { computeStats } from '@renderer/hooks/useStats'
import type { LogRow } from '@renderer/types'

const makeRow = (level: string, ts: string, extra = {}): LogRow => ({
  _lineNumber: 1, _raw: '', _schemaId: null,
  timestamp: ts, level, msg: 'test', ...extra
})

describe('computeStats', () => {
  it('레벨별 카운트를 집계한다', () => {
    const rows = [makeRow('error', 't'), makeRow('error', 't'), makeRow('info', 't')]
    const stats = computeStats(rows)
    expect(stats.levelCounts.error).toBe(2)
    expect(stats.levelCounts.info).toBe(1)
  })

  it('에러율을 계산한다 (error + warn / 전체)', () => {
    const rows = [makeRow('error', 't'), makeRow('warn', 't'), makeRow('info', 't'), makeRow('info', 't')]
    const stats = computeStats(rows)
    expect(stats.errorRate).toBe(0.5)
  })

  it('특정 필드의 값 분포를 집계한다', () => {
    const rows = [
      makeRow('info', 't', { host: 'a' }),
      makeRow('info', 't', { host: 'a' }),
      makeRow('info', 't', { host: 'b' }),
    ]
    const stats = computeStats(rows, 'host')
    expect(stats.fieldDistribution?.['a']).toBe(2)
    expect(stats.fieldDistribution?.['b']).toBe(1)
  })

  it('빈 배열이면 에러율 0', () => {
    expect(computeStats([]).errorRate).toBe(0)
  })
})

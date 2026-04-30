import React, { useMemo } from 'react'
import type { LogRow } from '../types'

const LEVEL_COLORS: Record<string, string> = { error: '#f87171', warn: '#fbbf24', info: '#4ade80', debug: '#94a3b8' }
const BUCKET_COUNT = 60

interface TimelineViewProps { rows: LogRow[] }

export function TimelineView({ rows }: TimelineViewProps): React.ReactElement {
  const { buckets, minTs, maxTs } = useMemo(() => {
    const parsed = rows
      .map(r => ({ ts: new Date(String(r.timestamp ?? '')).getTime(), level: String(r.level ?? 'info').toLowerCase() }))
      .filter(r => !isNaN(r.ts))
      .sort((a, b) => a.ts - b.ts)
    if (!parsed.length) return { buckets: [], minTs: 0, maxTs: 0 }
    const minTs = parsed[0].ts
    const maxTs = parsed[parsed.length - 1].ts
    const range = maxTs - minTs || 1
    const buckets: Array<Record<string, number>> = Array.from({ length: BUCKET_COUNT }, () => ({}))
    for (const { ts, level } of parsed) {
      const idx = Math.min(Math.floor(((ts - minTs) / range) * BUCKET_COUNT), BUCKET_COUNT - 1)
      buckets[idx][level] = (buckets[idx][level] ?? 0) + 1
    }
    return { buckets, minTs, maxTs }
  }, [rows])

  if (!buckets.length) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4, fontSize: 14 }}>
      timestamp 필드가 있는 줄이 없습니다
    </div>
  )

  const maxCount = Math.max(...buckets.map(b => Object.values(b).reduce((a, c) => a + c, 0)), 1)
  const levels = ['error', 'warn', 'info', 'debug']
  const H = 120, W_BUCKET = 8, GAP = 1, totalW = BUCKET_COUNT * (W_BUCKET + GAP)

  return (
    <div style={{ padding: 20, overflow: 'auto' }}>
      <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 8 }}>
        {new Date(minTs).toLocaleString()} — {new Date(maxTs).toLocaleString()}
        <span style={{ marginLeft: 16, opacity: 0.7 }}>{rows.length.toLocaleString()}줄 / {BUCKET_COUNT}구간</span>
      </div>
      <svg width={totalW} height={H} style={{ display: 'block' }}>
        {buckets.map((bucket, i) => {
          let yOffset = H
          return (
            <g key={i}>
              {levels.map(level => {
                const count = bucket[level] ?? 0
                if (!count) return null
                const h = (count / maxCount) * H
                yOffset -= h
                return <rect key={level} x={i * (W_BUCKET + GAP)} y={yOffset} width={W_BUCKET} height={h} fill={LEVEL_COLORS[level] ?? '#818cf8'} opacity={0.8} />
              })}
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        {levels.map(l => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: LEVEL_COLORS[l] }} />
            <span style={{ opacity: 0.7 }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

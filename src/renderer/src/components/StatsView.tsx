import React, { useState } from 'react'
import type { LogRow } from '../types'
import { computeStats } from '../hooks/useStats'

const LEVEL_COLORS: Record<string, string> = {
  error: '#f87171', warn: '#fbbf24', warning: '#fbbf24',
  info: '#4ade80', debug: '#94a3b8',
}

interface StatsViewProps { rows: LogRow[] }

export function StatsView({ rows }: StatsViewProps): React.ReactElement {
  const [distributionField, setDistributionField] = useState('')
  const stats = computeStats(rows, distributionField || undefined)
  const allFields = [...new Set(rows.flatMap(r => Object.keys(r).filter(k => !k.startsWith('_'))))].sort()

  return (
    <div style={{ padding: 20, overflow: 'auto', height: '100%' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <StatCard label="전체 줄" value={stats.total.toLocaleString()} />
        <StatCard label="에러율" value={`${(stats.errorRate * 100).toFixed(1)}%`} color={stats.errorRate > 0.1 ? '#f87171' : '#4ade80'} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>레벨별 분포</div>
        {Object.entries(stats.levelCounts).sort(([,a],[,b]) => b-a).map(([level, count]) => (
          <LevelBar key={level} level={level} count={count} total={stats.total} color={LEVEL_COLORS[level] ?? '#e2e8f0'} />
        ))}
      </div>
      <div>
        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>필드 분포</div>
        <select value={distributionField} onChange={e => setDistributionField(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 4, color: '#e2e8f0', fontSize: 12, padding: '3px 8px', marginBottom: 12 }}>
          <option value="">필드 선택...</option>
          {allFields.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        {stats.fieldDistribution && Object.entries(stats.fieldDistribution).sort(([,a],[,b]) => b-a).slice(0, 20).map(([val, count]) => (
          <LevelBar key={val} level={val} count={count} total={stats.total} color="#818cf8" />
        ))}
      </div>
    </div>
  )
}

function StatCard({ label, value, color = '#e2e8f0' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '12px 16px', minWidth: 100 }}>
      <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
    </div>
  )
}

function LevelBar({ level, count, total, color }: { level: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
        <span style={{ color }}>{level}</span>
        <span style={{ opacity: 0.6 }}>{count.toLocaleString()} ({pct.toFixed(1)}%)</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 2, height: 6 }}>
        <div style={{ background: color, borderRadius: 2, height: 6, width: `${pct}%`, transition: 'width 0.3s' }} />
      </div>
    </div>
  )
}

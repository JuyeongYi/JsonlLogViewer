import React from 'react'

export type ViewMode = 'list' | 'stats' | 'timeline' | 'diff'

interface ViewSwitcherProps {
  current: ViewMode
  onChange: (mode: ViewMode) => void
  hasTwoTabs: boolean
}

const VIEWS: Array<{ id: ViewMode; label: string }> = [
  { id: 'list',     label: '로그' },
  { id: 'stats',    label: '통계' },
  { id: 'timeline', label: '타임라인' },
  { id: 'diff',     label: 'Diff' },
]

export function ViewSwitcher({ current, onChange, hasTwoTabs }: ViewSwitcherProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', gap: 2, padding: '4px 12px', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
      {VIEWS.map(v => (
        <button key={v.id} onClick={() => onChange(v.id)}
          disabled={v.id === 'diff' && !hasTwoTabs}
          style={{
            background: current === v.id ? 'rgba(99,102,241,0.25)' : 'transparent',
            border: 'none', borderRadius: 4,
            color: current === v.id ? '#a5b4fc' : v.id === 'diff' && !hasTwoTabs ? '#334155' : '#64748b',
            cursor: v.id === 'diff' && !hasTwoTabs ? 'not-allowed' : 'pointer',
            fontSize: 12, padding: '3px 10px',
          }}
        >
          {v.label}
        </button>
      ))}
    </div>
  )
}

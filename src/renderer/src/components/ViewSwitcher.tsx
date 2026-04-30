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
    <div style={{ display: 'flex', gap: 2, padding: '4px 12px', borderTop: '2px solid var(--border-2)', borderBottom: '2px solid var(--border-2)', background: 'var(--bg-raised)', flexShrink: 0 }}>
      {VIEWS.map(v => (
        <button key={v.id} onClick={() => onChange(v.id)}
          disabled={v.id === 'diff' && !hasTwoTabs}
          style={{
            background: current === v.id ? 'var(--accent-dim)' : 'transparent',
            border: 'none', borderRadius: 4,
            color: current === v.id ? 'var(--accent-text)' : v.id === 'diff' && !hasTwoTabs ? 'var(--text-3)' : '#64748b',
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

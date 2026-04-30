import React from 'react'
import type { Tab } from '../types'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onOpen: () => void
}

export function TabBar({ tabs, activeTabId, onSelect, onClose, onOpen }: TabBarProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: '#13132a', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, overflowX: 'auto' }}>
      {tabs.map(tab => (
        <div
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            background: tab.id === activeTabId ? 'rgba(99,102,241,0.15)' : 'transparent',
            color: tab.id === activeTabId ? '#a5b4fc' : '#94a3b8',
            fontSize: 12, flexShrink: 0,
          }}
        >
          <span>{tab.label}</span>
          <button
            onClick={e => { e.stopPropagation(); onClose(tab.id) }}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.5, fontSize: 12, padding: '0 2px', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={onOpen}
        style={{ padding: '6px 14px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
      >
        + 파일 열기
      </button>
    </div>
  )
}

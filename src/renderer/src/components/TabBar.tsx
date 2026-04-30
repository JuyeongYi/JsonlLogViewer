import React from 'react'
import type { Tab } from '../types'

// 발광 점 애니메이션 keyframes (한 번만 주입)
const STYLE_ID = 'tab-pulse-style'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes tab-pulse {
      0%,100% { box-shadow: 0 0 3px 1px #4ade80; opacity: 1; }
      50%      { box-shadow: 0 0 7px 3px #4ade80; opacity: 0.5; }
    }
    .tab-new-dot {
      display: inline-block;
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #4ade80;
      margin-right: 4px;
      animation: tab-pulse 1s ease-in-out infinite;
      flex-shrink: 0;
    }
  `
  document.head.appendChild(style)
}

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string | null
  newRowTabs: Set<string>
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onOpen: () => void
}

export function TabBar({ tabs, activeTabId, newRowTabs, onSelect, onClose, onOpen }: TabBarProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: '#13132a', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, overflowX: 'auto' }}>
      {tabs.map(tab => {
        const hasNew = newRowTabs.has(tab.id)
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: isActive ? '#a5b4fc' : '#94a3b8',
              fontSize: 12, flexShrink: 0,
            }}
          >
            {hasNew && <span className="tab-new-dot" title="새 줄 추가됨" />}
            <span>{tab.label}</span>
            <button
              onClick={e => { e.stopPropagation(); onClose(tab.id) }}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', opacity: 0.5, fontSize: 12, padding: '0 2px', lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
        )
      })}
      <button
        onClick={onOpen}
        style={{ padding: '6px 14px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}
      >
        + 파일 열기
      </button>
    </div>
  )
}

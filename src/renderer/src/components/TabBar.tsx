import React from 'react'
import type { Tab } from '../types'

const LEVEL_DOT_COLORS = {
  error: '#f87171',
  warn:  '#fbbf24',
  info:  '#4ade80',
} as const

// 발광 점 애니메이션 keyframes (한 번만 주입)
const STYLE_ID = 'tab-pulse-style'
if (typeof document !== 'undefined' && !document.getElementById(STYLE_ID)) {
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
    @keyframes tab-pulse {
      0%,100% { opacity: 1; transform: scale(1); }
      50%      { opacity: 0.35; transform: scale(0.7); }
    }
    .tab-new-dot {
      display: inline-block;
      width: 7px; height: 7px;
      border-radius: 50%;
      margin-right: 3px;
      flex-shrink: 0;
      animation: tab-pulse 1s ease-in-out infinite;
    }
  `
  document.head.appendChild(style)
}

type DotLevel = 'error' | 'warn' | 'info'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string | null
  newRowTabs: Map<string, DotLevel>  // tabId → 최고 레벨
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onOpen: () => void
}

export function TabBar({ tabs, activeTabId, newRowTabs, onSelect, onClose, onOpen }: TabBarProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-raised)', borderBottom: '1px solid rgba(255,255,255,0.08)', flexShrink: 0, overflowX: 'auto' }}>
      {tabs.map(tab => {
        const dotLevel = newRowTabs.get(tab.id)
        const hasNew = !!dotLevel
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '6px 14px', cursor: 'pointer', whiteSpace: 'nowrap',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              color: isActive ? 'var(--accent-text)' : 'var(--text-2)',
              fontSize: 12, flexShrink: 0,
            }}
          >
            {hasNew && dotLevel && (
              <span
                className="tab-new-dot"
                title={`새 줄 추가됨 (${dotLevel})`}
                style={{
                  background: LEVEL_DOT_COLORS[dotLevel],
                  boxShadow: `0 0 5px 2px ${LEVEL_DOT_COLORS[dotLevel]}`,
                }}
              />
            )}
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

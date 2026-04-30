// src/renderer/src/components/LogList.tsx
import React, { useRef, useEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { LogRow as LogRowType } from '../types'
import { LogRow } from './LogRow'

interface LogListProps {
  rows: LogRowType[]
  selectedIndex: number | null
  onSelect: (index: number) => void
  onRowContextMenu: (e: React.MouseEvent, index: number) => void
}

export function LogList({ rows, selectedIndex, onSelect, onRowContextMenu }: LogListProps): React.ReactElement {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 20,
  })

  // 키보드 이동 시 선택된 행이 화면 밖으로 나가면 자동 스크롤
  useEffect(() => {
    if (selectedIndex !== null) {
      virtualizer.scrollToIndex(selectedIndex, { align: 'auto' })
    }
  }, [selectedIndex])

  if (rows.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4, fontSize: 14 }}>
        파일을 열거나 필터 결과가 없습니다
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 헤더: 스크롤 컨테이너 밖에 고정 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '155px 60px 110px 1fr',
          gap: 8,
          padding: '4px 12px',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          opacity: 0.5,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          background: 'var(--bg-raised)',
          flexShrink: 0,
        }}
      >
        <span>Timestamp</span>
        <span>Level</span>
        <span>Category</span>
        <span>Message</span>
      </div>

      {/* 스크롤 영역 */}
      <div ref={parentRef} style={{ flex: 1, overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualItem.size,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <LogRow
              row={rows[virtualItem.index]}
              isSelected={selectedIndex === virtualItem.index}
              onClick={() => onSelect(virtualItem.index)}
              onContextMenu={e => onRowContextMenu(e, virtualItem.index)}
            />
          </div>
        ))}
      </div>
      </div>
    </div>
  )
}

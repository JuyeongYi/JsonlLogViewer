// src/renderer/src/components/LogList.tsx
import React, { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import type { LogRow as LogRowType } from '../types'
import { LogRow } from './LogRow'

interface LogListProps {
  rows: LogRowType[]
  selectedIndex: number | null
  onSelect: (index: number) => void
}

export function LogList({ rows, selectedIndex, onSelect }: LogListProps): React.ReactElement {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 20,
  })

  if (rows.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', opacity: 0.4, fontSize: 14 }}>
        파일을 열거나 필터 결과가 없습니다
      </div>
    )
  }

  return (
    <div ref={parentRef} style={{ height: '100%', overflow: 'auto' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '90px 60px 1fr',
          gap: 8,
          padding: '4px 12px',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          opacity: 0.5,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          position: 'sticky',
          top: 0,
          background: '#1a1a2e',
        }}
      >
        <span>Timestamp</span>
        <span>Level</span>
        <span>Message</span>
      </div>

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
            />
          </div>
        ))}
      </div>
    </div>
  )
}

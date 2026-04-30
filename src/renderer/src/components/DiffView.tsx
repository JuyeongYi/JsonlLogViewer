import React, { useMemo, useState } from 'react'
import { createTwoFilesPatch } from 'diff'
import { html as diff2html } from 'diff2html'
import 'diff2html/bundles/css/diff2html.min.css'
import type { LogRow } from '../types'

interface DiffViewProps {
  leftRows: LogRow[]
  leftLabel: string
  rightRows: LogRow[]
  rightLabel: string
}

export function DiffView({ leftRows, leftLabel, rightRows, rightLabel }: DiffViewProps): React.ReactElement {
  const [maxLines, setMaxLines] = useState(200)
  const diffHtml = useMemo(() => {
    const left = leftRows.slice(0, maxLines).map(r => r._raw).join('\n')
    const right = rightRows.slice(0, maxLines).map(r => r._raw).join('\n')
    const patch = createTwoFilesPatch(leftLabel, rightLabel, left, right)
    return diff2html(patch, { drawFileList: false, matching: 'lines', outputFormat: 'side-by-side' })
  }, [leftRows, rightRows, leftLabel, rightLabel, maxLines])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, fontSize: 12 }}>
        <span style={{ opacity: 0.6 }}>비교 최대</span>
        <select value={maxLines} onChange={e => setMaxLines(Number(e.target.value))}
          style={{ background: 'var(--border)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 12, padding: '2px 6px' }}>
          {[100, 200, 500, 1000].map(n => <option key={n} value={n}>{n}줄</option>)}
        </select>
        <span style={{ opacity: 0.4 }}>좌: {leftLabel} ({leftRows.length}줄) · 우: {rightLabel} ({rightRows.length}줄)</span>
      </div>
      <div style={{ flex: 1, overflow: 'auto', fontSize: 12 }} dangerouslySetInnerHTML={{ __html: diffHtml }} />
    </div>
  )
}

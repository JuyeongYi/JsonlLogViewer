// src/renderer/src/components/JsonTree.tsx
import React, { useState } from 'react'

interface JsonTreeProps {
  data: unknown
  depth?: number
}

export function JsonTree({ data, depth = 0 }: JsonTreeProps): React.ReactElement {
  if (data === null) return <span style={{ color: '#94a3b8' }}>null</span>

  if (typeof data !== 'object') {
    const color =
      typeof data === 'string' ? '#86efac'
      : typeof data === 'number' ? '#93c5fd'
      : typeof data === 'boolean' ? '#f9a8d4'
      : '#e2e8f0'
    return <span style={{ color }}>{JSON.stringify(data)}</span>
  }

  if (Array.isArray(data)) {
    return <ArrayNode data={data} depth={depth} />
  }

  return <ObjectNode data={data as Record<string, unknown>} depth={depth} />
}

function ObjectNode({ data, depth }: { data: Record<string, unknown>; depth: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2)
  const entries = Object.entries(data)

  return (
    <span>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 2px' }}
      >
        {collapsed ? '▶' : '▼'}
      </button>
      {'{'}
      {collapsed ? (
        <span style={{ color: '#94a3b8' }}>…{entries.length} keys</span>
      ) : (
        <div style={{ paddingLeft: 16 }}>
          {entries.map(([key, val]) => (
            <div key={key}>
              <span style={{ color: '#fbbf24' }}>{key}</span>
              <span style={{ color: '#94a3b8' }}>: </span>
              <JsonTree data={val} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
      {'}'}
    </span>
  )
}

function ArrayNode({ data, depth }: { data: unknown[]; depth: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2)

  return (
    <span>
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0 2px' }}
      >
        {collapsed ? '▶' : '▼'}
      </button>
      {'['}
      {collapsed ? (
        <span style={{ color: '#94a3b8' }}>…{data.length} items</span>
      ) : (
        <div style={{ paddingLeft: 16 }}>
          {data.map((item, i) => (
            <div key={i}>
              <span style={{ color: '#94a3b8' }}>{i}: </span>
              <JsonTree data={item} depth={depth + 1} />
            </div>
          ))}
        </div>
      )}
      {']'}
    </span>
  )
}

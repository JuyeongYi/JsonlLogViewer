import React, { useState } from 'react'

interface SchemaManagementProps {
  schemas: Array<{ id: string; displayName: string; hasViewer: boolean }>
  onSave: (id: string, schemaJson: string, displayName: string, viewerHtml: string | null) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
}

export function SchemaManagement({ schemas, onSave, onDelete, onClose }: SchemaManagementProps): React.ReactElement {
  const [id, setId] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [schemaJson, setSchemaJson] = useState('{\n  "type": "object",\n  "required": ["timestamp", "level", "msg"]\n}')
  const [viewerHtml, setViewerHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    try { JSON.parse(schemaJson) } catch {
      setError('JSON Schema가 유효하지 않습니다'); return
    }
    setSaving(true); setError(null)
    try {
      await onSave(id, schemaJson, displayName || id, viewerHtml || null)
      setId(''); setDisplayName(''); setSchemaJson('{}'); setViewerHtml('')
    } catch (e) { setError(String(e)) }
    finally { setSaving(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 4, color: '#e2e8f0', fontSize: 12, padding: '4px 8px', fontFamily: 'monospace',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 560, maxHeight: '80vh', overflow: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15 }}>스키마 관리</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        {schemas.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6, textTransform: 'uppercase' }}>등록된 스키마</div>
            {schemas.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '4px 0', gap: 8 }}>
                <span style={{ flex: 1, fontSize: 13 }}>{s.displayName}</span>
                <span style={{ fontSize: 11, opacity: 0.4 }}>{s.id}</span>
                {s.hasViewer && <span style={{ fontSize: 11, color: '#818cf8' }}>HTML 뷰어</span>}
                <button onClick={() => onDelete(s.id)} style={{ background: 'none', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 3, color: '#f87171', cursor: 'pointer', fontSize: 11, padding: '1px 6px' }}>삭제</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>새 스키마 등록</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input placeholder="ID (영문, 하이픈)" value={id} onChange={e => setId(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <input placeholder="표시 이름" value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>
        <textarea rows={6} placeholder="JSON Schema" value={schemaJson} onChange={e => setSchemaJson(e.target.value)} style={{ ...inputStyle, display: 'block', marginBottom: 8, resize: 'vertical' }} />
        <textarea rows={4} placeholder="viewer.html (선택사항)" value={viewerHtml} onChange={e => setViewerHtml(e.target.value)} style={{ ...inputStyle, display: 'block', marginBottom: 8, resize: 'vertical' }} />
        {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <button onClick={handleSave} disabled={saving || !id} style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)', borderRadius: 4, color: '#a5b4fc', cursor: 'pointer', fontSize: 13, padding: '5px 16px' }}>
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}

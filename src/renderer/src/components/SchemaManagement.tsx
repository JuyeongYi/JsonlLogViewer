import React, { useState, useEffect } from 'react'
import type { SchemaEntry } from '../types'

interface SchemaManagementProps {
  schemas: Array<{ id: string; displayName: string; hasViewer: boolean }>
  onSave: (id: string, schemaJson: string, displayName: string, viewerHtml: string | null) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onClose: () => void
  editTarget?: SchemaEntry  // 편집 모드: 해당 스키마로 폼 초기화
}

export function SchemaManagement({ schemas, onSave, onDelete, onClose, editTarget }: SchemaManagementProps): React.ReactElement {
  const isEditing = !!editTarget

  const [id, setId] = useState(editTarget?.id ?? '')
  const [displayName, setDisplayName] = useState(editTarget?.displayName ?? '')
  const [schemaJson, setSchemaJson] = useState(
    editTarget ? JSON.stringify(editTarget.schema, null, 2) : '{\n  "type": "object",\n  "required": ["timestamp", "level", "msg"]\n}'
  )
  const [viewerHtml, setViewerHtml] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 편집 모드에서 viewer.html 내용 로드
  useEffect(() => {
    if (!editTarget?.viewerPath) return
    window.schemaApi.readViewer(editTarget.viewerPath).then(({ html }) => {
      if (html) setViewerHtml(html)
    })
  }, [editTarget?.viewerPath])

  const handleSave = async () => {
    try { JSON.parse(schemaJson) } catch {
      setError('JSON Schema가 유효하지 않습니다'); return
    }
    setSaving(true); setError(null)
    try {
      await onSave(id, schemaJson, displayName || id, viewerHtml || null)
      if (!isEditing) {
        setId(''); setDisplayName(''); setSchemaJson('{}'); setViewerHtml('')
      } else {
        onClose()
      }
    } catch (e) { setError(String(e)) }
    finally { setSaving(false) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 4, color: '#e2e8f0', fontSize: 12, padding: '4px 8px', fontFamily: 'monospace',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, width: 'min(860px, 92vw)', height: '85vh', display: 'flex', flexDirection: 'column', padding: 20, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 15 }}>{isEditing ? `스키마 편집 — ${editTarget.displayName}` : '스키마 관리'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* 등록된 스키마 목록 (신규 등록 모드에서만 표시) */}
        {!isEditing && schemas.length > 0 && (
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

        <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8, textTransform: 'uppercase' }}>
          {isEditing ? '내용 수정' : '새 스키마 등록'}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            placeholder="ID (영문, 하이픈)"
            value={id}
            onChange={e => setId(e.target.value)}
            disabled={isEditing}
            style={{ ...inputStyle, flex: 1, opacity: isEditing ? 0.5 : 1 }}
          />
          <input
            placeholder="표시 이름"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10, flex: 1, minHeight: 0, marginBottom: 8 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, opacity: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>JSON Schema</div>
            <textarea
              placeholder='{"type":"object","required":["timestamp","level","msg"]}'
              value={schemaJson}
              onChange={e => setSchemaJson(e.target.value)}
              style={{ ...inputStyle, flex: 1, resize: 'none' }}
            />
          </div>
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 10, opacity: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>viewer.html <span style={{ opacity: 0.5 }}>(선택사항)</span></div>
            <textarea
              placeholder="<style>...</style>&#10;<div id=&quot;root&quot;></div>&#10;<script>window.addEventListener('message', e => { ... })</script>"
              value={viewerHtml}
              onChange={e => setViewerHtml(e.target.value)}
              style={{ ...inputStyle, flex: 1, resize: 'none', fontFamily: 'monospace' }}
            />
          </div>
        </div>
        {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 8 }}>{error}</div>}
        <button
          onClick={handleSave}
          disabled={saving || !id}
          style={{ background: 'rgba(99,102,241,0.3)', border: '1px solid rgba(99,102,241,0.5)', borderRadius: 4, color: '#a5b4fc', cursor: 'pointer', fontSize: 13, padding: '5px 16px' }}
        >
          {saving ? '저장 중...' : isEditing ? '저장' : '등록'}
        </button>
      </div>
    </div>
  )
}

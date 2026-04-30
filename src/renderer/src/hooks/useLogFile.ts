import { useState, useCallback } from 'react'
import type { LogRow, FilterState } from '../types'
import { parseJsonlContent } from '../utils/parser'

export interface LogFileState {
  path: string | null
  rows: LogRow[]
  filteredRows: LogRow[]
  filter: FilterState
  isLoading: boolean
  error: string | null
}

function applyFilter(rows: LogRow[], filter: FilterState): LogRow[] {
  // 1. Level filter (multi-select, empty = all)
  let result = filter.levels.length === 0
    ? rows
    : rows.filter(row => filter.levels.includes(String(row.level ?? '').toLowerCase()))

  // 2. Msg regex filter
  if (filter.msgRegex) {
    try {
      const re = new RegExp(filter.msgRegex)
      result = result.filter(row => re.test(String(row.msg ?? '')))
    } catch { /* invalid regex */ }
  }

  // 3. Category regex filter
  if (filter.categoryRegex) {
    try {
      const re = new RegExp(filter.categoryRegex)
      result = result.filter(row => re.test(String(row.category ?? '')))
    } catch { /* invalid regex */ }
  }

  // 4. Sort by timestamp
  return [...result].sort((a, b) => {
    const ta = a.timestamp ? new Date(String(a.timestamp)).getTime() : 0
    const tb = b.timestamp ? new Date(String(b.timestamp)).getTime() : 0
    return filter.sortOrder === 'asc' ? ta - tb : tb - ta
  })
}

export function useLogFile() {
  const [state, setState] = useState<LogFileState>({
    path: null,
    rows: [],
    filteredRows: [],
    filter: { levels: [], sortOrder: 'asc', msgRegex: '', categoryRegex: '' },
    isLoading: false,
    error: null,
  })

  const openFile = useCallback(async () => {
    const path = await window.fileApi.openFile()
    if (!path) return

    setState(s => ({ ...s, isLoading: true, error: null }))
    const { content, error } = await window.fileApi.readFile(path)

    if (error) {
      setState(s => ({ ...s, isLoading: false, error }))
      return
    }

    const rows = parseJsonlContent(content)
    setState(s => ({
      ...s,
      path,
      rows,
      filteredRows: applyFilter(rows, s.filter),
      isLoading: false,
    }))
  }, [])

  const setFilter = useCallback((filter: FilterState) => {
    setState(s => ({
      ...s,
      filter,
      filteredRows: applyFilter(s.rows, filter),
    }))
  }, [])

  // 스키마 변경에 따른 targeted 캐시 초기화
  // changedId === null  → 새 스키마 추가: fallback('') 행만 초기화
  // changedId === '<id>' → 수정/삭제: 해당 ID 매칭 행 + fallback 행 초기화
  const resetFallbackSchemaIds = useCallback((changedId: string | null) => {
    setState(prev => {
      prev.rows.forEach(r => {
        if (changedId === null) {
          if (r._schemaId === '') r._schemaId = null
        } else {
          if (r._schemaId === changedId || r._schemaId === '') r._schemaId = null
        }
      })
      return { ...prev }
    })
  }, [])

  const resetAllSchemaCache = useCallback(() => {
    setState(prev => {
      prev.rows.forEach(r => { r._schemaId = null })
      return { ...prev }
    })
  }, [])

  return { ...state, openFile, setFilter, resetFallbackSchemaIds, resetAllSchemaCache }
}

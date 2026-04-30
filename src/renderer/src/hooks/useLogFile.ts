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
    } catch {
      // invalid regex — skip this filter
    }
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
    filter: { levels: [], sortOrder: 'asc', msgRegex: '' },
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

  return { ...state, openFile, setFilter }
}

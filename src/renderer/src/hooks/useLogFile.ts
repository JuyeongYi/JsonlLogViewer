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
  return rows.filter(row => {
    if (filter.level && row.level?.toLowerCase() !== filter.level.toLowerCase()) {
      return false
    }
    if (filter.text && !row._raw.toLowerCase().includes(filter.text.toLowerCase())) {
      return false
    }
    return true
  })
}

export function useLogFile() {
  const [state, setState] = useState<LogFileState>({
    path: null,
    rows: [],
    filteredRows: [],
    filter: { text: '', level: '' },
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

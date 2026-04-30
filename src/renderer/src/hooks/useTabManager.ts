import { useState, useCallback } from 'react'
import type { Tab } from '../types'

export function useTabManager() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  const openTab = useCallback((path: string) => {
    setTabs(prev => {
      const existing = prev.find(t => t.path === path)
      if (existing) {
        setActiveTabId(existing.id)
        return prev
      }
      const newTab: Tab = {
        id: crypto.randomUUID(),
        path,
        label: path.split(/[\\/]/).pop() ?? path,
      }
      setActiveTabId(newTab.id)
      return [...prev, newTab]
    })
  }, [])

  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === id)
      const next = prev.filter(t => t.id !== id)
      setActiveTabId(current => {
        if (current !== id) return current
        return next[Math.min(idx, next.length - 1)]?.id ?? null
      })
      return next
    })
  }, [])

  return { tabs, activeTabId, setActiveTabId, openTab, closeTab }
}

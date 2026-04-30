import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTabManager } from '@renderer/hooks/useTabManager'

describe('useTabManager', () => {
  it('초기 탭 목록이 비어 있다', () => {
    const { result } = renderHook(() => useTabManager())
    expect(result.current.tabs).toHaveLength(0)
    expect(result.current.activeTabId).toBeNull()
  })

  it('openTab은 탭을 추가하고 활성화한다', () => {
    const { result } = renderHook(() => useTabManager())
    act(() => result.current.openTab('/logs/server.jsonl'))
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.tabs[0].label).toBe('server.jsonl')
    expect(result.current.activeTabId).toBe(result.current.tabs[0].id)
  })

  it('같은 경로를 다시 열면 기존 탭을 활성화한다', () => {
    const { result } = renderHook(() => useTabManager())
    act(() => result.current.openTab('/logs/server.jsonl'))
    act(() => result.current.openTab('/logs/server.jsonl'))
    expect(result.current.tabs).toHaveLength(1)
  })

  it('closeTab은 탭을 제거하고 인접 탭을 활성화한다', () => {
    const { result } = renderHook(() => useTabManager())
    act(() => result.current.openTab('/logs/a.jsonl'))
    act(() => result.current.openTab('/logs/b.jsonl'))
    const firstId = result.current.tabs[0].id
    const secondId = result.current.tabs[1].id
    act(() => result.current.closeTab(firstId))
    expect(result.current.tabs).toHaveLength(1)
    expect(result.current.activeTabId).toBe(secondId)
  })
})

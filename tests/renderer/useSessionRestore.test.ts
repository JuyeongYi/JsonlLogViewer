import { describe, it, expect, beforeEach } from 'vitest'
import { saveSession, loadSession } from '@renderer/hooks/useSessionRestore'

beforeEach(() => localStorage.clear())

describe('session restore', () => {
  it('경로 목록을 저장하고 복원한다', () => {
    saveSession({ openPaths: ['/a.jsonl', '/b.jsonl'], activeIndex: 1 })
    const session = loadSession()
    expect(session?.openPaths).toEqual(['/a.jsonl', '/b.jsonl'])
    expect(session?.activeIndex).toBe(1)
  })

  it('저장된 세션 없으면 null 반환', () => {
    expect(loadSession()).toBeNull()
  })
})

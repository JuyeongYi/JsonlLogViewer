import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLogFile } from '@renderer/hooks/useLogFile'

const mockFileApi = {
  openFile: vi.fn(),
  readFile: vi.fn(),
}
vi.stubGlobal('fileApi', mockFileApi)

const SAMPLE_CONTENT = [
  '{"timestamp":"2024-01-01T00:00:00Z","level":"error","msg":"DB fail"}',
  '{"timestamp":"2024-01-01T00:00:01Z","level":"info","msg":"Retry ok"}',
  '{"timestamp":"2024-01-01T00:00:02Z","level":"warn","msg":"Slow query"}',
].join('\n')

beforeEach(() => {
  vi.clearAllMocks()
  mockFileApi.openFile.mockResolvedValue('/logs/server.jsonl')
  mockFileApi.readFile.mockResolvedValue({ content: SAMPLE_CONTENT })
})

describe('useLogFile', () => {
  it('초기 상태가 비어 있다', () => {
    const { result } = renderHook(() => useLogFile())
    expect(result.current.rows).toHaveLength(0)
    expect(result.current.path).toBeNull()
  })

  it('openFile 호출 시 파일을 로드한다', async () => {
    const { result } = renderHook(() => useLogFile())
    await act(() => result.current.openFile())
    expect(result.current.rows).toHaveLength(3)
    expect(result.current.path).toBe('/logs/server.jsonl')
  })

  it('레벨 단일 선택 필터가 동작한다', async () => {
    const { result } = renderHook(() => useLogFile())
    await act(() => result.current.openFile())
    act(() => result.current.setFilter({ levels: ['error'], sortOrder: 'asc', msgRegex: '', categoryRegex: '' }))
    expect(result.current.filteredRows).toHaveLength(1)
    expect(result.current.filteredRows[0].level).toBe('error')
  })

  it('레벨 복수 선택 시 두 레벨 모두 표시된다', async () => {
    const { result } = renderHook(() => useLogFile())
    await act(() => result.current.openFile())
    act(() => result.current.setFilter({ levels: ['error', 'warn'], sortOrder: 'asc', msgRegex: '', categoryRegex: '' }))
    expect(result.current.filteredRows).toHaveLength(2)
  })

  it('msg 정규식 필터가 동작한다', async () => {
    const { result } = renderHook(() => useLogFile())
    await act(() => result.current.openFile())
    act(() => result.current.setFilter({ levels: [], sortOrder: 'asc', msgRegex: 'fail|Slow', categoryRegex: '' }))
    expect(result.current.filteredRows).toHaveLength(2)
  })

  it('내림차순 정렬 시 최신 항목이 먼저 온다', async () => {
    const { result } = renderHook(() => useLogFile())
    await act(() => result.current.openFile())
    act(() => result.current.setFilter({ levels: [], sortOrder: 'desc', msgRegex: '', categoryRegex: '' }))
    expect(result.current.filteredRows[0].msg).toBe('Slow query')
  })

  it('openFile 취소 시 상태가 변하지 않는다', async () => {
    mockFileApi.openFile.mockResolvedValue(null)
    const { result } = renderHook(() => useLogFile())
    await act(() => result.current.openFile())
    expect(result.current.rows).toHaveLength(0)
  })
})

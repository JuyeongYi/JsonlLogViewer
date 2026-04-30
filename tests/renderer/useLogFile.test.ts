import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLogFile } from '@renderer/hooks/useLogFile'

// window.fileApi mock
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

  it('텍스트 필터가 msg와 raw에서 검색한다', async () => {
    const { result } = renderHook(() => useLogFile())
    await act(() => result.current.openFile())
    act(() => result.current.setFilter({ text: 'DB', level: '' }))
    expect(result.current.filteredRows).toHaveLength(1)
    expect(result.current.filteredRows[0].msg).toBe('DB fail')
  })

  it('레벨 필터가 대소문자 구분 없이 동작한다', async () => {
    const { result } = renderHook(() => useLogFile())
    await act(() => result.current.openFile())
    act(() => result.current.setFilter({ text: '', level: 'ERROR' }))
    expect(result.current.filteredRows).toHaveLength(1)
  })

  it('openFile 취소 시 상태가 변하지 않는다', async () => {
    mockFileApi.openFile.mockResolvedValue(null)
    const { result } = renderHook(() => useLogFile())
    await act(() => result.current.openFile())
    expect(result.current.rows).toHaveLength(0)
  })
})

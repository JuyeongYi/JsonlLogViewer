import { describe, it, expect } from 'vitest'
import { parseJsonlContent } from '@renderer/utils/parser'

describe('parseJsonlContent', () => {
  it('정상 JSONL을 LogRow 배열로 파싱한다', () => {
    const input = [
      '{"timestamp":"2024-01-01T00:00:00Z","level":"info","msg":"hello"}',
      '{"timestamp":"2024-01-01T00:00:01Z","level":"error","msg":"fail","code":500}',
    ].join('\n')

    const result = parseJsonlContent(input)

    expect(result).toHaveLength(2)
    expect(result[0]._lineNumber).toBe(1)
    expect(result[0].level).toBe('info')
    expect(result[0].msg).toBe('hello')
    expect(result[0]._parseError).toBeUndefined()
    expect(result[1].code).toBe(500)
  })

  it('빈 줄을 무시한다', () => {
    const input = '{"timestamp":"t","level":"info","msg":"a"}\n\n{"timestamp":"t","level":"info","msg":"b"}'
    expect(parseJsonlContent(input)).toHaveLength(2)
  })

  it('유효하지 않은 JSON 줄에 _parseError를 설정한다', () => {
    const input = 'not json'
    const result = parseJsonlContent(input)
    expect(result[0]._parseError).toBe('Invalid JSON')
    expect(result[0]._raw).toBe('not json')
  })

  it('필수 필드(timestamp, level, msg) 누락 시 _parseError를 설정한다', () => {
    const input = '{"timestamp":"t","level":"info"}'
    const result = parseJsonlContent(input)
    expect(result[0]._parseError).toContain('msg')
  })

  it('_lineNumber가 원본 파일 줄 번호와 일치한다', () => {
    const input = '\n{"timestamp":"t","level":"info","msg":"a"}'
    const result = parseJsonlContent(input)
    expect(result[0]._lineNumber).toBe(2)
  })
})

import { describe, it, expect } from 'vitest'
import { parseArgv } from '../../src/main/cli'

describe('parseArgv', () => {
  it('인자 없으면 default', () => {
    expect(parseArgv([])).toEqual({ cmd: 'default' })
  })

  it('--help', () => {
    expect(parseArgv(['--help'])).toEqual({ cmd: 'help' })
  })

  it('open + 단일 경로 (tail 기본 true)', () => {
    expect(parseArgv(['open', 'a.jsonl'])).toEqual({ cmd: 'open', paths: ['a.jsonl'], tail: true })
  })

  it('open + 다중 경로', () => {
    const r = parseArgv(['open', 'a.jsonl', 'b.jsonl', 'c.jsonl'])
    expect(r.cmd).toBe('open')
    if (r.cmd === 'open') expect(r.paths).toEqual(['a.jsonl', 'b.jsonl', 'c.jsonl'])
  })

  it('open + --non-tail', () => {
    expect(parseArgv(['open', 'a.jsonl', '--non-tail'])).toEqual({ cmd: 'open', paths: ['a.jsonl'], tail: false })
  })

  it('open 경로 없음 → 빈 paths', () => {
    expect(parseArgv(['open'])).toEqual({ cmd: 'open', paths: [], tail: true })
  })

  it('schema --list', () => {
    expect(parseArgv(['schema', '--list'])).toEqual({ cmd: 'schema', op: 'list' })
  })

  it('schema --add', () => {
    expect(parseArgv(['schema', '--add', 'my-id', './s.json', './v.html'])).toEqual({
      cmd: 'schema', op: 'add', id: 'my-id', schemaJsonPath: './s.json', viewerHtmlPath: './v.html'
    })
  })

  it('schema --add 인자 부족 → error', () => {
    expect(parseArgv(['schema', '--add', 'only-id']).cmd).toBe('error')
  })

  it('schema --remove', () => {
    expect(parseArgv(['schema', '--remove', 'rm-id'])).toEqual({ cmd: 'schema', op: 'remove', id: 'rm-id' })
  })

  it('schema --import', () => {
    expect(parseArgv(['schema', '--import', './x.zip'])).toEqual({ cmd: 'schema', op: 'import', zipPath: './x.zip' })
  })

  it('schema --export', () => {
    expect(parseArgv(['schema', '--export', './out.zip'])).toEqual({ cmd: 'schema', op: 'export', zipPath: './out.zip' })
  })

  it('schema --view <id> 기본 (--json)', () => {
    expect(parseArgv(['schema', '--view', 'game-event'])).toEqual({ cmd: 'schema', op: 'view', id: 'game-event', format: 'json' })
  })

  it('schema --view <id> --html', () => {
    expect(parseArgv(['schema', '--view', 'game-event', '--html'])).toEqual({ cmd: 'schema', op: 'view', id: 'game-event', format: 'html' })
  })

  it('알 수 없는 커맨드 → error', () => {
    expect(parseArgv(['unknown']).cmd).toBe('error')
  })
})

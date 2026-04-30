import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import os from 'os'
import {
  listSchemas,
  addSchema,
  removeSchema,
} from '../../src/main/schemaFs'

const TEST_DIR = join(os.tmpdir(), 'jllv-schemafs-test-' + Date.now())

beforeEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true })
  mkdirSync(TEST_DIR, { recursive: true })
})

describe('listSchemas', () => {
  it('빈 디렉토리면 빈 배열', () => {
    expect(listSchemas(TEST_DIR)).toEqual([])
  })

  it('등록된 스키마를 반환한다', () => {
    const id = 'demo'
    mkdirSync(join(TEST_DIR, id))
    writeFileSync(join(TEST_DIR, id, 'schema.json'), '{"type":"object"}')
    writeFileSync(join(TEST_DIR, id, 'config.json'), '{"name":"Demo"}')
    const list = listSchemas(TEST_DIR)
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(id)
    expect(list[0].displayName).toBe('Demo')
    expect(list[0].hasViewer).toBe(false)
  })
})

describe('addSchema', () => {
  it('스키마 디렉토리와 파일을 생성한다', () => {
    addSchema(TEST_DIR, 'new-id', '{"type":"object"}', 'New Display', null)
    expect(existsSync(join(TEST_DIR, 'new-id', 'schema.json'))).toBe(true)
    expect(existsSync(join(TEST_DIR, 'new-id', 'config.json'))).toBe(true)
    expect(existsSync(join(TEST_DIR, 'new-id', 'viewer.html'))).toBe(false)
  })

  it('viewerHtml 제공 시 viewer.html 생성', () => {
    addSchema(TEST_DIR, 'with-viewer', '{}', 'V', '<html></html>')
    expect(existsSync(join(TEST_DIR, 'with-viewer', 'viewer.html'))).toBe(true)
  })
})

describe('removeSchema', () => {
  it('스키마 디렉토리를 삭제한다', () => {
    addSchema(TEST_DIR, 'to-remove', '{}', 'R', null)
    removeSchema(TEST_DIR, 'to-remove')
    expect(existsSync(join(TEST_DIR, 'to-remove'))).toBe(false)
  })

  it('없는 ID 삭제 시 오류 없이 통과', () => {
    expect(() => removeSchema(TEST_DIR, 'never-existed')).not.toThrow()
  })
})

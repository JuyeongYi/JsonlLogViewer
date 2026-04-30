// tests/main/schemaRegistry.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import os from 'os'

const TEST_SCHEMA_DIR = join(os.tmpdir(), 'jlv-test-schemas-' + Date.now())

// Mock electron BEFORE importing schemaRegistry
vi.mock('electron', () => ({
  app: {
    getPath: () => os.tmpdir(),
  },
}))

// Import AFTER mock is set up
const { loadSchemas } = await import('../../src/main/schemaRegistry')

beforeEach(() => {
  rmSync(TEST_SCHEMA_DIR, { recursive: true, force: true })
  mkdirSync(TEST_SCHEMA_DIR, { recursive: true })
})

describe('loadSchemas', () => {
  it('유효한 스키마 디렉토리를 로드한다', () => {
    const schemaId = 'test-schema'
    mkdirSync(join(TEST_SCHEMA_DIR, schemaId))
    writeFileSync(
      join(TEST_SCHEMA_DIR, schemaId, 'schema.json'),
      JSON.stringify({ type: 'object', required: ['level'] })
    )
    writeFileSync(
      join(TEST_SCHEMA_DIR, schemaId, 'config.json'),
      JSON.stringify({ name: 'Test Schema' })
    )
    const schemas = loadSchemas(TEST_SCHEMA_DIR)
    expect(schemas).toHaveLength(1)
    expect(schemas[0].id).toBe(schemaId)
    expect(schemas[0].displayName).toBe('Test Schema')
    expect(schemas[0].hasViewer).toBe(false)
  })

  it('schema.json 없는 디렉토리는 건너뛴다', () => {
    mkdirSync(join(TEST_SCHEMA_DIR, 'no-schema'))
    expect(loadSchemas(TEST_SCHEMA_DIR)).toHaveLength(0)
  })

  it('viewer.html 존재 시 hasViewer = true', () => {
    const schemaId = 'with-viewer'
    mkdirSync(join(TEST_SCHEMA_DIR, schemaId))
    writeFileSync(join(TEST_SCHEMA_DIR, schemaId, 'schema.json'), '{}')
    writeFileSync(join(TEST_SCHEMA_DIR, schemaId, 'config.json'), '{"name":"W"}')
    writeFileSync(join(TEST_SCHEMA_DIR, schemaId, 'viewer.html'), '<html></html>')
    const schemas = loadSchemas(TEST_SCHEMA_DIR)
    expect(schemas[0].hasViewer).toBe(true)
    expect(schemas[0].viewerPath).toContain('viewer.html')
  })
})

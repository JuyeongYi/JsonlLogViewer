// src/main/schemaRegistry.ts
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { SchemaEntry } from '../renderer/src/types'

export function getSchemaDir(): string {
  return join(app.getPath('userData'), 'schemas')
}

export function loadSchemas(dir?: string): SchemaEntry[] {
  const schemaDir = dir ?? getSchemaDir()
  if (!existsSync(schemaDir)) return []

  return readdirSync(schemaDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .flatMap(d => {
      const entryDir = join(schemaDir, d.name)
      const schemaPath = join(entryDir, 'schema.json')
      const configPath = join(entryDir, 'config.json')
      const viewerPath = join(entryDir, 'viewer.html')

      if (!existsSync(schemaPath)) return []

      try {
        const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'))
        const config = existsSync(configPath)
          ? JSON.parse(readFileSync(configPath, 'utf-8'))
          : {}
        const hasViewer = existsSync(viewerPath)

        return [{
          id: d.name,
          displayName: config.name ?? d.name,
          schema,
          hasViewer,
          viewerPath: hasViewer ? viewerPath : null,
        } satisfies SchemaEntry]
      } catch {
        return []
      }
    })
}

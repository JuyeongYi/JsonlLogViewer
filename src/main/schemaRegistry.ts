// src/main/schemaRegistry.ts
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { SchemaEntry } from '../renderer/src/types'

export function getSchemaDir(): string {
  return join(app.getPath('userData'), 'schemas')
}

function getOrderFilePath(): string {
  return join(app.getPath('userData'), 'schemas-order.json')
}

export function loadSchemaOrder(): string[] {
  const p = getOrderFilePath()
  if (!existsSync(p)) return []
  try { return JSON.parse(readFileSync(p, 'utf-8')) } catch { return [] }
}

export function saveSchemaOrder(order: string[]): void {
  writeFileSync(getOrderFilePath(), JSON.stringify(order), 'utf-8')
}

export function loadSchemas(dir?: string): SchemaEntry[] {
  const schemaDir = dir ?? getSchemaDir()
  if (!existsSync(schemaDir)) return []

  const unsorted = readdirSync(schemaDir, { withFileTypes: true })
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

  // Sort by saved order; unknown schemas go at end
  const order = loadSchemaOrder()
  if (!order.length) return unsorted
  const orderMap = new Map(order.map((id, i) => [id, i]))
  return unsorted.sort((a, b) => {
    const ai = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity
    const bi = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity
    return ai - bi
  })
}

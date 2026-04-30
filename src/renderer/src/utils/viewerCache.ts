import type { SchemaEntry } from '../types'

// 스키마 ID별 viewer HTML 캐시 (lazy load)
const cache = new Map<string, string>()

export async function getViewerHtml(schema: SchemaEntry): Promise<string | null> {
  if (!schema.hasViewer || !schema.viewerPath) return null
  if (cache.has(schema.id)) return cache.get(schema.id)!

  const { html, error } = await window.schemaApi.readViewer(schema.viewerPath)
  if (error || !html) return null

  cache.set(schema.id, html)
  return html
}

export function clearViewerCache(): void {
  cache.clear()
}

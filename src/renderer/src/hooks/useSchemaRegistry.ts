import { useState, useEffect, useCallback } from 'react'
import type { SchemaEntry } from '../types'
import { clearValidatorCache } from '../utils/schemaValidator'
import { clearViewerCache } from '../utils/viewerCache'

export function useSchemaRegistry() {
  const [schemas, setSchemas] = useState<SchemaEntry[]>([])

  const reload = useCallback(async () => {
    const list = await window.schemaApi.list()
    clearValidatorCache()
    clearViewerCache()
    setSchemas(list)
  }, [])

  useEffect(() => { reload() }, [reload])

  const saveSchema = useCallback(async (
    id: string, schemaJson: string, displayName: string, viewerHtml: string | null
  ) => {
    await window.schemaApi.save(id, schemaJson, JSON.stringify({ name: displayName }), viewerHtml)
    await reload()
  }, [reload])

  const deleteSchema = useCallback(async (id: string) => {
    await window.schemaApi.delete(id)
    await reload()
  }, [reload])

  return { schemas, saveSchema, deleteSchema, reload }
}

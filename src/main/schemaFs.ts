import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import AdmZip from 'adm-zip'

export interface SchemaSummary {
  id: string
  displayName: string
  hasViewer: boolean
}

export function getUserDataDir(): string {
  const appData = process.env.APPDATA
  if (!appData) throw new Error('APPDATA 환경 변수가 설정되지 않았습니다 (Windows 전용)')
  return join(appData, 'jsonllogviewer')
}

export function getSchemasDir(): string {
  return join(getUserDataDir(), 'schemas')
}

export function listSchemas(dir: string = getSchemasDir()): SchemaSummary[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .flatMap(d => {
      const entryDir = join(dir, d.name)
      if (!existsSync(join(entryDir, 'schema.json'))) return []
      let displayName = d.name
      try {
        const cfg = JSON.parse(readFileSync(join(entryDir, 'config.json'), 'utf-8'))
        if (typeof cfg.name === 'string') displayName = cfg.name
      } catch { /* config.json 없거나 손상 → id 사용 */ }
      return [{
        id: d.name,
        displayName,
        hasViewer: existsSync(join(entryDir, 'viewer.html')),
      }]
    })
}

export function addSchema(
  dir: string,
  id: string,
  schemaJson: string,
  displayName: string,
  viewerHtml: string | null
): void {
  const target = join(dir, id)
  mkdirSync(target, { recursive: true })
  writeFileSync(join(target, 'schema.json'), schemaJson, 'utf-8')
  writeFileSync(join(target, 'config.json'), JSON.stringify({ name: displayName }), 'utf-8')
  if (viewerHtml !== null) {
    writeFileSync(join(target, 'viewer.html'), viewerHtml, 'utf-8')
  }
}

export function removeSchema(dir: string, id: string): void {
  rmSync(join(dir, id), { recursive: true, force: true })
}

export function exportSchemasToZip(dir: string, outputZip: string): number {
  if (!existsSync(dir)) return 0
  const zip = new AdmZip()
  let count = 0
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (!d.isDirectory()) continue
    const schemaPath = join(dir, d.name, 'schema.json')
    if (!existsSync(schemaPath)) continue
    for (const file of ['schema.json', 'config.json', 'viewer.html']) {
      const filePath = join(dir, d.name, file)
      if (existsSync(filePath)) zip.addLocalFile(filePath, d.name)
    }
    count++
  }
  zip.writeZip(outputZip)
  return count
}

export function importSchemasFromZip(dir: string, zipPath: string): number {
  const zip = new AdmZip(zipPath)
  const seen = new Set<string>()
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue
    const parts = entry.entryName.replace(/\\/g, '/').split('/')
    if (parts.length !== 2) continue
    const [schemaId, fileName] = parts
    if (!['schema.json', 'config.json', 'viewer.html'].includes(fileName)) continue
    const destDir = join(dir, schemaId)
    mkdirSync(destDir, { recursive: true })
    writeFileSync(join(destDir, fileName), entry.getData())
    seen.add(schemaId)
  }
  return seen.size
}

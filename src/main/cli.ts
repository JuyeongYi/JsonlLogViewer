import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  getSchemasDir,
  listSchemas,
  addSchema,
  removeSchema,
  exportSchemasToZip,
  importSchemasFromZip,
} from './schemaFs'

export type CliCommand =
  | { cmd: 'default' }
  | { cmd: 'help' }
  | { cmd: 'open'; paths: string[]; tail: boolean }
  | { cmd: 'schema'; op: 'list' }
  | { cmd: 'schema'; op: 'view'; id: string; format: 'json' | 'html' }
  | { cmd: 'schema'; op: 'add'; id: string; schemaJsonPath: string; viewerHtmlPath: string | null }
  | { cmd: 'schema'; op: 'remove'; id: string }
  | { cmd: 'schema'; op: 'import'; zipPath: string }
  | { cmd: 'schema'; op: 'export'; zipPath: string }
  | { cmd: 'error'; message: string }

export function parseArgv(argv: string[]): CliCommand {
  if (argv.length === 0) return { cmd: 'default' }
  if (argv[0] === '--help') return { cmd: 'help' }

  if (argv[0] === 'open') {
    const rest = argv.slice(1)
    const tail = !rest.includes('--non-tail')
    const paths = rest.filter(a => !a.startsWith('--'))
    return { cmd: 'open', paths, tail }
  }

  if (argv[0] === 'schema') {
    const op = argv[1]
    if (op === '--list') return { cmd: 'schema', op: 'list' }
    if (op === '--view') {
      if (!argv[2]) return { cmd: 'error', message: 'schema --view 사용법: --view <id> [--json|--html]' }
      const format = argv.includes('--html') ? 'html' : 'json'
      return { cmd: 'schema', op: 'view', id: argv[2], format }
    }
    if (op === '--add') {
      if (argv.length < 4) return { cmd: 'error', message: 'schema --add 사용법: --add <id> <json 파일> [html 파일]' }
      return { cmd: 'schema', op: 'add', id: argv[2], schemaJsonPath: argv[3], viewerHtmlPath: argv[4] ?? null }
    }
    if (op === '--remove') {
      if (!argv[2]) return { cmd: 'error', message: 'schema --remove 사용법: --remove <id>' }
      return { cmd: 'schema', op: 'remove', id: argv[2] }
    }
    if (op === '--import') {
      if (!argv[2]) return { cmd: 'error', message: 'schema --import 사용법: --import <zip 경로>' }
      return { cmd: 'schema', op: 'import', zipPath: argv[2] }
    }
    if (op === '--export') {
      if (!argv[2]) return { cmd: 'error', message: 'schema --export 사용법: --export <zip 출력 경로>' }
      return { cmd: 'schema', op: 'export', zipPath: argv[2] }
    }
    return { cmd: 'error', message: `알 수 없는 schema 옵션: ${op ?? '(없음)'}` }
  }

  return { cmd: 'error', message: `알 수 없는 명령: ${argv[0]}` }
}

export const HELP_TEXT = `jllv — JsonlLogViewer CLI

사용법:
  jllv                                     앱 열기 (세션 복원)
  jllv open <path> [path...]               파일 열기 (실시간 tail 기본)
    --non-tail                             tail 비활성화
  jllv schema --list                       등록된 스키마 목록 (JSON)
  jllv schema --view <id> [--json|--html]  스키마 JSON 또는 뷰어 HTML 출력
  jllv schema --add <id> <json> [html]     스키마 추가
  jllv schema --remove <id>               스키마 삭제
  jllv schema --import <zip>              스키마 가져오기
  jllv schema --export <zip>              스키마 내보내기
  --help                                   이 도움말 표시
`

export function printHelp(): void {
  process.stdout.write(HELP_TEXT)
}

export function runSchemaCommand(cmd: Extract<CliCommand, { cmd: 'schema' }>): number {
  const dir = getSchemasDir()
  try {
    switch (cmd.op) {
      case 'list': {
        const list = listSchemas(dir)
        process.stdout.write(JSON.stringify(list, null, 2) + '\n')
        return 0
      }
      case 'view': {
        const schemaDir = join(dir, cmd.id)
        if (!existsSync(schemaDir)) {
          process.stderr.write(`스키마 없음: ${cmd.id}\n`)
          return 1
        }
        if (cmd.format === 'html') {
          const viewerPath = join(schemaDir, 'viewer.html')
          if (!existsSync(viewerPath)) {
            process.stderr.write(`viewer.html 없음: ${cmd.id}\n`)
            return 1
          }
          process.stdout.write(readFileSync(viewerPath, 'utf-8') + '\n')
        } else {
          const schemaPath = join(schemaDir, 'schema.json')
          if (!existsSync(schemaPath)) {
            process.stderr.write(`schema.json 없음: ${cmd.id}\n`)
            return 1
          }
          // pretty-print the JSON
          const raw = JSON.parse(readFileSync(schemaPath, 'utf-8'))
          process.stdout.write(JSON.stringify(raw, null, 2) + '\n')
        }
        return 0
      }
      case 'add': {
        if (!existsSync(cmd.schemaJsonPath)) {
          process.stderr.write(`schema.json 파일 없음: ${cmd.schemaJsonPath}\n`)
          return 1
        }
        const schemaJson = readFileSync(cmd.schemaJsonPath, 'utf-8')
        let viewerHtml: string | null = null
        if (cmd.viewerHtmlPath) {
          if (!existsSync(cmd.viewerHtmlPath)) {
            process.stderr.write(`viewer html 파일 없음: ${cmd.viewerHtmlPath}\n`)
            return 1
          }
          viewerHtml = readFileSync(cmd.viewerHtmlPath, 'utf-8')
        }
        addSchema(dir, cmd.id, schemaJson, cmd.id, viewerHtml)
        process.stdout.write(`등록 완료: ${cmd.id}\n`)
        return 0
      }
      case 'remove': {
        removeSchema(dir, cmd.id)
        process.stdout.write(`삭제 완료: ${cmd.id}\n`)
        return 0
      }
      case 'import': {
        if (!existsSync(cmd.zipPath)) {
          process.stderr.write(`ZIP 파일 없음: ${cmd.zipPath}\n`)
          return 1
        }
        const n = importSchemasFromZip(dir, cmd.zipPath)
        process.stdout.write(`${n}개 스키마 가져옴\n`)
        return 0
      }
      case 'export': {
        const n = exportSchemasToZip(dir, cmd.zipPath)
        process.stdout.write(`${n}개 스키마를 ${cmd.zipPath}로 내보냄\n`)
        return 0
      }
    }
  } catch (e) {
    process.stderr.write(`오류: ${e instanceof Error ? e.message : String(e)}\n`)
    return 1
  }
}

import type { LogRow } from '../types'

export interface LogStats {
  total: number
  levelCounts: Record<string, number>
  errorRate: number
  fieldDistribution: Record<string, number> | null
}

export function computeStats(rows: LogRow[], distributionField?: string): LogStats {
  const levelCounts: Record<string, number> = {}
  const fieldDistribution: Record<string, number> = {}

  for (const row of rows) {
    const level = String(row.level ?? 'unknown').toLowerCase()
    levelCounts[level] = (levelCounts[level] ?? 0) + 1

    if (distributionField) {
      const val = String(row[distributionField] ?? '(없음)')
      fieldDistribution[val] = (fieldDistribution[val] ?? 0) + 1
    }
  }

  const errorCount = (levelCounts['error'] ?? 0) + (levelCounts['warn'] ?? 0) + (levelCounts['warning'] ?? 0)
  const errorRate = rows.length > 0 ? errorCount / rows.length : 0

  return {
    total: rows.length,
    levelCounts,
    errorRate,
    fieldDistribution: distributionField ? fieldDistribution : null,
  }
}

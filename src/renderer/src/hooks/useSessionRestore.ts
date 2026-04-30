const SESSION_KEY = 'jlv_session'

interface SessionData {
  openPaths: string[]
  activeIndex: number
}

export function saveSession(data: SessionData): void {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(data)) } catch { /* ignore */ }
}

export function loadSession(): SessionData | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

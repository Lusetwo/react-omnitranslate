const SETTINGS_KEY = 'omnitranslate-settings'
const HISTORY_KEY = 'omnitranslate-history'

export const storageService = {
  saveSettings<T>(value: T): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(value))
  },
  loadSettings<T>(): T | null {
    const raw = localStorage.getItem(SETTINGS_KEY)
    return raw ? (JSON.parse(raw) as T) : null
  },
  saveHistory<T>(items: T[]): void {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
  },
  loadHistory<T>(): T[] {
    const raw = localStorage.getItem(HISTORY_KEY)
    return raw ? (JSON.parse(raw) as T[]) : []
  },
}

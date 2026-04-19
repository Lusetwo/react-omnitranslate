import { create } from 'zustand'
import { storageService } from '../../services/storage'
import type { SettingsState } from '../../types'

interface SettingsStore extends SettingsState {
  updateSettings: (patch: Partial<SettingsState>) => void
}

const defaultSettings: SettingsState = {
  ocrProvider: 'mock',
  llmProvider: 'mock',
  targetLanguage: 'English',
  apiBaseUrl: 'http://localhost:8000/api',
  apiKey: '',
}

const initialSettings = {
  ...defaultSettings,
  ...(storageService.loadSettings<SettingsState>() ?? {}),
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...initialSettings,
  updateSettings: (patch) =>
    set((state) => {
      const next = { ...state, ...patch }
      storageService.saveSettings<SettingsState>({
        ocrProvider: next.ocrProvider,
        llmProvider: next.llmProvider,
        targetLanguage: next.targetLanguage,
        apiBaseUrl: next.apiBaseUrl,
        apiKey: next.apiKey,
      })
      return next
    }),
}))

import { create } from 'zustand'
import { storageService } from '../../services/storage'
import type { TranslationHistoryItem, TranslationResult } from '../../types'

interface HistoryStore {
  items: TranslationHistoryItem[]
  addHistory: (result: TranslationResult) => void
  clearHistory: () => void
}

export const useHistoryStore = create<HistoryStore>((set) => ({
  items: storageService.loadHistory<TranslationHistoryItem>(),
  addHistory: (result) =>
    set((state) => {
      const nextItem: TranslationHistoryItem = {
        id: crypto.randomUUID(),
        ...result,
      }
      const next = [nextItem, ...state.items].slice(0, 30)
      storageService.saveHistory(next)
      return { items: next }
    }),
  clearHistory: () => {
    storageService.saveHistory<TranslationHistoryItem>([])
    set({ items: [] })
  },
}))

import { create } from 'zustand'
import { recognizeText, translateText } from '../../services/api'
import type { PipelineStage, PipelineState, SettingsState, TranslationResult } from '../../types'
import { cleanOcrText } from '../../utils/formatters'
import { blobToFile, preprocessImage } from '../../utils/imageUtils'

interface TranslationStore {
  pipeline: PipelineState
  sourceText: string
  translated?: TranslationResult
  runPipeline: (capturedBlob: Blob, settings: SettingsState) => Promise<TranslationResult | undefined>
  setPipelineStage: (stage: PipelineStage) => void
  reset: () => void
}

function nextStage(stage: PipelineStage): PipelineState {
  return {
    stage,
    busy: stage !== 'idle' && stage !== 'displaying' && stage !== 'error',
  }
}

export const useTranslationStore = create<TranslationStore>((set) => ({
  pipeline: nextStage('idle'),
  sourceText: '',
  translated: undefined,
  setPipelineStage: (stage) => set({ pipeline: nextStage(stage) }),
  runPipeline: async (capturedBlob, settings) => {
    try {
      set({ pipeline: nextStage('preprocessing') })
      const processed = await preprocessImage(capturedBlob)
      const processedFile = blobToFile(processed, 'capture-preprocessed.png')

      set({ pipeline: nextStage('ocr') })
      const ocr = await recognizeText(processedFile, settings)

      set({ pipeline: nextStage('processingText') })
      const cleanedText = cleanOcrText(ocr.rawText)
      set({ sourceText: cleanedText })

      set({ pipeline: nextStage('translating') })
      const translated = await translateText(cleanedText, settings)

      set({ translated, pipeline: nextStage('displaying') })
      return translated
    } catch (error) {
      const message = error instanceof Error ? error.message : '流水线执行失败'
      set({ pipeline: { stage: 'error', busy: false, error: message } })
      return undefined
    }
  },
  reset: () => set({ pipeline: nextStage('idle'), sourceText: '', translated: undefined }),
}))

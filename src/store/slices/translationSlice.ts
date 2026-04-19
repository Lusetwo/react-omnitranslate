import { create } from 'zustand'
import { recognizeText, translateText } from '../../services/api'
import type {
  PipelineStage,
  PipelineState,
  SelectionRect,
  SettingsState,
  TranslationResult,
} from '../../types'
import { cleanOcrText } from '../../utils/formatters'
import { blobToFile, captureImageRegion, preprocessImage } from '../../utils/imageUtils'

interface TranslationStore {
  pipeline: PipelineState
  sourceText: string
  translated?: TranslationResult
  selectedRect?: SelectionRect
  setSelectedRect: (rect?: SelectionRect) => void
  runPipeline: (imageFile: File, settings: SettingsState) => Promise<TranslationResult | undefined>
  reset: () => void
}

function nextStage(stage: PipelineStage): PipelineState {
  return {
    stage,
    busy: stage !== 'idle' && stage !== 'displaying' && stage !== 'error',
  }
}

export const useTranslationStore = create<TranslationStore>((set, get) => ({
  pipeline: nextStage('idle'),
  sourceText: '',
  translated: undefined,
  selectedRect: undefined,
  setSelectedRect: (rect) => set({ selectedRect: rect }),
  runPipeline: async (imageFile, settings) => {
    const { selectedRect } = get()
    if (!selectedRect) {
      set({ pipeline: { stage: 'error', busy: false, error: '请先划定需要翻译的区域。' } })
      return undefined
    }

    try {
      set({ pipeline: nextStage('capturing') })
      const captured = await captureImageRegion(imageFile, selectedRect)

      set({ pipeline: nextStage('preprocessing') })
      const processed = await preprocessImage(captured)
      const processedFile = blobToFile(processed, 'capture-preprocessed.png')

      set({ pipeline: nextStage('ocr') })
      const ocr = await recognizeText(processedFile, settings)

      set({ pipeline: nextStage('processingText') })
      const cleanedText = cleanOcrText(ocr.rawText)
      set({ sourceText: cleanedText })

      set({ pipeline: nextStage('translating') })
      const translated = await translateText(cleanedText, settings)

      set({
        translated,
        pipeline: nextStage('displaying'),
      })

      return translated
    } catch (error) {
      const message = error instanceof Error ? error.message : '流水线执行失败'
      set({
        pipeline: {
          stage: 'error',
          busy: false,
          error: message,
        },
      })
      return undefined
    }
  },
  reset: () =>
    set({
      pipeline: nextStage('idle'),
      sourceText: '',
      translated: undefined,
      selectedRect: undefined,
    }),
}))

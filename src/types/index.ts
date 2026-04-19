export type PipelineStage =
  | 'idle'
  | 'capturing'
  | 'preprocessing'
  | 'ocr'
  | 'processingText'
  | 'translating'
  | 'displaying'
  | 'error'

export interface SelectionRect {
  x: number
  y: number
  width: number
  height: number
}

export interface OcrResult {
  rawText: string
  blocks: Array<{
    text: string
    confidence?: number
  }>
}

export interface TranslationResult {
  sourceText: string
  translatedText: string
  targetLanguage: string
  provider: string
  timestamp: string
}

export interface TranslationHistoryItem extends TranslationResult {
  id: string
}

export interface SettingsState {
  ocrProvider: 'paddleocr' | 'mock'
  llmProvider: 'openai' | 'deepseek' | 'mock'
  targetLanguage: string
  apiBaseUrl: string
  apiKey?: string
}

export interface PipelineState {
  stage: PipelineStage
  busy: boolean
  error?: string
}

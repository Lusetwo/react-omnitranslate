import axios from 'axios'
import type { OcrResult, SettingsState, TranslationResult } from '../types'

const MOCK_WAIT = 500

async function sleep(waitMs: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, waitMs))
}

export async function recognizeText(
  imageFile: File,
  settings: SettingsState,
): Promise<OcrResult> {
  if (settings.ocrProvider === 'mock') {
    await sleep(MOCK_WAIT)
    return {
      rawText: '示例 OCR 文本\n支持多行识别',
      blocks: [
        { text: '示例 OCR 文本', confidence: 0.93 },
        { text: '支持多行识别', confidence: 0.89 },
      ],
    }
  }

  const formData = new FormData()
  formData.append('image', imageFile)

  const response = await axios.post<OcrResult>(`${settings.apiBaseUrl}/ocr`, formData, {
    headers: {
      ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
    },
  })

  return response.data
}

export async function translateText(
  sourceText: string,
  settings: SettingsState,
): Promise<TranslationResult> {
  if (settings.llmProvider === 'mock') {
    await sleep(MOCK_WAIT)
    return {
      sourceText,
      translatedText: `[${settings.targetLanguage}] ${sourceText}`,
      targetLanguage: settings.targetLanguage,
      provider: 'mock',
      timestamp: new Date().toISOString(),
    }
  }

  const response = await axios.post<TranslationResult>(
    `${settings.apiBaseUrl}/translate`,
    {
      sourceText,
      targetLanguage: settings.targetLanguage,
      provider: settings.llmProvider,
    },
    {
      headers: {
        ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}),
      },
    },
  )

  return response.data
}

import type { PipelineStage } from '../types'

export const stageLabelMap: Record<PipelineStage, string> = {
  idle: '空闲',
  capturing: '屏幕捕获中',
  preprocessing: '图像预处理中',
  ocr: 'OCR 识别中',
  processingText: '文本清洗中',
  translating: 'LLM 翻译中',
  displaying: '结果展示中',
  error: '流程出错',
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}

export function cleanOcrText(raw: string): string {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
}

export function truncate(value: string, max = 120): string {
  if (value.length <= max) {
    return value
  }
  return `${value.slice(0, max)}...`
}

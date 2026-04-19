import { useMemo, useRef, useState } from 'react'
import type { ChangeEvent, MouseEvent } from 'react'
import './App.css'
import { useHistoryStore, useSettingsStore, useTranslationStore } from './store'
import { formatTime, stageLabelMap, truncate } from './utils/formatters'
import type { SelectionRect } from './types'

function toRect(startX: number, startY: number, endX: number, endY: number): SelectionRect {
  const x = Math.min(startX, endX)
  const y = Math.min(startY, endY)
  return {
    x,
    y,
    width: Math.abs(endX - startX),
    height: Math.abs(endY - startY),
  }
}

function App() {
  const [imageFile, setImageFile] = useState<File>()
  const [imageUrl, setImageUrl] = useState<string>()
  const [dragging, setDragging] = useState(false)
  const [anchor, setAnchor] = useState<{ x: number; y: number }>()

  const imageWrapRef = useRef<HTMLDivElement>(null)

  const {
    pipeline,
    selectedRect,
    sourceText,
    translated,
    setSelectedRect,
    runPipeline,
    reset,
  } = useTranslationStore()
  const settings = useSettingsStore()
  const { updateSettings } = useSettingsStore()
  const { items, addHistory, clearHistory } = useHistoryStore()

  const pipelineLabel = useMemo(() => stageLabelMap[pipeline.stage], [pipeline.stage])

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl)
    }

    setImageFile(file)
    setImageUrl(URL.createObjectURL(file))
    reset()
  }

  const getLocalPoint = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = imageWrapRef.current?.getBoundingClientRect()
    if (!bounds) {
      return null
    }

    return {
      x: Math.round(event.clientX - bounds.left),
      y: Math.round(event.clientY - bounds.top),
    }
  }

  const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    const point = getLocalPoint(event)
    if (!point) {
      return
    }

    setDragging(true)
    setAnchor(point)
    setSelectedRect({ x: point.x, y: point.y, width: 0, height: 0 })
  }

  const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragging || !anchor) {
      return
    }

    const point = getLocalPoint(event)
    if (!point) {
      return
    }

    setSelectedRect(toRect(anchor.x, anchor.y, point.x, point.y))
  }

  const onMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragging || !anchor) {
      return
    }

    const point = getLocalPoint(event)
    if (!point) {
      setDragging(false)
      return
    }

    setSelectedRect(toRect(anchor.x, anchor.y, point.x, point.y))
    setDragging(false)
  }

  const handleRunPipeline = async () => {
    if (!imageFile) {
      return
    }

    const result = await runPipeline(imageFile, settings)
    if (result) {
      addHistory(result)
    }
  }

  return (
    <main className="page">
      <header className="top">
        <h1>屏幕划区实时 AI 翻译（React 实现）</h1>
        <p>按照方案流程实现：划区 → 截图 → 预处理 → OCR → 文本处理 → LLM 翻译 → 展示。</p>
      </header>

      <section className="panel controls">
        <div className="field-grid">
          <label>
            上传截图
            <input type="file" accept="image/*" onChange={handleFileChange} />
          </label>
          <label>
            OCR 提供方
            <select
              value={settings.ocrProvider}
              onChange={(e) => updateSettings({ ocrProvider: e.target.value as 'mock' | 'paddleocr' })}
            >
              <option value="mock">mock（前端演示）</option>
              <option value="paddleocr">paddleocr（后端）</option>
            </select>
          </label>
          <label>
            LLM 提供方
            <select
              value={settings.llmProvider}
              onChange={(e) =>
                updateSettings({
                  llmProvider: e.target.value as 'mock' | 'openai' | 'deepseek',
                })
              }
            >
              <option value="mock">mock（前端演示）</option>
              <option value="openai">openai</option>
              <option value="deepseek">deepseek</option>
            </select>
          </label>
          <label>
            目标语言
            <input
              value={settings.targetLanguage}
              onChange={(e) => updateSettings({ targetLanguage: e.target.value })}
              placeholder="例如 English"
            />
          </label>
        </div>
        <div className="toolbar">
          <button onClick={handleRunPipeline} disabled={!imageFile || pipeline.busy}>
            {pipeline.busy ? '处理中...' : '开始翻译'}
          </button>
          <button className="secondary" onClick={() => setSelectedRect(undefined)} disabled={!selectedRect}>
            清除选区
          </button>
          <span className={`status ${pipeline.stage}`}>{pipelineLabel}</span>
          {pipeline.error ? <span className="error">{pipeline.error}</span> : null}
        </div>
      </section>

      <section className="workspace">
        <article className="panel canvas-panel">
          <h2>UI 交互模块：划定翻译区域</h2>
          <div
            className="image-wrap"
            ref={imageWrapRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          >
            {imageUrl ? <img src={imageUrl} alt="待识别截图" draggable={false} /> : <p className="placeholder">请先上传截图</p>}
            {selectedRect ? (
              <div
                className="selection"
                style={{
                  left: selectedRect.x,
                  top: selectedRect.y,
                  width: selectedRect.width,
                  height: selectedRect.height,
                }}
              />
            ) : null}
          </div>
        </article>

        <article className="panel result-panel">
          <h2>展示模块</h2>
          <div className="result-block">
            <h3>OCR + 文本处理结果</h3>
            <pre>{sourceText || '暂无结果'}</pre>
          </div>
          <div className="result-block">
            <h3>翻译结果</h3>
            <pre>{translated?.translatedText || '暂无结果'}</pre>
          </div>
        </article>
      </section>

      <section className="panel history">
        <div className="history-head">
          <h2>翻译历史</h2>
          <button className="secondary" onClick={clearHistory} disabled={items.length === 0}>
            清空历史
          </button>
        </div>
        {items.length === 0 ? (
          <p className="placeholder">暂无历史记录</p>
        ) : (
          <ul>
            {items.map((item) => (
              <li key={item.id}>
                <span>{formatTime(item.timestamp)}</span>
                <strong>{truncate(item.sourceText)}</strong>
                <em>{truncate(item.translatedText)}</em>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default App

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import './App.css'
import { useHistoryStore, useSettingsStore, useTranslationStore } from './store'
import { formatTime, stageLabelMap, truncate } from './utils/formatters'
import { captureVideoRegion } from './utils/imageUtils'
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
  const [dragging, setDragging] = useState(false)
  const [anchor, setAnchor] = useState<{ x: number; y: number }>()
  const [selection, setSelection] = useState<SelectionRect>()
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [intervalMs, setIntervalMs] = useState(1500)
  const [liveMode, setLiveMode] = useState(false)
  const [screenError, setScreenError] = useState<string>()

  const videoRef = useRef<HTMLVideoElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)

  const { pipeline, sourceText, translated, runPipeline, setPipelineStage, reset } = useTranslationStore()
  const settings = useSettingsStore()
  const { updateSettings } = useSettingsStore()
  const { items, addHistory, clearHistory } = useHistoryStore()

  const pipelineLabel = useMemo(() => stageLabelMap[pipeline.stage], [pipeline.stage])

  useEffect(() => {
    if (!videoRef.current) {
      return
    }
    videoRef.current.srcObject = stream
  }, [stream])

  const runOnce = useCallback(async () => {
    if (!videoRef.current || !selection || busyRef.current) {
      return
    }
    if (selection.width < 8 || selection.height < 8) {
      return
    }

    busyRef.current = true
    setPipelineStage('capturing')

    try {
      const blob = await captureVideoRegion(videoRef.current, selection)
      const result = await runPipeline(blob, settings)
      if (result && result.translatedText !== items[0]?.translatedText) {
        addHistory(result)
      }
    } finally {
      busyRef.current = false
    }
  }, [addHistory, items, runPipeline, selection, setPipelineStage, settings])

  useEffect(() => {
    if (!liveMode || !stream) {
      return
    }

    const timer = window.setInterval(() => {
      void runOnce()
    }, intervalMs)

    return () => window.clearInterval(timer)
  }, [intervalMs, liveMode, runOnce, stream])

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [stream])

  const getLocalPoint = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = previewRef.current?.getBoundingClientRect()
    if (!bounds) {
      return null
    }

    return {
      x: Math.max(0, Math.min(Math.round(event.clientX - bounds.left), Math.round(bounds.width))),
      y: Math.max(0, Math.min(Math.round(event.clientY - bounds.top), Math.round(bounds.height))),
    }
  }

  const onMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (!stream) {
      return
    }
    const point = getLocalPoint(event)
    if (!point) {
      return
    }
    setDragging(true)
    setAnchor(point)
    setSelection({ x: point.x, y: point.y, width: 0, height: 0 })
  }

  const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragging || !anchor) {
      return
    }
    const point = getLocalPoint(event)
    if (!point) {
      return
    }
    setSelection(toRect(anchor.x, anchor.y, point.x, point.y))
  }

  const onMouseUp = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragging || !anchor) {
      return
    }

    const point = getLocalPoint(event)
    setDragging(false)
    if (!point) {
      return
    }
    setSelection(toRect(anchor.x, anchor.y, point.x, point.y))
  }

  const startShare = async () => {
    try {
      setScreenError(undefined)
      const media = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 15, max: 30 } },
        audio: false,
      })
      setStream(media)
      reset()
    } catch (error) {
      const message = error instanceof Error ? error.message : '屏幕共享失败'
      setScreenError(message)
    }
  }

  const stopShare = () => {
    setLiveMode(false)
    stream?.getTracks().forEach((track) => track.stop())
    setStream(null)
    setSelection(undefined)
    setPipelineStage('idle')
  }

  return (
    <main className="page">
      <header className="top">
        <h1>跨页面实时划区翻译</h1>
        <p>先共享屏幕/窗口，再在预览层上画框，系统会按间隔动态抓帧并持续翻译该区域文本。</p>
      </header>

      <section className="panel controls">
        <div className="field-grid">
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
          <label>
            采样间隔（毫秒）
            <input
              type="number"
              min={500}
              step={100}
              value={intervalMs}
              onChange={(e) => setIntervalMs(Number(e.target.value) || 1500)}
            />
          </label>
        </div>
        <div className="toolbar">
          <button onClick={startShare} disabled={Boolean(stream)}>
            开始共享屏幕
          </button>
          <button className="secondary" onClick={stopShare} disabled={!stream}>
            停止共享
          </button>
          <button onClick={() => void runOnce()} disabled={!stream || !selection || pipeline.busy}>
            单次翻译
          </button>
          <button
            onClick={() => setLiveMode((prev) => !prev)}
            disabled={!stream || !selection || selection.width < 8 || selection.height < 8}
          >
            {liveMode ? '停止动态翻译' : '开启动态翻译'}
          </button>
          <span className={`status ${pipeline.stage}`}>{pipelineLabel}</span>
          {pipeline.error ? <span className="error">{pipeline.error}</span> : null}
          {screenError ? <span className="error">{screenError}</span> : null}
        </div>
      </section>

      <section className="workspace">
        <article className="panel canvas-panel">
          <h2>其他页面预览（在这里框选翻译区域）</h2>
          <div
            className="video-wrap"
            ref={previewRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
          >
            <video ref={videoRef} autoPlay muted playsInline />
            {!stream ? <p className="placeholder">点击“开始共享屏幕”后在此框选区域</p> : null}
            {selection ? (
              <div
                className="selection"
                style={{
                  left: selection.x,
                  top: selection.y,
                  width: selection.width,
                  height: selection.height,
                }}
              />
            ) : null}
          </div>
        </article>

        <article className="panel result-panel">
          <h2>动态翻译结果</h2>
          <div className="result-block">
            <h3>OCR + 文本清洗</h3>
            <pre>{sourceText || '暂无结果'}</pre>
          </div>
          <div className="result-block">
            <h3>翻译输出</h3>
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

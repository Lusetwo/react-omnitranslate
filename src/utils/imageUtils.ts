import type { SelectionRect } from '../types'

export async function preprocessImage(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('无法创建图像预处理上下文')
  }

  context.drawImage(bitmap, 0, 0)
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data

  for (let i = 0; i < pixels.length; i += 4) {
    const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
    const binary = gray > 128 ? 255 : 0
    pixels[i] = binary
    pixels[i + 1] = binary
    pixels[i + 2] = binary
  }

  context.putImageData(imageData, 0, 0)

  return new Promise((resolve, reject) => {
    canvas.toBlob((processedBlob) => {
      if (!processedBlob) {
        reject(new Error('图像预处理失败'))
        return
      }
      resolve(processedBlob)
    }, 'image/png')
  })
}

export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: 'image/png' })
}

export async function captureVideoRegion(
  video: HTMLVideoElement,
  rect: SelectionRect,
): Promise<Blob> {
  const displayWidth = video.clientWidth
  const displayHeight = video.clientHeight

  if (!displayWidth || !displayHeight || !video.videoWidth || !video.videoHeight) {
    throw new Error('视频尺寸不可用，请重新共享屏幕。')
  }

  const scaleX = video.videoWidth / displayWidth
  const scaleY = video.videoHeight / displayHeight

  const srcX = Math.max(0, Math.floor(rect.x * scaleX))
  const srcY = Math.max(0, Math.floor(rect.y * scaleY))
  const srcW = Math.max(1, Math.floor(rect.width * scaleX))
  const srcH = Math.max(1, Math.floor(rect.height * scaleY))

  const canvas = document.createElement('canvas')
  canvas.width = srcW
  canvas.height = srcH

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('无法创建截帧画布')
  }

  context.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('截取视频区域失败'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

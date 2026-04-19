import type { SelectionRect } from '../types'

export async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    image.src = url
  })
}

export async function captureImageRegion(file: File, rect: SelectionRect): Promise<Blob> {
  const image = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, rect.width)
  canvas.height = Math.max(1, rect.height)

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('无法创建画布上下文')
  }

  context.drawImage(
    image,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    0,
    0,
    rect.width,
    rect.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('区域截图失败'))
        return
      }
      resolve(blob)
    }, 'image/png')
  })
}

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

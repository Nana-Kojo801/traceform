import type { DocumentKind, Segment } from '@shared/types'
import { joinPages, segmentParagraphs } from '@shared/segments'
import { MAX_FILE_BYTES, MAX_IMAGE_BYTES, MAX_TOTAL_CHARS, MAX_TRANSCRIBE_PAGES } from '@shared/limits'

export interface ParsedFile {
  name: string
  kind: DocumentKind
  text: string
  segments: Segment[]
  parseStatus: 'parsed' | 'failed' | 'needs_ocr'
  parseError?: string
  sizeBytes: number
}

export function detectKind(file: File): DocumentKind | null {
  const name = file.name.toLowerCase()
  if (name.endsWith('.txt') || file.type === 'text/plain') return 'txt'
  if (name.endsWith('.docx')) return 'docx'
  if (name.endsWith('.pdf') || file.type === 'application/pdf') return 'pdf'
  if (/\.(png|jpe?g|webp)$/.test(name) || ['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return 'image'
  return null
}

/** Pre-upload validation. Returns an error message or null. */
export function validateFile(file: File): string | null {
  const kind = detectKind(file)
  if (!kind) return `${file.name}: unsupported type. Use .txt, .docx, .pdf, or a .png/.jpg/.webp image.`
  if (kind === 'image' && file.size > MAX_IMAGE_BYTES) return `${file.name}: images must be under ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`
  if (kind !== 'image' && file.size > MAX_FILE_BYTES) return `${file.name}: larger than ${MAX_FILE_BYTES / 1024} KB.`
  if (file.size === 0) return `${file.name}: the file is empty.`
  return null
}

function normalizeNewlines(s: string) {
  return s.replace(/\r\n?/g, '\n').replace(/\u0000/g, '')
}

async function loadPdf(buffer: ArrayBuffer) {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  return await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image.'))), 'image/jpeg', 0.85),
  )
}

/**
 * Render an image or the first pages of a scanned PDF to JPEG blobs for
 * Muse Spark vision. Images are downscaled to at most 2000 px on the long side.
 */
export async function renderForVision(file: File, kind: 'image' | 'pdf'): Promise<Blob[]> {
  const MAX_SIDE = 2000
  if (kind === 'image') {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const g = canvas.getContext('2d')!
    g.fillStyle = '#fff'
    g.fillRect(0, 0, canvas.width, canvas.height)
    g.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return [await canvasToJpeg(canvas)]
  }
  const pdf = await loadPdf(await file.arrayBuffer())
  const blobs: Blob[] = []
  for (let i = 1; i <= Math.min(pdf.numPages, MAX_TRANSCRIBE_PAGES); i++) {
    const page = await pdf.getPage(i)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: Math.min(2.5, 1600 / base.width) })
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    const g = canvas.getContext('2d')!
    g.fillStyle = '#fff'
    g.fillRect(0, 0, canvas.width, canvas.height)
    await page.render({ canvas, canvasContext: g, viewport }).promise
    blobs.push(await canvasToJpeg(canvas))
  }
  return blobs
}

async function parsePdf(buffer: ArrayBuffer): Promise<{ text: string; segments: Segment[]; pages: number }> {
  const pdf = await loadPdf(buffer)
  const pages: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    let out = ''
    for (const item of content.items) {
      if (!('str' in item)) continue
      out += item.str
      if (item.hasEOL) out += '\n'
      else if (item.str && !out.endsWith(' ')) out += ' '
    }
    pages.push(out.replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' '))
  }
  const joined = joinPages(pages)
  return { ...joined, pages: pdf.numPages }
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const kind = detectKind(file)
  const base = { name: file.name, sizeBytes: file.size }
  if (!kind) {
    return { ...base, kind: 'txt', text: '', segments: [], parseStatus: 'failed', parseError: 'Unsupported file type.' }
  }
  try {
    let text = ''
    let segments: Segment[] = []
    if (kind === 'image') {
      return {
        ...base,
        kind,
        text: '',
        segments: [],
        parseStatus: 'needs_ocr',
        parseError: 'Images have no text layer. They need a vision transcription.',
      }
    }
    if (kind === 'txt') {
      text = normalizeNewlines(await file.text())
      segments = segmentParagraphs(text)
    } else if (kind === 'docx') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
      text = normalizeNewlines(result.value).replace(/\n{3,}/g, '\n\n').trim()
      segments = segmentParagraphs(text)
    } else {
      const pdf = await parsePdf(await file.arrayBuffer())
      text = pdf.text
      segments = pdf.segments
      // Fewer than ~20 visible characters per page: almost certainly a scan with no text layer.
      if (text.replace(/\s/g, '').length < 20 * Math.max(1, pdf.pages)) {
        return {
          ...base,
          kind,
          text: '',
          segments: [],
          parseStatus: 'needs_ocr',
          parseError: 'This PDF has no extractable text (likely a scan). It needs a vision transcription.',
        }
      }
    }
    if (!text.trim()) {
      return { ...base, kind, text: '', segments: [], parseStatus: 'failed', parseError: 'No text found in this file.' }
    }
    if (text.length > MAX_TOTAL_CHARS) {
      return {
        ...base,
        kind,
        text: '',
        segments: [],
        parseStatus: 'failed',
        parseError: `Extracted text is ${text.length.toLocaleString()} characters; the per-extraction limit is ${MAX_TOTAL_CHARS.toLocaleString()}.`,
      }
    }
    return { ...base, kind, text, segments, parseStatus: 'parsed' }
  } catch (err) {
    return {
      ...base,
      kind,
      text: '',
      segments: [],
      parseStatus: 'failed',
      parseError: `Could not parse this file${err instanceof Error ? `: ${err.message.slice(0, 160)}` : '.'}`,
    }
  }
}

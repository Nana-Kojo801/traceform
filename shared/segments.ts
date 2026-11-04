import type { Segment } from './types'

/** Split text into paragraph segments on blank lines, keeping original offsets. */
export function segmentParagraphs(text: string): Segment[] {
  const segments: Segment[] = []
  const re = /\n[ \t]*\n+/g
  let start = 0
  let index = 0
  const push = (s: number, e: number) => {
    // trim whitespace at the edges while keeping offsets into `text`
    while (s < e && /\s/.test(text[s])) s++
    while (e > s && /\s/.test(text[e - 1])) e--
    if (e > s) segments.push({ index: index++, start: s, end: e })
  }
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    push(start, m.index)
    start = m.index + m[0].length
  }
  push(start, text.length)
  return segments
}

/**
 * Join pages with blank lines. Each page is split into paragraph segments
 * (on blank lines) that keep their page number.
 */
export function joinPages(pages: string[]): { text: string; segments: Segment[] } {
  let text = ''
  const segments: Segment[] = []
  pages.forEach((page, i) => {
    const body = page.trim()
    if (!body) return
    if (text) text += '\n\n'
    const offset = text.length
    text += body
    for (const p of segmentParagraphs(body)) {
      segments.push({ index: segments.length, start: offset + p.start, end: offset + p.end, pageNumber: i + 1 })
    }
  })
  return { text, segments }
}

export function pageCount(segments: Segment[]): number {
  return segments.reduce((n, s) => Math.max(n, s.pageNumber ?? 0), 0)
}

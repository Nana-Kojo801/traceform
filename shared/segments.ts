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

/** Join PDF pages with blank lines and produce one segment per page. */
export function joinPages(pages: string[]): { text: string; segments: Segment[] } {
  let text = ''
  const segments: Segment[] = []
  pages.forEach((page, i) => {
    const body = page.trim()
    if (text) text += '\n\n'
    const start = text.length
    text += body
    if (body) segments.push({ index: segments.length, start, end: text.length, pageNumber: i + 1 })
  })
  return { text, segments }
}

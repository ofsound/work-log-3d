export interface DailyNoteMark {
  type: string
  attrs?: Record<string, unknown>
}

export interface DailyNoteContentNode {
  type: string
  attrs?: Record<string, unknown>
  content?: DailyNoteContentNode[]
  marks?: DailyNoteMark[]
  text?: string
}

export interface DailyNote {
  dateKey: string
  content: DailyNoteContentNode
  createdAt: Date | null
  updatedAt: Date | null
}

export interface DailyNoteInput {
  content: DailyNoteContentNode
}

export const DAILY_NOTE_MAX_LINES = 500

const BLOCK_LINE_NODE_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'codeBlock',
  'listItem',
  'taskItem',
])

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const cloneAttrs = (attrs: Record<string, unknown> | undefined) => {
  if (!attrs) {
    return undefined
  }

  return { ...attrs }
}

const cloneMark = (mark: DailyNoteMark): DailyNoteMark => ({
  type: mark.type,
  ...(mark.attrs ? { attrs: cloneAttrs(mark.attrs) } : {}),
})

export const createEmptyDailyNoteContent = (): DailyNoteContentNode => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
})

export const isDailyNoteContentNode = (value: unknown): value is DailyNoteContentNode => {
  if (!isRecord(value) || typeof value.type !== 'string' || !value.type.trim()) {
    return false
  }

  if (value.text !== undefined && typeof value.text !== 'string') {
    return false
  }

  if (value.attrs !== undefined && !isRecord(value.attrs)) {
    return false
  }

  if (
    value.marks !== undefined &&
    (!Array.isArray(value.marks) ||
      value.marks.some(
        (mark) =>
          !isRecord(mark) ||
          typeof mark.type !== 'string' ||
          !mark.type.trim() ||
          (mark.attrs !== undefined && !isRecord(mark.attrs)),
      ))
  ) {
    return false
  }

  if (
    value.content !== undefined &&
    (!Array.isArray(value.content) || value.content.some((entry) => !isDailyNoteContentNode(entry)))
  ) {
    return false
  }

  return true
}

export const cloneDailyNoteContent = (content: DailyNoteContentNode): DailyNoteContentNode => ({
  type: content.type,
  ...(content.attrs ? { attrs: cloneAttrs(content.attrs) } : {}),
  ...(content.text !== undefined ? { text: content.text } : {}),
  ...(content.marks ? { marks: content.marks.map(cloneMark) } : {}),
  ...(content.content ? { content: content.content.map(cloneDailyNoteContent) } : {}),
})

const toLineCountText = (content: DailyNoteContentNode): string => {
  if (content.type === 'hardBreak') {
    return '\n'
  }

  const childText = (content.content ?? []).map(toLineCountText).join('')
  const ownText = content.text ?? ''
  const combined = `${ownText}${childText}`

  if (!BLOCK_LINE_NODE_TYPES.has(content.type)) {
    return combined
  }

  return combined.endsWith('\n') ? combined : `${combined}\n`
}

export const getDailyNoteLineCount = (content: DailyNoteContentNode) => {
  const normalized = toLineCountText(content).replace(/\n+$/u, '')

  return normalized ? normalized.split('\n').length : 1
}

const collectPlainText = (content: DailyNoteContentNode): string =>
  `${content.text ?? ''}${(content.content ?? []).map(collectPlainText).join('')}`

export const isDailyNoteContentEmpty = (content: DailyNoteContentNode) =>
  collectPlainText(content).trim().length === 0

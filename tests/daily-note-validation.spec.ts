import {
  createEmptyDailyNoteContent,
  getDailyNoteLineCount,
  isDailyNoteContentEmpty,
  validateDailyNoteInput,
} from '~~/shared/worklog'

describe('daily note validation', () => {
  it('accepts a valid rich-text document and normalizes the date key', () => {
    const note = validateDailyNoteInput(' 2026-03-23 ', {
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Plan the release' }],
          },
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: true },
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ship v1' }] }],
              },
            ],
          },
        ],
      },
    })

    expect(note.dateKey).toBe('2026-03-23')
    expect(note.content.content?.length).toBe(2)
  })

  it('exposes empty helpers for the default scratchpad document', () => {
    const content = createEmptyDailyNoteContent()

    expect(isDailyNoteContentEmpty(content)).toBe(true)
    expect(getDailyNoteLineCount(content)).toBe(1)
  })

  it('rejects malformed content payloads', () => {
    expect(() =>
      validateDailyNoteInput('2026-03-23', {
        content: {
          type: '',
        },
      }),
    ).toThrow('Daily note content must be a valid rich-text document.')
  })

  it('rejects content that exceeds the configured line limit', () => {
    const content = {
      type: 'doc',
      content: Array.from({ length: 501 }, (_, index) => ({
        type: 'paragraph',
        content: [{ type: 'text', text: `Line ${index + 1}` }],
      })),
    } as const

    expect(() => validateDailyNoteInput('2026-03-23', { content })).toThrow(
      'Daily note content must stay within 500 lines.',
    )
  })
})

import {
  DEFAULT_PROJECTS_PAGE_LAYOUT,
  PROJECTS_LAYOUT_GUEST_STORAGE_KEY,
  PROJECTS_LAYOUT_USER_STORAGE_KEY_PREFIX,
  coerceProjectsPageViewQuery,
  getProjectsLayoutStorageKey,
  isProjectsPageLayout,
  readProjectsPageLayout,
  writeProjectsPageLayout,
} from '~/app/utils/projects-page-layout'

describe('projects page layout storage', () => {
  it('resolves guest vs user storage keys', () => {
    expect(getProjectsLayoutStorageKey(null)).toBe(PROJECTS_LAYOUT_GUEST_STORAGE_KEY)
    expect(getProjectsLayoutStorageKey('abc')).toBe(`${PROJECTS_LAYOUT_USER_STORAGE_KEY_PREFIX}abc`)
  })

  it('validates layout values', () => {
    expect(isProjectsPageLayout('list')).toBe(true)
    expect(isProjectsPageLayout('grid')).toBe(true)
    expect(isProjectsPageLayout('')).toBe(false)
    expect(isProjectsPageLayout('tiles')).toBe(false)
    expect(isProjectsPageLayout(null)).toBe(false)
  })

  it('reads and writes known layouts', () => {
    const storage = new Map<string, string>()

    const like = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storage.set(k, v)
      },
    }

    expect(readProjectsPageLayout(like, PROJECTS_LAYOUT_GUEST_STORAGE_KEY)).toBe(null)

    writeProjectsPageLayout(like, PROJECTS_LAYOUT_GUEST_STORAGE_KEY, 'grid')
    expect(readProjectsPageLayout(like, PROJECTS_LAYOUT_GUEST_STORAGE_KEY)).toBe('grid')

    writeProjectsPageLayout(like, PROJECTS_LAYOUT_GUEST_STORAGE_KEY, 'list')
    expect(readProjectsPageLayout(like, PROJECTS_LAYOUT_GUEST_STORAGE_KEY)).toBe('list')
  })

  it('ignores invalid stored values', () => {
    const storage = new Map<string, string>([[PROJECTS_LAYOUT_GUEST_STORAGE_KEY, 'nope']])

    const like = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => {
        storage.set(k, v)
      },
    }

    expect(readProjectsPageLayout(like, PROJECTS_LAYOUT_GUEST_STORAGE_KEY)).toBe(null)
  })

  it('documents default layout', () => {
    expect(DEFAULT_PROJECTS_PAGE_LAYOUT).toBe('grid')
  })

  it('coerces ?view= query for vue-router', () => {
    expect(coerceProjectsPageViewQuery(undefined)).toBe('grid')
    expect(coerceProjectsPageViewQuery('grid')).toBe('grid')
    expect(coerceProjectsPageViewQuery(['grid'])).toBe('grid')
    expect(coerceProjectsPageViewQuery('list')).toBe('list')
    expect(coerceProjectsPageViewQuery('tiles')).toBe('grid')
  })
})

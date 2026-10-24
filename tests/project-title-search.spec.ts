import { searchProjectTitles } from '~/utils/project-title-search'

const projects = [
  { id: '1', name: 'Client Portal Redesign' },
  { id: '2', name: 'Internal Reporting' },
  { id: '3', name: 'Café Brand Refresh' },
  { id: '4', name: 'Portal' },
  { id: '5', name: 'ClientPortal Maintenance' },
]
const names = (query: string) => searchProjectTitles(projects, query).map((project) => project.name)

describe('project title search', () => {
  it('preserves the supplied order for empty or separator-only queries', () => {
    expect(searchProjectTitles(projects, '  ')).toEqual(projects)
    expect(searchProjectTitles(projects, '---')).toEqual(projects)
  })

  it('ranks exact titles before prefixes, words, and fuzzy matches', () => {
    expect(names('portal')[0]).toBe('Portal')
    expect(names('client portal')[0]).toBe('Client Portal Redesign')
  })

  it('matches unordered fragments and requires every fragment', () => {
    expect(names('red cli')).toEqual(['Client Portal Redesign'])
    expect(names('portal nonexistent')).toEqual([])
    expect(names('rand fres')).toEqual(['Café Brand Refresh'])
  })

  it('ignores case, accents, and separators and splits camel case', () => {
    expect(names('CAFE-brand')).toEqual(['Café Brand Refresh'])
    expect(names('main client')).toEqual(['ClientPortal Maintenance'])
  })

  it('supports initials and ordered character abbreviations', () => {
    expect(names('cpr')[0]).toBe('Client Portal Redesign')
    expect(names('clprt')).toContain('Client Portal Redesign')
    expect(names('ir')[0]).toBe('Internal Reporting')
    expect(names('zz')).toEqual([])
  })

  it('tolerates small typos without fuzzy matching single characters across words', () => {
    expect(names('clent')).toContain('Client Portal Redesign')
    expect(names('reportng')).toContain('Internal Reporting')
    expect(names('xy')).toEqual([])
  })

  it('keeps stable order for equally good matches', () => {
    expect(searchProjectTitles([{ name: 'Alpha One' }, { name: 'Alpha Two' }], 'alpha')).toEqual([
      { name: 'Alpha One' },
      { name: 'Alpha Two' },
    ])
  })
})

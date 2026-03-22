import { join } from 'node:path'

import { parseRendererPortStateFile, resolveRequestFilePath } from '~/electron/renderer-server'

describe('renderer port state file', () => {
  it('parses a valid port from JSON', () => {
    expect(parseRendererPortStateFile('{"port":47821}\n')).toBe(47_821)
  })

  it('returns undefined for invalid JSON', () => {
    expect(parseRendererPortStateFile('not json')).toBeUndefined()
  })

  it('returns undefined when port is out of range', () => {
    expect(parseRendererPortStateFile('{"port":70000}')).toBeUndefined()
  })
})

describe('desktop renderer request paths', () => {
  const rootDir = '/tmp/work-log-renderer'

  it('maps the root request to the renderer index document', () => {
    expect(resolveRequestFilePath(rootDir, '/')).toBe(join(rootDir, 'index.html'))
  })

  it('maps asset requests within the renderer root', () => {
    expect(resolveRequestFilePath(rootDir, '/assets/app.js')).toBe(join(rootDir, 'assets/app.js'))
  })

  it('rejects parent-directory traversal attempts', () => {
    expect(resolveRequestFilePath(rootDir, '/../secrets.txt')).toBeNull()
  })
})

import { join } from 'node:path'

import { resolveRequestFilePath } from '~/electron/renderer-server'

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

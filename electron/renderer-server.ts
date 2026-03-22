import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'

import type { AddressInfo } from 'node:net'

const DEFAULT_DOCUMENT = 'index.html'

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
}

const getMimeType = (filePath: string) =>
  MIME_TYPES[extname(filePath)] ?? 'application/octet-stream'

const isPathInsideRoot = (rootDir: string, candidatePath: string) => {
  const normalizedRoot = normalize(rootDir)
  const normalizedCandidate = normalize(candidatePath)

  return (
    normalizedCandidate === normalizedRoot ||
    normalizedCandidate.startsWith(`${normalizedRoot}${sep}`)
  )
}

export const resolveRequestFilePath = (rootDir: string, requestPath: string) => {
  const pathname = decodeURIComponent(requestPath)
  const relativePath = pathname === '/' ? DEFAULT_DOCUMENT : pathname.replace(/^\/+/, '')
  const candidatePath = join(rootDir, relativePath)

  return isPathInsideRoot(rootDir, candidatePath) ? candidatePath : null
}

const resolveRendererFile = async (rootDir: string, requestPath: string) => {
  const candidatePath = resolveRequestFilePath(rootDir, requestPath)

  if (candidatePath) {
    try {
      const candidateStat = await stat(candidatePath)

      if (candidateStat.isFile()) {
        return candidatePath
      }

      if (candidateStat.isDirectory()) {
        const nestedIndexPath = join(candidatePath, DEFAULT_DOCUMENT)
        const nestedIndexStat = await stat(nestedIndexPath)

        if (nestedIndexStat.isFile()) {
          return nestedIndexPath
        }
      }
    } catch {
      // Fall through to the SPA document fallback below.
    }
  }

  if (extname(requestPath)) {
    return null
  }

  return join(rootDir, DEFAULT_DOCUMENT)
}

export const createDesktopRendererServer = async (rootDir: string) => {
  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1')
      const filePath = await resolveRendererFile(rootDir, requestUrl.pathname)

      if (!filePath) {
        response.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8',
        })
        response.end('Not found')
        return
      }

      const body = await readFile(filePath)
      response.writeHead(200, {
        'Content-Type': getMimeType(filePath),
      })
      response.end(body)
    } catch {
      response.writeHead(500, {
        'Content-Type': 'text/plain; charset=utf-8',
      })
      response.end('Internal server error')
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Renderer server did not expose a TCP address.')
  }

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error)
            return
          }

          resolve()
        })
      }),
    url: `http://127.0.0.1:${(address as AddressInfo).port}`,
  }
}

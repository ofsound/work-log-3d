import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join, normalize, sep } from 'node:path'

const DEFAULT_DOCUMENT = 'index.html'

/** Stable default so Firebase Auth IndexedDB (origin-scoped) survives app restarts. */
export const DEFAULT_RENDERER_LISTEN_PORT = 47_821

const MAX_PORT_BIND_ATTEMPTS = 48

export type DesktopRendererServerOptions = {
  /**
   * When set, the successfully bound port is written here so the next launch retries the same
   * port first (keeps `http://127.0.0.1:<port>` stable if the default port was previously skipped).
   */
  portStatePath?: string
}

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

const RENDERER_HOST = '127.0.0.1'

export const parseRendererPortStateFile = (raw: string): number | undefined => {
  try {
    const parsed = JSON.parse(raw) as { port?: unknown }
    if (
      typeof parsed.port === 'number' &&
      Number.isInteger(parsed.port) &&
      parsed.port > 0 &&
      parsed.port < 65_536
    ) {
      return parsed.port
    }
  } catch {
    // ignore invalid file
  }
  return undefined
}

const readSavedRendererPort = async (portStatePath: string): Promise<number | undefined> => {
  try {
    return parseRendererPortStateFile(await readFile(portStatePath, 'utf8'))
  } catch {
    return undefined
  }
}

const parseEnvRendererPort = (): number | undefined => {
  const raw = process.env.ELECTRON_RENDERER_PORT
  if (!raw) {
    return undefined
  }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 65_536) {
    return undefined
  }
  return parsed
}

const getPreferredStartPort = async (options: DesktopRendererServerOptions): Promise<number> => {
  const fromEnv = parseEnvRendererPort()
  if (fromEnv !== undefined) {
    return fromEnv
  }

  if (options.portStatePath) {
    const saved = await readSavedRendererPort(options.portStatePath)
    if (saved !== undefined) {
      return saved
    }
  }

  return DEFAULT_RENDERER_LISTEN_PORT
}

const createRendererRequestListener = (rootDir: string) => {
  return async (request: IncomingMessage, response: ServerResponse) => {
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
  }
}

const listenOnAvailablePort = async (server: Server, port: number): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      server.off('error', onError)
      reject(error)
    }
    server.once('error', onError)
    server.listen(port, RENDERER_HOST, () => {
      server.off('error', onError)
      resolve()
    })
  })
}

const closeServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}

export const createDesktopRendererServer = async (
  rootDir: string,
  options: DesktopRendererServerOptions = {},
) => {
  const requestListener = createRendererRequestListener(rootDir)
  const startPort = await getPreferredStartPort(options)

  for (let offset = 0; offset < MAX_PORT_BIND_ATTEMPTS; offset++) {
    const port = startPort + offset
    if (port >= 65_536) {
      break
    }

    const candidate = createServer(requestListener)

    try {
      await listenOnAvailablePort(candidate, port)

      if (options.portStatePath) {
        await mkdir(dirname(options.portStatePath), { recursive: true })
        await writeFile(options.portStatePath, `${JSON.stringify({ port })}\n`, 'utf8')
      }

      return {
        close: () => closeServer(candidate),
        url: `http://${RENDERER_HOST}:${port}`,
      }
    } catch (error) {
      const err = error as NodeJS.ErrnoException
      if (err.code === 'EADDRINUSE') {
        await closeServer(candidate).catch(() => {
          // Ignore close errors on a server that failed to bind.
        })
        continue
      }
      throw error
    }
  }

  throw new Error('Could not bind the desktop renderer server to a localhost port.')
}

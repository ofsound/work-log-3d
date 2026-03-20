import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const desktopPort = process.env.NUXT_ELECTRON_PORT ?? '3001'
const desktopUrl = `http://127.0.0.1:${desktopPort}`

let nuxtProcess = null
let electronProcess = null

const spawnProcess = (command, args, env) => {
  return spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
    },
    stdio: 'inherit',
  })
}

const stopProcesses = () => {
  electronProcess?.kill('SIGTERM')
  nuxtProcess?.kill('SIGTERM')
}

const waitForServer = async (url, attempts = 120) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)

      if (response.ok) {
        return
      }
    } catch {
      // Keep polling until the dev server is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  throw new Error(`Nuxt dev server did not start at ${url}`)
}

process.on('SIGINT', () => {
  stopProcesses()
  process.exit(130)
})

process.on('SIGTERM', () => {
  stopProcesses()
  process.exit(143)
})

nuxtProcess = spawnProcess(
  npmCommand,
  ['run', 'dev', '--', '--port', desktopPort, '--host', '127.0.0.1'],
  {
    NUXT_ELECTRON_BUILD: 'true',
  },
)

nuxtProcess.on('exit', (code) => {
  if (electronProcess) {
    electronProcess.kill('SIGTERM')
  }

  process.exit(code ?? 1)
})

await waitForServer(desktopUrl)

electronProcess = spawnProcess(npxCommand, ['electron-vite', 'dev'], {
  NUXT_DEV_SERVER_URL: desktopUrl,
})

electronProcess.on('exit', (code) => {
  nuxtProcess?.kill('SIGTERM')
  process.exit(code ?? 0)
})

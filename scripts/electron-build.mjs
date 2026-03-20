import { cp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const projectRoot = process.cwd()
const generatedRendererDir = join(projectRoot, '.output', 'public')
const electronRendererDir = join(projectRoot, 'dist-electron', 'renderer')

const run = (command, args, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      env: {
        ...process.env,
        ...env,
      },
      stdio: 'inherit',
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} exited with code ${code ?? 1}`))
    })
  })

await run(npmCommand, ['run', 'generate'], {
  NUXT_ELECTRON_BUILD: 'true',
})

await run(npxCommand, ['electron-vite', 'build'])

const electronMainResourcesDir = join(projectRoot, 'dist-electron', 'main', 'resources')
const electronResourcesSrc = join(projectRoot, 'electron', 'resources')

await rm(electronMainResourcesDir, { force: true, recursive: true })
await cp(electronResourcesSrc, electronMainResourcesDir, { recursive: true })

await rm(electronRendererDir, { force: true, recursive: true })
await cp(generatedRendererDir, electronRendererDir, { recursive: true })

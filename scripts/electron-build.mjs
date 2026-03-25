import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const projectRoot = process.cwd()
const generatedRendererDir = join(projectRoot, '.output', 'public')
const electronRendererDir = join(projectRoot, 'dist-electron', 'renderer')
const electronAppDir = join(projectRoot, 'dist-electron', 'app')
const electronPackagedDistDir = join(electronAppDir, 'dist-electron')

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

const rootPackageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'))
const electronPackageJson = {
  name: rootPackageJson.name,
  version: rootPackageJson.version,
  description: rootPackageJson.description,
  main: 'dist-electron/main/main.js',
  type: rootPackageJson.type,
}

await rm(electronAppDir, { force: true, recursive: true })
await mkdir(electronPackagedDistDir, { recursive: true })

await Promise.all([
  cp(join(projectRoot, 'dist-electron', 'main'), join(electronPackagedDistDir, 'main'), {
    recursive: true,
  }),
  cp(join(projectRoot, 'dist-electron', 'preload'), join(electronPackagedDistDir, 'preload'), {
    recursive: true,
  }),
  cp(join(projectRoot, 'dist-electron', 'renderer'), join(electronPackagedDistDir, 'renderer'), {
    recursive: true,
  }),
  writeFile(
    join(electronAppDir, 'package.json'),
    `${JSON.stringify(electronPackageJson, null, 2)}\n`,
  ),
])

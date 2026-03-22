import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

export const UNUSED_MACOS_USAGE_DESCRIPTION_KEYS = [
  'NSMicrophoneUsageDescription',
  'NSAudioCaptureUsageDescription',
  'NSCameraUsageDescription',
  'NSBluetoothAlwaysUsageDescription',
  'NSBluetoothPeripheralUsageDescription',
]

const PLIST_VALUE_PATTERN = String.raw`(?:<array>[\s\S]*?<\/array>|<data>[\s\S]*?<\/data>|<date>[\s\S]*?<\/date>|<dict>[\s\S]*?<\/dict>|<false\/>|<integer>[\s\S]*?<\/integer>|<real>[\s\S]*?<\/real>|<string>[\s\S]*?<\/string>|<true\/>)`

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const removeUsageDescriptionsFromPlist = (
  plist,
  keys = UNUSED_MACOS_USAGE_DESCRIPTION_KEYS,
) =>
  keys.reduce(
    (current, key) =>
      current.replace(
        new RegExp(`(^|\\n)\\s*<key>${escapeRegExp(key)}</key>\\s*${PLIST_VALUE_PATTERN}`, 'g'),
        '$1',
      ),
    plist,
  )

export const getMacInfoPlistPath = (context) =>
  join(
    context.appOutDir,
    `${context.packager.appInfo.productFilename}.app`,
    'Contents',
    'Info.plist',
  )

export default async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') {
    return
  }

  const infoPlistPath = getMacInfoPlistPath(context)
  const plist = await readFile(infoPlistPath, 'utf8')
  const cleanedPlist = removeUsageDescriptionsFromPlist(plist)

  if (cleanedPlist !== plist) {
    await writeFile(infoPlistPath, cleanedPlist, 'utf8')
  }
}

import { describe, expect, it } from 'vitest'

import {
  UNUSED_MACOS_USAGE_DESCRIPTION_KEYS,
  getMacInfoPlistPath,
  removeUsageDescriptionsFromPlist,
} from '../scripts/electron-after-pack.mjs'

describe('electron afterPack hook', () => {
  it('removes unused macOS usage-description keys from the plist', () => {
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "https://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>
  <string>Work Log</string>
  <key>NSMicrophoneUsageDescription</key>
  <string>This app needs access to the microphone</string>
  <key>NSCameraUsageDescription</key>
  <string>This app needs access to the camera</string>
  <key>NSBluetoothAlwaysUsageDescription</key>
  <string>This app needs access to Bluetooth</string>
  <key>NSBluetoothPeripheralUsageDescription</key>
  <string>This app needs access to Bluetooth</string>
  <key>NSAudioCaptureUsageDescription</key>
  <string>This app needs access to audio capture</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
`

    const cleaned = removeUsageDescriptionsFromPlist(plist)

    for (const key of UNUSED_MACOS_USAGE_DESCRIPTION_KEYS) {
      expect(cleaned).not.toContain(`<key>${key}</key>`)
    }
    expect(cleaned).toContain('<key>CFBundleName</key>')
    expect(cleaned).toContain('<key>NSHighResolutionCapable</key>')
  })

  it('resolves the macOS Info.plist from the afterPack context', () => {
    expect(
      getMacInfoPlistPath({
        appOutDir: '/tmp/release/mac-arm64',
        packager: {
          appInfo: {
            productFilename: 'Work Log',
          },
        },
      }),
    ).toBe('/tmp/release/mac-arm64/Work Log.app/Contents/Info.plist')
  })
})

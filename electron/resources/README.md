# Desktop alert sounds

Place your timer completion sound here as **`timer-complete.wav`** (or change `TIMER_COMPLETE_SOUND_FILENAME` in [`../audio-config.ts`](../audio-config.ts)).

If the file is missing, the app falls back to the system beep.

You can also set an absolute path in `TIMER_COMPLETE_SOUND_PATH_OVERRIDE` in the same config file.

## Tray icon templates

macOS tray rendering uses:

- `tray-iconTemplate.png`
- `tray-iconTemplate@2x.png`

Keep them pure black on a transparent background so `setTemplateImage(true)` can tint them correctly in the menu bar.

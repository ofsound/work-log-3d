# Desktop alert sounds

Place your timer completion sound here as **`timer-complete.wav`** (or change `TIMER_COMPLETE_SOUND_FILENAME` in [`../audio-config.ts`](../audio-config.ts)).

If the file is missing, the app falls back to the system beep.

You can also set an absolute path in `TIMER_COMPLETE_SOUND_PATH_OVERRIDE` in the same config file.

## Tray icon templates

macOS tray rendering uses:

- `tray-iconTemplate.png`
- `tray-iconTemplate@2x.png`

Keep them pure black on a transparent background so `setTemplateImage(true)` can tint them correctly in the menu bar.

## Active app icon

`icon-white-not-so-thin.svg` is the source for the packaged app icon; its matching PNG is selected in `package.json`. Keep the public SVG copy in sync. The clock face center is `(512, 582)` on the 1024-square canvas: horizontally centered, with its original vertical placement.

Render with `rsvg-convert icon-white-not-so-thin.svg -o icon-white-not-so-thin.png` from this directory. The full-bleed, shadow-free home-screen source is `public/icon-pwa.svg`; rasterize it before resizing/flattening with ImageMagick for the home-screen PNGs and favicon.

The tray PNGs are 18 and 36 pixels square and are rasterized from `newTimeboxIconSvg({ stroke: '#000000' })` in `shared/icons/newTimeboxIcon.ts`. Use a padded `-2 -2 28 28` viewBox for these raster exports to preserve the original tray scale and vertical placement.

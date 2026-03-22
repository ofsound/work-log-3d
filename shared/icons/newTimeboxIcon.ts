export type NewTimeboxIconOptions = {
  /** Stroke color: `currentColor` in the app; `#000000` for macOS tray template rasterization */
  stroke?: string
  className?: string
}

/**
 * Alarm-clock style icon used for “new timebox” in the header and the Electron tray.
 */
export function newTimeboxIconSvg(options: NewTimeboxIconOptions = {}): string {
  const { stroke = 'currentColor', className } = options
  const classAttr = className ? ` class="${className}"` : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${classAttr}>
  <circle cx="12" cy="14" r="8" />
  <line x1="12" y1="2" x2="12" y2="6" />
  <line x1="9.5" y1="1.5" x2="14.5" y2="1.5" stroke-width="3" />
  <line x1="12" y1="10" x2="12" y2="14" />
  <line x1="4.5" y1="6.5" x2="6.34" y2="8.34" />
</svg>`
}

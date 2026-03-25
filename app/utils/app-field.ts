/**
 * Shared field layout, labels, and native control chrome (aligned with settings / reports / sessions).
 * Pair with `AppField`, `AppFieldLabel`, and `AppTextInput` / `AppSelect` / `AppTextarea`.
 */

export const APP_FIELD_DENSITIES = ['compact', 'comfortable'] as const
export type AppFieldDensity = (typeof APP_FIELD_DENSITIES)[number]

export const APP_FIELD_LABEL_VARIANTS = ['default'] as const
export type AppFieldLabelVariant = (typeof APP_FIELD_LABEL_VARIANTS)[number]

const FIELD_ROOT_GAP_CLASS_NAMES: Record<AppFieldDensity, string> = {
  compact: 'gap-2',
  comfortable: 'gap-3',
}

/** Vertical stack: label + control(s). */
export const getAppFieldRootClassName = ({ density = 'compact' }: { density?: AppFieldDensity }) =>
  ['flex min-w-0 flex-col', FIELD_ROOT_GAP_CLASS_NAMES[density]].filter(Boolean).join(' ')

export const APP_FIELD_LABEL_CLASS_NAMES: Record<AppFieldLabelVariant, string> = {
  default: 'text-sm font-semibold text-text',
}

export const getAppFieldLabelClassName = ({
  variant = 'default',
}: {
  variant?: AppFieldLabelVariant
}) => APP_FIELD_LABEL_CLASS_NAMES[variant]

const CONTROL_BASE = 'min-w-0 border border-input-border bg-input text-text select-text'

const CONTROL_DENSITY_CLASS_NAMES: Record<AppFieldDensity, string> = {
  compact: 'rounded-md px-3 py-2',
  comfortable: 'rounded-md px-4 py-3',
}

/** Native text-like controls (input, select, textarea). */
export const getAppFieldControlClassName = ({
  density = 'compact',
  multiline = false,
}: {
  density?: AppFieldDensity
  multiline?: boolean
}) =>
  [CONTROL_BASE, CONTROL_DENSITY_CLASS_NAMES[density], multiline ? 'w-full max-w-full' : '']
    .filter(Boolean)
    .join(' ')

/** Optional `text-sm` for compact popover inputs (e.g. multi-select search). */
export const APP_FIELD_CONTROL_POPOVER_INPUT_CLASS_NAME = `${CONTROL_BASE} rounded-xl px-3 py-2 text-sm text-text`

/** Multi-select / combobox trigger (button), compact density. */
export const getAppFieldControlTriggerClassName = ({
  disabled = false,
}: {
  disabled?: boolean
} = {}) =>
  [
    'flex min-h-11 w-full min-w-0 items-center justify-between gap-3 border border-input-border bg-input px-3 py-2 text-left text-sm text-text',
    disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
    'rounded-xl',
  ]
    .filter(Boolean)
    .join(' ')

/** Row for checkbox/radio + label text (reports, muted cards). */
export const APP_FIELD_INLINE_CHOICE_CLASS_NAME =
  'flex cursor-pointer items-center gap-2 text-sm text-text'

/** Same as inline choice with wider control–label gap (popover lists). */
export const APP_FIELD_INLINE_CHOICE_PANEL_ROW_CLASS_NAME =
  'flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm text-text hover:bg-surface-subtle'

const TOGGLE_CHIP_BASE =
  'inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition'

export const APP_TOGGLE_CHIP_SELECTED_CLASS_NAME = `${TOGGLE_CHIP_BASE} border-link/45 bg-link/10 text-link`

export const APP_TOGGLE_CHIP_UNSELECTED_CLASS_NAME = `${TOGGLE_CHIP_BASE} border-border-subtle bg-surface-muted text-text hover:border-link/45`

export const getAppToggleChipClassName = ({ selected }: { selected: boolean }) =>
  selected ? APP_TOGGLE_CHIP_SELECTED_CLASS_NAME : APP_TOGGLE_CHIP_UNSELECTED_CLASS_NAME

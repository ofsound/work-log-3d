/**
 * App-wide button styles: one radius scale per size, shared theme tokens from `main.css`.
 * - xs/sm: rounded-md — compact rows, dialogs
 * - md: rounded-lg — forms, settings
 * - lg: rounded-xl — timer bar, prominent secondary
 * Use `attrs.class` for layout (flex-1, responsive width, container queries).
 */

export const APP_BUTTON_VARIANTS = ['primary', 'secondary', 'danger'] as const
export const APP_BUTTON_SIZES = ['xs', 'sm', 'md', 'lg'] as const
export const APP_BUTTON_SHAPES = ['rounded', 'pill'] as const

export type AppButtonVariant = (typeof APP_BUTTON_VARIANTS)[number]
export type AppButtonSize = (typeof APP_BUTTON_SIZES)[number]
export type AppButtonShape = (typeof APP_BUTTON_SHAPES)[number]

const BASE_CLASS_NAME =
  'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'

export const APP_BUTTON_VARIANT_CLASS_NAMES = {
  primary:
    'border border-transparent bg-button-primary text-button-primary-text hover:bg-button-primary-hover',
  secondary:
    'border border-button-secondary-border bg-button-secondary text-button-secondary-text hover:border-border-strong hover:bg-button-secondary-hover',
  danger: 'border border-transparent bg-danger text-text-inverse hover:opacity-90',
} satisfies Record<AppButtonVariant, string>

/** Layout and typography per size (radius applied separately from shape). */
export const APP_BUTTON_SIZE_CLASS_NAMES = {
  xs: 'h-6 min-h-6 min-w-0 px-0.5 py-0 text-[10px] font-bold leading-none tracking-normal',
  sm: 'px-3 py-1.5 text-sm font-medium',
  md: 'px-4 py-2 text-sm font-semibold',
  lg: 'h-10 min-h-10 px-3 text-base font-bold tracking-wide',
} satisfies Record<AppButtonSize, string>

const SIZE_ROUNDED_CLASS_NAMES = {
  xs: 'rounded-md',
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
} satisfies Record<AppButtonSize, string>

export const getAppButtonClassName = ({
  block = false,
  shape = 'rounded',
  size = 'md',
  variant = 'secondary',
}: {
  block?: boolean
  shape?: AppButtonShape
  size?: AppButtonSize
  variant?: AppButtonVariant
}) => {
  const parts = [
    BASE_CLASS_NAME,
    APP_BUTTON_VARIANT_CLASS_NAMES[variant],
    APP_BUTTON_SIZE_CLASS_NAMES[size],
    shape === 'pill' ? 'rounded-full' : SIZE_ROUNDED_CLASS_NAMES[size],
  ]

  if (variant === 'primary' && (size === 'md' || size === 'lg')) {
    parts.push('shadow-button-primary')
  }

  if (variant === 'secondary' && size === 'lg') {
    parts.push('shadow-control')
  }

  if (block) {
    parts.push('w-full')
  }

  return parts.filter(Boolean).join(' ')
}

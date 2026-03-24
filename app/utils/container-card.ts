export const CONTAINER_CARD_VARIANTS = [
  'default',
  'muted',
  'subtle',
  'gradient',
  'project',
  'projectGradient',
  'tag',
  'day',
  'timer',
  'session',
  'overlay',
  'warning',
  'danger',
] as const

export const CONTAINER_CARD_PADDING_OPTIONS = ['none', 'compact', 'default', 'comfortable'] as const

export type ContainerCardVariant = (typeof CONTAINER_CARD_VARIANTS)[number]
export type ContainerCardPadding = (typeof CONTAINER_CARD_PADDING_OPTIONS)[number]

const BASE_CLASS_NAME = 'border'

export const CONTAINER_CARD_VARIANT_CLASS_NAMES = {
  default: 'rounded-lg border-border-subtle bg-surface shadow-panel',
  muted: 'rounded-lg border-border-subtle bg-surface-muted shadow-none',
  subtle: 'rounded-lg border-border bg-surface shadow-panel',
  gradient:
    'rounded-lg border-border-subtle bg-[image:var(--background-image-container-card-gradient-surface)] shadow-panel',
  project: 'rounded-lg border-border-subtle bg-panel-project shadow-panel',
  projectGradient:
    'rounded-lg border-border-subtle bg-[image:var(--background-image-container-card-gradient-project)] shadow-panel',
  tag: 'rounded-lg border-border-subtle bg-panel-tag shadow-panel',
  day: 'rounded-lg border-border-subtle bg-panel-day shadow-panel',
  timer: 'rounded-lg border-border-subtle bg-panel-timer shadow-panel',
  session: 'rounded-lg border-border-subtle bg-panel-session shadow-panel',
  overlay:
    'overflow-hidden rounded-3xl border-white/20 bg-surface/42 shadow-panel backdrop-blur-xl backdrop-saturate-150',
  warning:
    'rounded-3xl border-callout-warning-border bg-callout-warning-surface shadow-control text-callout-warning-text',
  danger: 'rounded-3xl border-callout-danger-border bg-callout-danger-surface shadow-control',
} satisfies Record<ContainerCardVariant, string>

export const CONTAINER_CARD_PADDING_CLASS_NAMES = {
  none: 'p-0',
  compact: 'px-4 py-4',
  default: 'px-5 py-5',
  comfortable: 'px-6 py-6',
} satisfies Record<ContainerCardPadding, string>

export const CONTAINER_CARD_INTERACTIVE_CLASS_NAME =
  'cursor-pointer transition-[box-shadow,filter] duration-150 ease-out hover:brightness-[1.02] hover:shadow-[var(--shadow-panel-selected)]'

export const CONTAINER_CARD_SELECTED_CLASS_NAME =
  'shadow-panel-selected ring-1 ring-link/35 ring-inset'

export const getContainerCardClassName = ({
  interactive = false,
  padding = 'default',
  selected = false,
  variant = 'default',
}: {
  interactive?: boolean
  padding?: ContainerCardPadding
  selected?: boolean
  variant?: ContainerCardVariant
}) =>
  [
    BASE_CLASS_NAME,
    CONTAINER_CARD_VARIANT_CLASS_NAMES[variant],
    CONTAINER_CARD_PADDING_CLASS_NAMES[padding],
    interactive ? CONTAINER_CARD_INTERACTIVE_CLASS_NAME : '',
    selected ? CONTAINER_CARD_SELECTED_CLASS_NAME : '',
  ]
    .filter(Boolean)
    .join(' ')

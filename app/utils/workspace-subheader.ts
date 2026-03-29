export const WORKSPACE_SUBHEADER_VARIANT_CLASS_NAMES = {
  neutral: 'bg-panel-workspace-neutral',
  project: 'bg-[image:var(--background-image-container-card-gradient-surface)]',
} as const

export const WORKSPACE_SUBHEADER_LAYOUT_CLASS_NAMES = {
  fluid: 'w-full',
  content: 'mx-auto w-full max-w-[var(--width-workspace-content-max)]',
} as const

export type WorkspaceSubheaderVariant = keyof typeof WORKSPACE_SUBHEADER_VARIANT_CLASS_NAMES
export type WorkspaceSubheaderLayout = keyof typeof WORKSPACE_SUBHEADER_LAYOUT_CLASS_NAMES

export const WORKSPACE_SUBHEADER_CARD_CLASS_NAME =
  'relative z-10 w-full !rounded-none border-0 !shadow-[var(--shadow-workspace-subheader)]'

export const WORKSPACE_SUBHEADER_INNER_CLASS_NAME =
  'w-full px-6 py-[var(--spacing-workspace-subheader-y)] sm:px-[var(--spacing-workspace-subheader-x)]'

export const WORKSPACE_SUBHEADER_FOOTER_CLASS_NAME = 'mt-4 w-full'

export const WORKSPACE_BODY_X_CLASS_NAME = 'px-[var(--spacing-workspace-content-x)]'

export const WORKSPACE_BODY_CONTENT_CLASS_NAME =
  'mx-auto w-full max-w-[var(--width-workspace-content-max)]'

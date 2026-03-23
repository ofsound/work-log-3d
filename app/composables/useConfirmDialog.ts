export type ConfirmDialogVariant = 'danger' | 'primary'

export type ConfirmDialogOptions = {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmDialogVariant
}

type ConfirmDialogState = {
  open: boolean
  title: string
  message: string | undefined
  confirmLabel: string
  cancelLabel: string
  variant: ConfirmDialogVariant
  titleId: string
  resolve: ((value: boolean) => void) | null
}

const initialState = (): ConfirmDialogState => ({
  open: false,
  title: '',
  message: undefined,
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
  variant: 'primary',
  titleId: 'confirm-dialog-title',
  resolve: null,
})

export function useConfirmDialog() {
  const state = useState<ConfirmDialogState>('confirm-dialog', () => initialState())

  const finish = (value: boolean) => {
    const resolve = state.value.resolve
    state.value.resolve = null
    state.value.open = false
    resolve?.(value)
  }

  const confirm = (options: ConfirmDialogOptions): Promise<boolean> => {
    if (state.value.open) {
      if (import.meta.dev) {
        console.warn('[useConfirmDialog] confirm() called while a dialog is already open')
      }
      return Promise.resolve(false)
    }

    const variant = options.variant ?? 'primary'
    const confirmLabel = options.confirmLabel ?? (variant === 'danger' ? 'Delete' : 'OK')
    const cancelLabel = options.cancelLabel ?? 'Cancel'

    return new Promise<boolean>((resolve) => {
      state.value.title = options.title
      state.value.message = options.message
      state.value.confirmLabel = confirmLabel
      state.value.cancelLabel = cancelLabel
      state.value.variant = variant
      state.value.resolve = resolve
      state.value.open = true
    })
  }

  return { state, confirm, finish }
}

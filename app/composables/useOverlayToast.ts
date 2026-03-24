export type OverlayToastOptions = {
  title: string
  message?: string
  durationMs?: number
}

type OverlayToastState = {
  open: boolean
  title: string
  message: string | undefined
  resolve: (() => void) | null
  durationTimeoutId: ReturnType<typeof setTimeout> | null
}

const initialState = (): OverlayToastState => ({
  open: false,
  title: '',
  message: undefined,
  resolve: null,
  durationTimeoutId: null,
})

export function useOverlayToast() {
  const state = useState<OverlayToastState>('overlay-toast', () => initialState())

  const clearDurationTimer = () => {
    const id = state.value.durationTimeoutId
    if (id !== null) {
      clearTimeout(id)
      state.value.durationTimeoutId = null
    }
  }

  const beginDismiss = () => {
    clearDurationTimer()
    if (state.value.open) {
      state.value.open = false
    }
  }

  const onAfterLeave = () => {
    const resolve = state.value.resolve
    state.value.resolve = null
    state.value.title = ''
    state.value.message = undefined
    resolve?.()
  }

  const show = (options: OverlayToastOptions): Promise<void> => {
    if (state.value.open) {
      if (import.meta.dev) {
        console.warn('[useOverlayToast] show() called while a toast is already open')
      }
      return Promise.resolve()
    }

    const durationMs = options.durationMs ?? 4000

    return new Promise<void>((resolve) => {
      clearDurationTimer()
      state.value.title = options.title
      state.value.message = options.message
      state.value.resolve = resolve
      state.value.open = true

      state.value.durationTimeoutId = setTimeout(() => {
        state.value.durationTimeoutId = null
        beginDismiss()
      }, durationMs)
    })
  }

  return { state, show, dismiss: beginDismiss, onAfterLeave }
}

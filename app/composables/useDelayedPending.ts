import { onBeforeUnmount, readonly, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

interface UseDelayedPendingOptions {
  delayMs?: number
  minVisibleMs?: number
}

export const useDelayedPending = (
  pending: MaybeRefOrGetter<boolean>,
  options: UseDelayedPendingOptions = {},
) => {
  const delayMs = options.delayMs ?? 180
  const minVisibleMs = options.minVisibleMs ?? 120
  const showPending = ref(false)

  let becameVisibleAt = 0
  let showTimer: ReturnType<typeof setTimeout> | null = null
  let hideTimer: ReturnType<typeof setTimeout> | null = null

  const clearShowTimer = () => {
    if (showTimer == null) {
      return
    }

    clearTimeout(showTimer)
    showTimer = null
  }

  const clearHideTimer = () => {
    if (hideTimer == null) {
      return
    }

    clearTimeout(hideTimer)
    hideTimer = null
  }

  const hideImmediately = () => {
    clearHideTimer()
    showPending.value = false
    becameVisibleAt = 0
  }

  const showImmediately = () => {
    clearShowTimer()
    showPending.value = true
    becameVisibleAt = Date.now()
  }

  watch(
    () => toValue(pending),
    (isPending) => {
      clearShowTimer()
      clearHideTimer()

      if (isPending) {
        if (showPending.value) {
          return
        }

        if (delayMs <= 0) {
          showImmediately()
          return
        }

        showTimer = setTimeout(() => {
          showTimer = null
          showImmediately()
        }, delayMs)

        return
      }

      if (!showPending.value) {
        return
      }

      const visibleForMs = Date.now() - becameVisibleAt
      const remainingVisibleMs = Math.max(minVisibleMs - visibleForMs, 0)

      if (remainingVisibleMs === 0) {
        hideImmediately()
        return
      }

      hideTimer = setTimeout(() => {
        hideTimer = null
        hideImmediately()
      }, remainingVisibleMs)
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    clearShowTimer()
    clearHideTimer()
  })

  return {
    showPending: readonly(showPending),
  }
}

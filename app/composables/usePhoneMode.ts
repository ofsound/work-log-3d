import { readonly, ref } from 'vue'
import type { Ref } from 'vue'

import {
  PHONE_MODE_TOUCH_QUERY,
  PHONE_MODE_VIEWPORT_QUERY,
  detectPhoneMode,
} from '~/utils/phone-mode'

let hasAttachedPhoneModeListeners = false
const isPhoneModeState = ref(false)
const hasResolvedViewportState = ref(false)

const addMediaQueryListener = (query: MediaQueryList, listener: () => void) => {
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener)
    return
  }

  query.addListener(listener)
}

const attachPhoneModeListeners = (isPhoneMode: Ref<boolean>, hasResolvedViewport: Ref<boolean>) => {
  if (!import.meta.client || hasAttachedPhoneModeListeners) {
    return
  }

  hasAttachedPhoneModeListeners = true

  const viewportQuery = window.matchMedia(PHONE_MODE_VIEWPORT_QUERY)
  const touchQuery = window.matchMedia(PHONE_MODE_TOUCH_QUERY)

  const updateState = () => {
    isPhoneMode.value = detectPhoneMode(window)
    hasResolvedViewport.value = true
  }

  addMediaQueryListener(viewportQuery, updateState)
  addMediaQueryListener(touchQuery, updateState)
  updateState()
}

export function usePhoneMode() {
  attachPhoneModeListeners(isPhoneModeState, hasResolvedViewportState)

  return {
    hasResolvedViewport: readonly(hasResolvedViewportState),
    isPhoneMode: readonly(isPhoneModeState),
  }
}

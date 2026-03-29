import { onBeforeUnmount, readonly, ref } from 'vue'

export function useMediaQuery(query: string, initialValue = false) {
  const matches = ref(initialValue)

  if (!import.meta.client) {
    return readonly(matches)
  }

  const mediaQuery = window.matchMedia(query)
  matches.value = mediaQuery.matches

  const updateMatches = (event: MediaQueryListEvent | MediaQueryList) => {
    matches.value = event.matches
  }

  const handleChange = (event: MediaQueryListEvent) => {
    updateMatches(event)
  }

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange)
  } else {
    mediaQuery.addListener(handleChange)
  }

  onBeforeUnmount(() => {
    if (typeof mediaQuery.removeEventListener === 'function') {
      mediaQuery.removeEventListener('change', handleChange)
    } else {
      mediaQuery.removeListener(handleChange)
    }
  })

  return readonly(matches)
}

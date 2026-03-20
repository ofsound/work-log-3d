export function useHostShell() {
  const { isDesktop } = useHostRuntime()

  return {
    isDesktop,
    confirm(message: string) {
      if (typeof window !== 'undefined') {
        return window.confirm(message)
      }

      return false
    },
  }
}

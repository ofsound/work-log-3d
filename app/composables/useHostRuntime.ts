import type { DesktopApi } from '~~/shared/worklog'
import { DEFAULT_DESKTOP_CAPABILITIES } from '~~/shared/worklog'

export const getDesktopApi = (
  windowLike: Pick<Window, 'worklogDesktop'> | undefined = typeof window === 'undefined'
    ? undefined
    : window,
): DesktopApi | null => {
  return windowLike?.worklogDesktop ?? null
}

export const getHostCapabilities = (desktopApi: DesktopApi | null = getDesktopApi()) => {
  return desktopApi?.getCapabilities() ?? DEFAULT_DESKTOP_CAPABILITIES
}

export function useHostRuntime() {
  const desktopApi = getDesktopApi()
  const capabilities = getHostCapabilities(desktopApi)

  return {
    capabilities,
    desktopApi,
    hasNativeTimer: capabilities.nativeTimer,
    isDesktop: capabilities.isDesktop,
  }
}

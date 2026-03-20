import type { DesktopApi } from '~/shared/worklog'
import { DEFAULT_DESKTOP_CAPABILITIES } from '~/shared/worklog'
import { getDesktopApi, getHostCapabilities } from '~/app/composables/useHostRuntime'

describe('host runtime adapter', () => {
  it('falls back cleanly when no desktop bridge is present', () => {
    expect(getDesktopApi(undefined)).toBeNull()
    expect(getHostCapabilities(null)).toEqual(DEFAULT_DESKTOP_CAPABILITIES)
  })

  it('uses the desktop bridge when Electron exposes one', () => {
    const desktopApi = {
      getCapabilities: () => ({
        isDesktop: true,
        nativeTimer: true,
        routeRequests: true,
      }),
    } as DesktopApi

    expect(getDesktopApi({ worklogDesktop: desktopApi })).toBe(desktopApi)
    expect(getHostCapabilities(desktopApi)).toEqual({
      isDesktop: true,
      nativeTimer: true,
      routeRequests: true,
    })
  })
})

type NuxtTestMocks = Record<string, unknown>

const getNuxtTestMocks = () => (globalThis as { __nuxtTestMocks?: NuxtTestMocks }).__nuxtTestMocks

const getRequiredMock = <T>(key: string): T => {
  const value = getNuxtTestMocks()?.[key]

  if (!value) {
    throw new Error(`Missing Nuxt test mock: ${key}`)
  }

  return value as T
}

export const definePageMeta = () => {}

export const getCurrentUser = () => getRequiredMock<() => Promise<unknown>>('getCurrentUser')()

export const onBeforeRouteLeave = (guard: unknown) =>
  getNuxtTestMocks()?.onBeforeRouteLeave &&
  (getNuxtTestMocks()?.onBeforeRouteLeave as (nextGuard: unknown) => unknown)(guard)

export const useCurrentUser = () => getRequiredMock<() => { value: unknown }>('useCurrentUser')()

export const useFirebaseAuth = () => getRequiredMock<() => unknown>('useFirebaseAuth')()

export const useRoute = () => getRequiredMock<() => unknown>('useRoute')()

export const useRouter = () => getRequiredMock<() => unknown>('useRouter')()

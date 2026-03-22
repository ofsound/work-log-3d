type NuxtTestMocks = Record<string, unknown>

const getNuxtTestMocks = () => (globalThis as { __nuxtTestMocks?: NuxtTestMocks }).__nuxtTestMocks

const getRequiredMock = <T>(key: string): T => {
  const value = getNuxtTestMocks()?.[key]

  if (!value) {
    throw new Error(`Missing Nuxt test mock: ${key}`)
  }

  return value as T
}

export const defineNuxtRouteMiddleware = <T>(middleware: T) => middleware

export const navigateTo = (...args: unknown[]) =>
  getRequiredMock<(...callArgs: unknown[]) => unknown>('navigateTo')(...args)

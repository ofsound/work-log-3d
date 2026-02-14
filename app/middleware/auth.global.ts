export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const user = await getCurrentUser()
  if (!user) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath },
    })
  }
})

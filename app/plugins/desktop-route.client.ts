export default defineNuxtPlugin(() => {
  const { desktopApi } = useHostRuntime()

  if (!desktopApi) {
    return
  }

  const router = useRouter()

  desktopApi.subscribeToRouteRequest((path) => {
    if (router.currentRoute.value.fullPath === path) {
      return
    }

    void router.push(path)
  })
})

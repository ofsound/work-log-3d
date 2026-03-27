import { createMemoryHistory, createWebHashHistory, createWebHistory } from 'vue-router'
import type { RouterConfig } from 'nuxt/schema'

import { getRouterHistoryMode } from '~/utils/router-history'

export default <RouterConfig>{
  history: (base) => {
    const mode = getRouterHistoryMode({
      isClient: import.meta.client,
      protocol: import.meta.client ? window.location.protocol : null,
    })

    if (mode === 'hash') {
      return createWebHashHistory(base)
    }

    if (mode === 'web') {
      return createWebHistory(base)
    }

    return createMemoryHistory(base)
  },
}

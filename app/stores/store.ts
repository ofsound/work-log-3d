import { defineStore } from 'pinia'

export const useStore = defineStore('store', () => {
  const sortOrderReversed = ref(true)

  return { sortOrderReversed }
})

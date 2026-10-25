// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const hideReports = ref(false)
const isPhoneMode = ref(false)
vi.mock('~/composables/usePhoneMode', () => ({
  usePhoneMode: () => ({ isPhoneMode }),
}))
const { default: HeaderBar } = await import('~/components/HeaderBar.vue')

beforeEach(() => {
  hideReports.value = false
  isPhoneMode.value = false
  vi.stubGlobal('computed', computed)
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('watch', watch)
  vi.stubGlobal('onMounted', onMounted)
  vi.stubGlobal('onBeforeUnmount', onBeforeUnmount)
  vi.stubGlobal('useRoute', () => ({ path: '/sessions', fullPath: '/sessions' }))
  vi.stubGlobal('useMediaQuery', () => ref(false))
  vi.stubGlobal('useUserSettings', () => ({ hideTags: ref(false), hideReports }))
})
afterEach(() => vi.unstubAllGlobals())

it('previews hiding Reports in desktop and collapsed navigation, then restores it', async () => {
  const wrapper = mount(HeaderBar, {
    global: {
      stubs: {
        NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' },
        ThemeSwitcher: true,
      },
    },
  })
  await wrapper.get('[aria-label="Open navigation menu"]').trigger('click')
  expect(wrapper.findAll('a[href="/reports"]')).toHaveLength(2)
  hideReports.value = true
  await nextTick()
  expect(wrapper.findAll('a[href="/reports"]')).toHaveLength(0)
  expect(wrapper.findAll('a[href="/projects"]')).toHaveLength(2)
  hideReports.value = false
  await nextTick()
  expect(wrapper.findAll('a[href="/reports"]')).toHaveLength(2)
  wrapper.unmount()
})

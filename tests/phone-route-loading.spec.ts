// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import PhoneRouteLoading from '~/app/components/PhoneRouteLoading.vue'

describe('PhoneRouteLoading', () => {
  it('renders a quiet placeholder without loading copy', () => {
    const wrapper = mount(PhoneRouteLoading, {
      global: {
        stubs: {
          ContainerCard: {
            template: '<div v-bind="$attrs"><slot /></div>',
          },
        },
      },
    })

    expect(wrapper.find('[data-phone-route-loading]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Loading')
    expect(wrapper.text()).not.toContain('Preparing')
  })
})

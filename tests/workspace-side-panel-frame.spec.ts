// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import ContainerCard from '~/app/components/ContainerCard.vue'
import WorkspaceSidePanelFrame from '~/app/components/WorkspaceSidePanelFrame.vue'

describe('WorkspaceSidePanelFrame', () => {
  it('renders fixed header and subheader slots above a full-width scroll viewport', () => {
    const wrapper = mount(WorkspaceSidePanelFrame, {
      global: {
        components: {
          ContainerCard,
        },
      },
      slots: {
        default: '<div data-test="body">Body</div>',
        header: '<div data-test="header">Header</div>',
        subheader: '<div data-test="subheader">Subheader</div>',
      },
    })

    expect(wrapper.find('[data-test="header"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="subheader"]').exists()).toBe(true)

    const scrollViewport = wrapper.find('.overflow-y-auto.overscroll-contain')
    expect(scrollViewport.exists()).toBe(true)

    const paddedBody = scrollViewport.find('.px-4.pt-4.pb-4')
    expect(paddedBody.exists()).toBe(true)
    expect(paddedBody.find('[data-test="body"]').exists()).toBe(true)
  })

  it('omits the subheader slot and accepts custom body padding classes', () => {
    const wrapper = mount(WorkspaceSidePanelFrame, {
      props: {
        bodyPaddingClass: 'px-4 pb-4',
      },
      global: {
        components: {
          ContainerCard,
        },
      },
      slots: {
        default: '<div data-test="body">Body</div>',
        header: '<div data-test="header">Header</div>',
      },
    })

    expect(wrapper.find('[data-test="subheader"]').exists()).toBe(false)
    expect(wrapper.find('.px-4.pb-4').exists()).toBe(true)
    expect(wrapper.find('.pt-4').exists()).toBe(false)
  })
})

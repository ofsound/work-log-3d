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
    expect(wrapper.find('aside').classes()).not.toContain('px-4')
    expect(wrapper.find('aside').classes()).not.toContain('py-4')

    const scrollViewport = wrapper.find('.overflow-y-auto.overscroll-contain')
    expect(scrollViewport.exists()).toBe(true)
    expect(scrollViewport.classes()).not.toContain('px-4')

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
    expect(wrapper.find('aside').classes()).not.toContain('px-4')
    expect(wrapper.find('aside').classes()).not.toContain('py-4')
    expect(wrapper.find('.overflow-y-auto.overscroll-contain').classes()).not.toContain('px-4')
    expect(wrapper.find('.px-4.pb-4').exists()).toBe(true)
    expect(wrapper.find('.pt-4').exists()).toBe(false)
  })

  it('uses a translucent surface only in overlay mode', () => {
    const wrapper = mount(WorkspaceSidePanelFrame, {
      props: {
        overlay: true,
      },
      global: {
        components: {
          ContainerCard,
        },
      },
      slots: {
        default: '<div data-test="body">Body</div>',
      },
    })

    expect(wrapper.find('aside').classes()).toContain('bg-surface/85')
    expect(wrapper.find('aside').classes()).not.toContain('rounded-none')
    expect(wrapper.find('aside').classes()).not.toContain('bg-surface-strong')
  })
})

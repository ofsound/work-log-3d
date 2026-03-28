// @vitest-environment jsdom

import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'

import WorkspaceSidebarLayout from '~/app/components/WorkspaceSidebarLayout.vue'

describe('WorkspaceSidebarLayout', () => {
  it('renders the shared left rail and independent scroll regions', () => {
    const wrapper = mount(WorkspaceSidebarLayout, {
      props: {
        contentBodyClass: 'px-6 py-4',
        sidebarBodyClass: 'px-4 py-3',
      },
      slots: {
        default: '<div data-test="content">Content</div>',
        sidebar: '<div data-test="sidebar">Sidebar</div>',
      },
    })

    const aside = wrapper.get('aside')
    expect(aside.classes()).toContain('lg:w-[var(--width-workspace-sidebar-rail)]')
    expect(aside.classes()).toContain('max-lg:max-h-[var(--height-workspace-sidebar-mobile-max)]')

    const [sidebarViewport, contentViewport] = wrapper.findAll('.overscroll-contain')
    expect(sidebarViewport).toBeDefined()
    expect(contentViewport).toBeDefined()
    expect(sidebarViewport?.classes()).toContain('overflow-y-auto')
    expect(sidebarViewport?.classes()).toContain('px-4')
    expect(contentViewport?.classes()).toContain('overflow-auto')
    expect(contentViewport?.classes()).toContain('px-6')
    expect(wrapper.get('[data-test="sidebar"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="content"]').exists()).toBe(true)
  })

  it('pins the optional footer below the sidebar scroll viewport', () => {
    const wrapper = mount(WorkspaceSidebarLayout, {
      props: {
        sidebarFooterClass: 'px-5 pb-4',
      },
      slots: {
        default: '<div>Content</div>',
        sidebar: '<div>Sidebar</div>',
        sidebarFooter: '<div data-test="footer">Footer</div>',
      },
    })

    const footer = wrapper.get('[data-test="footer"]')
    expect(footer.text()).toBe('Footer')
    expect(footer.element.parentElement?.className).toContain('px-5')
    expect(wrapper.findAll('.overscroll-contain')).toHaveLength(2)
  })

  it('scrolls the content column to the top when contentScrollResetKey changes', async () => {
    const wrapper = mount(WorkspaceSidebarLayout, {
      props: {
        contentScrollResetKey: 'report-a',
      },
      slots: {
        default: '<div style="height: 800px" data-test="tall">Content</div>',
        sidebar: '<div>Sidebar</div>',
      },
    })

    const [, contentViewport] = wrapper.findAll('.overscroll-contain')
    const el = contentViewport!.element as HTMLElement
    el.scrollTop = 200

    await wrapper.setProps({ contentScrollResetKey: 'report-b' })
    await nextTick()
    await nextTick()

    expect(el.scrollTop).toBe(0)
  })
})

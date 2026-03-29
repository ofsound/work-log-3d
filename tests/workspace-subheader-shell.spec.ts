// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import WorkspaceSubheaderShell from '~/app/components/WorkspaceSubheaderShell.vue'
import {
  WORKSPACE_SUBHEADER_LAYOUT_CLASS_NAMES,
  WORKSPACE_SUBHEADER_VARIANT_CLASS_NAMES,
} from '~/app/utils/workspace-subheader'

describe('WorkspaceSubheaderShell', () => {
  it('applies the neutral surface variant and fluid inner layout', () => {
    const wrapper = mount(WorkspaceSubheaderShell, {
      props: {
        layout: 'fluid',
        variant: 'neutral',
      },
      slots: {
        default: '<div data-test="content">Header</div>',
      },
    })

    for (const token of WORKSPACE_SUBHEADER_VARIANT_CLASS_NAMES.neutral.split(' ')) {
      expect(wrapper.classes()).toContain(token)
    }

    const inner = wrapper.get('[data-testid="workspace-subheader-inner"]')
    expect(inner.classes()).toContain('px-6')
    expect(inner.classes()).toContain('sm:px-[var(--spacing-workspace-subheader-x)]')
    for (const token of WORKSPACE_SUBHEADER_LAYOUT_CLASS_NAMES.fluid.split(' ')) {
      expect(inner.classes()).toContain(token)
    }
    expect(inner.find('[data-test="content"]').exists()).toBe(true)
  })

  it('applies the project surface variant, content layout, footer slot, and surface style', () => {
    const wrapper = mount(WorkspaceSubheaderShell, {
      props: {
        layout: 'content',
        surfaceStyle: {
          color: 'rgb(255, 255, 255)',
        },
        variant: 'project',
      },
      slots: {
        default: '<div data-test="content">Header</div>',
        footer: '<div data-test="footer">Footer</div>',
      },
    })

    for (const token of WORKSPACE_SUBHEADER_VARIANT_CLASS_NAMES.project.split(' ')) {
      expect(wrapper.classes()).toContain(token)
    }

    const inner = wrapper.get('[data-testid="workspace-subheader-inner"]')
    expect(inner.classes()).toContain('px-6')
    expect(inner.classes()).toContain('sm:px-[var(--spacing-workspace-subheader-x)]')
    for (const token of WORKSPACE_SUBHEADER_LAYOUT_CLASS_NAMES.content.split(' ')) {
      expect(inner.classes()).toContain(token)
    }

    expect(wrapper.attributes('style')).toContain('color: rgb(255, 255, 255)')
    expect(wrapper.find('[data-test="footer"]').exists()).toBe(true)
  })
})

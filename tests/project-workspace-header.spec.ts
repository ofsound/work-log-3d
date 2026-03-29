// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import ProjectWorkspaceHeader from '~/app/components/ProjectWorkspaceHeader.vue'
import { WORKSPACE_SUBHEADER_VARIANT_CLASS_NAMES } from '~/app/utils/workspace-subheader'

describe('ProjectWorkspaceHeader', () => {
  it('renders the shared project shell, badges, and tabs', async () => {
    const wrapper = mount(ProjectWorkspaceHeader, {
      props: {
        activeMode: 'calendar',
        badges: [
          { label: '12.0 hrs', style: { backgroundColor: 'rgb(37, 99, 235)' } },
          { label: '8 sessions', variant: 'outline' },
        ],
        headerStyle: {
          color: 'rgb(248, 250, 252)',
        },
        tabs: [
          { id: 'list', label: 'List' },
          { id: 'calendar', label: 'Calendar' },
          { id: 'edit', label: 'Edit' },
        ],
        title: 'Client Portal',
      },
    })

    for (const token of WORKSPACE_SUBHEADER_VARIANT_CLASS_NAMES.project.split(' ')) {
      expect(wrapper.classes()).toContain(token)
    }

    expect(wrapper.text()).toContain('Client Portal')
    expect(wrapper.text()).toContain('12.0 hrs')
    expect(wrapper.text()).toContain('8 sessions')
    expect(wrapper.attributes('style')).toContain('color: rgb(248, 250, 252)')

    const buttons = wrapper.findAll('button')
    expect(buttons.map((button) => button.text())).toEqual(['List', 'Calendar', 'Edit'])

    await buttons[2]!.trigger('click')

    expect(wrapper.emitted('select-mode')).toEqual([['edit']])
  })

  it('supports opt-in compact mobile title and badge treatments without changing defaults', () => {
    const wrapper = mount(ProjectWorkspaceHeader, {
      props: {
        badges: [
          {
            compactBelowSm: true,
            label: '12.0 hrs',
            style: { backgroundColor: 'rgb(37, 99, 235)' },
          },
          {
            compactBelowSm: true,
            label: '8 sessions',
            variant: 'outline',
          },
          {
            hideBelowSm: true,
            label: 'Last activity Mar 24, 2026',
            variant: 'outline',
          },
        ],
        compactTitleBelowSm: true,
        title: 'Client Portal',
      },
    })

    const title = wrapper.get('[data-testid="project-workspace-header-title"]')
    expect(title.classes()).toContain('text-xl')
    expect(title.classes()).toContain('sm:text-3xl')

    const badges = wrapper.findAll('[data-testid="project-workspace-header-badge"]')
    expect(badges).toHaveLength(3)
    expect(badges[0]!.classes()).toContain('px-2')
    expect(badges[0]!.classes()).toContain('text-xs')
    expect(badges[0]!.classes()).toContain('sm:text-sm')
    expect(badges[1]!.classes()).toContain('px-2')
    expect(badges[1]!.classes()).toContain('text-xs')
    expect(badges[2]!.classes()).toContain('hidden')
    expect(badges[2]!.classes()).toContain('sm:block')
  })
})

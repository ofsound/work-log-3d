// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import AppSegmentedControl from '~/app/components/AppSegmentedControl.vue'

const items = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
]

describe('AppSegmentedControl', () => {
  it('renders items and emits the selected id', async () => {
    const wrapper = mount(AppSegmentedControl, {
      props: {
        activeId: 'day',
        ariaLabel: 'Sessions view modes',
        items,
      },
    })

    const buttons = wrapper.findAll('button')

    expect(wrapper.attributes('aria-label')).toBe('Sessions view modes')
    expect(buttons.map((button) => button.text())).toEqual(['Day', 'Week'])

    await buttons[1]!.trigger('click')

    expect(wrapper.emitted('select')).toEqual([['week']])
  })

  it('applies active and inactive large-size classes', () => {
    const wrapper = mount(AppSegmentedControl, {
      props: {
        activeId: 'day',
        items,
        size: 'large',
      },
    })

    const buttons = wrapper.findAll('button')
    const activeButton = buttons[0]!
    const inactiveButton = buttons[1]!

    expect(wrapper.classes()).toContain('rounded-xl')
    expect(wrapper.classes()).toContain('p-1')
    expect(activeButton.classes()).toContain('rounded-lg')
    expect(activeButton.classes()).toContain('px-4')
    expect(activeButton.classes()).toContain('py-2')
    expect(activeButton.classes()).toContain('text-sm')
    expect(activeButton.classes()).toContain(
      'bg-[light-dark(color-mix(in_srgb,var(--color-surface)_74%,var(--color-header)_26%),color-mix(in_srgb,var(--color-header)_92%,var(--color-black)_8%))]',
    )
    expect(activeButton.classes()).toContain(
      'text-[light-dark(var(--color-zinc-900),var(--color-zinc-100))]',
    )
    expect(activeButton.attributes('aria-pressed')).toBe('true')
    expect(inactiveButton.classes()).toContain('text-text-muted')
    expect(inactiveButton.classes()).toContain(
      'hover:bg-[linear-gradient(135deg,_color-mix(in_srgb,var(--color-surface-strong)_96%,var(--color-header)_4%),_color-mix(in_srgb,var(--color-surface-strong)_92%,var(--color-header)_8%))]',
    )
    expect(inactiveButton.attributes('aria-pressed')).toBe('false')
  })

  it('applies medium-size classes', () => {
    const wrapper = mount(AppSegmentedControl, {
      props: {
        activeId: 'week',
        items,
        size: 'medium',
      },
    })

    const activeButton = wrapper.findAll('button')[1]!

    expect(wrapper.classes()).toContain('rounded-lg')
    expect(wrapper.classes()).toContain('p-0.5')
    expect(activeButton.classes()).toContain('rounded-md')
    expect(activeButton.classes()).toContain('px-3')
    expect(activeButton.classes()).toContain('py-1.5')
    expect(activeButton.classes()).toContain('text-xs')
  })
})

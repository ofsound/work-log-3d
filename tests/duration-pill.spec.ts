// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import DurationPill from '~/app/components/DurationPill.vue'

describe('DurationPill', () => {
  it('renders summary duration pills with decimal hours formatting', () => {
    const wrapper = mount(DurationPill, {
      props: {
        minutes: 3970,
      },
    })

    expect(wrapper.text()).toBe('66.16 hrs')
    expect(wrapper.classes()).toContain('bg-badge-duration')
    expect(wrapper.classes()).toContain('rounded-lg')
  })

  it('renders compact neutral pills with rounded hours formatting', () => {
    const wrapper = mount(DurationPill, {
      props: {
        format: 'hours-rounded',
        minutes: 95,
        tone: 'neutral',
        variant: 'compact',
      },
    })

    expect(wrapper.text()).toBe('2 hrs')
    expect(wrapper.classes()).toContain('rounded-full')
    expect(wrapper.classes()).toContain('border')
    expect(wrapper.classes()).toContain('text-text')
  })

  it('renders compact project pills with minute formatting and forwarded styles', () => {
    const wrapper = mount(DurationPill, {
      props: {
        format: 'minutes',
        minutes: 45,
        style: {
          backgroundColor: 'rgb(37, 99, 235)',
        },
        tone: 'project',
        variant: 'compact',
      },
    })

    expect(wrapper.text()).toBe('45m')
    expect(wrapper.attributes('style')).toContain('background-color: rgb(37, 99, 235)')
  })

  it('handles zero, sub-hour, and exact-hour values consistently', () => {
    expect(mount(DurationPill, { props: { minutes: 0 } }).text()).toBe('0 hrs')
    expect(mount(DurationPill, { props: { minutes: 15 } }).text()).toBe('.25 hrs')
    expect(mount(DurationPill, { props: { minutes: 120 } }).text()).toBe('2 hrs')
  })
})

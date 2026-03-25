// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import ContainerCard from '~/app/components/ContainerCard.vue'
import {
  CONTAINER_CARD_PADDING_CLASS_NAMES,
  CONTAINER_CARD_SELECTED_CLASS_NAME,
  CONTAINER_CARD_SELECTED_RING_ONLY_CLASS_NAME,
  CONTAINER_CARD_VARIANT_CLASS_NAMES,
  getContainerCardClassName,
} from '~/app/utils/container-card'

describe('ContainerCard', () => {
  it('renders the configured semantic root tag', () => {
    const wrapper = mount(ContainerCard, {
      props: {
        as: 'section',
      },
      slots: {
        default: 'Card body',
      },
    })

    expect(wrapper.element.tagName).toBe('SECTION')
    expect(wrapper.text()).toContain('Card body')
  })

  it('applies every semantic variant from the central registry', () => {
    for (const [variant, className] of Object.entries(CONTAINER_CARD_VARIANT_CLASS_NAMES)) {
      const wrapper = mount(ContainerCard, {
        props: {
          variant: variant as keyof typeof CONTAINER_CARD_VARIANT_CLASS_NAMES,
        },
      })

      for (const token of className.split(' ')) {
        expect(wrapper.classes()).toContain(token)
      }
    }
  })

  it('applies every padding option from the central registry', () => {
    for (const [padding, className] of Object.entries(CONTAINER_CARD_PADDING_CLASS_NAMES)) {
      const wrapper = mount(ContainerCard, {
        props: {
          padding: padding as keyof typeof CONTAINER_CARD_PADDING_CLASS_NAMES,
        },
      })

      for (const token of className.split(' ')) {
        expect(wrapper.classes()).toContain(token)
      }
    }
  })

  it('applies padding, interactive, and selected state classes', () => {
    const wrapper = mount(ContainerCard, {
      props: {
        interactive: true,
        padding: 'comfortable',
        selected: true,
      },
    })

    for (const token of CONTAINER_CARD_PADDING_CLASS_NAMES.comfortable.split(' ')) {
      expect(wrapper.classes()).toContain(token)
    }

    for (const token of CONTAINER_CARD_SELECTED_CLASS_NAME.split(' ')) {
      expect(wrapper.classes()).toContain(token)
    }

    expect(wrapper.classes()).toContain('cursor-pointer')
    expect(wrapper.classes()).toContain('hover:brightness-[1.02]')
  })

  it('flat surface omits panel shadows and hover shadow lift while keeping selection ring', () => {
    const unselected = mount(ContainerCard, {
      props: {
        flatSurface: true,
        interactive: true,
        variant: 'default',
      },
    })
    const unselectedClass = unselected.classes().join(' ')
    expect(unselectedClass).toContain('shadow-none')
    expect(unselectedClass).not.toMatch(/\bshadow-panel\b/)
    expect(unselectedClass).not.toMatch(/hover:shadow/)

    const selected = mount(ContainerCard, {
      props: {
        flatSurface: true,
        selected: true,
        variant: 'muted',
      },
    })
    for (const token of CONTAINER_CARD_SELECTED_RING_ONLY_CLASS_NAME.split(' ')) {
      expect(selected.classes()).toContain(token)
    }
    expect(selected.classes()).not.toContain('shadow-panel-selected')
  })

  it('getContainerCardClassName flat surface strips shadow tokens from variants', () => {
    const flat = getContainerCardClassName({ flatSurface: true, variant: 'default' })
    expect(flat).toContain('shadow-none')
    expect(flat).not.toContain('shadow-panel')
  })

  it('passes through attrs, classes, and inline styles to the root element', () => {
    const wrapper = mount(ContainerCard, {
      attrs: {
        class: 'custom-card px-9',
        'data-test': 'container-card',
        id: 'settings-card',
        style: '--card-accent: #123456;',
        type: 'button',
      },
      props: {
        as: 'button',
      },
    })

    expect(wrapper.attributes('data-test')).toBe('container-card')
    expect(wrapper.attributes('id')).toBe('settings-card')
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.attributes('style')).toContain('--card-accent: #123456')
    expect(wrapper.classes()).toContain('custom-card')
    expect(wrapper.classes()).toContain('px-9')
  })
})

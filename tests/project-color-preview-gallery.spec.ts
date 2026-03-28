// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import ContainerCard from '~/app/components/ContainerCard.vue'
import ProjectColorPreviewGallery from '~/app/components/ProjectColorPreviewGallery.vue'

describe('ProjectColorPreviewGallery', () => {
  it('renders each preview slice with prop-driven anchors', () => {
    const name = 'Client Portal'
    const notes = 'Private working notes'

    const wrapper = mount(ProjectColorPreviewGallery, {
      global: {
        components: {
          ContainerCard,
        },
      },
      props: {
        colors: {
          primary: '#2563eb',
          secondary: '#0e7490',
        },
        name,
        notes,
      },
    })

    expect(wrapper.get('[data-test="preview-section-workspace-header"]').text()).toContain(name)
    expect(wrapper.get('[data-test="preview-section-cards-rows"]').text()).toContain(notes)
    expect(wrapper.get('[data-test="preview-section-calendar-density"]').text()).toContain(name)
    expect(wrapper.get('[data-test="preview-section-support-usage"]').text()).toContain(
      `Project: ${name}`,
    )
    expect(wrapper.get('[data-test="preview-section-selection-states"]').text()).toContain(name)
    expect(wrapper.get('[data-test="preview-section-minimal-scale"]').text()).toContain('45m')
  })
})

// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import ContainerCard from '~/app/components/ContainerCard.vue'
import ProjectColorPreviewGallery from '~/app/components/ProjectColorPreviewGallery.vue'

describe('ProjectColorPreviewGallery', () => {
  it('renders the full set of representative project color usage families', () => {
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
        name: 'Client Portal',
        notes: 'Private working notes',
      },
    })

    expect(wrapper.get('[data-test="preview-section-workspace-header"]').text()).toContain(
      'ProjectWorkspaceHeader',
    )
    expect(wrapper.get('[data-test="preview-section-cards-rows"]').text()).toContain(
      'ProjectsManagerProject',
    )
    expect(wrapper.get('[data-test="preview-section-calendar-density"]').text()).toContain(
      'SessionsMonthView',
    )
    expect(wrapper.get('[data-test="preview-section-support-usage"]').text()).toContain(
      'SessionListFilterPanel',
    )
    expect(wrapper.get('[data-test="preview-section-selection-states"]').text()).toContain(
      'TimeBoxEditor',
    )
    expect(wrapper.get('[data-test="preview-section-minimal-scale"]').text()).toContain(
      'Minimal scale check',
    )
    expect(wrapper.text()).toContain('Secondary accent text')
    expect(wrapper.text()).toContain('Selected uses the full gradient.')
    expect(wrapper.text()).toContain('45m')
  })
})

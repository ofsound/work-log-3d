// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import AppButton from '~/app/components/AppButton.vue'
import ContainerCard from '~/app/components/ContainerCard.vue'
import ProjectEditorFormLayout from '~/app/components/ProjectEditorFormLayout.vue'

describe('ProjectEditorFormLayout', () => {
  it('renders preview, context, and warning cards for the project editor workspace', async () => {
    const wrapper = mount(ProjectEditorFormLayout, {
      global: {
        components: {
          AppButton,
          ContainerCard,
        },
      },
      props: {
        contextSummary: {
          lastSession: new Date('2026-03-23T12:00:00.000Z'),
          sessionCount: 7,
          totalDurationLabel: '12.5',
        },
        heading: 'Edit Project',
        lowContrastWarning: true,
        name: 'Client Portal',
        notes: 'Private working notes',
        previewBadgeStyle: {
          backgroundColor: '#123456',
          color: '#ffffff',
        },
        previewHeaderStyle: {
          backgroundColor: '#234567',
          color: '#ffffff',
        },
        previewSurfaceStyle: {
          backgroundColor: '#f8fafc',
        },
        primaryColor: '#2563eb',
        secondaryColor: '#06b6d4',
        submitLabel: 'Save project',
      },
    })

    expect(wrapper.text()).toContain('Edit Project')
    expect(wrapper.text()).toContain('Project context')
    expect(wrapper.text()).toContain('This color pairing may reduce contrast')

    const cancelButton = wrapper
      .findAll('button')
      .find((buttonWrapper) => buttonWrapper.text() === 'Cancel')

    expect(cancelButton).toBeDefined()

    await cancelButton!.trigger('click')

    expect(wrapper.emitted('cancel')).toEqual([[]])
  })
})

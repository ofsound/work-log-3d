// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import AppButton from '~/app/components/AppButton.vue'
import AppField from '~/app/components/AppField.vue'
import AppFieldLabel from '~/app/components/AppFieldLabel.vue'
import AppTextInput from '~/app/components/AppTextInput.vue'
import AppTextarea from '~/app/components/AppTextarea.vue'
import ContainerCard from '~/app/components/ContainerCard.vue'
import ProjectEditorFormLayout from '~/app/components/ProjectEditorFormLayout.vue'

describe('ProjectEditorFormLayout', () => {
  it('renders preview content and explicit color-rule messaging for the project editor workspace', async () => {
    const wrapper = mount(ProjectEditorFormLayout, {
      global: {
        components: {
          AppButton,
          AppField,
          AppFieldLabel,
          AppTextInput,
          AppTextarea,
          ContainerCard,
        },
      },
      props: {
        colorValidationMessages: [
          'Secondary color must keep shared text readable across project gradients.',
        ],
        heading: 'Edit Project',
        name: 'Client Portal',
        notes: 'Private working notes',
        previewColors: {
          primary: '#2563eb',
          secondary: '#0e7490',
        },
        primaryColor: '#2563eb',
        secondaryColor: '#0e7490',
        submitLabel: 'Save project',
      },
    })

    expect(wrapper.text()).toContain('Edit Project')
    expect(wrapper.text()).toContain('Internal notes')
    expect(wrapper.text()).toContain('Color rules block saving')
    expect(wrapper.text()).toContain('Badges always use white text')
    expect(wrapper.text()).toContain('shared text readable across project gradients')
    expect(wrapper.text()).toContain('Live project color preview')
    expect(wrapper.text()).toContain('Workspace header')
    expect(wrapper.text()).toContain('Selection states')
    expect(wrapper.text()).toContain('Sources: ProjectWorkspaceHeader, ProjectOverview')
    expect(wrapper.text()).not.toContain('This color pairing may reduce contrast')

    const cancelButton = wrapper
      .findAll('button')
      .find((buttonWrapper) => buttonWrapper.text() === 'Cancel')

    expect(cancelButton).toBeDefined()

    await cancelButton!.trigger('click')

    expect(wrapper.emitted('cancel')).toEqual([[]])
  })
})

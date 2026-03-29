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
  it('renders keyed regions, surfaces color-rule messages, and emits cancel', async () => {
    const heading = 'Edit Project'
    const name = 'Client Portal'
    const notes = 'Private working notes'
    const colorMessage = 'Secondary color must keep shared text readable across project gradients.'

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
        colorValidationMessages: [colorMessage],
        heading,
        name,
        notes,
        primaryColor: '#2563eb',
        secondaryColor: '#0e7490',
        submitLabel: 'Save project',
      },
    })

    expect(wrapper.get('[data-test="project-editor-heading"]').text()).toContain(heading)
    expect(wrapper.find('[data-test="project-editor-gradient-preview"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="project-editor-notes"]').text()).toContain('Internal notes')
    expect(wrapper.get('[data-test="project-editor-color-rules"]').text()).toContain(colorMessage)
    expect(wrapper.get('[data-test="project-editor-inline-actions"]').exists()).toBe(true)

    const cancelButton = wrapper
      .findAll('button')
      .find((buttonWrapper) => buttonWrapper.text() === 'Cancel')

    expect(cancelButton).toBeDefined()

    await cancelButton!.trigger('click')

    expect(wrapper.emitted('cancel')).toEqual([[]])
  })

  it('shows the gradient preview when color validation is clear', () => {
    const name = 'Client Portal'

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
        colorValidationMessages: [],
        heading: 'Edit Project',
        name,
        notes: 'Private working notes',
        primaryColor: '#2563eb',
        secondaryColor: '#0e7490',
        submitLabel: 'Save project',
      },
    })

    expect(wrapper.get('[data-test="project-editor-gradient-preview"]').text()).toContain(name)
    expect(wrapper.find('[data-test="project-editor-color-rules"]').exists()).toBe(false)
  })

  it('can hide the inline action row when a workspace renders persistent footer actions', () => {
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
        heading: 'Edit Project',
        name: 'Client Portal',
        notes: 'Private working notes',
        primaryColor: '#2563eb',
        secondaryColor: '#0e7490',
        showInlineActions: false,
        submitLabel: 'Save project',
      },
    })

    expect(wrapper.find('[data-test="project-editor-inline-actions"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Cancel')
  })
})

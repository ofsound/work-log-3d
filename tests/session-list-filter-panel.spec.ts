// @vitest-environment jsdom

import { mount } from '@vue/test-utils'

import SessionListFilterPanel from '~/app/components/SessionListFilterPanel.vue'

describe('SessionListFilterPanel', () => {
  it('keeps the scroll viewport flush while applying horizontal padding to inner content', () => {
    const wrapper = mount(SessionListFilterPanel, {
      props: {
        filters: {
          query: '',
          projectIds: [],
          tagIds: [],
          tagMode: 'any',
          dateStart: '',
          dateEnd: '',
          minMinutes: null,
          maxMinutes: null,
          untaggedOnly: false,
          notesState: 'any',
          sort: 'newest',
        },
        projects: [],
        tags: [],
      },
      global: {
        stubs: {
          AppButton: true,
          AppField: true,
          AppSelect: true,
          AppTextInput: true,
          ContainerCard: true,
          SessionListMultiSelect: true,
        },
      },
      shallow: true,
    })

    const scrollViewport = wrapper.find('.overflow-y-auto.overscroll-contain')
    expect(scrollViewport.exists()).toBe(true)
    expect(scrollViewport.classes()).not.toContain('px-4')
    expect(scrollViewport.classes()).toContain('py-5')

    const paddedContent = scrollViewport.find('.flex.min-w-0.flex-col.gap-5.px-4')
    expect(paddedContent.exists()).toBe(true)
  })
})

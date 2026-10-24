// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

import ProjectPicker from '~/components/ProjectPicker.vue'

const projects = [
  {
    id: 'one',
    name: 'Client Portal Redesign',
    colors: { primary: '#123456', secondary: '#abcdef' },
  },
  { id: 'two', name: 'Internal Reporting', colors: { primary: '#345678', secondary: '#fedcba' } },
]

const mountPicker = () =>
  mount(ProjectPicker, {
    attachTo: document.body,
    props: { modelValue: 'two', projects },
  })
const input = () => document.querySelector<HTMLInputElement>('[role="combobox"]')!
const search = async (query: string) => {
  input().value = query
  input().dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}
const press = async (key: string) => {
  input().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }))
  await nextTick()
}

beforeEach(() => {
  // jsdom does not implement the native dialog lifecycle/focus behavior yet.
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function () {
    this.open = false
  }
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('project picker', () => {
  it('opens focused Spotlight search and selects a ranked match by keyboard', async () => {
    const wrapper = mountPicker()
    expect(wrapper.text()).toContain('Internal Reporting')
    await wrapper.get('button[aria-haspopup="dialog"]').trigger('click')
    expect(document.querySelector('dialog')?.getAttribute('aria-modal')).toBe('true')
    expect(document.activeElement).toBe(input())
    await search('red cli')
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(1)
    await press('Enter')
    expect(wrapper.emitted('update:modelValue')).toEqual([['one']])
    expect(document.querySelector('dialog')?.open).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('button').element)
    wrapper.unmount()
  })

  it('browses all projects, marks the current project and allows pointer selection', async () => {
    const wrapper = mountPicker()
    await wrapper.get('button').trigger('click')
    expect(wrapper.find('[aria-label="Browse projects"]').exists()).toBe(false)
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(2)
    expect(document.querySelector('[aria-selected="true"]')?.textContent).toContain(
      'Internal Reporting',
    )
    ;(document.querySelector('[role="option"]') as HTMLElement).click()
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toEqual([['one']])
    wrapper.unmount()
  })

  it('navigates results with arrows and Enter', async () => {
    const wrapper = mountPicker()
    await wrapper.get('button').trigger('click')
    await search('client')
    await search('')
    await press('ArrowDown')
    expect(input().getAttribute('aria-activedescendant')).toMatch(/option-1$/)
    await press('Enter')
    expect(wrapper.emitted('update:modelValue')).toEqual([['two']])
    wrapper.unmount()
  })

  it('consumes Escape before editor handlers without changing selection', async () => {
    const wrapper = mountPicker()
    const editorHandler = vi.fn()
    window.addEventListener('keydown', editorHandler, { capture: true })
    await wrapper.get('button').trigger('click')
    await search('client')
    await press('Escape')
    expect(document.querySelector('dialog')?.open).toBe(false)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(editorHandler).not.toHaveBeenCalled()
    window.removeEventListener('keydown', editorHandler, { capture: true })
    wrapper.unmount()
  })

  it('does not select anything when no results match or during IME composition', async () => {
    const wrapper = mountPicker()
    await wrapper.get('button').trigger('click')
    input().dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }),
    )
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await search('zzzzzz')
    await press('ArrowDown')
    await press('Enter')
    expect(document.querySelector('[role="status"]')?.textContent).toContain('No matching projects')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(document.querySelector('dialog')?.open).toBe(true)
    wrapper.unmount()
  })

  it('dismisses search on backdrop click and resets the query on reopening', async () => {
    const wrapper = mountPicker()
    await wrapper.get('button').trigger('click')
    await search('client')
    document.querySelector('dialog')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()
    expect(document.querySelector('dialog')?.open).toBe(false)
    await wrapper.get('button').trigger('click')
    expect(input().value).toBe('')
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(2)
    wrapper.unmount()
  })
})

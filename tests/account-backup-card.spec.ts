// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import AccountBackupCard from '~/app/components/AccountBackupCard.vue'
import AppButton from '~/app/components/AppButton.vue'
import ContainerCard from '~/app/components/ContainerCard.vue'

const exportBackup = vi.fn()
const isExporting = ref(false)
const exportMessage = ref('')
const exportErrorMessage = ref('')

vi.mock('~/composables/useAccountBackup', () => ({
  useAccountBackup: () => ({
    exportBackup,
    exportErrorMessage,
    exportMessage,
    isExporting,
  }),
}))

describe('account backup card', () => {
  beforeEach(() => {
    exportBackup.mockReset()
    isExporting.value = false
    exportMessage.value = ''
    exportErrorMessage.value = ''
  })

  it('explains and starts the portable account export', async () => {
    const wrapper = mount(AccountBackupCard, {
      global: {
        components: {
          AppButton,
          ContainerCard,
        },
      },
    })

    expect(wrapper.text()).toContain('Data backup')
    expect(wrapper.text()).toContain('portable JSON copy')
    expect(wrapper.text()).toContain('Login credentials are never included')

    await wrapper.get('button').trigger('click')

    expect(exportBackup).toHaveBeenCalledOnce()
  })

  it('shows progress and export feedback', async () => {
    isExporting.value = true
    exportMessage.value = 'Backup downloaded.'
    const wrapper = mount(AccountBackupCard, {
      global: {
        components: {
          AppButton,
          ContainerCard,
        },
      },
    })

    expect(wrapper.get('button').text()).toContain('Preparing backup')
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Backup downloaded.')

    exportMessage.value = ''
    exportErrorMessage.value = 'Unable to export.'
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Unable to export.')
  })
})

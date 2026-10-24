// @vitest-environment jsdom

import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

import { useMinuteVerticalDrag } from '~/composables/useMinuteVerticalDrag'

it('rolls back a continuously edited value on pointer cancellation and cleans up listeners', () => {
  let value = 30
  let drag!: ReturnType<typeof useMinuteVerticalDrag>
  const onSessionEnd = vi.fn()
  const wrapper = mount(
    defineComponent({
      setup() {
        drag = useMinuteVerticalDrag({
          onSessionStart: () => {},
          onDrag: (delta) => {
            value = 30 + delta
          },
          onSessionEnd,
        })
        return () => null
      },
    }),
  )
  drag.onPointerDown(
    new MouseEvent('pointerdown', { button: 0, clientY: 100 }) as unknown as PointerEvent,
  )
  window.dispatchEvent(new MouseEvent('pointermove', { clientY: 70 }))
  expect(value).toBe(35)
  window.dispatchEvent(new MouseEvent('pointercancel', { clientY: 0 }))
  expect(value).toBe(30)
  expect(onSessionEnd).toHaveBeenCalledExactlyOnceWith({
    deltaMinutes: 0,
    didDragBeyondThreshold: false,
  })
  expect(drag.pointerSessionActive.value).toBe(false)
  window.dispatchEvent(new MouseEvent('pointerup', { clientY: 0 }))
  expect(onSessionEnd).toHaveBeenCalledTimes(1)
  wrapper.unmount()
})

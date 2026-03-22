import { getRouterHistoryMode } from '~/app/utils/router-history'

describe('router history mode', () => {
  it('uses memory history during non-client rendering', () => {
    expect(getRouterHistoryMode({ isClient: false, protocol: 'file:' })).toBe('memory')
  })

  it('uses hash history for packaged desktop file URLs', () => {
    expect(getRouterHistoryMode({ isClient: true, protocol: 'file:' })).toBe('hash')
  })

  it('uses web history for browser protocols', () => {
    expect(getRouterHistoryMode({ isClient: true, protocol: 'https:' })).toBe('web')
    expect(getRouterHistoryMode({ isClient: true, protocol: 'http:' })).toBe('web')
  })
})

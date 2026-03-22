export type RouterHistoryMode = 'hash' | 'memory' | 'web'

interface RouterHistoryModeOptions {
  isClient: boolean
  protocol?: string | null
}

export const getRouterHistoryMode = ({
  isClient,
  protocol,
}: RouterHistoryModeOptions): RouterHistoryMode => {
  if (!isClient) {
    return 'memory'
  }

  return protocol === 'file:' ? 'hash' : 'web'
}

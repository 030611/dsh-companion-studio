import { describe, expect, it, vi } from 'vitest'
import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { bindObservableSnapshot } from '../src/client/CompanionOverlay.tsx'

describe('bindObservableSnapshot', () => {
  it('preserves the receiver for host observable methods', () => {
    const listener = vi.fn()
    class ReceiverAwareSource implements ObservableSnapshot<string> {
      value = 'ready'

      getSnapshot() {
        return this.value
      }

      subscribe(callback: () => void) {
        expect(this.value).toBe('ready')
        callback()
        return () => {}
      }
    }
    const source = new ReceiverAwareSource()

    const bound = bindObservableSnapshot(source)

    expect(bound.getSnapshot()).toBe('ready')
    bound.subscribe(listener)
    expect(listener).toHaveBeenCalledOnce()
  })
})

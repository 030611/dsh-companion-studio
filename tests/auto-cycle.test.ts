import { describe, expect, it } from 'vitest'
import { AUTO_CYCLE_INTERVAL_MS, nextCycleId } from '../src/client/auto-cycle.ts'

describe('hourly companion variation', () => {
  it('uses a real one-hour interval', () => {
    expect(AUTO_CYCLE_INTERVAL_MS).toBe(3_600_000)
  })

  it('cycles through outfits and wraps safely', () => {
    const outfits = ['maid', 'reception', 'evening']
    expect(nextCycleId(outfits, 'maid')).toBe('reception')
    expect(nextCycleId(outfits, 'evening')).toBe('maid')
    expect(nextCycleId(outfits, 'missing')).toBe('maid')
    expect(nextCycleId([], 'missing')).toBeUndefined()
  })
})

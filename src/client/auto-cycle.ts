export const AUTO_CYCLE_INTERVAL_MS = 60 * 60 * 1000

/** Return the next stable item, wrapping to the beginning when needed. */
export function nextCycleId(ids: readonly string[], currentId: string): string | undefined {
  if (ids.length === 0) return undefined
  const index = ids.indexOf(currentId)
  return ids[(index + 1) % ids.length]
}

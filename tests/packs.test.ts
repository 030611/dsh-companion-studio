import { describe, expect, it } from 'vitest'
import {
  BUILTIN_PACKS,
  getCompanionPackRegistry,
  registerCompanionPack,
  validateCompanionPack,
  type CompanionPack,
} from '../src/client/packs.ts'

const externalPack: CompanionPack = {
  schemaVersion: 1,
  id: 'community.mechanical-otter',
  version: '1.0.0',
  name: '机械海獭',
  characterName: '栎栎',
  author: 'Example author',
  license: 'MIT',
  glyph: '🦦',
  palette: { primary: '#8b5b36', secondary: '#fff7e8', glow: '#70d8d1' },
  outfits: [{ id: 'workshop', name: '工坊服', accent: '#8b5b36' }],
  defaultOutfitId: 'workshop',
}

describe('companion pack registry', () => {
  it('ships one license-safe metadata placeholder without bundled art', () => {
    expect(BUILTIN_PACKS).toHaveLength(1)
    expect(BUILTIN_PACKS[0]).toMatchObject({
      id: 'studio.xingxi',
      characterName: '星汐',
      defaultOutfitId: 'tide-explorer',
    })
    expect(BUILTIN_PACKS[0]?.animations).toBeUndefined()
    expect(BUILTIN_PACKS[0]?.outfits.every(outfit => outfit.animations === undefined)).toBe(true)
  })

  it('publishes independently installed packs and removes only its own registration', () => {
    const registry = getCompanionPackRegistry()
    const before = registry.getSnapshot().revision
    const dispose = registerCompanionPack(externalPack)
    expect(registry.getSnapshot().packs.some(pack => pack.id === externalPack.id)).toBe(true)
    expect(registry.getSnapshot().revision).toBeGreaterThan(before)
    dispose()
    expect(registry.getSnapshot().packs.some(pack => pack.id === externalPack.id)).toBe(false)
  })

  it('rejects unlicensed and ambiguous manifests', () => {
    expect(() => validateCompanionPack({ ...externalPack, license: '' })).toThrow(/identity and license/)
    expect(() => validateCompanionPack({ ...externalPack, defaultOutfitId: 'missing' })).toThrow(/Default outfit/)
    expect(() => validateCompanionPack({ ...externalPack, id: '../escape' })).toThrow(/Invalid companion pack id/)
    expect(() => validateCompanionPack({
      ...externalPack,
      animations: {
        idle: { asset: 'blob:test', mode: 'image', frames: 2, frameWidth: 100, frameHeight: 100, fps: 1, loop: false },
      },
    })).toThrow(/one frame/)
  })
})

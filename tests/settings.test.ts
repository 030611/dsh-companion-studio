import { describe, expect, it } from 'vitest'
import { CompanionController, DEFAULT_SETTINGS, readSettings, type StorageLike } from '../src/client/settings.ts'

class MemoryStorage implements StorageLike {
  readonly values = new Map<string, string>()
  getItem(key: string): string | null { return this.values.get(key) ?? null }
  setItem(key: string, value: string): void { this.values.set(key, value) }
}

describe('companion settings', () => {
  it('persists privacy, voice, position and full hide state locally', () => {
    const storage = new MemoryStorage()
    const controller = new CompanionController(storage)
    controller.patch({
      previewEnabled: false,
      speechEnabled: true,
      autoCycleEnabled: true,
      voiceURI: 'Microsoft Xiaoxiao',
      speechStyle: 'gentle',
      position: { x: 42, y: 64 },
      menuOffset: { x: -190, y: 18 },
    })
    controller.hide()
    expect(readSettings(storage)).toMatchObject({
      displayMode: 'hidden',
      previewEnabled: false,
      speechEnabled: true,
      autoCycleEnabled: true,
      voiceURI: 'Microsoft Xiaoxiao',
      speechStyle: 'gentle',
      position: { x: 42, y: 64 },
      menuOffset: { x: -190, y: 18 },
    })
  })

  it('falls back safely from malformed storage', () => {
    const storage = new MemoryStorage()
    storage.setItem('dsh-companion-studio.settings.v1', '{not-json')
    expect(readSettings(storage)).toEqual(DEFAULT_SETTINGS)
  })
})

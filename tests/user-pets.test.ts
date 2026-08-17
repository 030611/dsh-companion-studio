import { describe, expect, it } from 'vitest'
import { getCompanionPackRegistry } from '../src/client/packs.ts'
import {
  UserPetManager,
  validateUserPetFile,
  type ObjectUrlHost,
  type UserPetRecord,
  type UserPetRepository,
} from '../src/client/user-pets.ts'

class MemoryRepository implements UserPetRepository {
  readonly records = new Map<string, UserPetRecord>()
  async list(): Promise<readonly UserPetRecord[]> { return [...this.records.values()] }
  async put(record: UserPetRecord): Promise<void> { this.records.set(record.id, record) }
  async delete(id: string): Promise<void> { this.records.delete(id) }
}

class MemoryUrls implements ObjectUrlHost {
  readonly created: string[] = []
  readonly revoked: string[] = []
  createObjectURL(): string {
    const url = `blob:test-${this.created.length}`
    this.created.push(url)
    return url
  }
  revokeObjectURL(url: string): void { this.revoked.push(url) }
}

describe('user pet image boundary', () => {
  it('rejects executable, oversized and unreasonable image inputs', () => {
    expect(() => validateUserPetFile({ type: 'image/svg+xml', size: 100 })).toThrow(/PNG 或 WebP/)
    expect(() => validateUserPetFile({ type: 'image/png', size: 5 * 1024 * 1024 + 1 })).toThrow(/5 MB/)
    expect(() => validateUserPetFile({ type: 'image/png', size: 100, width: 4096, height: 4096 })).toThrow(/2048/)
    expect(() => validateUserPetFile({ type: 'image/webp', size: 100, width: 8, height: 8 })).toThrow(/24/)
  })

  it('persists, registers and completely releases a one-image pet', async () => {
    const repository = new MemoryRepository()
    const urls = new MemoryUrls()
    const manager = new UserPetManager(repository, urls, async () => ({
      image: new Blob(['normalized'], { type: 'image/png' }),
      width: 512,
      height: 512,
    }))
    const pack = await manager.importFile(new File(['source'], ' 我的鲸鱼 <test>.png ', { type: 'image/png' }))

    expect(pack.origin).toBe('user')
    expect(pack.characterName).toBe('我的鲸鱼 test')
    expect(repository.records.has(pack.id)).toBe(true)
    expect(getCompanionPackRegistry().getSnapshot().packs.some(candidate => candidate.id === pack.id)).toBe(true)

    await manager.remove(pack.id)
    expect(repository.records.has(pack.id)).toBe(false)
    expect(getCompanionPackRegistry().getSnapshot().packs.some(candidate => candidate.id === pack.id)).toBe(false)
    expect(urls.revoked).toEqual(urls.created)
  })

  it('restores persisted pets and revokes their URLs on plugin disposal', async () => {
    const repository = new MemoryRepository()
    repository.records.set('user.12345678-1234-1234-1234-123456789abc', {
      id: 'user.12345678-1234-1234-1234-123456789abc',
      name: '本机角色',
      createdAt: 1,
      width: 256,
      height: 256,
      image: new Blob(['image'], { type: 'image/png' }),
    })
    const urls = new MemoryUrls()
    const manager = new UserPetManager(repository, urls)
    await manager.hydrate()
    expect(getCompanionPackRegistry().getSnapshot().packs.some(pack => pack.id.startsWith('user.'))).toBe(true)
    manager.dispose()
    expect(urls.revoked).toEqual(urls.created)
  })
})

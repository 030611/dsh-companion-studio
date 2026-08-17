import type { CompanionAnimation, CompanionPack } from './packs.ts'
import { registerCompanionPack } from './packs.ts'

export const USER_PET_MAX_BYTES = 5 * 1024 * 1024
export const USER_PET_MAX_EDGE = 2048
export const USER_PET_MAX_PIXELS = 4_194_304
export const USER_PET_MIN_EDGE = 24
export const USER_PET_MIME_TYPES = ['image/png', 'image/webp'] as const

export interface UserPetRecord {
  readonly id: string
  readonly name: string
  readonly createdAt: number
  readonly width: number
  readonly height: number
  readonly image: Blob
}

export interface UserPetRepository {
  list(): Promise<readonly UserPetRecord[]>
  put(record: UserPetRecord): Promise<void>
  delete(id: string): Promise<void>
}

export interface UserPetFileFacts {
  readonly type: string
  readonly size: number
  readonly width?: number
  readonly height?: number
}

export interface ImageNormalizer {
  (file: File): Promise<{ readonly image: Blob; readonly width: number; readonly height: number }>
}

export interface ObjectUrlHost {
  createObjectURL(blob: Blob): string
  revokeObjectURL(url: string): void
}

interface MountedPet {
  readonly disposePack: () => void
  readonly assetUrl: string
}

/** Validate cheap file facts before decoding and dimensions immediately after decoding. */
export function validateUserPetFile(facts: UserPetFileFacts): void {
  if (!USER_PET_MIME_TYPES.includes(facts.type as typeof USER_PET_MIME_TYPES[number])) {
    throw new Error('仅支持 PNG 或 WebP 图片')
  }
  if (!Number.isFinite(facts.size) || facts.size <= 0 || facts.size > USER_PET_MAX_BYTES) {
    throw new Error('图片必须小于或等于 5 MB')
  }
  if (facts.width === undefined || facts.height === undefined) return
  if (!Number.isInteger(facts.width) || !Number.isInteger(facts.height)
    || facts.width < USER_PET_MIN_EDGE || facts.height < USER_PET_MIN_EDGE) {
    throw new Error('图片宽高必须至少为 24 像素')
  }
  if (facts.width > USER_PET_MAX_EDGE || facts.height > USER_PET_MAX_EDGE
    || facts.width * facts.height > USER_PET_MAX_PIXELS) {
    throw new Error('图片不得超过 2048×2048 或 419 万像素')
  }
}

/** Decode and re-encode as PNG, preserving alpha while removing metadata and animated payloads. */
export async function normalizeUserPetFile(file: File): Promise<{ image: Blob; width: number; height: number }> {
  validateUserPetFile(file)
  if (typeof createImageBitmap !== 'function') throw new Error('当前浏览器不支持安全图片解码')
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    validateUserPetFile({ type: file.type, size: file.size, width: bitmap.width, height: bitmap.height })
    const canvas = document.createElement('canvas')
    canvas.width = bitmap.width
    canvas.height = bitmap.height
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new Error('无法创建本地图片画布')
    context.clearRect(0, 0, bitmap.width, bitmap.height)
    context.drawImage(bitmap, 0, 0)
    const image = await canvasBlob(canvas)
    return { image, width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}

/** Own persistence, object-URL lifetime and registry entries for user-created pets. */
export class UserPetManager {
  private readonly mounted = new Map<string, MountedPet>()
  private disposed = false

  constructor(
    private readonly repository: UserPetRepository,
    private readonly urls: ObjectUrlHost = URL,
    private readonly normalize: ImageNormalizer = normalizeUserPetFile,
  ) {}

  async hydrate(): Promise<void> {
    const records = await this.repository.list()
    if (this.disposed) return
    for (const record of records) {
      validateUserPetFile({
        type: record.image.type,
        size: record.image.size,
        width: record.width,
        height: record.height,
      })
      if (this.disposed) return
      this.mount(record)
    }
  }

  async importFile(file: File): Promise<CompanionPack> {
    if (this.disposed) throw new Error('桌宠服务已经停止')
    validateUserPetFile(file)
    const normalized = await this.normalize(file)
    validateUserPetFile({ type: normalized.image.type || 'image/png', size: normalized.image.size, ...normalized })
    const record: UserPetRecord = {
      id: `user.${crypto.randomUUID().toLowerCase()}`,
      name: safePetName(file.name),
      createdAt: Date.now(),
      width: normalized.width,
      height: normalized.height,
      image: normalized.image,
    }
    await this.repository.put(record)
    try {
      return this.mount(record)
    } catch (error) {
      await this.repository.delete(record.id)
      throw error
    }
  }

  async remove(id: string): Promise<void> {
    if (!id.startsWith('user.')) throw new Error('只能删除本机自定义桌宠')
    await this.repository.delete(id)
    this.unmount(id)
  }

  dispose(): void {
    this.disposed = true
    for (const id of [...this.mounted.keys()]) this.unmount(id)
  }

  private mount(record: UserPetRecord): CompanionPack {
    this.unmount(record.id)
    const assetUrl = this.urls.createObjectURL(record.image)
    const animation: CompanionAnimation = {
      asset: assetUrl,
      mode: 'image',
      frames: 1,
      frameWidth: record.width,
      frameHeight: record.height,
      fps: 1,
      loop: false,
    }
    const pack: CompanionPack = {
      schemaVersion: 1,
      id: record.id,
      version: '1',
      name: `我的桌宠 · ${record.name}`,
      characterName: record.name,
      author: '本机用户',
      license: '本机用户提供；未授权传播',
      origin: 'user',
      glyph: '✨',
      palette: { primary: '#526c9c', secondary: '#ffffff', glow: '#80d8c7' },
      outfits: [{ id: 'uploaded', name: '上传形象', accent: '#80d8c7', animations: allStates(animation) }],
      defaultOutfitId: 'uploaded',
    }
    let disposePack: () => void
    try {
      disposePack = registerCompanionPack(pack)
    } catch (error) {
      this.urls.revokeObjectURL(assetUrl)
      throw error
    }
    this.mounted.set(record.id, { disposePack, assetUrl })
    return pack
  }

  private unmount(id: string): void {
    const mounted = this.mounted.get(id)
    if (!mounted) return
    this.mounted.delete(id)
    mounted.disposePack()
    this.urls.revokeObjectURL(mounted.assetUrl)
  }
}

/** IndexedDB keeps binary images out of localStorage and survives DSH reloads. */
export class IndexedDbUserPetRepository implements UserPetRepository {
  private databasePromise: Promise<IDBDatabase> | undefined

  list(): Promise<readonly UserPetRecord[]> {
    return this.request<UserPetRecord[]>('readonly', store => store.getAll())
  }

  put(record: UserPetRecord): Promise<void> {
    return this.request<IDBValidKey>('readwrite', store => store.put(record)).then(() => undefined)
  }

  delete(id: string): Promise<void> {
    return this.request<undefined>('readwrite', store => store.delete(id)).then(() => undefined)
  }

  private async request<T>(mode: IDBTransactionMode, issue: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const database = await this.database()
    return new Promise<T>((resolve, reject) => {
      const transaction = database.transaction('pets', mode)
      const request = issue(transaction.objectStore('pets'))
      let result: T
      request.onsuccess = () => { result = request.result }
      request.onerror = () => { reject(request.error ?? new Error('IndexedDB request failed')) }
      transaction.onabort = () => { reject(transaction.error ?? new Error('IndexedDB transaction aborted')) }
      transaction.oncomplete = () => { resolve(result) }
    })
  }

  private database(): Promise<IDBDatabase> {
    if (this.databasePromise) return this.databasePromise
    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('dsh-companion-studio', 1)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('pets')) request.result.createObjectStore('pets', { keyPath: 'id' })
      }
      request.onsuccess = () => { resolve(request.result) }
      request.onerror = () => { reject(request.error ?? new Error('Cannot open companion storage')) }
    })
    return this.databasePromise
  }
}

function allStates(animation: CompanionAnimation): Record<'idle' | 'thinking' | 'streaming' | 'tool' | 'waiting' | 'success' | 'error' | 'sleeping', CompanionAnimation> {
  return {
    idle: animation,
    thinking: animation,
    streaming: animation,
    tool: animation,
    waiting: animation,
    success: animation,
    error: animation,
    sleeping: animation,
  }
}

function safePetName(filename: string): string {
  const withoutExtension = filename.replace(/\.[^.]+$/, '')
  const clean = withoutExtension.replace(/[\u0000-\u001f<>:"/\\|?*]+/g, ' ').replace(/\s+/g, ' ').trim()
  return (clean || '自定义桌宠').slice(0, 32)
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('图片重新编码失败'))
    }, 'image/png')
  })
}

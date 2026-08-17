import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { CompanionState } from './model.ts'

export type { CompanionState } from './model.ts'

export interface CompanionAnimation {
  readonly asset: string
  readonly mode?: 'sprite' | 'image'
  readonly frames: number
  readonly frameWidth: number
  readonly frameHeight: number
  readonly fps: number
  readonly loop: boolean
}

export interface CompanionOutfit {
  readonly id: string
  readonly name: string
  readonly accent: string
  readonly animations?: Partial<Record<CompanionState, CompanionAnimation>>
}

export interface CompanionPack {
  readonly schemaVersion: 1
  readonly id: string
  readonly version: string
  readonly name: string
  readonly characterName: string
  readonly author: string
  readonly license: string
  readonly origin?: 'builtin' | 'package' | 'user'
  readonly homepage?: string
  readonly glyph: string
  readonly palette: {
    readonly primary: string
    readonly secondary: string
    readonly glow: string
  }
  readonly outfits: readonly CompanionOutfit[]
  readonly defaultOutfitId: string
  readonly animations?: Partial<Record<CompanionState, CompanionAnimation>>
}

export interface CompanionPackRegistrySnapshot {
  readonly revision: number
  readonly packs: readonly CompanionPack[]
}

export const BUILTIN_PACKS: readonly CompanionPack[] = [
  {
    schemaVersion: 1,
    id: 'studio.xingxi',
    version: '0.1.0-dev',
    name: '星潮鲸灵',
    characterName: '星汐',
    author: 'Companion Studio',
    license: 'MIT metadata placeholder; no character art is bundled',
    origin: 'builtin',
    glyph: '🏮',
    palette: { primary: '#3b958d', secondary: '#fff9ec', glow: '#ff987a' },
    outfits: [
      { id: 'tide-explorer', name: '潮汐探险', accent: '#3b958d' },
      { id: 'lab-coat', name: '观测实验服', accent: '#79b9c7' },
      { id: 'sleep-cape', name: '星夜睡斗篷', accent: '#62588f' },
    ],
    defaultOutfitId: 'tide-explorer',
  },
]

interface RegistryHost {
  revision: number
  packs: Map<string, CompanionPack>
  listeners: Set<() => void>
  snapshot: CompanionPackRegistrySnapshot
}

const REGISTRY_KEY = Symbol.for('dsh.companion-studio.pack-registry.v1')

/** Global-by-symbol registry lets separately bundled character packs load before or after the core plugin. */
export function getCompanionPackRegistry(): ObservableSnapshot<CompanionPackRegistrySnapshot> {
  const host = registryHost()
  return {
    getSnapshot: () => host.snapshot,
    subscribe: listener => {
      host.listeners.add(listener)
      return () => { host.listeners.delete(listener) }
    },
  }
}

/** Register one installed character pack and return its lifecycle disposer. */
export function registerCompanionPack(pack: CompanionPack): () => void {
  validateCompanionPack(pack)
  const host = registryHost()
  const previous = host.packs.get(pack.id)
  host.packs.set(pack.id, pack)
  publish(host)
  return () => {
    if (host.packs.get(pack.id) !== pack) return
    if (previous) host.packs.set(pack.id, previous)
    else host.packs.delete(pack.id)
    publish(host)
  }
}

/** Fail early on unsafe or ambiguous pack metadata. */
export function validateCompanionPack(pack: CompanionPack): void {
  if (pack.schemaVersion !== 1) throw new Error('Unsupported companion pack schema')
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(pack.id)) throw new Error('Invalid companion pack id')
  if (!pack.name.trim() || !pack.characterName.trim() || !pack.author.trim() || !pack.license.trim()) {
    throw new Error('Companion pack identity and license fields are required')
  }
  if (pack.outfits.length === 0) throw new Error('Companion pack needs at least one outfit')
  const outfitIds = new Set(pack.outfits.map(outfit => outfit.id))
  if (outfitIds.size !== pack.outfits.length) throw new Error('Companion outfit ids must be unique')
  if (!outfitIds.has(pack.defaultOutfitId)) throw new Error('Default outfit is not present')
  for (const animation of Object.values(pack.animations ?? {})) validateAnimation(animation)
  for (const outfit of pack.outfits) {
    for (const animation of Object.values(outfit.animations ?? {})) validateAnimation(animation)
  }
}

function validateAnimation(animation: CompanionAnimation | undefined): void {
  if (!animation) return
  if (!animation.asset.trim()) throw new Error('Animation asset is required')
  if (animation.mode !== undefined && animation.mode !== 'sprite' && animation.mode !== 'image') {
    throw new Error('Unsupported animation mode')
  }
  if (animation.mode === 'image' && animation.frames !== 1) throw new Error('Static images must contain one frame')
  for (const value of [animation.frames, animation.frameWidth, animation.frameHeight, animation.fps]) {
    if (!Number.isFinite(value) || value <= 0) throw new Error('Animation dimensions and timing must be positive')
  }
}

function registryHost(): RegistryHost {
  const globalRecord = globalThis as typeof globalThis & { [REGISTRY_KEY]?: RegistryHost }
  if (!globalRecord[REGISTRY_KEY]) {
    const packs = new Map(BUILTIN_PACKS.map(pack => [pack.id, pack]))
    globalRecord[REGISTRY_KEY] = {
      revision: 0,
      packs,
      listeners: new Set(),
      snapshot: { revision: 0, packs: [...packs.values()] },
    }
  }
  return globalRecord[REGISTRY_KEY]
}

function publish(host: RegistryHost): void {
  host.revision += 1
  host.snapshot = { revision: host.revision, packs: [...host.packs.values()] }
  for (const listener of host.listeners) listener()
}

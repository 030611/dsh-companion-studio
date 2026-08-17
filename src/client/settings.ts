import type { ObservableSnapshot } from '@deepseek-ai/dsh-client-runtime/client'

export type CompanionDisplayMode = 'shown' | 'docked' | 'hidden'
export type CompanionSpeechStyle = 'natural' | 'gentle' | 'lively'

export interface CompanionSettings {
  readonly displayMode: CompanionDisplayMode
  readonly previewEnabled: boolean
  readonly speechEnabled: boolean
  readonly autoCycleEnabled: boolean
  readonly volume: number
  readonly voiceURI: string
  readonly speechStyle: CompanionSpeechStyle
  readonly selectedPackId: string
  readonly selectedOutfitId: string
  readonly position: { readonly x: number; readonly y: number } | null
  readonly menuOffset: { readonly x: number; readonly y: number } | null
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const DEFAULT_SETTINGS: CompanionSettings = {
  displayMode: 'shown',
  previewEnabled: true,
  speechEnabled: false,
  autoCycleEnabled: false,
  volume: 0.8,
  voiceURI: '',
  speechStyle: 'natural',
  selectedPackId: 'studio.xingxi',
  selectedOutfitId: 'tide-explorer',
  position: null,
  menuOffset: null,
}

const STORAGE_KEY = 'dsh-companion-studio.settings.v1'

export class CompanionController implements ObservableSnapshot<CompanionSettings> {
  private readonly listeners = new Set<() => void>()
  private value: CompanionSettings

  constructor(private readonly storage: StorageLike | null) {
    this.value = readSettings(storage)
  }

  getSnapshot = (): CompanionSettings => this.value

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  patch(next: Partial<CompanionSettings>): void {
    const value = normalizeSettings({ ...this.value, ...next })
    if (JSON.stringify(value) === JSON.stringify(this.value)) return
    this.value = value
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(value))
    for (const listener of this.listeners) listener()
  }

  show(): void { this.patch({ displayMode: 'shown' }) }
  dock(): void { this.patch({ displayMode: 'docked' }) }
  hide(): void { this.patch({ displayMode: 'hidden' }) }
}

export function readSettings(storage: StorageLike | null): CompanionSettings {
  if (!storage) return DEFAULT_SETTINGS
  try {
    const raw = storage.getItem(STORAGE_KEY)
    return raw ? normalizeSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) as object }) : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function normalizeSettings(candidate: CompanionSettings): CompanionSettings {
  const displayMode = ['shown', 'docked', 'hidden'].includes(candidate.displayMode)
    ? candidate.displayMode
    : DEFAULT_SETTINGS.displayMode
  const position = candidate.position
    && Number.isFinite(candidate.position.x)
    && Number.isFinite(candidate.position.y)
    ? { x: candidate.position.x, y: candidate.position.y }
    : null
  const menuOffset = candidate.menuOffset
    && Number.isFinite(candidate.menuOffset.x)
    && Number.isFinite(candidate.menuOffset.y)
    ? { x: candidate.menuOffset.x, y: candidate.menuOffset.y }
    : null
  const speechStyle = ['natural', 'gentle', 'lively'].includes(candidate.speechStyle)
    ? candidate.speechStyle
    : DEFAULT_SETTINGS.speechStyle
  return {
    displayMode,
    previewEnabled: Boolean(candidate.previewEnabled),
    speechEnabled: Boolean(candidate.speechEnabled),
    autoCycleEnabled: Boolean(candidate.autoCycleEnabled),
    volume: Math.min(1, Math.max(0, Number(candidate.volume) || DEFAULT_SETTINGS.volume)),
    voiceURI: String(candidate.voiceURI || ''),
    speechStyle,
    selectedPackId: String(candidate.selectedPackId || DEFAULT_SETTINGS.selectedPackId),
    selectedOutfitId: String(candidate.selectedOutfitId || DEFAULT_SETTINGS.selectedOutfitId),
    position,
    menuOffset,
  }
}

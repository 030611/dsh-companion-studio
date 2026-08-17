import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type {
  ConversationSnapshot,
  ObservableSnapshot,
} from '@deepseek-ai/dsh-client-runtime/client'
import type {
  HostObservable,
  InjectFace,
  PropsRuntime,
  SessionMaybeProvideInfo,
} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { AUTO_CYCLE_INTERVAL_MS, nextCycleId } from './auto-cycle.ts'
import { deriveCompanionState, extractAssistantPreview, type CompanionState } from './model.ts'
import type { CompanionPack, CompanionPackRegistrySnapshot } from './packs.ts'
import type { CompanionController, CompanionSettings, CompanionSpeechStyle } from './settings.ts'
import { listChineseVoices, selectCompanionVoice, speakPreview, stopSpeech } from './voice.ts'
import type { UserPetManager } from './user-pets.ts'

interface CompanionInject {
  hooks: {
    companion: ObservableSnapshot<CompanionSettings>
    packs: ObservableSnapshot<CompanionPackRegistrySnapshot>
    provideInfo: HostObservable<SessionMaybeProvideInfo>
  }
  patch: CompanionController['patch']
  show: CompanionController['show']
  dock: CompanionController['dock']
  hide: CompanionController['hide']
  importUserPet: UserPetManager['importFile']
  removeUserPet: UserPetManager['remove']
}

export type CompanionOverlayProps = PropsRuntime<'shell.overlay'> & InjectFace<CompanionInject>
export type CompanionHeaderToggleProps = PropsRuntime<'conversation.session.header.utilities'> & InjectFace<CompanionInject>

const EMPTY_SESSION: ObservableSnapshot<ConversationSnapshot | undefined> = {
  getSnapshot: () => undefined,
  subscribe: () => () => {},
}

const VOICE_PREVIEW_TEXT = '你好呀，今天也一起加油吧！'

const SPEECH_STYLE_LABEL: Readonly<Record<CompanionSpeechStyle, string>> = {
  natural: '自然',
  gentle: '温柔',
  lively: '活泼',
}

const SPEECH_STYLE_ORDER: readonly CompanionSpeechStyle[] = ['natural', 'gentle', 'lively']

function nextSpeechStyle(current: CompanionSpeechStyle): CompanionSpeechStyle {
  const currentIndex = SPEECH_STYLE_ORDER.indexOf(current)
  return SPEECH_STYLE_ORDER[(currentIndex + 1) % SPEECH_STYLE_ORDER.length] ?? 'natural'
}

/** Preserve receiver-aware DSH observable methods when passing them to React. */
export function bindObservableSnapshot<T>(source: ObservableSnapshot<T>): ObservableSnapshot<T> {
  return {
    getSnapshot: () => source.getSnapshot(),
    subscribe: listener => source.subscribe(listener),
  }
}

const STATE_LABEL: Readonly<Record<CompanionState, string>> = {
  idle: '待命',
  thinking: '思考中',
  streaming: '正在回复',
  tool: '正在使用工具',
  waiting: '等待你的决定',
  success: '任务完成',
  error: '需要留意',
  sleeping: '休息中',
}

const STATE_ICON: Readonly<Record<CompanionState, string>> = {
  idle: '·',
  thinking: '✦',
  streaming: '≋',
  tool: '⌁',
  waiting: '?',
  success: '✓',
  error: '!',
  sleeping: 'z',
}

export function CompanionOverlay(props: CompanionOverlayProps) {
  const settings = props.useCompanion(value => value)
  const packs = props.usePacks(value => value.packs)
  const provideInfo = props.useProvideInfo(value => value)
  const sessionSource = (provideInfo.hooks.session as ObservableSnapshot<ConversationSnapshot> | undefined) ?? EMPTY_SESSION
  const sessionStore = useMemo(() => bindObservableSnapshot(sessionSource), [sessionSource])
  const snapshot = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot, sessionStore.getSnapshot)
  const sessions = props.useSessions(value => value)
  const summary = sessions.current ? sessions.byId[sessions.current] : undefined
  const currentRunning = snapshot?.running ?? summary?.running ?? false
  const [completedPulse, setCompletedPulse] = useState(false)
  const [showcasePulse, setShowcasePulse] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')
  const [dragPosition, setDragPosition] = useState(settings.position)
  const [menuOffset, setMenuOffset] = useState(settings.menuOffset)
  const [speechVoices, setSpeechVoices] = useState<readonly SpeechSynthesisVoice[]>([])
  const wasRunning = useRef(currentRunning)
  const lastSessionId = useRef(provideInfo.sessionId)

  const pack = packs.find(candidate => candidate.id === settings.selectedPackId) ?? packs[0]
  const outfit = pack?.outfits.find(candidate => candidate.id === settings.selectedOutfitId)
    ?? pack?.outfits.find(candidate => candidate.id === pack.defaultOutfitId)
  const preview = extractAssistantPreview(snapshot ?? null)
  const sleeping = !currentRunning && [0, 1, 2, 3, 4, 5].includes(new Date().getHours())
  const state = deriveCompanionState({ snapshot: snapshot ?? null, completedPulse, sleeping })
  const recommendedVoice = useMemo(() => selectCompanionVoice(speechVoices), [speechVoices])

  useEffect(() => { setDragPosition(settings.position) }, [settings.position])
  useEffect(() => { setMenuOffset(settings.menuOffset) }, [settings.menuOffset])
  useEffect(() => {
    const host = globalThis.speechSynthesis
    if (!host) return
    const update = () => { setSpeechVoices([...listChineseVoices(host)]) }
    update()
    host.addEventListener('voiceschanged', update)
    return () => { host.removeEventListener('voiceschanged', update) }
  }, [])
  useEffect(() => {
    if (!settings.autoCycleEnabled || !pack || !outfit) return
    let showcaseTimer: number | undefined
    const interval = window.setInterval(() => {
      const nextId = nextCycleId(pack.outfits.map(candidate => candidate.id), outfit.id)
      if (nextId) props.patch({ selectedOutfitId: nextId })
      setShowcasePulse(true)
      if (showcaseTimer !== undefined) window.clearTimeout(showcaseTimer)
      showcaseTimer = window.setTimeout(() => { setShowcasePulse(false) }, 4500)
    }, AUTO_CYCLE_INTERVAL_MS)
    return () => {
      window.clearInterval(interval)
      if (showcaseTimer !== undefined) window.clearTimeout(showcaseTimer)
    }
  }, [outfit, pack, props.patch, settings.autoCycleEnabled])
  useEffect(() => {
    if (lastSessionId.current !== provideInfo.sessionId) {
      lastSessionId.current = provideInfo.sessionId
      wasRunning.current = currentRunning
      setCompletedPulse(false)
      return
    }
    const previous = wasRunning.current
    wasRunning.current = currentRunning
    if (!previous || currentRunning) return
    setCompletedPulse(true)
    if (settings.speechEnabled && preview.text) {
      speakPreview(preview.text, settings.volume, settings.voiceURI, undefined, settings.speechStyle)
    }
    const timer = window.setTimeout(() => { setCompletedPulse(false) }, 4500)
    return () => { window.clearTimeout(timer) }
  }, [currentRunning, preview.text, provideInfo.sessionId, settings.speechEnabled, settings.speechStyle, settings.voiceURI, settings.volume])

  if (!pack || !outfit || settings.displayMode === 'hidden') return null
  if (settings.displayMode === 'docked') {
    return <button className="dsh-companion-dock" type="button" onClick={props.show} aria-label="展开桌宠">
      <span>{pack.glyph}</span><span>{summary?.running ? '●' : ''}</span>
    </button>
  }

  const rootStyle = {
    '--pet-primary': pack.palette.primary,
    '--pet-secondary': pack.palette.secondary,
    '--pet-glow': outfit.accent || pack.palette.glow,
    ...(dragPosition ? { left: `${dragPosition.x}px`, top: `${dragPosition.y}px`, right: 'auto', bottom: 'auto' } : {}),
  } as CSSProperties
  const menuStyle = menuOffset
    ? { left: `${menuOffset.x}px`, top: `${menuOffset.y}px`, right: 'auto' } as CSSProperties
    : undefined

  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('button,input,select,label,.dsh-companion-menu')) return
    const rect = event.currentTarget.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const offsetY = event.clientY - rect.top
    const move = (pointer: PointerEvent) => {
      setDragPosition(clampPosition(pointer.clientX - offsetX, pointer.clientY - offsetY))
    }
    const finish = (pointer: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      const position = clampPosition(pointer.clientX - offsetX, pointer.clientY - offsetY)
      setDragPosition(position)
      props.patch({ position })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish, { once: true })
  }

  const startMenuDrag = (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const panel = event.currentTarget.closest('.dsh-companion-menu')
    const stage = event.currentTarget.closest('.dsh-companion-stage')
    if (!(panel instanceof HTMLElement) || !(stage instanceof HTMLElement)) return
    const panelRect = panel.getBoundingClientRect()
    const stageRect = stage.getBoundingClientRect()
    const pointerOffsetX = event.clientX - panelRect.left
    const pointerOffsetY = event.clientY - panelRect.top
    const positionFor = (pointer: PointerEvent) => clampMenuOffset(
      pointer.clientX - pointerOffsetX - stageRect.left,
      pointer.clientY - pointerOffsetY - stageRect.top,
      panelRect.width,
      panelRect.height,
      stageRect.left,
      stageRect.top,
    )
    const move = (pointer: PointerEvent) => { setMenuOffset(positionFor(pointer)) }
    const finish = (pointer: PointerEvent) => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
      const position = positionFor(pointer)
      setMenuOffset(position)
      props.patch({ menuOffset: position })
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', finish, { once: true })
    window.addEventListener('pointercancel', finish, { once: true })
  }

  const cyclePack = () => {
    const index = packs.findIndex(candidate => candidate.id === pack.id)
    const next = packs[(index + 1) % packs.length]
    if (next) props.patch({ selectedPackId: next.id, selectedOutfitId: next.defaultOutfitId })
  }
  const cycleOutfit = () => {
    const index = pack.outfits.findIndex(candidate => candidate.id === outfit.id)
    const next = pack.outfits[(index + 1) % pack.outfits.length]
    if (next) props.patch({ selectedOutfitId: next.id })
  }
  const importUserPet = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setImporting(true)
    setImportError('')
    try {
      const imported = await props.importUserPet(file)
      props.patch({ selectedPackId: imported.id, selectedOutfitId: imported.defaultOutfitId })
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '导入失败')
    } finally {
      setImporting(false)
    }
  }
  const removeUserPet = async () => {
    if (pack.origin !== 'user' || !window.confirm(`删除本机桌宠“${pack.characterName}”？此操作会移除保存的图片。`)) return
    try {
      await props.removeUserPet(pack.id)
      const fallback = packs.find(candidate => candidate.id !== pack.id)
      if (fallback) props.patch({ selectedPackId: fallback.id, selectedOutfitId: fallback.defaultOutfitId })
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '删除失败')
    }
  }

  return <aside
    className="dsh-companion-stage"
    style={rootStyle}
    data-state={state}
    data-showcase={showcasePulse ? 'true' : undefined}
    aria-label={`${pack.characterName}桌宠，${STATE_LABEL[state]}`}
    onPointerDown={startDrag}
  >
    {settings.previewEnabled && preview.text && <section className="dsh-companion-bubble" aria-live="polite">
      <strong>{summary?.displayTitle ?? '当前会话'}</strong>
      <p>{preview.text}</p>
      {preview.redacted && <small>已自动隐藏疑似密钥</small>}
    </section>}
    <div className="dsh-companion-toolbar">
      <button type="button" onClick={() => { setMenuOpen(value => !value) }} aria-label="桌宠设置">⚙</button>
      <button type="button" onClick={props.dock} aria-label="收起桌宠">–</button>
      <button type="button" onClick={props.hide} aria-label="隐藏桌宠">×</button>
    </div>
    {menuOpen && <section className="dsh-companion-menu" aria-label="桌宠设置面板" style={menuStyle}>
      <button type="button" className="dsh-companion-menu-handle" onPointerDown={startMenuDrag} aria-label="拖动设置面板">
        <strong>桌宠设置</strong><span>拖动</span>
      </button>
      <button type="button" onClick={cyclePack}>角色：{pack.characterName}</button>
      <button type="button" onClick={cycleOutfit}>服装：{outfit.name}</button>
      <button type="button" onClick={() => { props.patch({ previewEnabled: !settings.previewEnabled }) }}>
        回复预览：{settings.previewEnabled ? '开' : '关'}
      </button>
      <button type="button" onClick={() => { props.patch({ autoCycleEnabled: !settings.autoCycleEnabled }) }}>
        每小时变化：{settings.autoCycleEnabled ? '开' : '关'}
      </button>
      <button type="button" onClick={() => {
        const enabled = !settings.speechEnabled
        props.patch({ speechEnabled: enabled })
        if (!enabled) stopSpeech()
      }}>
        完成朗读：{settings.speechEnabled ? '开' : '关'}
      </button>
      <button type="button" onClick={() => {
        const speechStyle = nextSpeechStyle(settings.speechStyle)
        props.patch({ speechStyle })
        speakPreview(VOICE_PREVIEW_TEXT, settings.volume, settings.voiceURI, undefined, speechStyle)
      }}>
        朗读语气：{SPEECH_STYLE_LABEL[settings.speechStyle]}
      </button>
      <label className="dsh-companion-voice">
        <span>本地语音</span>
        <select
          aria-label="本地语音"
          value={settings.voiceURI}
          onChange={event => {
            const voiceURI = event.currentTarget.value
            props.patch({ voiceURI })
            speakPreview(VOICE_PREVIEW_TEXT, settings.volume, voiceURI, undefined, settings.speechStyle)
          }}
        >
          <option value="">推荐：{recommendedVoice?.name ?? '系统中文声线'}</option>
          {speechVoices.map(voice => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => {
        speakPreview(VOICE_PREVIEW_TEXT, settings.volume, settings.voiceURI, undefined, settings.speechStyle)
      }}>试听当前声音</button>
      {preview.text && <button type="button" onClick={() => {
        speakPreview(preview.text, settings.volume, settings.voiceURI, undefined, settings.speechStyle)
      }}>立即朗读</button>}
      <button type="button" onClick={() => { stopSpeech() }}>停止朗读</button>
      <label className="dsh-companion-import">
        {importing ? '正在处理图片…' : '＋ 上传自定义桌宠'}
        <input type="file" accept="image/png,image/webp" disabled={importing} onChange={importUserPet} />
      </label>
      {pack.origin === 'user' && <button type="button" className="dsh-companion-delete" onClick={removeUserPet}>删除这个自定义桌宠</button>}
      {importError && <small className="dsh-companion-import-error" role="alert">{importError}</small>}
      <small>只读取助手文字；不展示提示词、推理、工具参数或结果。</small>
    </section>}
    <CompanionAvatar pack={pack} outfitId={outfit.id} state={state} />
    <span className="dsh-companion-status"><b>{STATE_ICON[state]}</b>{STATE_LABEL[state]}</span>
  </aside>
}

export function CompanionHeaderToggle(props: CompanionHeaderToggleProps) {
  const settings = props.useCompanion(value => value)
  const packs = props.usePacks(value => value.packs)
  const pack = packs.find(candidate => candidate.id === settings.selectedPackId) ?? packs[0]
  const hidden = settings.displayMode === 'hidden'
  return <button
    className="dsh-companion-header-toggle"
    type="button"
    onClick={hidden ? props.show : props.hide}
    title={hidden ? '显示桌宠' : '隐藏桌宠'}
    aria-label={hidden ? '显示桌宠' : '隐藏桌宠'}
  >{pack?.glyph ?? '🐋'}</button>
}

function CompanionAvatar({ pack, outfitId, state }: { pack: CompanionPack; outfitId: string; state: CompanionState }) {
  const outfit = pack.outfits.find(candidate => candidate.id === outfitId)
  const animation = outfit?.animations?.[state] ?? pack.animations?.[state]
  if (!animation) {
    return <div className="dsh-companion-avatar dsh-companion-placeholder" title="开发预览占位形象">
      <span className="dsh-companion-fin" />
      <span className="dsh-companion-glyph">{pack.glyph}</span>
      <span className="dsh-companion-face">•ᴗ•</span>
    </div>
  }
  if (animation.mode === 'image') {
    return <img
      className="dsh-companion-avatar dsh-companion-image"
      src={animation.asset}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  }
  const style = {
    backgroundImage: `url(${JSON.stringify(animation.asset).slice(1, -1)})`,
    width: `${animation.frameWidth}px`,
    height: `${animation.frameHeight}px`,
    backgroundSize: `${animation.frames * 100}% 100%`,
    '--pet-frames': animation.frames,
    '--pet-fps': `${animation.frames / animation.fps}s`,
  } as CSSProperties
  return <div className="dsh-companion-avatar dsh-companion-sprite" style={style} aria-hidden="true" />
}

function clampPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.max(8, Math.min(window.innerWidth - 196, x)),
    y: Math.max(8, Math.min(window.innerHeight - 226, y)),
  }
}

function clampMenuOffset(
  x: number,
  y: number,
  width: number,
  height: number,
  stageLeft: number,
  stageTop: number,
): { x: number; y: number } {
  return {
    x: Math.max(8 - stageLeft, Math.min(window.innerWidth - width - 8 - stageLeft, x)),
    y: Math.max(8 - stageTop, Math.min(window.innerHeight - height - 8 - stageTop, y)),
  }
}

import { speechText } from './model.ts'
import type { CompanionSpeechStyle } from './settings.ts'

export interface SpeechHost {
  cancel(): void
  getVoices?(): readonly SpeechSynthesisVoice[]
  speak(utterance: SpeechSynthesisUtterance): void
}

export interface CompanionProsody {
  readonly rate: number
  readonly pitch: number
}

export interface CompanionSpeechSegment extends CompanionProsody {
  readonly text: string
}

const COMPANION_VOICE_HINTS = [
  'xiaoxiao', '晓晓',
  'xiaoyi', '晓伊',
  'yaoyao', '瑶瑶',
  'huihui', '慧慧',
  'ting-ting', '婷婷',
  'meijia', '美佳',
  'sin-ji', '善怡',
]

/** Stop any in-progress local speech without changing the user's auto-speech preference. */
export function stopSpeech(host: SpeechHost | undefined = globalThis.speechSynthesis): boolean {
  if (!host) return false
  host.cancel()
  return true
}

/** Prefer an installed Mandarin voice that suits the companion; an explicit user choice always wins. */
export function selectCompanionVoice(
  voices: readonly SpeechSynthesisVoice[],
  voiceURI = '',
): SpeechSynthesisVoice | undefined {
  if (voiceURI) {
    const selected = voices.find(voice => voice.voiceURI === voiceURI)
    if (selected) return selected
  }
  return voices
    .filter(voice => /^zh(?:-|$)/i.test(voice.lang))
    .map(voice => ({ voice, score: voiceScore(voice) }))
    .sort((left, right) => right.score - left.score || left.voice.name.localeCompare(right.voice.name))[0]?.voice
}

export function listChineseVoices(host: SpeechHost | undefined = globalThis.speechSynthesis): readonly SpeechSynthesisVoice[] {
  return host?.getVoices?.().filter(voice => /^zh(?:-|$)/i.test(voice.lang)) ?? []
}

/** Local Web Speech API only: no audio or conversation text leaves the browser. */
export function speakPreview(
  text: string,
  volume: number,
  voiceURI = '',
  host: SpeechHost | undefined = globalThis.speechSynthesis,
  style: CompanionSpeechStyle = 'natural',
): boolean {
  const sanitized = speechText(text)
  if (!host || !sanitized || typeof SpeechSynthesisUtterance === 'undefined') return false
  host.cancel()
  const chinese = /[\u3400-\u9fff]/.test(sanitized)
  const voice = voiceURI || chinese ? selectCompanionVoice(host.getVoices?.() ?? [], voiceURI) : undefined
  for (const segment of planCompanionSpeech(sanitized, voice, style)) {
    const utterance = new SpeechSynthesisUtterance(segment.text)
    if (voice) utterance.voice = voice
    utterance.lang = voice?.lang ?? (chinese ? 'zh-CN' : 'en-US')
    utterance.rate = segment.rate
    utterance.pitch = segment.pitch
    utterance.volume = Math.min(1, Math.max(0, volume))
    host.speak(utterance)
  }
  return true
}

/** Split speech into sentence-sized performances, then vary delivery without sending text off-device. */
export function planCompanionSpeech(
  text: string,
  voice: SpeechSynthesisVoice | undefined,
  style: CompanionSpeechStyle = 'natural',
): readonly CompanionSpeechSegment[] {
  const base = companionProsody(voice)
  const styleFactor = STYLE_PROSODY[style]
  return splitSpeech(text).map(segment => {
    const expression = expressionProsody(segment)
    return {
      text: segment,
      rate: clamp(base.rate * styleFactor.rate * expression.rate, 0.75, 1.3),
      pitch: clamp(base.pitch * styleFactor.pitch + expression.pitch, 0.7, 1.35),
    }
  })
}

/** Keep the installed voices audibly distinct even when the browser applies subtle voice models. */
export function companionProsody(voice: SpeechSynthesisVoice | undefined): CompanionProsody {
  const name = voice?.name.toLocaleLowerCase() ?? ''
  if (/kangkang|康康/.test(name)) return { rate: 0.96, pitch: 0.96 }
  if (/yaoyao|瑶瑶/.test(name)) return { rate: 1.02, pitch: 1.04 }
  if (/huihui|慧慧/.test(name)) return { rate: 0.99, pitch: 1 }
  return { rate: 1, pitch: 1 }
}

const STYLE_PROSODY: Readonly<Record<CompanionSpeechStyle, CompanionProsody>> = {
  natural: { rate: 1, pitch: 1 },
  gentle: { rate: 0.94, pitch: 0.99 },
  lively: { rate: 1.03, pitch: 1.01 },
}

function splitSpeech(text: string): readonly string[] {
  const segments = text.match(/[^。！？!?；;…\n]+(?:[。！？!?；;…]+|$)/g)
    ?.map(segment => segment.trim())
    .filter(Boolean)
  return segments?.length ? segments : [text]
}

function expressionProsody(text: string): CompanionProsody {
  if (/失败|出错|错误|抱歉|别担心|没关系|需要留意/.test(text)) return { rate: 0.92, pitch: -0.02 }
  if (/[？?]+$/.test(text)) return { rate: 0.96, pitch: 0.03 }
  if (/[！!]+$/.test(text) || /完成|成功|太好|加油|恭喜|好呀/.test(text)) return { rate: 1.03, pitch: 0.025 }
  if (/[…]{1,}$|\.{3,}$/.test(text)) return { rate: 0.9, pitch: -0.015 }
  return { rate: 1, pitch: 0 }
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function voiceScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLocaleLowerCase()
  const hintIndex = COMPANION_VOICE_HINTS.findIndex(hint => name.includes(hint))
  return (hintIndex >= 0 ? 200 - hintIndex * 5 : 0)
    + (/natural|自然/.test(name) ? 30 : 0)
    + (voice.default ? 5 : 0)
    + (voice.localService ? 2 : 0)
}

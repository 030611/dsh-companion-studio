import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  companionProsody,
  planCompanionSpeech,
  selectCompanionVoice,
  speakPreview,
  stopSpeech,
  type SpeechHost,
} from '../src/client/voice.ts'

afterEach(() => { vi.unstubAllGlobals() })

describe('stopSpeech', () => {
  it('cancels active browser speech', () => {
    const host: SpeechHost = { cancel: vi.fn(), speak: vi.fn() }

    expect(stopSpeech(host)).toBe(true)
    expect(host.cancel).toHaveBeenCalledOnce()
    expect(host.speak).not.toHaveBeenCalled()
  })

  it('is safe when speech synthesis is unavailable', () => {
    expect(stopSpeech(undefined)).toBe(false)
  })
})

describe('companion voice selection', () => {
  const voice = (name: string, lang: string, voiceURI = name): SpeechSynthesisVoice => ({
    name,
    lang,
    voiceURI,
    default: false,
    localService: true,
  })

  it('prefers a matching explicit choice', () => {
    const voices = [voice('晓晓', 'zh-CN', 'xiaoxiao'), voice('晓伊', 'zh-CN', 'xiaoyi')]
    expect(selectCompanionVoice(voices, 'xiaoyi')?.voiceURI).toBe('xiaoyi')
  })

  it('auto-selects the preferred available Mandarin companion voice', () => {
    const voices = [voice('Microsoft Yunxi', 'zh-CN'), voice('Microsoft Xiaoxiao Natural', 'zh-CN')]
    expect(selectCompanionVoice(voices)?.name).toContain('Xiaoxiao')
  })

  it('prefers Yaoyao over the other Mandarin voices available in this profile', () => {
    const voices = [
      voice('Microsoft Huihui - Chinese (Simplified, PRC)', 'zh-CN'),
      voice('Microsoft Kangkang - Chinese (Simplified, PRC)', 'zh-CN'),
      voice('Microsoft Yaoyao - Chinese (Simplified, PRC)', 'zh-CN'),
    ]
    expect(selectCompanionVoice(voices)?.name).toContain('Yaoyao')
  })

  it('does not silently substitute a non-Chinese auto voice', () => {
    expect(selectCompanionVoice([voice('English Voice', 'en-US')])).toBeUndefined()
  })

  it('speaks with the exact selected voice and its distinct profile', () => {
    const voices = [
      voice('Microsoft Huihui - Chinese (Simplified, PRC)', 'zh-CN'),
      voice('Microsoft Kangkang - Chinese (Simplified, PRC)', 'zh-CN'),
    ]
    class FakeUtterance {
      voice: SpeechSynthesisVoice | null = null
      lang = ''
      rate = 1
      pitch = 1
      volume = 1
      constructor(readonly text: string) {}
    }
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    const spoken: SpeechSynthesisUtterance[] = []
    const host: SpeechHost = {
      cancel: vi.fn(),
      getVoices: () => voices,
      speak: utterance => { spoken.push(utterance) },
    }

    expect(speakPreview('测试声音', 0.8, voices[1]!.voiceURI, host)).toBe(true)
    expect(spoken[0]?.voice).toBe(voices[1])
    expect(spoken[0]?.pitch).toBe(companionProsody(voices[1]).pitch)
    expect(spoken[0]?.pitch).not.toBe(companionProsody(voices[0]).pitch)
  })

  it('performs each sentence with punctuation-aware expression', () => {
    const selected = voice('Microsoft Yaoyao - Chinese (Simplified, PRC)', 'zh-CN')
    const segments = planCompanionSpeech('任务完成啦！要继续吗？别担心，我会陪着你。', selected)

    expect(segments.map(segment => segment.text)).toEqual([
      '任务完成啦！',
      '要继续吗？',
      '别担心，我会陪着你。',
    ])
    expect(segments[0]!.pitch).toBeGreaterThan(segments[2]!.pitch)
    expect(segments[1]!.pitch).toBeGreaterThan(segments[2]!.pitch)
    expect(segments[2]!.rate).toBeLessThan(segments[0]!.rate)
  })

  it('offers audibly different gentle and lively delivery modes', () => {
    const selected = voice('Microsoft Huihui - Chinese (Simplified, PRC)', 'zh-CN')
    const gentle = planCompanionSpeech('今天也一起努力。', selected, 'gentle')[0]!
    const lively = planCompanionSpeech('今天也一起努力。', selected, 'lively')[0]!

    expect(gentle.rate).toBeLessThan(lively.rate)
    expect(gentle.pitch).toBeLessThan(lively.pitch)
  })
})

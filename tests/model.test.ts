import { describe, expect, it } from 'vitest'
import type { ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { deriveCompanionState, extractAssistantPreview, speechText } from '../src/client/model.ts'

type SnapshotInput = Pick<ConversationSnapshot,
  'running' | 'runningCalls' | 'partial' | 'pending' | 'promptError' | 'lastAgentError' | 'nodes'>

function snapshot(overrides: Partial<SnapshotInput> = {}): SnapshotInput {
  return {
    running: false,
    runningCalls: [],
    partial: null,
    pending: [],
    promptError: null,
    lastAgentError: null,
    nodes: [],
    ...overrides,
  }
}

describe('deriveCompanionState', () => {
  it('gives user-blocking and failure facts precedence over activity', () => {
    expect(deriveCompanionState({ snapshot: snapshot({
      running: true,
      runningCalls: [{ callId: '1', name: 'bash' } as never],
      pending: [{ kind: 'question' } as never],
    }) })).toBe('waiting')
    expect(deriveCompanionState({ snapshot: snapshot({
      running: true,
      pending: [{ kind: 'question' } as never],
      lastAgentError: 'failed',
    }) })).toBe('error')
  })

  it('separates tool, streaming, thinking, success and sleep states', () => {
    expect(deriveCompanionState({ snapshot: snapshot({ running: true, runningCalls: [{ callId: '1' } as never] }) })).toBe('tool')
    expect(deriveCompanionState({ snapshot: snapshot({
      running: true,
      partial: { turn: 1, step: 1, blocks: [{ kind: 'text', text: 'hello' }] },
    }) })).toBe('streaming')
    expect(deriveCompanionState({ snapshot: snapshot({ running: true }) })).toBe('thinking')
    expect(deriveCompanionState({ snapshot: snapshot(), completedPulse: true })).toBe('success')
    expect(deriveCompanionState({ snapshot: snapshot(), sleeping: true })).toBe('sleeping')
  })
})

describe('assistant preview privacy boundary', () => {
  it('uses streaming assistant text while excluding reasoning and tool data', () => {
    const result = extractAssistantPreview({
      partial: {
        turn: 1,
        step: 1,
        blocks: [
          { kind: 'reasoning', text: 'private chain' },
          { kind: 'text', text: '公开回复' },
          { kind: 'tool-call', callId: 'x', name: 'bash', argsRaw: 'secret' } as never,
        ],
      },
      nodes: [],
    })
    expect(result).toEqual({ text: '公开回复', source: 'partial', redacted: false })
  })

  it('falls back to the latest finalized assistant and redacts credential-like material', () => {
    const secret = 'a'.repeat(64)
    const result = extractAssistantPreview({
      partial: null,
      nodes: [
        { kind: 'assistant', seq: 1, turn: 1, step: 1, time: 1, blocks: [{ kind: 'text', text: 'older' }] },
        { kind: 'assistant', seq: 2, turn: 2, step: 1, time: 2, blocks: [{ kind: 'text', text: `完成 ${secret}` }] },
      ],
    })
    expect(result.text).toBe('完成 [已脱敏]')
    expect(result.source).toBe('final')
    expect(result.redacted).toBe(true)
  })

  it('strips code and URLs before local speech', () => {
    expect(speechText('结果 `x = 1`，详见 https://example.com')).toBe('结果 代码，详见 链接')
  })

  it('removes markdown and kaomoji that legacy voices pronounce mechanically', () => {
    const result = speechText('---\n> **咕噜咕噜～嗨！** (*´▽*)\n- 详见 [使用说明](https://example.com)')

    expect(result).toBe('咕噜咕噜～嗨！详见 使用说明')
    expect(result).not.toMatch(/[>*_[\]()]/)
  })
})

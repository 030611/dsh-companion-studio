import type {
  AssistantBlock,
  ConversationNode,
  ConversationSnapshot,
} from '@deepseek-ai/dsh-client-runtime/client'

export type CompanionState =
  | 'idle'
  | 'thinking'
  | 'streaming'
  | 'tool'
  | 'waiting'
  | 'success'
  | 'error'
  | 'sleeping'

export interface StateInput {
  snapshot: Pick<ConversationSnapshot,
    'running' | 'runningCalls' | 'partial' | 'pending' | 'promptError' | 'lastAgentError' | 'nodes'> | null
  completedPulse?: boolean
  sleeping?: boolean
}

export interface AssistantPreview {
  text: string
  source: 'partial' | 'final' | 'none'
  redacted: boolean
}

const SECRET_PATTERNS: readonly RegExp[] = [
  /\b(?:sk|rk|pk)-[A-Za-z0-9_-]{16,}\b/g,
  /\b(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{16,}\b/g,
  /\bnpm_[A-Za-z0-9]{16,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+\/-]{12,}=*\b/gi,
  /\b[A-Fa-f0-9]{64}\b/g,
]

/** Pure precedence table mapping official DSH facts to one animation state. */
export function deriveCompanionState({ snapshot, completedPulse = false, sleeping = false }: StateInput): CompanionState {
  if (snapshot && (snapshot.promptError || snapshot.lastAgentError || hasTerminalError(snapshot.nodes))) return 'error'
  if ((snapshot?.pending.length ?? 0) > 0) return 'waiting'
  if ((snapshot?.runningCalls.length ?? 0) > 0) return 'tool'
  if (snapshot?.running && hasVisibleText(snapshot.partial?.blocks ?? [])) return 'streaming'
  if (snapshot?.running) return 'thinking'
  if (completedPulse) return 'success'
  if (sleeping) return 'sleeping'
  return 'idle'
}

/** Return only assistant-authored text; reasoning, tool arguments and tool results never enter the bubble. */
export function extractAssistantPreview(snapshot: Pick<ConversationSnapshot, 'partial' | 'nodes'> | null, limit = 180): AssistantPreview {
  if (!snapshot) return { text: '', source: 'none', redacted: false }
  const partialText = textFromBlocks(snapshot.partial?.blocks ?? [])
  if (partialText) return sanitizePreview(partialText, 'partial', limit)

  for (let index = snapshot.nodes.length - 1; index >= 0; index -= 1) {
    const node = snapshot.nodes[index]
    if (node?.kind !== 'assistant') continue
    const text = textFromBlocks(node.blocks)
    if (text) return sanitizePreview(text, 'final', limit)
  }
  return { text: '', source: 'none', redacted: false }
}

/** Text-to-speech input is deliberately shorter and strips code/URLs before touching the local browser voice. */
export function speechText(preview: string, limit = 320): string {
  return normalizeText(preview)
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, ' 代码片段 ')
    .replace(/`[^`]*`/g, ' 代码 ')
    .replace(/https?:\/\/\S+/g, ' 链接 ')
    .replace(/^\s*[-*_]{3,}\s*$/gm, ' ')
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+])\s+/gm, '')
    .replace(/\*\*|__|~~/g, '')
    .replace(/[*_]/g, '')
    .replace(/\([^\n)]*[▽ω﹏Дᴗ•´][^\n)]*\)/gu, '，')
    .replace(/[—-]{2,}/g, '，')
    .replace(/[ \t]*\n+[ \t]*/g, '。')
    .replace(/\s+([，。！？；：])/g, '$1')
    .replace(/([！？。])，。/g, '$1')
    .replace(/，。/g, '。')
    .replace(/([！？])。/g, '$1')
    .replace(/。{2,}/g, '。')
    .replace(/\s+([，。！？；：])/g, '$1')
    .replace(/[\t ]+/g, ' ')
    .slice(0, limit)
    .trim()
}

function sanitizePreview(raw: string, source: AssistantPreview['source'], limit: number): AssistantPreview {
  let text = normalizeText(raw)
    .replace(/!\[[^\]]*]\([^)]*\)/g, '[图片]')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '[代码片段]')
    .replace(/`([^`]*)`/g, '$1')
  let redacted = false
  for (const pattern of SECRET_PATTERNS) {
    pattern.lastIndex = 0
    if (pattern.test(text)) redacted = true
    pattern.lastIndex = 0
    text = text.replace(pattern, '[已脱敏]')
  }
  if (text.length > limit) text = `${text.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
  return { text, source, redacted }
}

function textFromBlocks(blocks: readonly AssistantBlock[]): string {
  return blocks.flatMap(block => block.kind === 'text' ? [block.text] : []).join('\n')
}

function hasVisibleText(blocks: readonly AssistantBlock[]): boolean {
  return blocks.some(block => block.kind === 'text' && block.text.trim().length > 0)
}

function hasTerminalError(nodes: readonly ConversationNode[]): boolean {
  return nodes.at(-1)?.kind === 'turn-error'
}

function normalizeText(text: string): string {
  return text.replace(/\r\n?/g, '\n').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
}

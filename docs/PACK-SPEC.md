# Companion Pack v1

Each pack is an independently licensed character. A pack may provide several outfits, and an outfit may override only the animations it changes.

```ts
interface CompanionPack {
  schemaVersion: 1
  id: string
  version: string
  name: string
  characterName: string
  author: string
  license: string
  homepage?: string
  glyph: string
  palette: { primary: string; secondary: string; glow: string }
  outfits: readonly CompanionOutfit[]
  defaultOutfitId: string
  animations?: Partial<Record<CompanionState, CompanionAnimation>>
}
```

## Required states

A production first-party pack should cover `idle`, `thinking`, `streaming`, `tool`, `waiting`, `success`, `error` and `sleeping`. Missing animation entries fall back to the core's accessible placeholder rather than silently reusing a misleading state.

## Sprite sheets

- Transparent PNG or WebP with a documented source and license.
- Equal-size horizontal frames.
- Tight but non-clipping bounds and a stable foot anchor.
- Recommended rendered height: 144–192 CSS pixels at 1×.
- Motion must remain readable at 60 Hz and must not flash.
- The UI disables animation when `prefers-reduced-motion` is active.

## Outfit rule

An outfit is a visual override, not a second character identity. Hair, palette and clothing variants belong under the same pack when the face, name and base silhouette remain the same. A different species or character gets another package so users can install only what they want.

## Registration

```ts
import { registerCompanionPack } from 'dsh-companion-studio/client-api'
import { pack } from './pack.ts'

export function apply(ctx) {
  ctx.effect(() => registerCompanionPack(pack))
}
```

Registration rejects missing licenses, invalid IDs, duplicate outfit IDs, absent defaults and non-positive animation dimensions. Network downloads are not performed by the overlay. Installation remains under DSH/npm's explicit package workflow.

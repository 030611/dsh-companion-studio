# Product plan: useful before cute

## Distribution

The intended public distribution is a small core plus optional packages:

| Package | Purpose | Default |
|---|---|---:|
| `dsh-companion-studio` | state engine, privacy, pet center, voice and overlay | required |
| `dsh-pet-lanyin` | original short-haired blue whale maid | recommended starter |
| `dsh-pet-xingxi` | pearl/mint tide explorer | optional |
| `dsh-pet-lili` | mechanical sea-otter workshop assistant | optional |
| `dsh-pet-mianmian` | moon-rabbit coding engineer | optional |
| `dsh-outfit-*` | additional outfits for one declared character | optional |

The core must never silently install a character, voice or network dependency. The pet center shows installed packs and copies an explicit DSH/npm installation command for catalog entries. Removal leaves settings intact but falls back to an available character.

## Launch differentiation

1. **State literacy** — eight official-session states, not a generic idle/busy toggle.
2. **Reply glance** — a short, assistant-only live bubble with automatic secret redaction.
3. **Human-action alarm** — approval and question waits are visually and audibly distinct from completion.
4. **Multi-session radar** — later show running/waiting counts and jump to the selected session without exposing content from other sessions.
5. **Local voice** — opt-in completion TTS first; microphone/STT only after a permission and browser-compatibility review.
6. **Real absence** — dock, hide and a separate header restore control.
7. **Asset packs** — character, hair and outfits are replaceable without duplicating the session engine.
8. **Create mode** — upload one local transparent image for an instant private pet; graduate to per-state images only when desired.

## Create mode levels

- **Level 1 (implemented):** one PNG/WebP, filename-derived name, local normalization and storage, automatic state motions, delete at any time.
- **Level 2:** optional crop/anchor editor, display scale and per-state image replacement.
- **Level 3:** layered hair/outfits, expression overlays and export/import of a signed `.dshpet` archive.

Automatic background removal is intentionally outside Level 1: a remote remover would upload the image, while a high-quality local model would greatly increase the package. If added later, the privacy and download cost must be explicit.

## Motion grammar

Each state can eventually hold several weighted clips to avoid obvious repetition:

| State | Example motions | Expression cue |
|---|---|---|
| idle | breathe, blink, look around, tail sway | calm |
| thinking | inspect notes, orbiting star, head tilt | focused |
| streaming | tiny typing, nodding, tail rhythm | engaged |
| tool | lantern scan, wrench, file cards | working |
| waiting | hand raise, question bubble, alert light | asking |
| success | jump, spin, confetti, salute | delighted |
| error | stumble, red lantern, retry gesture | concerned, not blaming |
| sleeping | curl up, dim light, slow breathing | quiet |

Clips are selected with a no-immediate-repeat rule. Reduced-motion mode uses a static pose plus status badge.

## Voice boundary

Version 0.1 uses only browser-local `speechSynthesis`, disabled by default. Voice input is a separate feature because it needs microphone permission, clear recording indicators, cancellation, language choice and a statement of whether recognition is local or remote. It must not be smuggled into a cosmetic pack.

## Pack trust

Every catalog entry must disclose author, license, source URL, package size and asset hashes. First-party packs must have no install scripts and no network permission. Community packs are still executable npm/DSH plugins, so the UI must not label them “safe” merely because their manifest validates.

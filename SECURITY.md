# Security policy

## Reporting

Please do not publish credentials, private prompts, tool output or other sensitive data in an issue. Open a minimal issue asking for a private contact channel, or use GitHub's private vulnerability reporting when it is enabled for this repository.

## Privacy boundary

Companion Studio selects only assistant text for its optional reply preview and local speech. User prompts, reasoning blocks, tool names, tool arguments, tool results and approval payloads are excluded. User-uploaded pet images are normalized locally and stored in browser IndexedDB; the core does not upload them.

## Supported version

This repository is an early preview. Security fixes target the latest commit on `main` until the first tagged release.

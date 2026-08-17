import { mkdir, writeFile } from 'node:fs/promises'

await mkdir(new URL('../lib/types/', import.meta.url), { recursive: true })
await Promise.all([
  writeFile(new URL('../lib/package.json', import.meta.url), '{"type":"commonjs"}\n'),
  writeFile(new URL('../lib/types/package.json', import.meta.url), '{"type":"module"}\n'),
])

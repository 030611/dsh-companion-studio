import { defineConfig } from 'tsdown'

const external = ['react', 'react/jsx-runtime']

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/client-api.ts'],
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    dts: false,
    clean: false,
  },
  {
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    dts: false,
    sourcemap: true,
    clean: false,
    external,
    outputOptions: {
      entryFileNames: 'client.js',
      banner: 'window.__ModuleLoader__.load({ id: "dsh-companion-studio", factory: (require) => {',
      footer: 'return module.exports; } });',
      intro: 'var module = { exports: {} }; var exports = module.exports;',
    },
  },
])

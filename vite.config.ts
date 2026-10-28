/// <reference types="vitest/config" />
import { defineConfig, runnerImport, type Plugin } from 'vite'

type Render = () => { head: string; body: string }

function prerender(): Plugin {
  return {
    name: 'prerender',
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        const entry = '/src/render.ts'
        const { render } = ctx.server
          ? ((await ctx.server.ssrLoadModule(entry)) as { render: Render })
          : (await runnerImport<{ render: Render }>(entry, { configFile: false, logLevel: 'error' })).module
        const { head, body } = render()
        return html.replace('<!--head-->', head).replace('<!--app-->', body)
      },
    },
  }
}

export default defineConfig({
  plugins: [prerender()],
  test: {
    environment: 'node',
    globals: true,
  },
})

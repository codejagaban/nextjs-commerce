import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const storageRequire = createRequire(require.resolve('@payloadcms/storage-s3'))
const cloudStorageRoot = path.resolve(
  path.dirname(storageRequire.resolve('@payloadcms/plugin-cloud-storage')),
  '..',
)

function javascriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name)
    return entry.isDirectory()
      ? javascriptFiles(filename)
      : entry.name.endsWith('.js')
        ? [filename]
        : []
  })
}

describe('version-scoped security overrides', () => {
  it('only removes a dependency unused by the inspected cloud-storage release', () => {
    const manifest = JSON.parse(readFileSync(path.join(cloudStorageRoot, 'package.json'), 'utf8'))
    // A Payload upgrade must explicitly re-evaluate the override, not inherit it silently.
    expect(manifest.version).toBe('3.93.0')
    const files = javascriptFiles(path.join(cloudStorageRoot, 'dist'))
    expect(files.length).toBeGreaterThan(0)
    for (const filename of files) {
      expect(readFileSync(filename, 'utf8'), filename).not.toContain('find-node-modules')
    }
  })

  it('converts rich-text HTML with the patched DOM while remote resource loading stays disabled', async () => {
    const richtextRequire = createRequire(require.resolve('@payloadcms/richtext-lexical'))
    const headlessRequire = createRequire(richtextRequire.resolve('@lexical/headless'))
    type HeadlessWindow = typeof globalThis.window & {
      happyDOM: { settings: { enableIframePageLoading: boolean; enableCSSFileLoading: boolean } }
    }
    const { withDOM } = (await import(
      pathToFileURL(headlessRequire.resolve('@lexical/headless/dom')).href
    )) as {
      withDOM: <T>(callback: (window: HeadlessWindow) => T) => T
    }
    const { createHeadlessEditor } = await import('@payloadcms/richtext-lexical/lexical/headless')
    const { $generateHtmlFromNodes, $generateNodesFromDOM } =
      await import('@payloadcms/richtext-lexical/lexical/html')
    const { $getRoot } = await import('@payloadcms/richtext-lexical/lexical')
    const previousDocument = globalThis.document
    const html = withDOM((window) => {
      const settings = window.happyDOM.settings
      expect(settings.enableIframePageLoading).toBe(false)
      expect(settings.enableCSSFileLoading).toBe(false)
      const editor = createHeadlessEditor({
        onError: (error) => {
          throw error
        },
      })
      const document = new window.DOMParser().parseFromString(
        '<p>Daily <strong>cleanser</strong> routine</p>',
        'text/html',
      )
      editor.update(
        () => {
          $getRoot().append(...$generateNodesFromDOM(editor, document))
        },
        { discrete: true },
      )
      return editor.getEditorState().read(() => $generateHtmlFromNodes(editor))
    })
    expect(html).toContain('cleanser')
    expect(html).toContain('<strong')
    expect(html).toContain('routine')
    expect(globalThis.document).toBe(previousDocument)
  })
})

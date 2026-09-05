// Build a labeled contact sheet of the seed assets so we can eyeball each photo.
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const dir = path.resolve('src/endpoints/seed/assets')
const out = process.argv[2] || 'contact-sheet.png'
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort()

const cols = 5
const rows = Math.ceil(files.length / cols)
const cw = 360
const ch = 300
const labelH = 26
const cellH = ch + labelH

const canvas = sharp({
  create: {
    width: cols * cw,
    height: rows * cellH,
    channels: 3,
    background: { r: 24, g: 22, b: 18 },
  },
})

const composites = []
for (let i = 0; i < files.length; i++) {
  const col = i % cols
  const row = Math.floor(i / cols)
  const x = col * cw
  const y = row * cellH
  const thumb = await sharp(path.join(dir, files[i]))
    .resize(cw, ch, { fit: 'cover' })
    .jpeg()
    .toBuffer()
  composites.push({ input: thumb, left: x, top: y })
  const label = `<svg width="${cw}" height="${labelH}"><rect width="100%" height="100%" fill="#141210"/><text x="6" y="18" font-family="monospace" font-size="14" fill="#f0e9dc">${files[i]}</text></svg>`
  composites.push({ input: Buffer.from(label), left: x, top: y + ch })
}

await canvas.composite(composites).png().toFile(out)
console.log('contact sheet ->', out, `(${files.length} images)`)

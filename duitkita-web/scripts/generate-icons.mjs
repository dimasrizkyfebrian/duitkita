// Regenerates every app icon from brand/logo-source.png.
//
// Run it after the logo changes:
//   npm i --no-save sharp && node scripts/generate-icons.mjs
//
// --no-save on purpose: sharp is a large native dependency needed only for
// this one-off asset build, never at runtime or in CI, so it shouldn't sit
// in package.json.
//
// The source art is a rounded square with TRANSPARENT CORNERS, which is why
// there are two variants of the same image below rather than one resized
// seven ways:
//
//   * "as-is"     — keeps the rounded square and its transparent corners.
//                   Right for manifest icons with purpose "any", which are
//                   drawn exactly as supplied.
//   * "full-bleed" — crops just inside the corner arc so no transparency
//                   survives. Required for (a) maskable icons, which the OS
//                   masks to its own shape and which must not have gaps, and
//                   (b) apple-touch-icon, because iOS composites it over
//                   BLACK rather than honouring the alpha channel — a
//                   transparent corner there renders as a black notch.

import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = path.join(root, 'brand', 'logo-source.png')
const PUBLIC = path.join(root, 'public')
const ICONS = path.join(PUBLIC, 'icons')

// Measured from the source art: the corner arc has a radius of 16% of the
// width. Cropping r*(1 - 1/√2) ≈ 29.3% of that radius off each side lands
// exactly on the arc; the margin below rounds it up so sub-pixel error at
// the tangent can't leave a sliver of alpha behind.
const CORNER_RADIUS_RATIO = 0.16
const TANGENT_INSET = 1 - Math.SQRT1_2
const SAFETY_MARGIN = 1.2

async function fullBleed(src) {
  const { width, height } = await sharp(src).metadata()
  const inset = Math.ceil(width * CORNER_RADIUS_RATIO * TANGENT_INSET * SAFETY_MARGIN)
  return sharp(src)
    .extract({ left: inset, top: inset, width: width - inset * 2, height: height - inset * 2 })
    .toBuffer()
}

/** Fails loudly rather than shipping an icon with a black notch on iOS. */
async function assertOpaque(buffer, label) {
  const { data, info } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true })
  if (info.channels < 4) return
  for (let i = 3; i < data.length; i += info.channels) {
    if (data[i] !== 255) throw new Error(`${label}: expected a fully opaque image`)
  }
}

async function write(input, size, name) {
  const out = path.join(ICONS, name)
  await sharp(input)
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9, palette: false })
    .toFile(out)
  return { name, size }
}

// The notification badge is a different kind of asset entirely: Android
// draws it in the status bar by throwing away the colours and keeping only
// the alpha channel, so a full-colour icon arrives as a solid blob. What's
// needed is a silhouette. The wallet sits on dark navy, and a luminance
// histogram of that region is cleanly bimodal (background ~10-40, wallet
// ~210-255), so a mid threshold separates them — and because the wallet's
// face is drawn in dark navy, the eye and wink fall below the threshold and
// stay punched out, which is what keeps the shape readable at 24px.
const WALLET_BOX = { left: 300, top: 330, width: 680, height: 620 }
const SILHOUETTE_THRESHOLD = 100

async function writeBadge(name, size) {
  const { data, info } = await sharp(SOURCE)
    .extract(WALLET_BOX)
    .raw()
    .toBuffer({ resolveWithObject: true })
  const { width, height, channels } = info

  const mask = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const luminance =
      0.2126 * data[i * channels] +
      0.7152 * data[i * channels + 1] +
      0.0722 * data[i * channels + 2]
    mask[i * 4] = 255
    mask[i * 4 + 1] = 255
    mask[i * 4 + 2] = 255
    mask[i * 4 + 3] = luminance > SILHOUETTE_THRESHOLD ? 255 : 0
  }

  const transparent = { r: 0, g: 0, b: 0, alpha: 0 }
  const inset = Math.round(size * 0.0625)
  await sharp(mask, { raw: { width, height, channels: 4 } })
    // 'contain' letterboxes the non-square crop to a square in one step.
    // Doing it with .extend() after .resize() would not work: sharp applies
    // a fixed pipeline order (resize, then extend) regardless of call order,
    // so the padding would be added to the already-resized image and the
    // result would come out taller than it is wide.
    .resize(size - inset * 2, size - inset * 2, { fit: 'contain', background: transparent })
    .extend({ top: inset, bottom: inset, left: inset, right: inset, background: transparent })
    .png({ compressionLevel: 9 })
    .toFile(path.join(ICONS, name))
  return { name, size }
}

// public/favicon.ico isn't referenced from index.html, but browsers request
// /favicon.ico on their own (and bookmarks and some crawlers only look
// there), so a stale one keeps the old brand alive in places the <link>
// tags never reach. Modern ICO can simply wrap a PNG, so this is a 22-byte
// header in front of the 32px favicon rather than a real ICO encoder.
async function writeFaviconIco(pngBuffer, size) {
  const header = Buffer.alloc(22)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(1, 4) // one image
  header.writeUInt8(size, 6) // width  (0 would mean 256)
  header.writeUInt8(size, 7) // height
  header.writeUInt8(0, 8) // palette size: 0 = truecolour
  header.writeUInt8(0, 9) // reserved
  header.writeUInt16LE(1, 10) // colour planes
  header.writeUInt16LE(32, 12) // bits per pixel
  header.writeUInt32LE(pngBuffer.length, 14)
  header.writeUInt32LE(header.length, 18) // offset to the image data
  await writeFile(path.join(PUBLIC, 'favicon.ico'), Buffer.concat([header, pngBuffer]))
  return { name: 'favicon.ico', size }
}

await mkdir(ICONS, { recursive: true })

const bleed = await fullBleed(SOURCE)
await assertOpaque(bleed, 'full-bleed crop')

const written = await Promise.all([
  // Manifest "any" — drawn as supplied, so the designed rounded square stays.
  write(SOURCE, 192, 'icon-192.png'),
  write(SOURCE, 512, 'icon-512.png'),
  // In-app <BrandMark>, shown around 28px; 128 covers 3x displays. Uses the
  // full-bleed crop because BrandMark rounds the corners in CSS anyway —
  // feeding it the pre-rounded art would round already-rounded corners and
  // spend ~13% of a 28px box on padding the wallet can't use.
  write(bleed, 128, 'logo-mark-128.png'),
  // Masked or composited by the platform — must be full-bleed.
  write(bleed, 512, 'icon-maskable-512.png'),
  write(bleed, 180, 'apple-touch-icon.png'),
  write(bleed, 32, 'favicon-32.png'),
  write(bleed, 16, 'favicon-16.png'),
  // Status-bar badge — alpha-only silhouette, see writeBadge.
  writeBadge('badge-96.png', 96),
  writeFaviconIco(await sharp(bleed).resize(32, 32).png({ compressionLevel: 9 }).toBuffer(), 32),
])

for (const { name, size } of written) {
  console.log(`${name.padEnd(24)} ${String(size).padStart(3)}px`)
}

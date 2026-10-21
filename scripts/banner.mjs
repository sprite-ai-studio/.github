#!/usr/bin/env node
// Writes a light and a dark animated SVG banner in the style of the
// sprite-ai.art landing page: a space invaders formation on an 8px-style
// pixel grid, a cannon that shoots it, and a pixel-font title.
//
//   node scripts/banner.mjs --title "SPRITE AI MCP" --subtitle "MCP SERVER FOR AI EDITORS" --out profile/banner
//   -> profile/banner-light.svg, profile/banner-dark.svg
//
// No dependencies. Every animation shares one cycle (CYCLE seconds), and the
// shots and hits are worked out here, so the bullets really hit the aliens.

import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]])
    return pairs
  }, []),
)
const TITLE = (args.title ?? 'SPRITE AI').toUpperCase()
const SUBTITLE = (args.subtitle ?? 'AI PIXEL ART FOR GAME DEVELOPERS').toUpperCase()
const OUT = args.out ?? 'profile/banner'

// Title and subtitle colours per theme. pink is the title's shadow.
const THEMES = {
  light: { pink: '#db2475', text: '#0c0a09', muted: '#78716c' },
  dark: { pink: '#db2475', text: '#fafaf9', muted: '#a8a29e' },
}

// Sprites look the same in both themes: solid colours, pink mixed into white,
// from shade[0] of pink at the sprite's centre to shade[1] at its edge.
const SPRITE = { pink: '#db2475', bg: '#ffffff', shade: [0.85, 0.15] }

const mix = (fg, bg, amount) => {
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const [a, b] = [rgb(fg), rgb(bg)]
  return `#${a.map((v, i) => Math.round(b[i] + (v - b[i]) * amount).toString(16).padStart(2, '0')).join('')}`
}

// The alien and cannon sprites are the sprite-ai.art landing page's own.
const ALIEN_A = [
  '001000000100',
  '000100011000',
  '001111111100',
  '001111111100',
  '011011100110',
  '111111111111',
  '101111111101',
  '101000000101',
  '000100011000',
  '000100000000',
]
const ALIEN_B = [
  '001000000100',
  '000100011000',
  '001111111100',
  '001111111100',
  '011001110110',
  '111111111111',
  '101111111101',
  '101000000101',
  '000110001000',
  '000000001000',
]
const PLAYER = ['0001000', '0001000', '0011100', '0111110', '1111111']
const BOOM = [
  '000100001000',
  '010010010010',
  '001000000100',
  '000100001000',
  '110000000011',
  '000100001000',
  '001000000100',
  '010010010010',
  '000100001000',
]

// 5x7 pixel font.
const FONT = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110', D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110', J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 10001 11001 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111', 3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00010 01100',
  '-': '00000 00000 00000 11111 00000 00000 00000', '.': '00000 00000 00000 00000 00000 01100 01100',
  '/': '00001 00010 00010 00100 01000 01000 10000', ':': '00000 01100 01100 00000 01100 01100 00000',
  '+': '00000 00100 00100 11111 00100 00100 00000', '!': '00100 00100 00100 00100 00100 00000 00100',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
}

// Layout, in px of a 960-wide banner.
const W = 960
const H = 360
const AC = 5 // alien and cannon cell
const ALIEN_W = 12 * AC
const ALIEN_H = 10 * AC
const COLS = 8
const ROWS = 2
const GAP_X = 24
const GAP_Y = 16
const MARCH_STEP = 10
const MARCH_STEPS = 8
const FORMATION_W = COLS * ALIEN_W + (COLS - 1) * GAP_X
const FORMATION_X = Math.round((W - FORMATION_W - MARCH_STEP * MARCH_STEPS) / 2)
const ROW_Y = [20, 20 + ALIEN_H + GAP_Y]
const PLAYER_Y = 176
const BULLET_W = AC
const BULLET_H = 3 * AC
const BULLET_SPEED = 400 // px per second
const BULLET_TICK = 0.025

// One cycle: the formation marches 8 steps right and 8 back, a step each MARCH_TICK.
const MARCH_TICK = 0.5
const CYCLE = MARCH_TICK * MARCH_STEPS * 2
const PLAYER_TICK = 0.125
const PLAYER_MOVE = 30 // px per player tick
// [first tick, x]: the cannon holds at x from that tick and fires one tick later.
// Each x lines a shot up with a bottom-row alien at that moment of the march.
const PLAYER_STOPS = [
  [0, 210],
  [16, 500],
  [32, 710],
  [50, 335],
]

const pct = (t) => `${((t / CYCLE) * 100).toFixed(3)}%`
const marchOffset = (t) => {
  const k = Math.floor(t / MARCH_TICK) % (MARCH_STEPS * 2)
  return (k <= MARCH_STEPS ? k : MARCH_STEPS * 2 - k) * MARCH_STEP
}

// Cannon x at every player tick: hold at a stop for 4 ticks, then walk to the next.
function playerPath() {
  const ticks = Math.round(CYCLE / PLAYER_TICK)
  const xs = new Array(ticks)
  const stops = [...PLAYER_STOPS, [ticks, PLAYER_STOPS[0][1]]]
  for (let s = 0; s < stops.length - 1; s++) {
    const [from, x] = stops[s]
    const [to, nextX] = stops[s + 1]
    let cur = x
    for (let i = from; i < to; i++) {
      if (i >= from + 4) cur += Math.sign(nextX - cur) * Math.min(PLAYER_MOVE, Math.abs(nextX - cur))
      xs[i] = cur
    }
  }
  return xs
}

// Fly each shot up the screen; the first live alien it meets dies.
function shots(xs) {
  const dead = new Map() // alien index -> time of death
  return PLAYER_STOPS.map(([tick]) => {
    const fireTick = tick + 1
    const t0 = fireTick * PLAYER_TICK
    const x = xs[fireTick] + 3 * AC
    const top0 = PLAYER_Y - BULLET_H
    const frames = []
    for (let i = 0; ; i++) {
      const t = t0 + i * BULLET_TICK
      const top = top0 - i * BULLET_TICK * BULLET_SPEED
      frames.push({ t, dy: top - top0 })
      if (top + BULLET_H < 0) return { x, frames, hit: null }
      for (let row = ROWS - 1; row >= 0; row--) {
        const bottom = ROW_Y[row] + ALIEN_H
        if (top > bottom || top + BULLET_H < ROW_Y[row]) continue
        for (let col = 0; col < COLS; col++) {
          const idx = row * COLS + col
          const ax = FORMATION_X + marchOffset(t) + col * (ALIEN_W + GAP_X)
          if (dead.has(idx) || x + BULLET_W <= ax + AC || x >= ax + ALIEN_W - AC) continue
          dead.set(idx, t)
          return { x, frames, hit: { idx, t } }
        }
      }
    }
  })
}

// A sprite as rects, shaded like the landing page: darkest at the centre.
function spriteRects(rows, cell) {
  const h = rows.length
  const w = rows[0].length
  const max = Math.hypot(w / 2, h / 2)
  const [centre, edge] = SPRITE.shade
  let out = ''
  rows.forEach((line, y) =>
    [...line].forEach((bit, x) => {
      if (bit !== '1') return
      const t = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2) / max
      const fill = mix(SPRITE.pink, SPRITE.bg, centre + (edge - centre) * t)
      out += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}" fill="${fill}"/>`
    }),
  )
  return out
}

function textRects(text, cell, x0, y0, fill) {
  let out = ''
  ;[...text].forEach((ch, i) => {
    const glyph = (FONT[ch] ?? FONT[' ']).split(' ')
    glyph.forEach((line, y) =>
      [...line].forEach((bit, x) => {
        if (bit === '1') out += `<rect x="${x0 + (i * 6 + x) * cell}" y="${y0 + y * cell}" width="${cell}" height="${cell}"/>`
      }),
    )
  })
  return `<g fill="${fill}">${out}</g>`
}

function keyframes(name, steps) {
  const body = steps.map(([t, css]) => `${typeof t === 'string' ? t : pct(t)}{${css}}`).join('')
  return `@keyframes ${name}{${body}}`
}

function banner(theme) {
  const c = THEMES[theme]
  const xs = playerPath()
  const fired = shots(xs)
  const css = []
  const anim = (name) => `animation:${name} ${CYCLE}s steps(1,end) infinite`

  const marchTicks = MARCH_STEPS * 2
  const march = []
  const flipA = []
  const flipB = []
  for (let k = 0; k < marchTicks; k++) {
    const t = k * MARCH_TICK
    march.push([t, `transform:translateX(${marchOffset(t)}px)`])
    flipA.push([t, `opacity:${k % 2 ? 0 : 1}`])
    flipB.push([t, `opacity:${k % 2 ? 1 : 0}`])
  }
  march.push(['100%', 'transform:translateX(0px)'])
  css.push(keyframes('march', march), `.march{${anim('march')}}`)
  css.push(keyframes('fa', flipA), `.fa{${anim('fa')}}`, keyframes('fb', flipB), `.fb{${anim('fb')}}`)

  const walk = xs.map((x, i) => [i * PLAYER_TICK, `transform:translateX(${x}px)`])
  walk.push(['100%', `transform:translateX(${xs[0]}px)`])
  css.push(keyframes('walk', walk), `.walk{${anim('walk')}}`)

  let bullets = ''
  const deaths = new Map()
  fired.forEach((shot, n) => {
    const end = shot.hit ? shot.hit.t : shot.frames[shot.frames.length - 1].t
    const steps = [['0%', 'opacity:0;transform:translateY(0px)']]
    shot.frames.forEach((f) => steps.push([f.t, `opacity:${f.t < end ? 1 : 0};transform:translateY(${f.dy}px)`]))
    steps.push(['100%', 'opacity:0;transform:translateY(0px)'])
    css.push(keyframes(`b${n}`, steps), `.b${n}{${anim(`b${n}`)}}`)
    bullets += `<rect class="b${n}" x="${shot.x}" y="${PLAYER_Y - BULLET_H}" width="${BULLET_W}" height="${BULLET_H}" fill="${mix(SPRITE.pink, SPRITE.bg, SPRITE.shade[0])}" opacity="0"/>`
    if (shot.hit) deaths.set(shot.hit.idx, shot.hit.t)
  })

  let aliens = ''
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const idx = row * COLS + col
      const x = FORMATION_X + col * (ALIEN_W + GAP_X)
      const y = ROW_Y[row]
      const died = deaths.get(idx)
      let body = `<use href="#alienA" class="fa"/><use href="#alienB" class="fb" opacity="0"/>`
      let boom = ''
      if (died !== undefined) {
        css.push(keyframes(`d${idx}`, [['0%', 'opacity:1'], [died, 'opacity:0'], ['100%', 'opacity:0']]), `.d${idx}{${anim(`d${idx}`)}}`)
        css.push(
          keyframes(`x${idx}`, [['0%', 'opacity:0'], [died, 'opacity:1'], [died + 0.375, 'opacity:0'], ['100%', 'opacity:0']]),
          `.x${idx}{${anim(`x${idx}`)}}`,
        )
        body = `<g class="d${idx}">${body}</g>`
        boom = `<use href="#boom" class="x${idx}" opacity="0"/>`
      }
      aliens += `<g transform="translate(${x} ${y})">${body}${boom}</g>`
    }
  }

  const titleCell = Math.min(8, Math.floor((W - 80) / (TITLE.length * 6 - 1)))
  const titleW = (TITLE.length * 6 - 1) * titleCell
  const titleX = Math.round((W - titleW) / 2)
  const titleY = 232
  const subCell = 3
  const subW = (SUBTITLE.length * 6 - 1) * subCell
  const subX = Math.round((W - subW) / 2)
  const subY = titleY + 7 * titleCell + 28

  css.push('@media (prefers-reduced-motion:reduce){*{animation:none!important}}')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${TITLE}: ${SUBTITLE}">
<title>${TITLE}</title>
<style>${css.join('')}</style>
<defs>
<g id="alienA">${spriteRects(ALIEN_A, AC)}</g>
<g id="alienB">${spriteRects(ALIEN_B, AC)}</g>
<g id="boom">${spriteRects(BOOM, AC)}</g>
</defs>
<g class="march">${aliens}</g>
${bullets}
<g class="walk"><g transform="translate(0 ${PLAYER_Y})">${spriteRects(PLAYER, AC)}</g></g>
${textRects(TITLE, titleCell, titleX + titleCell / 2, titleY + titleCell / 2, c.pink)}
${textRects(TITLE, titleCell, titleX, titleY, c.text)}
${textRects(SUBTITLE, subCell, subX, subY, c.muted)}
</svg>
`
}

mkdirSync(dirname(OUT), { recursive: true })
for (const theme of Object.keys(THEMES)) {
  const file = `${OUT}-${theme}.svg`
  writeFileSync(file, banner(theme))
  console.log(file)
}

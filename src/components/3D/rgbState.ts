import { Color } from 'three'

// Shared RGB lighting state for the 3D scene (case strips, RAM strips, fan LEDs).
// 'rainbow' cycles hue over time; a hex value pins a solid color.

export const rgbState = {
  mode: 'rainbow' as 'rainbow' | 'solid',
  color: '#C8102E',
}

const _c = new Color()

/** Writes the current RGB color into `target` for this frame. */
export function applyRgb(target: Color): void {
  if (rgbState.mode === 'rainbow') {
    target.setHSL((Date.now() * 0.0005) % 1, 0.9, 0.55)
  } else {
    target.set(rgbState.color)
  }
}

/** Convenience: returns a fresh Color for the current RGB. */
export function currentRgb(): Color {
  applyRgb(_c)
  return _c
}

export const RGB_SWATCHES: { id: string; color: string }[] = [
  { id: 'rainbow', color: 'conic' },
  { id: 'red', color: '#ff1a3c' },
  { id: 'gold', color: '#C9A84C' },
  { id: 'green', color: '#19e36b' },
  { id: 'cyan', color: '#19c8ff' },
  { id: 'blue', color: '#2a5cff' },
  { id: 'purple', color: '#a855f7' },
  { id: 'white', color: '#ffffff' },
]

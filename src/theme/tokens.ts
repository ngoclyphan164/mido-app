/**
 * Values from the Mido design that can't live in CSS utilities: gradient stops,
 * native shadow triplets and the per-member avatar ramp.
 *
 * The design generates avatar colours with `oklch(0.9 0.055 <hue>)` for the
 * background and `oklch(0.4 0.1 <hue>)` for the initial, at hues
 * 25/95/165/250/320. Both are pre-converted to sRGB here.
 */

export const AVATAR_PALETTE = [
  { bg: '#FFD1CC', fg: '#742E2B' }, // hue 25
  { bg: '#E9DEB5', fg: '#594600' }, // hue 95
  { bg: '#BDEAD5', fg: '#00583A' }, // hue 165
  { bg: '#C3E2FF', fg: '#124A7B' }, // hue 250
  { bg: '#EFD3F5', fg: '#5F3369' }, // hue 320
] as const;

export function avatarColors(hueIndex: number) {
  return AVATAR_PALETTE[hueIndex % AVATAR_PALETTE.length];
}

/** `linear-gradient(135deg, ...)` maps to a top-left → bottom-right sweep. */
export const DIAGONAL = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } as const;
/** `linear-gradient(90deg, ...)` — left → right. */
export const HORIZONTAL = { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } } as const;
/** `linear-gradient(160deg, ...)` — steeply down, drifting right. */
export const STEEP = { start: { x: 0.2, y: 0 }, end: { x: 0.8, y: 1 } } as const;

export const GRADIENTS = {
  cta: ['#FF8A73', '#F0564F'] as const,
  welcomeHeader: ['#FF9A7A', '#F0564F', '#C22B44'] as const,
  logoTile: ['#FFB199', '#F0564F'] as const,
  categoryActive: ['#FF9A7A', '#F0564F'] as const,
  sliderTrack: ['#FF9A7A', '#F0564F'] as const,
};

/**
 * The design's `box-shadow` values, carried over verbatim. React Native 0.86
 * takes CSS shorthand for `boxShadow` and deprecates the older `shadow*` props,
 * so the alpha and colour survive intact on both platforms.
 */
export const SHADOWS = {
  /** Inputs and unselected chips. */
  field: { boxShadow: '0px 2px 8px rgba(43,20,32,0.05)' },
  /** Plain cards. */
  card: { boxShadow: '0px 2px 10px rgba(43,20,32,0.05)' },
  /** Round icon buttons and the active segment. */
  pill: { boxShadow: '0px 2px 6px rgba(43,20,32,0.08)' },
  /** The "best match" suggestion card. */
  recommended: { boxShadow: '0px 8px 20px rgba(240,86,79,0.12)' },
  /** Primary CTA. */
  cta: { boxShadow: '0px 10px 24px rgba(240,86,79,0.3)' },
  /** Selected chip / category tile. */
  chipActive: { boxShadow: '0px 4px 10px rgba(240,86,79,0.3)' },
  /** Logo tile on the coral header. */
  logoTile: { boxShadow: '0px 8px 20px rgba(0,0,0,0.2)' },
  /** Slider knob. */
  knob: { boxShadow: '0px 2px 6px rgba(43,20,32,0.25)' },
  /** Map pin. */
  pin: { boxShadow: '0px 2px 6px rgba(0,0,0,0.2)' },
  /** Raised centre action in the tab bar. */
  fab: { boxShadow: '0px 8px 18px rgba(240,86,79,0.4)' },
  /** "Kèo sắp tới" hero card on Home. */
  hero: { boxShadow: '0px 10px 24px rgba(240,86,79,0.3)' },
} as const;

/** Hatch fill used wherever the design shows a map or photo placeholder. */
export const HATCH = {
  dark: 'rgba(43,20,32,0.06)',
  light: 'rgba(43,20,32,0.02)',
} as const;

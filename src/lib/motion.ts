import type { Transition } from 'motion/react'

/** iOS-like motion. Springs for movement, the iOS sheet curve for CSS/WAAPI. */
export const IOS_EASE = [0.32, 0.72, 0, 1] as const
export const IOS_EASE_CSS = 'cubic-bezier(0.32, 0.72, 0, 1)'

/** Snappy: thumbs, selection highlights, small controls. */
export const snap: Transition = { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 }
/** Soft: content entering, cards, panels. */
export const soft: Transition = { type: 'spring', stiffness: 260, damping: 30, mass: 0.9 }

export function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Slide an element in from a direction (used for pane and tab switches). */
export function slideIn(el: HTMLElement | null, dir: 1 | -1 | 0 = 0) {
  if (!el || prefersReducedMotion() || typeof el.animate !== 'function') return
  const from = dir === 0 ? 'translateY(10px)' : `translateX(${dir * 28}px)`
  el.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], { duration: 420, easing: IOS_EASE_CSS })
}

/** Stagger helpers for lists and sections. */
export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { ...soft, delay: i * 0.06 } }),
}

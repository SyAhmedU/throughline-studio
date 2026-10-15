import { useEffect, useLayoutEffect, useRef } from 'react'
import { STAGE_IDS } from '../lib/stages'
import type { StageId } from '../lib/types'

/** Motion owns presentation only; it never remounts editors or rewrites values. */
export function StudioMotion({ routeKey, stage }: { routeKey: string; stage?: StageId }) {
  const previous = useRef<StageId | undefined>(undefined)
  useLayoutEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const direction = stage && previous.current && STAGE_IDS.indexOf(stage) < STAGE_IDS.indexOf(previous.current) ? -1 : 1
    previous.current = stage
    const target = document.querySelector(stage ? '.ws-stage' : '.app-body > main')
    if (reduced.matches || !target?.animate) return
    const animation = target.animate([
      { opacity: .35, transform: stage ? `translateX(${direction * 14}px)` : 'translateY(12px)' },
      { opacity: 1, transform: 'translate(0)' },
    ], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' })
    const stop = () => { if (reduced.matches) animation.cancel() }
    reduced.addEventListener('change', stop)
    return () => { animation.cancel(); reduced.removeEventListener('change', stop) }
  }, [routeKey, stage])

  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const fine = matchMedia('(hover: hover) and (pointer: fine)')
    let frame = 0
    let active: HTMLElement | null = null
    const move = (event: PointerEvent) => {
      if (reduced.matches || !fine.matches) return
      const card = (event.target as Element).closest<HTMLElement>('.rh-focus, .rh-start')
      if (active !== card) { active?.style.removeProperty('--spotlight'); active = card }
      cancelAnimationFrame(frame)
      if (!card) return
      frame = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect()
        card.style.setProperty('--spot-x', `${event.clientX - rect.left}px`)
        card.style.setProperty('--spot-y', `${event.clientY - rect.top}px`)
        card.style.setProperty('--spotlight', '1')
      })
    }
    const reset = () => { cancelAnimationFrame(frame); active?.style.removeProperty('--spotlight'); active = null }
    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', reset)
    reduced.addEventListener('change', reset)
    return () => { reset(); document.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', reset); reduced.removeEventListener('change', reset) }
  }, [])
  return null
}

/* syed-juice: subtle, professional interaction polish — additive (calm button
   feedback + a thin top scroll-progress bar). No colour/design change; fully
   disabled under prefers-reduced-motion. No particle/burst or cursor-magnet effects. */
(() => {
  if (typeof document === 'undefined' || document.getElementById('syed-juice')) return
  const css = [
    '@media (prefers-reduced-motion: no-preference){',
    'button,[role=button],.btn,[class*=btn],input[type=submit],input[type=button],select,summary{transition:transform .18s cubic-bezier(.4,0,.2,1),box-shadow .2s ease,border-color .18s ease,background-color .18s ease,color .18s ease}',
    'button:active,[role=button]:active,.btn:active,[class*=btn]:active,input[type=submit]:active,select:active,summary:active{transform:translateY(1px) scale(.985);transition-duration:.06s}}',
  ].join('')
  const style = document.createElement('style')
  style.id = 'syed-juice'
  style.textContent = css
  document.head.appendChild(style)
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  // Scroll-progress bar (top edge). Stays invisible (0 width) if nothing scrolls.
  {
    const bar = document.createElement('div')
    bar.id = 'syed-scroll-prog'
    bar.setAttribute('aria-hidden', 'true')
    bar.style.cssText = 'position:fixed;top:0;left:0;height:3px;width:0;z-index:100000;background:linear-gradient(135deg,#FF9656 0%,#F14575 55%,#9270F4 100%);box-shadow:0 0 10px rgba(241,69,117,.45);transition:width .12s linear;pointer-events:none'
    const mount = () => { (document.body || document.documentElement).appendChild(bar) }
    if (document.body) mount(); else window.addEventListener('DOMContentLoaded', mount)
    const upd = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      bar.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%'
    }
    window.addEventListener('scroll', upd, { passive: true })
    window.addEventListener('resize', upd, { passive: true })
    upd()
  }
})()
export {}

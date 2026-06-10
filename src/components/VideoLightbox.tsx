// Full-screen video lightbox (sound + controls), Esc / backdrop to close.
// Used by the Hub hero tour and the worked-example walkthrough videos.
import { useEffect } from 'react'

export function VideoLightbox({
  src,
  poster,
  label,
  onClose,
}: {
  src: string
  poster?: string
  label: string
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="tour-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={label}>
        <video className="tour-modal-video" src={src} poster={poster} controls autoPlay playsInline />
        <button className="btn btn-ghost btn-sm tour-modal-close" onClick={onClose}>
          Close ✕
        </button>
      </div>
    </div>
  )
}

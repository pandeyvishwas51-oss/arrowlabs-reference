'use client'

import { useEffect } from 'react'
import { X, Download } from 'lucide-react'

// Full-screen media preview with a one-click download. Works for images + video.
export function Lightbox({ src, type = 'image', onClose }: { src: string; type?: 'image' | 'video'; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  async function download() {
    try {
      const res = await fetch(src)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = src.split('/').pop() || (type === 'video' ? 'video.mp4' : 'image.png')
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(src, '_blank')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        {type === 'video' ? (
          <video src={src} controls autoPlay className="max-h-[85vh] rounded-2xl" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="preview" className="max-h-[85vh] rounded-2xl object-contain" />
        )}
        <div className="absolute -top-3 right-0 flex -translate-y-full gap-2 pb-2">
          <button onClick={download} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-black shadow-lg">
            <Download className="h-4 w-4" /> Download
          </button>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur hover:bg-white/30">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

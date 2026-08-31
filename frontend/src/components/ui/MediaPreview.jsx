import { useState } from 'react'
import { XIcon, VideoIcon } from './icons.jsx'

export default function MediaPreview({ items }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const activeItem = activeIndex === null ? null : items[activeIndex]

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveIndex(index)}
            className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-bg"
          >
            {item.type === 'video' ? (
              <div className="flex h-full w-full items-center justify-center text-text-muted">
                <VideoIcon className="h-6 w-6" />
              </div>
            ) : (
              <img
                src={item.url}
                alt={item.label}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/70 px-2 py-1 text-left text-[11px] font-medium text-text">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {activeItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6"
          onClick={() => setActiveIndex(null)}
        >
          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            className="absolute right-6 top-6 text-text-muted hover:text-text"
            aria-label="Yopish"
          >
            <XIcon className="h-6 w-6" />
          </button>

          <div className="max-h-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            {activeItem.type === 'video' ? (
              <video src={activeItem.url} controls autoPlay className="max-h-[80vh] rounded-lg" />
            ) : (
              <img src={activeItem.url} alt={activeItem.label} className="max-h-[80vh] rounded-lg" />
            )}
            <p className="mt-3 text-center text-sm text-text-muted">{activeItem.label}</p>
          </div>
        </div>
      )}
    </>
  )
}

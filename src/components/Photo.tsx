import { useState } from 'react'
import { ImageOff } from 'lucide-react'

interface Props {
  src?: string
  alt: string
  className?: string
  fallbackClassName?: string
  label?: string
}

/** 图片组件：加载失败时降级为米色占位，不会出现破图 */
export default function Photo({ src, alt, className = '', fallbackClassName = '', label = '照片' }: Props) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-sand text-muted ${fallbackClassName || className}`}
        role="img"
        aria-label={alt}
      >
        <ImageOff size={20} strokeWidth={1.4} />
        <span className="text-[11px] tracking-wide">{label}</span>
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`photo-magazine object-cover ${className}`}
    />
  )
}

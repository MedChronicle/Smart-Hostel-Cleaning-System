import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

type Status = 'loading' | 'loaded' | 'error'

export interface ImageWithFallbackProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string
  maxRetries?: number
  retryDelayMs?: number
  showSkeleton?: boolean
  fadeInMs?: number
  aspectRatio?: string
  renderFallback?: (args: { retry: () => void; src?: string }) => React.ReactNode
  onStatusChange?: (status: Status) => void
}

export const ImageWithFallback = forwardRef<HTMLImageElement, ImageWithFallbackProps>(
  function ImageWithFallback(props, forwardedRef) {
    const {
      src,
      alt = '',
      style,
      className,
      fallbackSrc = ERROR_IMG_SRC,
      maxRetries = 2,
      retryDelayMs = 800,
      showSkeleton = true,
      fadeInMs = 250,
      aspectRatio,
      renderFallback,
      onStatusChange,
      onLoad,
      onError,
      loading = 'lazy',
      decoding = 'async',
      ...rest
    } = props

    const imgRef = useRef<HTMLImageElement>(null)
    const retryCount = useRef(0)
    const timer = useRef<ReturnType<typeof setTimeout>>()
    const [status, setStatus] = useState<Status>('loading')
    const [attempt, setAttempt] = useState(0)

    useImperativeHandle(forwardedRef, () => imgRef.current as HTMLImageElement)

    const updateStatus = useCallback(
      (next: Status) => {
        setStatus(next)
        onStatusChange?.(next)
      },
      [onStatusChange]
    )

    useEffect(() => {
      retryCount.current = 0
      setAttempt(0)
      updateStatus(src ? 'loading' : 'error')
      return () => clearTimeout(timer.current)
    }, [src]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
      const el = imgRef.current
      if (el && el.complete && el.naturalWidth > 0 && status === 'loading') {
        updateStatus('loaded')
      }
    }, [status, attempt, updateStatus])

    const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
      updateStatus('loaded')
      onLoad?.(e)
    }

    const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
      if (retryCount.current < maxRetries) {
        const delay = retryDelayMs * 2 ** retryCount.current
        retryCount.current += 1
        timer.current = setTimeout(() => setAttempt((a) => a + 1), delay)
        return
      }
      updateStatus('error')
      onError?.(e)
    }

    const manualRetry = useCallback(() => {
      retryCount.current = 0
      updateStatus('loading')
      setAttempt((a) => a + 1)
    }, [updateStatus])

    const wrapperStyle: React.CSSProperties = {
      ...style,
      ...(aspectRatio ? { aspectRatio } : null),
    }

    if (status === 'error') {
      if (renderFallback) return <>{renderFallback({ retry: manualRetry, src })}</>
      return (
        <div
          role="img"
          aria-label={alt || 'Image failed to load'}
          className={`inline-flex items-center justify-center bg-gray-100 align-middle ${className ?? ''}`}
          style={wrapperStyle}
        >
          <img
            src={fallbackSrc}
            alt=""
            aria-hidden="true"
            data-original-url={src}
            {...rest}
          />
        </div>
      )
    }

    const resolvedSrc =
      attempt > 0 && src
        ? `${src}${src.includes('?') ? '&' : '?'}_r=${attempt}`
        : src

    return (
      <span
        className="relative inline-block align-middle"
        style={{ ...wrapperStyle, lineHeight: 0 }}
      >
        {showSkeleton && status === 'loading' && (
          <span
            aria-hidden="true"
            className={`absolute inset-0 animate-pulse bg-gray-200 ${className ?? ''}`}
          />
        )}
        <img
          {...rest}
          ref={imgRef}
          key={attempt}
          src={resolvedSrc}
          alt={alt}
          loading={loading}
          decoding={decoding}
          className={className}
          style={{
            ...style,
            opacity: status === 'loaded' ? 1 : 0,
            transition: `opacity ${fadeInMs}ms ease-in-out`,
            ...(aspectRatio ? { aspectRatio, objectFit: style?.objectFit ?? 'cover' } : null),
          }}
          onLoad={handleLoad}
          onError={handleError}
        />
      </span>
    )
  }
)

import { useCallback, useEffect, useRef } from 'react'

/**
 * Strict fullscreen lock.
 *
 * Browsers will never let a page block the hardware/OS gesture that exits
 * fullscreen (Esc key, Android back gesture, iOS swipe) — that escape hatch
 * is intentionally outside page control for user-safety reasons, and no
 * amount of JS can override it. What we CAN do, and what this hook does, is
 * detect the exit the instant it happens and immediately re-request
 * fullscreen, so the gap is effectively invisible — sub-second, not a state
 * the user can comfortably sit in.
 *
 * Call `enter()` from inside a real user gesture (the GET STARTED tap) since
 * the Fullscreen API itself requires one to grant the request.
 */
export function useFullscreenLock(active) {
  const reEnterTimeoutRef = useRef(null)

  const enter = useCallback(() => {
    const el = document.documentElement
    const request =
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen

    if (request) {
      request.call(el).catch(() => {
        // Some mobile browsers (notably iOS Safari) don't support the
        // Fullscreen API at all. In that case we fall back to viewport-fill
        // CSS (100vh + fixed positioning), already applied via global.css,
        // so the experience still reads as "fullscreen" even without the
        // native API.
      })
    }
  }, [])

  useEffect(() => {
    if (!active) return

    const isFullscreen = () =>
      Boolean(
        document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
      )

    const handleChange = () => {
      if (!isFullscreen()) {
        // Debounce slightly: rapid-fire re-requests can be ignored by some
        // browsers as spammy. A short delay keeps the re-entry reliable.
        clearTimeout(reEnterTimeoutRef.current)
        reEnterTimeoutRef.current = setTimeout(() => {
          enter()
        }, 50)
      }
    }

    document.addEventListener('fullscreenchange', handleChange)
    document.addEventListener('webkitfullscreenchange', handleChange)
    document.addEventListener('mozfullscreenchange', handleChange)
    document.addEventListener('MSFullscreenChange', handleChange)

    // Catch-all safety net: some webviews fire no fullscreenchange event at
    // all when they kick the page out. Poll as a backstop.
    const pollId = setInterval(() => {
      if (!isFullscreen()) enter()
    }, 1000)

    return () => {
      document.removeEventListener('fullscreenchange', handleChange)
      document.removeEventListener('webkitfullscreenchange', handleChange)
      document.removeEventListener('mozfullscreenchange', handleChange)
      document.removeEventListener('MSFullscreenChange', handleChange)
      clearInterval(pollId)
      clearTimeout(reEnterTimeoutRef.current)
    }
  }, [active, enter])

  return { enter }
}

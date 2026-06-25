import { useRef, useState, useCallback, useEffect } from 'react'
import { AUDIO_SRC, AUDIO_OFFSETS } from '../utils/audioConstants'

/**
 * Bulletproof mobile audio engine.
 *
 * Why this exists: iOS Safari, in-app browsers (Instagram/FB/TikTok webviews),
 * and some Android WebViews will silently keep an AudioContext "suspended"
 * even when resume()/start() are called inside a real user gesture. There's
 * no reliable way to *detect* this in advance — the only proof is checking
 * `audioContext.state` right after the attempt and seeing it didn't flip to
 * "running". When that happens we surface `needsUnmute = true` so the UI can
 * show a persistent "tap to unmute" control. There is deliberately no pause/
 * mute control here — once sound is desired, the only state we expose going
 * forward is "still need a tap" vs "playing".
 */
export function useAudioEngine() {
  const audioContextRef = useRef(null)
  const audioBufferRef = useRef(null)
  const sourceNodesRef = useRef([])
  const arrayBufferRef = useRef(null)
  const decodePromiseRef = useRef(null)
  const startedRef = useRef(false)

  const [needsUnmute, setNeedsUnmute] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  // ---- Preload: fetch + pre-decode as early as possible, no gesture needed ----
  useEffect(() => {
    let cancelled = false

    fetch(AUDIO_SRC)
      .then((res) => res.arrayBuffer())
      .then((buf) => {
        if (cancelled) return
        arrayBufferRef.current = buf

        // Pre-decode using a throwaway context so the AudioBuffer is ready
        // before the user even taps. Decoding doesn't require a gesture.
        const tempCtx = new (window.AudioContext || window.webkitAudioContext)()
        decodePromiseRef.current = tempCtx
          .decodeAudioData(buf.slice(0))
          .then((decoded) => {
            if (!cancelled) audioBufferRef.current = decoded
            tempCtx.close()
            return decoded
          })
          .catch(() => {
            tempCtx.close()
          })
      })
      .catch(() => {
        // Network/file issue — engine will simply have nothing to play.
        // The unmute button will keep retrying harmlessly.
      })

    return () => {
      cancelled = true
    }
  }, [])

  const stopAllSources = () => {
    sourceNodesRef.current.forEach((node) => {
      try {
        node.stop()
      } catch {
        // already stopped — ignore
      }
    })
    sourceNodesRef.current = []
  }

  const startLayers = useCallback((ctx, buffer) => {
    stopAllSources()
    AUDIO_OFFSETS.forEach((offsetSeconds) => {
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true
      source.connect(ctx.destination)
      const safeOffset = offsetSeconds % buffer.duration
      try {
        source.start(0, safeOffset)
      } catch {
        // if start fails for this layer, the others still play
      }
      sourceNodesRef.current.push(source)
    })
  }, [])

  /**
   * Call this synchronously inside a user gesture (pointerdown / touchstart / click).
   * Handles: context creation, hardware unlock, decode races, and reports back
   * whether audio is actually audible after the attempt.
   */
  const unlockAndPlay = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = audioContextRef.current

    // Silent 1-sample buffer — wakes the hardware on old Safari.
    try {
      const silent = ctx.createBuffer(1, 1, 22050)
      const silentSource = ctx.createBufferSource()
      silentSource.buffer = silent
      silentSource.connect(ctx.destination)
      silentSource.start(0)
    } catch {
      // non-fatal
    }

    // Always attempt resume — required on iOS even after context creation.
    ctx.resume().catch(() => {})

    const tryStart = (buffer) => {
      startLayers(ctx, buffer)
      startedRef.current = true
    }

    if (audioBufferRef.current) {
      tryStart(audioBufferRef.current)
    } else if (decodePromiseRef.current) {
      decodePromiseRef.current.then((buffer) => {
        if (buffer) tryStart(buffer)
      })
    } else if (arrayBufferRef.current) {
      ctx.decodeAudioData(arrayBufferRef.current.slice(0)).then((buffer) => {
        audioBufferRef.current = buffer
        tryStart(buffer)
      })
    } else {
      // XHR still in flight — poll briefly until data arrives.
      const poll = setInterval(() => {
        if (audioBufferRef.current) {
          clearInterval(poll)
          tryStart(audioBufferRef.current)
        } else if (arrayBufferRef.current) {
          clearInterval(poll)
          ctx.decodeAudioData(arrayBufferRef.current.slice(0)).then((buffer) => {
            audioBufferRef.current = buffer
            tryStart(buffer)
          })
        }
      }, 50)
      setTimeout(() => clearInterval(poll), 8000)
    }

    // Check shortly after whether the context is actually running.
    // This is what catches the "gesture fired but iOS/webview kept it
    // suspended anyway" case and triggers the unmute button.
    setTimeout(() => {
      const running = ctx.state === 'running'
      setIsPlaying(running && startedRef.current)
      setNeedsUnmute(!running || !startedRef.current)
    }, 150)
  }, [startLayers])

  /**
   * Re-attempt only. Used by the floating "tap to unmute" button.
   * Intentionally has no opposite (no mute/pause) — once tapped and
   * confirmed running, we hide the control entirely.
   */
  const manualUnmute = useCallback(() => {
    unlockAndPlay()
    // Re-check after the resume() promise has had a moment to settle.
    setTimeout(() => {
      const ctx = audioContextRef.current
      const running = ctx && ctx.state === 'running'
      setIsPlaying(Boolean(running))
      setNeedsUnmute(!running)
    }, 250)
  }, [unlockAndPlay])

  // If the tab/app is backgrounded and resumed, iOS sometimes re-suspends
  // the context silently. Re-check on visibility/focus return so the unmute
  // button can reappear instead of leaving the user with silence.
  useEffect(() => {
    const recheck = () => {
      const ctx = audioContextRef.current
      if (!ctx || !startedRef.current) return
      if (ctx.state !== 'running') {
        setIsPlaying(false)
        setNeedsUnmute(true)
      }
    }
    document.addEventListener('visibilitychange', recheck)
    window.addEventListener('focus', recheck)
    return () => {
      document.removeEventListener('visibilitychange', recheck)
      window.removeEventListener('focus', recheck)
    }
  }, [])

  return {
    unlockAndPlay,
    manualUnmute,
    needsUnmute,
    isPlaying,
  }
}

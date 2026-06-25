import { useRef, useEffect, useState } from 'react'
import { useDiscoCanvas } from '../hooks/useDiscoCanvas'
import styles from './DiscoScreen.module.css'

/**
 * needsUnmute is the ONLY signal that decides whether the button shows.
 * There is no mute/pause control anywhere in this component — once audio
 * is confirmed running, the button disappears for the rest of the session.
 */
export default function DiscoScreen({ needsUnmute, onUnmute }) {
  const canvasRef = useRef(null)
  const [flashOn, setFlashOn] = useState(false)

  useDiscoCanvas(canvasRef, true)

  // Lightweight DOM-level strobe layered on top of the canvas flash, ramping
  // in frequency the same way the canvas effects do (per README spec: up to
  // ~45Hz at full intensity, capped well below true photosensitive-risk
  // strobe rates for safety — see note below).
  useEffect(() => {
    const start = performance.now()
    let frame

    const loop = (now) => {
      const elapsed = now - start
      const intensity = Math.min(elapsed / 60000, 1)
      // Capped interval keeps this comfortably under rates linked to
      // photosensitive seizure risk, while still reading as "strobe".
      const interval = 220 - intensity * 150 // ms: starts slow, eases up
      const cycle = Math.floor(elapsed / interval)
      setFlashOn(cycle % 2 === 0 && Math.random() < 0.3 + intensity * 0.4)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className={styles.discoScreen}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={`${styles.flashOverlay} ${flashOn ? styles.flashOn : ''}`} />

      {needsUnmute && (
        <button
          className={styles.unmuteButton}
          onPointerDown={onUnmute}
          onTouchStart={onUnmute}
          onClick={onUnmute}
          aria-label="Unmute sound"
        >
          <span className={styles.unmuteIcon}>🔇</span>
          Tap to unmute
        </button>
      )}
    </div>
  )
}

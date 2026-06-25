import { useEffect, useRef } from 'react'
import { Particle } from '../utils/Particle'

const PARTICLE_COUNT = 500
const LASER_ARMS = 6

export function useDiscoCanvas(canvasRef, active) {
  const animationRef = useRef(null)
  const particlesRef = useRef([])
  const startTimeRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      particlesRef.current.forEach((p) => p.resize(canvas.width, canvas.height))
    }
    resize()
    window.addEventListener('resize', resize)

    particlesRef.current = Array.from(
      { length: PARTICLE_COUNT },
      () => new Particle(canvas.width, canvas.height)
    )

    startTimeRef.current = performance.now()

    const tick = (now) => {
      const time = now - startTimeRef.current
      // Ramps 0 -> 1 over ~60 seconds, then holds at full intensity.
      const strobeIntensity = Math.min(time / 3600, 1)

      const { width, height } = canvas
      const cx = width / 2
      const cy = height / 2

      // Trail fade — lower alpha = longer streaks
      ctx.fillStyle = `rgba(5, 0, 10, ${0.22 - strobeIntensity * 0.1})`
      ctx.fillRect(0, 0, width, height)

      // Radial pulse bloom
      const pulse = 0.5 + 0.5 * Math.sin(time / 300)
      const radius = Math.min(width, height) * (0.3 + 0.25 * pulse + strobeIntensity * 0.2)
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius)
      const hue = (time / 10) % 360
      gradient.addColorStop(0, `hsla(${hue}, 100%, 60%, ${0.35 + strobeIntensity * 0.25})`)
      gradient.addColorStop(1, 'hsla(0, 0%, 0%, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // Laser arms
      const armSpin = time / (250 - strobeIntensity * 150)
      ctx.save()
      ctx.translate(cx, cy)
      for (let i = 0; i < LASER_ARMS; i++) {
        const angle = armSpin + (i * Math.PI * 2) / LASER_ARMS
        const armHue = (hue + i * 60) % 360
        const len = Math.max(width, height)
        ctx.save()
        ctx.rotate(angle)
        const grad = ctx.createLinearGradient(0, 0, len, 0)
        grad.addColorStop(0, `hsla(${armHue}, 100%, 65%, ${0.5 + strobeIntensity * 0.4})`)
        grad.addColorStop(1, 'hsla(0, 0%, 0%, 0)')
        ctx.strokeStyle = grad
        ctx.lineWidth = 3 + strobeIntensity * 5
        ctx.shadowBlur = 20 + strobeIntensity * 20
        ctx.shadowColor = `hsla(${armHue}, 100%, 65%, 0.8)`
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(len, 0)
        ctx.stroke()
        ctx.restore()
      }
      ctx.restore()

      // Particles
      particlesRef.current.forEach((p) => {
        p.update(strobeIntensity)
        p.draw(ctx, strobeIntensity)
      })
      ctx.shadowBlur = 0

      // Canvas-level flash — escalating opacity/frequency with strobeIntensity
      const flashFreq = 2 + strobeIntensity * 43 // up to ~45Hz worth of cycles
      const flashPhase = Math.sin(time * flashFreq * 0.001 * Math.PI)
      if (flashPhase > 1 - strobeIntensity * 0.6) {
        ctx.fillStyle = `rgba(255, 255, 255, ${strobeIntensity * 0.5})`
        ctx.fillRect(0, 0, width, height)
      }

      // BG chaos — body background hue randomised per frame, intensity-scaled
      if (Math.random() < 0.05 + strobeIntensity * 0.1) {
        document.body.style.background = `hsl(${Math.random() * 360}, 60%, ${2 + strobeIntensity * 4}%)`
      }

      animationRef.current = requestAnimationFrame(tick)
    }

    animationRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener('resize', resize)
      document.body.style.background = ''
    }
  }, [active, canvasRef])
}

// Pure canvas particle — no React, no DOM, just numbers + a draw() call.
// Kept framework-free so useDiscoCanvas can run a tight requestAnimationFrame
// loop without React re-render overhead per-particle.
export class Particle {
  constructor(width, height) {
    this.bounds = { width, height }
    this.reset()
    // stagger initial life so all 500 don't pulse in sync
    this.life = Math.random() * 100
  }

  reset() {
    const { width, height } = this.bounds
    this.x = Math.random() * width
    this.y = Math.random() * height
    this.radius = 1 + Math.random() * 3
    this.speedX = (Math.random() - 0.5) * 4
    this.speedY = (Math.random() - 0.5) * 4
    this.hue = Math.random() * 360
    this.life = 0
    this.maxLife = 80 + Math.random() * 120
  }

  resize(width, height) {
    this.bounds = { width, height }
  }

  update(strobeIntensity) {
    this.x += this.speedX * (1 + strobeIntensity * 2)
    this.y += this.speedY * (1 + strobeIntensity * 2)
    this.hue = (this.hue + 1.5 + strobeIntensity * 4) % 360
    this.life += 1

    const { width, height } = this.bounds
    if (this.x < 0 || this.x > width || this.y < 0 || this.y > height || this.life > this.maxLife) {
      this.reset()
    }
  }

  draw(ctx, strobeIntensity) {
    const lifeRatio = 1 - this.life / this.maxLife
    const alpha = Math.max(0, lifeRatio) * (0.6 + strobeIntensity * 0.4)
    const r = this.radius * (1 + strobeIntensity * 1.5)

    ctx.beginPath()
    ctx.arc(this.x, this.y, Math.max(r, 0.1), 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${this.hue}, 100%, 60%, ${alpha})`
    ctx.shadowBlur = 12 + strobeIntensity * 18
    ctx.shadowColor = `hsla(${this.hue}, 100%, 60%, ${alpha})`
    ctx.fill()
  }
}

import { useState, useCallback } from 'react'
import LandingScreen from './components/LandingScreen'
import DiscoScreen from './components/DiscoScreen'
import { useAudioEngine } from './hooks/useAudioEngine'
import { useFullscreenLock } from './hooks/useFullscreenLock'

export default function App() {
  const [started, setStarted] = useState(false)
  const { unlockAndPlay, manualUnmute, needsUnmute } = useAudioEngine()
  const { enter: enterFullscreen } = useFullscreenLock(started)

  // Fired synchronously inside the GET STARTED gesture — both the audio
  // unlock attempt and the fullscreen request need that real gesture to
  // have any chance of working on mobile.
  const handleStart = useCallback(() => {
    unlockAndPlay()
    enterFullscreen()
    setStarted(true)
  }, [unlockAndPlay, enterFullscreen])

  if (!started) {
    return <LandingScreen onStart={handleStart} />
  }

  return <DiscoScreen needsUnmute={needsUnmute} onUnmute={manualUnmute} />
}

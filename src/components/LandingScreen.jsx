import { useRef } from "react";
import styles from "./LandingScreen.module.css";

/**
 * GET STARTED button.
 *
 * The audio unlock AND the fullscreen request both legally require a real,
 * synchronous user gesture — so both are fired directly inside the handler,
 * not after any async work. We listen on multiple events because mobile
 * fires pointerdown/touchstart well before click, and we want the gesture
 * captured at the earliest reliable moment:
 *  - pointerdown: primary, fires first on modern mobile browsers
 *  - touchstart: fallback for iOS Safari < 13
 *  - click: final fallback for desktop / browsers without pointer events
 *
 * A `firedRef` guard stops the same tap triggering the handler twice
 * (e.g. touchstart AND the click that follows it).
 */
export default function LandingScreen({ onStart }) {
  const firedRef = useRef(false);

  const handleStart = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onStart();
  };

  return (
    <div className={styles.landing}>
      <h1 className={styles.title}>NEON VOID</h1>
      <p className={styles.volumeHint}>
        Turn on the volume to full for better experience before getting started
      </p>

      <button
        className={styles.startButton}
        onPointerDown={handleStart}
        onTouchStart={handleStart}
        onClick={handleStart}
      >
        Get Started
      </button>
            

    </div>
  );
}

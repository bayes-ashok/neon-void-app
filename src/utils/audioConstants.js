// Path to the audio file. Must live in /public so Vite serves it as a static asset.
export const AUDIO_SRC = '/music.mp3'

// Each offset (in seconds) starts another loop of the SAME track at a different
// point, layering it against itself for a thicker, echoing rave sound.
export const AUDIO_OFFSETS = [0, 1, 2, 3, 4]

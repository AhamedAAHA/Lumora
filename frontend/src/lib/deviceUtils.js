/** Touch-first phones/tablets — used for autoplay and voice strategy */
export function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true;
  }
  return navigator.maxTouchPoints > 1 && window.matchMedia('(max-width: 1024px)').matches;
}

let audioUnlocked = false;

/** Unlock HTML5 audio / speech on iOS & Android (requires a user gesture). */
export async function unlockAudioPlayback() {
  if (audioUnlocked || typeof window === 'undefined') return audioUnlocked;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (AudioCtx) {
    try {
      const ctx = new AudioCtx();
      await ctx.resume();
      await ctx.close();
    } catch {
      // continue
    }
  }

  try {
    const silent = new Audio(
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
    );
    silent.volume = 0.01;
    silent.setAttribute('playsinline', 'true');
    await silent.play();
    silent.pause();
    audioUnlocked = true;
  } catch {
    audioUnlocked = false;
  }

  return audioUnlocked;
}

export function isAudioUnlocked() {
  return audioUnlocked;
}

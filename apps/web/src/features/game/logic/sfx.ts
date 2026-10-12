import type { GamePreferences } from "@/features/storage/preferences";

export type SfxCue = "tap" | "story" | "transmute_success" | "transmute_fail" | "event";

interface AudioRuntime {
  context: AudioContext;
  master: GainNode;
}

let runtime: AudioRuntime | null = null;

function getRuntime(volume: number): AudioRuntime | null {
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") {
    return null;
  }

  if (!runtime) {
    const context = new window.AudioContext();
    const master = context.createGain();
    master.connect(context.destination);
    runtime = { context, master };
  }

  const nextVolume = Math.max(0, Math.min(1, volume));
  const now = runtime.context.currentTime;
  runtime.master.gain.cancelScheduledValues(now);
  runtime.master.gain.setTargetAtTime(nextVolume * 0.18, now, 0.02);
  if (runtime.context.state === "suspended") {
    void runtime.context.resume();
  }
  return runtime;
}

function playTone(
  runtimeAudio: AudioRuntime,
  options: {
    freq: number;
    duration: number;
    type?: OscillatorType;
    gain?: number;
    detune?: number;
    offset?: number;
  },
): void {
  const { context, master } = runtimeAudio;
  const start = context.currentTime + (options.offset ?? 0);
  const end = start + options.duration;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();

  oscillator.type = options.type ?? "sine";
  oscillator.frequency.setValueAtTime(options.freq, start);
  if (typeof options.detune === "number") {
    oscillator.detune.setValueAtTime(options.detune, start);
  }

  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(
    options.gain ?? 0.35,
    start + Math.min(0.03, options.duration * 0.2),
  );
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);

  oscillator.connect(envelope);
  envelope.connect(master);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

function playSuccess(runtimeAudio: AudioRuntime): void {
  playTone(runtimeAudio, { freq: 392, duration: 0.12, type: "triangle" });
  playTone(runtimeAudio, {
    freq: 523.25,
    duration: 0.16,
    type: "triangle",
    offset: 0.08,
  });
  playTone(runtimeAudio, {
    freq: 659.25,
    duration: 0.18,
    type: "sine",
    offset: 0.16,
    gain: 0.28,
  });
}

function playFail(runtimeAudio: AudioRuntime): void {
  playTone(runtimeAudio, { freq: 246.94, duration: 0.16, type: "sawtooth", gain: 0.3 });
  playTone(runtimeAudio, {
    freq: 185,
    duration: 0.2,
    type: "sawtooth",
    offset: 0.08,
    gain: 0.28,
  });
}

function playStory(runtimeAudio: AudioRuntime): void {
  playTone(runtimeAudio, { freq: 329.63, duration: 0.1, type: "triangle", gain: 0.26 });
  playTone(runtimeAudio, {
    freq: 440,
    duration: 0.12,
    type: "triangle",
    offset: 0.08,
    gain: 0.24,
  });
}

function playTap(runtimeAudio: AudioRuntime): void {
  playTone(runtimeAudio, { freq: 520, duration: 0.06, type: "square", gain: 0.18 });
}

function playEvent(runtimeAudio: AudioRuntime): void {
  playTone(runtimeAudio, { freq: 293.66, duration: 0.09, type: "sine", gain: 0.2 });
  playTone(runtimeAudio, {
    freq: 392,
    duration: 0.11,
    type: "triangle",
    offset: 0.06,
    gain: 0.22,
  });
  playTone(runtimeAudio, {
    freq: 493.88,
    duration: 0.13,
    type: "sine",
    offset: 0.12,
    gain: 0.2,
  });
}

export function playSfx(preferences: GamePreferences, cue: SfxCue): void {
  if (!preferences.sfxEnabled) {
    return;
  }

  const runtimeAudio = getRuntime(preferences.sfxVolume);
  if (!runtimeAudio) {
    return;
  }

  if (cue === "tap") {
    playTap(runtimeAudio);
    return;
  }
  if (cue === "story") {
    playStory(runtimeAudio);
    return;
  }
  if (cue === "transmute_success") {
    playSuccess(runtimeAudio);
    return;
  }
  if (cue === "transmute_fail") {
    playFail(runtimeAudio);
    return;
  }
  playEvent(runtimeAudio);
}

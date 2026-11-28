// Pure procedural Web Audio API sound effects & adaptive medieval-chiptune BGM
// Zero external audio files; master DynamicsCompressor bus prevents clipping under heavy combat.

export type BgmIntensity = 0 | 1 | 2;

interface ToneOptions {
  freq: number;
  endFreq?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  attack?: number;
  filterFreq?: number;
  endFilterFreq?: number;
  filterType?: BiquadFilterType;
  q?: number;
  detune?: number;
  dest?: 'sfx' | 'bgm';
  vibratoHz?: number;
  vibratoDepth?: number;
}

interface NoiseOptions {
  duration: number;
  gain?: number;
  filterFreq?: number;
  endFilterFreq?: number;
  filterType?: BiquadFilterType;
  q?: number;
  delay?: number;
  attack?: number;
  dest?: 'sfx' | 'bgm';
}

const midiToHz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12);

// 8-bar (64 eighth-note) adaptive Kingdom Rush-style medieval folk / chiptune loop
// Key: D Major (Intensity 0 = sunny meadow pluck, Intensity 1 = upbeat castle march)
//      D Minor (Intensity 2 = urgent boss / high leak alarm battle march)

// 0 = rest
const MELODY_MAJOR: readonly number[] = [
  // Bar 1 (D)
  62, 0, 66, 69, 74, 0, 71, 69,
  // Bar 2 (A)
  69, 0, 64, 67, 66, 0, 64, 0,
  // Bar 3 (Bm)
  62, 64, 66, 69, 71, 0, 69, 66,
  // Bar 4 (G -> A)
  67, 0, 66, 64, 69, 0, 0, 0,
  // Bar 5 (D)
  74, 0, 73, 71, 69, 0, 66, 69,
  // Bar 6 (G)
  71, 0, 74, 71, 67, 0, 69, 71,
  // Bar 7 (Em -> D/F#)
  76, 0, 74, 71, 74, 0, 69, 66,
  // Bar 8 (A turnaround)
  64, 66, 67, 69, 64, 0, 69, 0,
];

const MELODY_MINOR: readonly number[] = [
  // Bar 1 (Dm)
  62, 62, 65, 69, 74, 0, 72, 69,
  // Bar 2 (C / Am)
  72, 0, 70, 69, 67, 0, 64, 67,
  // Bar 3 (Bb)
  65, 65, 69, 70, 74, 0, 70, 69,
  // Bar 4 (Gm -> A7)
  67, 69, 70, 67, 69, 0, 73, 0,
  // Bar 5 (Dm)
  74, 74, 72, 70, 69, 0, 65, 69,
  // Bar 6 (Gm)
  70, 70, 74, 70, 67, 0, 69, 70,
  // Bar 7 (Bb -> C)
  74, 0, 72, 70, 72, 0, 76, 72,
  // Bar 8 (A7 turnaround)
  73, 0, 69, 73, 76, 74, 73, 69,
];

// Chord roots & triads per half-bar (16 half-bars across 8 bars, 4 eighth-notes each)
const CHORDS_MAJOR: readonly (readonly [number, number, number])[] = [
  [50, 54, 57], [50, 54, 57], // Bar 1: D
  [45, 49, 52], [45, 49, 52], // Bar 2: A
  [47, 50, 54], [47, 50, 54], // Bar 3: Bm
  [43, 47, 50], [45, 49, 52], // Bar 4: G -> A
  [50, 54, 57], [50, 54, 57], // Bar 5: D
  [43, 47, 50], [43, 47, 50], // Bar 6: G
  [52, 55, 59], [54, 57, 62], // Bar 7: Em -> D/F#
  [45, 49, 52], [45, 52, 55], // Bar 8: A -> A7
];

const CHORDS_MINOR: readonly (readonly [number, number, number])[] = [
  [50, 53, 57], [50, 53, 57], // Bar 1: Dm
  [48, 52, 55], [45, 48, 52], // Bar 2: C -> Am
  [46, 50, 53], [46, 50, 53], // Bar 3: Bb
  [43, 46, 50], [45, 49, 52], // Bar 4: Gm -> A
  [50, 53, 57], [50, 53, 57], // Bar 5: Dm
  [43, 46, 50], [43, 46, 50], // Bar 6: Gm
  [46, 50, 53], [48, 52, 55], // Bar 7: Bb -> C
  [45, 49, 52], [45, 49, 55], // Bar 8: A -> A7
];

// Counter-arpeggio index pattern across 4 eighth-notes of a half-bar
const ARP_PATTERN: readonly number[] = [0, 1, 2, 1];

const MASTER_LEVEL = 0.88;
const SFX_LEVEL = 0.96;
const BGM_LEVEL = 0.27;
const AUDIO_PREFS_KEY = 'temu3_kingdom_audio_v1';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmDuckGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private _muted = false;
  private _bgmMuted = false;
  private bgmRunning = false;
  private bgmIntensity: BgmIntensity = 0;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmNextTime = 0;

  private lastTriggered = new Map<string, number>();
  private coinStreak = 0;
  private lastCoinAt = 0;

  constructor() {
    this.loadPrefs();
  }

  private getStorage(): Storage | null {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        return localStorage;
      }
    } catch {
      // Ignore SecurityError in sandboxed iframes or restricted privacy modes
    }
    return null;
  }

  private loadPrefs(): void {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      const raw = storage.getItem(AUDIO_PREFS_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      const record = parsed as { muted?: unknown; bgmMuted?: unknown };
      if (typeof record.muted === 'boolean') {
        this._muted = record.muted;
      }
      if (typeof record.bgmMuted === 'boolean') {
        this._bgmMuted = record.bgmMuted;
      }
    } catch {
      // Ignore malformed JSON or storage errors
    }
  }

  private savePrefs(): void {
    const storage = this.getStorage();
    if (!storage) return;
    try {
      storage.setItem(
        AUDIO_PREFS_KEY,
        JSON.stringify({ muted: this._muted, bgmMuted: this._bgmMuted })
      );
    } catch {
      // Ignore storage quota or security errors
    }
  }

  public get muted(): boolean {
    return this._muted;
  }

  public set muted(val: boolean) {
    const next = Boolean(val);
    const changed = this._muted !== next;
    this._muted = next;
    this.savePrefs();
    if (changed) {
      this.syncAudioRouting();
    }
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
  }

  public get bgmMuted(): boolean {
    return this._bgmMuted;
  }

  public set bgmMuted(val: boolean) {
    const next = Boolean(val);
    const changed = this._bgmMuted !== next;
    this._bgmMuted = next;
    this.savePrefs();
    if (changed) {
      this.syncAudioRouting();
    }
  }

  public setBgmMuted(muted: boolean): void {
    this.bgmMuted = muted;
  }

  public startBgm(): void {
    this.bgmRunning = true;
    if (this._muted || this._bgmMuted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    this.syncGainLevels(ctx);
    this.startBgmScheduler(ctx);
  }

  public stopBgm(): void {
    this.bgmRunning = false;
    this.stopBgmScheduler();
    if (this.ctx && this.bgmGain) {
      const now = this.ctx.currentTime;
      this.bgmGain.gain.cancelScheduledValues(now);
      this.bgmGain.gain.setTargetAtTime(0, now, 0.03);
    }
  }

  public setIntensity(level: BgmIntensity): void {
    const clamped: BgmIntensity = level === 2 ? 2 : level === 1 ? 1 : 0;
    this.bgmIntensity = clamped;
  }

  private ensure(): AudioContext | null {
    if (this._muted) return null;
    if (!this.ctx) {
      if (typeof window === 'undefined') return null;
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return null;
      }
      this.initGraph(this.ctx);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private initGraph(ctx: AudioContext): void {
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, ctx.currentTime);
    compressor.knee.setValueAtTime(18, ctx.currentTime);
    compressor.ratio.setValueAtTime(6, ctx.currentTime);
    compressor.attack.setValueAtTime(0.004, ctx.currentTime);
    compressor.release.setValueAtTime(0.18, ctx.currentTime);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this._muted ? 0 : MASTER_LEVEL, ctx.currentTime);

    const sfxGain = ctx.createGain();
    sfxGain.gain.setValueAtTime(SFX_LEVEL, ctx.currentTime);

    const bgmGain = ctx.createGain();
    bgmGain.gain.setValueAtTime(this._bgmMuted ? 0 : BGM_LEVEL, ctx.currentTime);

    const bgmDuckGain = ctx.createGain();
    bgmDuckGain.gain.setValueAtTime(1, ctx.currentTime);

    sfxGain.connect(compressor);
    bgmDuckGain.connect(bgmGain);
    bgmGain.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    this.masterGain = masterGain;
    this.sfxGain = sfxGain;
    this.bgmGain = bgmGain;
    this.bgmDuckGain = bgmDuckGain;
  }

  private syncAudioRouting(): void {
    if (this._muted) {
      this.stopBgmScheduler();
      if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0, now, 0.015);
      }
      return;
    }

    if (this.bgmRunning && !this._bgmMuted) {
      const ctx = this.ensure();
      if (ctx) {
        this.syncGainLevels(ctx);
        this.startBgmScheduler(ctx);
      }
      return;
    }

    this.stopBgmScheduler();
    if (this.ctx) {
      this.syncGainLevels(this.ctx);
    }
  }

  private syncGainLevels(ctx: AudioContext): void {
    const now = ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this._muted ? 0 : MASTER_LEVEL, now, 0.02);
    }
    if (this.bgmGain) {
      this.bgmGain.gain.cancelScheduledValues(now);
      const targetBgm = this._bgmMuted || !this.bgmRunning ? 0 : BGM_LEVEL;
      this.bgmGain.gain.setTargetAtTime(targetBgm, now, 0.03);
    }
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const len = Math.max(1, Math.floor(ctx.sampleRate * 1.5));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
    return buf;
  }

  private canTrigger(key: string, minIntervalMs: number): boolean {
    if (this._muted) return false;
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const prev = this.lastTriggered.get(key) ?? -Infinity;
    if (nowMs - prev < minIntervalMs) return false;
    this.lastTriggered.set(key, nowMs);
    return true;
  }

  private jitter(amount = 0.06): number {
    return 1 + (Math.random() * 2 - 1) * amount;
  }

  private duckBgm(depth = 0.42, holdSec = 0.35, releaseSec = 0.45): void {
    if (!this.ctx || !this.bgmDuckGain || !this.bgmRunning || this._bgmMuted || this._muted) return;
    const now = this.ctx.currentTime;
    const g = this.bgmDuckGain.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(0.1, g.value), now);
    g.linearRampToValueAtTime(Math.max(0.15, depth), now + 0.03);
    g.setValueAtTime(Math.max(0.15, depth), now + holdSec);
    g.linearRampToValueAtTime(1, now + holdSec + releaseSec);
  }

  private playTone(opts: ToneOptions, ctxOverride?: AudioContext, absStart?: number): void {
    const ctx = ctxOverride ?? this.ensure();
    if (!ctx) return;
    const target = opts.dest === 'bgm' ? this.bgmDuckGain : this.sfxGain;
    if (!target) return;

    const start = Math.max(
      ctx.currentTime,
      absStart !== undefined ? absStart + (opts.delay ?? 0) : ctx.currentTime + (opts.delay ?? 0)
    );
    const duration = Math.max(0.015, opts.duration);
    const attack = Math.min(duration * 0.45, Math.max(0.003, opts.attack ?? 0.01));
    const gainPeak = Math.max(0.0005, opts.gain ?? 0.14);
    const startFreq = Math.max(20, opts.freq);
    const endFreq = Math.max(20, opts.endFreq ?? opts.freq);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? 'triangle';
    osc.frequency.setValueAtTime(startFreq, start);
    if (opts.detune) {
      osc.detune.setValueAtTime(opts.detune, start);
    }
    if (endFreq !== startFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    }

    let lfo: OscillatorNode | null = null;
    if (opts.vibratoHz && opts.vibratoDepth) {
      lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(opts.vibratoHz, start);
      lfoGain.gain.setValueAtTime(opts.vibratoDepth, start);
      lfo.connect(lfoGain).connect(osc.frequency);
      lfo.start(start);
      lfo.stop(start + duration + 0.03);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainPeak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    if (opts.filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = opts.filterType ?? 'lowpass';
      filter.frequency.setValueAtTime(Math.max(40, opts.filterFreq), start);
      if (opts.endFilterFreq && opts.endFilterFreq !== opts.filterFreq) {
        filter.frequency.exponentialRampToValueAtTime(Math.max(40, opts.endFilterFreq), start + duration);
      }
      if (opts.q) {
        filter.Q.setValueAtTime(opts.q, start);
      }
      osc.connect(filter).connect(gain).connect(target);
    } else {
      osc.connect(gain).connect(target);
    }

    osc.start(start);
    osc.stop(start + duration + 0.025);
  }

  private playNoise(opts: NoiseOptions, ctxOverride?: AudioContext, absStart?: number): void {
    const ctx = ctxOverride ?? this.ensure();
    if (!ctx) return;
    const target = opts.dest === 'bgm' ? this.bgmDuckGain : this.sfxGain;
    if (!target) return;

    const start = Math.max(
      ctx.currentTime,
      absStart !== undefined ? absStart + (opts.delay ?? 0) : ctx.currentTime + (opts.delay ?? 0)
    );
    const duration = Math.max(0.012, opts.duration);
    const attack = Math.min(duration * 0.4, Math.max(0.002, opts.attack ?? 0.005));
    const gainPeak = Math.max(0.0005, opts.gain ?? 0.14);

    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = opts.filterType ?? 'lowpass';
    const startCut = Math.max(40, opts.filterFreq ?? 1000);
    filter.frequency.setValueAtTime(startCut, start);
    if (opts.endFilterFreq && opts.endFilterFreq !== startCut) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, opts.endFilterFreq), start + duration);
    }
    if (opts.q) {
      filter.Q.setValueAtTime(opts.q, start);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(gainPeak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    src.connect(filter).connect(gain).connect(target);
    const offset = Math.random() * 1.1;
    src.start(start, offset, duration + 0.025);
  }

  // =========================================================================
  // Adaptive Procedural BGM Scheduler (lookahead Web Audio clock)
  // =========================================================================

  private startBgmScheduler(ctx: AudioContext): void {
    if (this.bgmTimer !== null || typeof window === 'undefined') return;
    this.bgmNextTime = ctx.currentTime + 0.05;
    this.tickBgm();
    this.bgmTimer = window.setInterval(() => this.tickBgm(), 50);
  }

  private stopBgmScheduler(): void {
    if (this.bgmTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private getStepDuration(): number {
    // 8th-note durations: Intensity 0 = 112 BPM, 1 = 128 BPM, 2 = 144 BPM
    const bpm = this.bgmIntensity === 2 ? 144 : this.bgmIntensity === 1 ? 128 : 112;
    return 60 / bpm / 2;
  }

  private tickBgm(): void {
    if (!this.bgmRunning || this._muted || this._bgmMuted) {
      this.stopBgmScheduler();
      return;
    }
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;

    // Prevent catch-up burst after background tab throttling
    if (this.bgmNextTime < ctx.currentTime - 0.16) {
      this.bgmNextTime = ctx.currentTime + 0.05;
    }

    const lookahead = 0.18;
    while (this.bgmNextTime < ctx.currentTime + lookahead) {
      const stepDur = this.getStepDuration();
      this.scheduleBgmStep(ctx, this.bgmStep, this.bgmNextTime, stepDur);
      this.bgmNextTime += stepDur;
      this.bgmStep = (this.bgmStep + 1) % 64;
    }
  }

  private scheduleBgmStep(ctx: AudioContext, step: number, time: number, stepDur: number): void {
    const intensity = this.bgmIntensity;
    const minor = intensity === 2;
    const melodySeq = minor ? MELODY_MINOR : MELODY_MAJOR;
    const chords = minor ? CHORDS_MINOR : CHORDS_MAJOR;

    const halfBar = Math.floor(step / 4) % 16;
    const inHalfBar = step % 4;
    const inBar = step % 8;
    const chord = chords[halfBar];

    // 1. Medieval Lute / Harp Plucked Accompaniment (always active, shifts timbre with intensity)
    const arpMidi = chord[ARP_PATTERN[inHalfBar]] + 12;
    const shouldPluck =
      intensity === 0
        ? inHalfBar === 0 || inHalfBar === 2 || inHalfBar === 3
        : true;
    if (shouldPluck) {
      this.playTone(
        {
          freq: midiToHz(arpMidi),
          duration: stepDur * (intensity === 0 ? 1.35 : 0.85),
          type: 'triangle',
          gain: intensity === 0 ? 0.11 : intensity === 1 ? 0.085 : 0.075,
          attack: 0.008,
          filterFreq: intensity === 2 ? 1900 : 2400,
          dest: 'bgm',
        },
        ctx,
        time
      );
    }

    // 2. Bassline (gentle walking pluck -> bouncy march -> urgent driving ostinato)
    const rootMidi = chord[0] - 12;
    const fifthMidi = chord[2] - 12;
    if (intensity === 0) {
      if (inHalfBar === 0) {
        this.playTone(
          {
            freq: midiToHz(rootMidi),
            duration: stepDur * 2.4,
            type: 'triangle',
            gain: 0.16,
            attack: 0.015,
            filterFreq: 520,
            dest: 'bgm',
          },
          ctx,
          time
        );
      }
    } else if (intensity === 1) {
      if (inBar % 2 === 0) {
        const bassNote = inBar === 4 ? fifthMidi : rootMidi;
        this.playTone(
          {
            freq: midiToHz(bassNote),
            duration: stepDur * 1.25,
            type: 'triangle',
            gain: 0.18,
            attack: 0.01,
            filterFreq: 680,
            dest: 'bgm',
          },
          ctx,
          time
        );
      } else if (inBar === 7) {
        // Playful medieval upbeat bounce
        this.playTone(
          {
            freq: midiToHz(rootMidi + 12),
            duration: stepDur * 0.7,
            type: 'triangle',
            gain: 0.1,
            attack: 0.008,
            filterFreq: 800,
            dest: 'bgm',
          },
          ctx,
          time
        );
      }
    } else {
      // Intensity 2: Driving 8th-note urgent bass ostinato
      const ostinatoNote = inBar % 2 === 0 ? rootMidi : inBar === 7 ? fifthMidi : rootMidi + 12;
      this.playTone(
        {
          freq: midiToHz(ostinatoNote),
          duration: stepDur * 0.78,
          type: 'sawtooth',
          gain: inBar % 2 === 0 ? 0.13 : 0.09,
          attack: 0.006,
          filterFreq: 620,
          endFilterFreq: 320,
          dest: 'bgm',
        },
        ctx,
        time
      );
    }

    // 3. Lead Melody (woodwind meadow -> medieval-chiptune fife -> heroic urgent brass)
    const melMidi = melodySeq[step];
    if (melMidi > 0) {
      const hz = midiToHz(melMidi);
      const nextStep = melodySeq[(step + 1) % 64];
      const noteLen = nextStep === 0 ? stepDur * 1.75 : stepDur * 0.92;

      if (intensity === 0) {
        // Warm sunny meadow ocarina/lute lead
        this.playTone(
          {
            freq: hz,
            duration: noteLen,
            type: 'triangle',
            gain: 0.14,
            attack: 0.022,
            filterFreq: 1900,
            dest: 'bgm',
          },
          ctx,
          time
        );
        this.playTone(
          {
            freq: hz * 2,
            duration: noteLen * 0.65,
            type: 'sine',
            gain: 0.032,
            attack: 0.025,
            dest: 'bgm',
          },
          ctx,
          time
        );
      } else if (intensity === 1) {
        // Upbeat medieval-chiptune fife & square shimmer
        this.playTone(
          {
            freq: hz,
            duration: noteLen,
            type: 'square',
            gain: 0.075,
            attack: 0.01,
            filterFreq: 1850,
            endFilterFreq: 1200,
            dest: 'bgm',
          },
          ctx,
          time
        );
        this.playTone(
          {
            freq: hz,
            duration: noteLen * 1.05,
            type: 'triangle',
            gain: 0.11,
            attack: 0.012,
            detune: 4,
            dest: 'bgm',
          },
          ctx,
          time
        );
      } else {
        // Intensity 2: Urgent heroic brass/chiptune lead
        this.playTone(
          {
            freq: hz,
            duration: noteLen * 0.9,
            type: 'sawtooth',
            gain: 0.095,
            attack: 0.008,
            filterFreq: 2300,
            endFilterFreq: 1200,
            dest: 'bgm',
          },
          ctx,
          time
        );
        this.playTone(
          {
            freq: hz * 0.5,
            duration: noteLen * 0.85,
            type: 'square',
            gain: 0.055,
            attack: 0.008,
            filterFreq: 1100,
            dest: 'bgm',
          },
          ctx,
          time
        );
      }
    }

    // 4. Percussion Layer
    if (intensity === 0) {
      // Soft meadow tambourine whisper on backbeats
      if (inBar === 2 || inBar === 6) {
        this.playNoise(
          {
            duration: 0.045,
            gain: 0.028,
            filterFreq: 5200,
            filterType: 'highpass',
            dest: 'bgm',
          },
          ctx,
          time
        );
      }
    } else if (intensity === 1) {
      // Kingdom Rush marching kick & snare cadence
      if (inBar === 0 || inBar === 4) {
        this.playTone(
          {
            freq: 115,
            endFreq: 48,
            duration: 0.11,
            type: 'sine',
            gain: 0.16,
            attack: 0.004,
            dest: 'bgm',
          },
          ctx,
          time
        );
      }
      if (inBar === 2 || inBar === 6) {
        this.playNoise(
          {
            duration: 0.075,
            gain: 0.075,
            filterFreq: 2100,
            endFilterFreq: 1100,
            filterType: 'bandpass',
            q: 1.2,
            dest: 'bgm',
          },
          ctx,
          time
        );
      }
      // Classic snappy marching double-tap on the end of every 2nd bar
      if (inBar === 7 && Math.floor(step / 8) % 2 === 1) {
        this.playNoise(
          {
            duration: 0.05,
            gain: 0.055,
            filterFreq: 2400,
            filterType: 'bandpass',
            q: 1.4,
            dest: 'bgm',
          },
          ctx,
          time
        );
        this.playNoise(
          {
            duration: 0.05,
            gain: 0.068,
            filterFreq: 2600,
            filterType: 'bandpass',
            q: 1.4,
            dest: 'bgm',
          },
          ctx,
          time + stepDur * 0.5
        );
      }
    } else {
      // Intensity 2: Urgent war timpani + driving snare + battle fills
      if (inBar === 0 || inBar === 3 || inBar === 4 || inBar === 6) {
        this.playTone(
          {
            freq: inBar === 0 ? 128 : 108,
            endFreq: 42,
            duration: 0.13,
            type: 'sine',
            gain: 0.21,
            attack: 0.004,
            dest: 'bgm',
          },
          ctx,
          time
        );
      }
      if (inBar === 2 || inBar === 6) {
        this.playNoise(
          {
            duration: 0.085,
            gain: 0.1,
            filterFreq: 2200,
            endFilterFreq: 950,
            filterType: 'bandpass',
            q: 1.1,
            dest: 'bgm',
          },
          ctx,
          time
        );
      } else {
        // Urgent 8th-note hi-hat tick
        this.playNoise(
          {
            duration: 0.032,
            gain: 0.038,
            filterFreq: 6200,
            filterType: 'highpass',
            dest: 'bgm',
          },
          ctx,
          time
        );
      }
      // Dramatic 16th-note battle roll at bars 4 & 8
      if ((step === 31 || step === 63) || (step === 30 || step === 62)) {
        this.playNoise(
          {
            duration: 0.05,
            gain: 0.085,
            filterFreq: 2400,
            filterType: 'bandpass',
            q: 1.2,
            dest: 'bgm',
          },
          ctx,
          time + stepDur * 0.5
        );
      }
    }
  }

  // =========================================================================
  // Tactile, Punchy & Satirical Procedural SFX (100% backward-compatible API)
  // =========================================================================

  build(): void {
    if (!this.canTrigger('build', 40)) return;
    const j = this.jitter(0.035);
    // Warm wooden hammer thock + bright upgrade chime
    this.playTone({ freq: 165 * j, endFreq: 88 * j, duration: 0.075, type: 'triangle', gain: 0.19, attack: 0.004 });
    this.playNoise({ duration: 0.04, gain: 0.09, filterFreq: 1100 * j, filterType: 'bandpass', q: 1.8 });
    this.playTone({ freq: 330 * j, endFreq: 440 * j, duration: 0.09, type: 'triangle', gain: 0.14, delay: 0.04 });
    this.playTone({ freq: 523 * j, endFreq: 659 * j, duration: 0.13, type: 'sine', gain: 0.13, delay: 0.085 });
  }

  sell(): void {
    if (!this.canTrigger('sell', 40)) return;
    const j = this.jitter(0.035);
    // Dismantle pop + crisp double coin refund clink
    this.playTone({ freq: 420 * j, endFreq: 210 * j, duration: 0.08, type: 'triangle', gain: 0.13 });
    this.playTone({ freq: 988 * j, endFreq: 1046 * j, duration: 0.09, type: 'sine', gain: 0.12, delay: 0.045 });
    this.playTone({ freq: 1319 * j, endFreq: 1568 * j, duration: 0.13, type: 'sine', gain: 0.11, delay: 0.095 });
    this.playTone({ freq: 2637 * j, endFreq: 2637 * j, duration: 0.07, type: 'sine', gain: 0.035, delay: 0.095 });
  }

  arrow(): void {
    if (!this.canTrigger('arrow', 45)) return;
    const j = this.jitter(0.06);
    // Crisp bowstring snap + feathery air zip (safe under 4.0x Gatling fire)
    this.playTone({ freq: 680 * j, endFreq: 250 * j, duration: 0.055, type: 'triangle', gain: 0.068, attack: 0.003 });
    this.playNoise({
      duration: 0.042,
      gain: 0.042,
      filterFreq: 2600 * j,
      endFilterFreq: 1100 * j,
      filterType: 'bandpass',
      q: 1.5,
    });
  }

  sniper(): void {
    if (!this.canTrigger('sniper', 65)) return;
    const j = this.jitter(0.055);
    // Punchy trademark-stamp rifle crack + sub kick
    this.playNoise({
      duration: 0.065,
      gain: 0.11,
      filterFreq: 3400 * j,
      endFilterFreq: 1100 * j,
      filterType: 'highpass',
    });
    this.playTone({
      freq: 1320 * j,
      endFreq: 155 * j,
      duration: 0.13,
      type: 'sawtooth',
      gain: 0.1,
      attack: 0.003,
      filterFreq: 2800,
      endFilterFreq: 600,
    });
    this.playTone({ freq: 170 * j, endFreq: 52 * j, duration: 0.095, type: 'sine', gain: 0.15, attack: 0.004 });
  }

  magic(): void {
    if (!this.canTrigger('magic', 48)) return;
    const j = this.jitter(0.06);
    // Crystalline arcane sweep + harmonic shimmer
    this.playTone({ freq: 430 * j, endFreq: 960 * j, duration: 0.13, type: 'sine', gain: 0.072, attack: 0.008 });
    this.playTone({
      freq: 645 * j,
      endFreq: 1440 * j,
      duration: 0.11,
      type: 'triangle',
      gain: 0.048,
      detune: 7,
      delay: 0.012,
    });
    this.playTone({ freq: 1760 * j, endFreq: 1976 * j, duration: 0.06, type: 'sine', gain: 0.032, delay: 0.04 });
  }

  mortarBoom(): void {
    if (!this.canTrigger('mortarBoom', 75)) return;
    const j = this.jitter(0.06);
    // Warm sub-bass thump + initial shell crack + sweeping debris rumble
    this.playTone({ freq: 140 * j, endFreq: 32 * j, duration: 0.27, type: 'sine', gain: 0.24, attack: 0.004 });
    this.playTone({ freq: 230 * j, endFreq: 64 * j, duration: 0.06, type: 'triangle', gain: 0.13, attack: 0.003 });
    this.playNoise({
      duration: 0.29,
      gain: 0.2,
      filterFreq: 1150 * j,
      endFilterFreq: 180,
      filterType: 'lowpass',
    });
  }

  megaphone(): void {
    if (!this.canTrigger('megaphone', 90)) return;
    const j = this.jitter(0.055);
    // Satirical nasal bullhorn chirp
    this.playTone({
      freq: 470 * j,
      endFreq: 650 * j,
      duration: 0.085,
      type: 'sawtooth',
      gain: 0.095,
      filterFreq: 1200,
      filterType: 'bandpass',
      q: 2.4,
    });
    this.playTone({
      freq: 620 * j,
      endFreq: 390 * j,
      duration: 0.095,
      type: 'square',
      gain: 0.065,
      delay: 0.055,
      filterFreq: 1100,
      filterType: 'bandpass',
      q: 2.2,
    });
  }

  coin(): void {
    if (!this.canTrigger('coin', 45)) return;
    const nowMs = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (nowMs - this.lastCoinAt < 300) {
      this.coinStreak = Math.min(5, this.coinStreak + 1);
    } else {
      this.coinStreak = 0;
    }
    this.lastCoinAt = nowMs;

    const climb = Math.pow(1.05946, this.coinStreak); // crisp semitone shimmer on rapid kills
    const j = this.jitter(0.03) * climb;
    this.playTone({ freq: 960 * j, endFreq: 1440 * j, duration: 0.085, type: 'sine', gain: 0.082, attack: 0.003 });
    this.playTone({ freq: 1920 * j, endFreq: 2400 * j, duration: 0.06, type: 'triangle', gain: 0.036, delay: 0.015 });
  }

  vipSuccess(): void {
    if (!this.canTrigger('vipSuccess', 60)) return;
    // Champagne cork pop + red-carpet fanfare arpeggio
    this.playTone({ freq: 240, endFreq: 760, duration: 0.045, type: 'sine', gain: 0.14, attack: 0.003 });
    this.playNoise({ duration: 0.08, gain: 0.06, filterFreq: 4200, filterType: 'highpass', delay: 0.02 });
    const notes = [523.25, 659.25, 783.99, 987.77, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone({
        freq: n,
        endFreq: n * 1.005,
        duration: idx === notes.length - 1 ? 0.28 : 0.13,
        type: idx % 2 === 0 ? 'triangle' : 'sine',
        gain: idx === notes.length - 1 ? 0.16 : 0.125,
        delay: 0.035 + idx * 0.065,
      });
    });
  }

  vipPenalty(): void {
    if (!this.canTrigger('vipPenalty', 80)) return;
    // Comical muted-brass "wah-wah-waaaah" PR disaster trombone
    const steps: readonly [number, number, number, number][] = [
      [311, 294, 0.16, 0],
      [277, 261, 0.16, 0.14],
      [247, 168, 0.34, 0.29],
    ];
    for (const [f1, f2, dur, delay] of steps) {
      this.playTone({
        freq: f1,
        endFreq: f2,
        duration: dur,
        type: 'sawtooth',
        gain: 0.16,
        delay,
        filterFreq: 980,
        endFilterFreq: 420,
        vibratoHz: delay > 0.2 ? 6.5 : 0,
        vibratoDepth: delay > 0.2 ? 5 : 0,
      });
    }
  }

  stealTelemetry(): void {
    // Signature Skill 1: Vacuum suction whoosh + rising motor slurp + stolen coin cascade!
    this.playNoise({
      duration: 0.44,
      gain: 0.16,
      attack: 0.09,
      filterFreq: 380,
      endFilterFreq: 3100,
      filterType: 'bandpass',
      q: 2.1,
    });
    this.playTone({
      freq: 195,
      endFreq: 960,
      duration: 0.38,
      type: 'sawtooth',
      gain: 0.11,
      attack: 0.05,
      filterFreq: 1600,
    });
    this.playTone({
      freq: 310,
      endFreq: 1380,
      duration: 0.42,
      type: 'sine',
      gain: 0.11,
      attack: 0.04,
      delay: 0.05,
    });
    // Joyful stolen-telemetry coin cascade
    const coins = [1046.5, 1174.66, 1318.5, 1567.98, 2093.0];
    coins.forEach((n, idx) => {
      this.playTone({
        freq: n,
        endFreq: n * 1.12,
        duration: 0.09,
        type: 'sine',
        gain: 0.095,
        attack: 0.004,
        delay: 0.21 + idx * 0.052,
      });
      this.playTone({
        freq: n * 2,
        endFreq: n * 2,
        duration: 0.055,
        type: 'triangle',
        gain: 0.032,
        delay: 0.21 + idx * 0.052,
      });
    });
  }

  rugSweep(): void {
    // Signature Skill 2: Comical double bristle-brush sweep + floppy rug slap thump
    this.playNoise({
      duration: 0.12,
      gain: 0.15,
      attack: 0.015,
      filterFreq: 2100,
      endFilterFreq: 820,
      filterType: 'bandpass',
      q: 1.5,
      delay: 0,
    });
    this.playNoise({
      duration: 0.13,
      gain: 0.16,
      attack: 0.012,
      filterFreq: 2300,
      endFilterFreq: 720,
      filterType: 'bandpass',
      q: 1.4,
      delay: 0.1,
    });
    // Comical slide-swoop as puddles vanish under the carpet
    this.playTone({ freq: 520, endFreq: 175, duration: 0.19, type: 'triangle', gain: 0.13, delay: 0.03 });
    // Soft heavy rug flop thump
    this.playTone({ freq: 145, endFreq: 48, duration: 0.15, type: 'sine', gain: 0.2, attack: 0.005, delay: 0.16 });
    this.playNoise({
      duration: 0.1,
      gain: 0.11,
      filterFreq: 460,
      endFilterFreq: 180,
      filterType: 'lowpass',
      delay: 0.16,
    });
  }

  rugBurst(): void {
    // 41.6 GB Catastrophic Explosion: pressure swell -> seismic blast + data-sludge splatter pops
    this.duckBgm(0.35, 0.45, 0.5);
    this.playTone({ freq: 115, endFreq: 290, duration: 0.055, type: 'triangle', gain: 0.14, attack: 0.005 });
    this.playTone({ freq: 118, endFreq: 26, duration: 0.54, type: 'sine', gain: 0.3, attack: 0.004, delay: 0.045 });
    this.playTone({
      freq: 98,
      endFreq: 30,
      duration: 0.46,
      type: 'sawtooth',
      gain: 0.19,
      delay: 0.045,
      filterFreq: 720,
      endFilterFreq: 160,
    });
    this.playNoise({
      duration: 0.52,
      gain: 0.25,
      filterFreq: 2200,
      endFilterFreq: 210,
      filterType: 'lowpass',
      delay: 0.045,
    });
    // Comical bubbling leak splatter pops
    const pops = [540, 790, 420, 680];
    pops.forEach((f, idx) => {
      this.playTone({
        freq: f * 0.65,
        endFreq: f * 1.45,
        duration: 0.055,
        type: 'sine',
        gain: 0.075,
        delay: 0.14 + idx * 0.055,
      });
    });
  }

  deleteSlam(): void {
    // Signature Skill 3 (4 AM Delete): Heavy mechanical keyboard THOCK + spring ping + colossal bass drop!
    this.duckBgm(0.32, 0.5, 0.55);
    // 1. Tactile mechanical switch click
    this.playNoise({ duration: 0.018, gain: 0.18, filterFreq: 3800, filterType: 'bandpass', q: 2.0 });
    this.playTone({ freq: 2450, endFreq: 860, duration: 0.02, type: 'square', gain: 0.09, attack: 0.002 });
    // 2. Deep PBT keycap bottom-out THOCK + metallic stabilizer ring
    this.playTone({ freq: 340, endFreq: 105, duration: 0.06, type: 'triangle', gain: 0.24, attack: 0.002, delay: 0.01 });
    this.playNoise({ duration: 0.045, gain: 0.15, filterFreq: 680, filterType: 'bandpass', q: 1.6, delay: 0.01 });
    this.playTone({ freq: 1460, endFreq: 1410, duration: 0.09, type: 'sine', gain: 0.045, delay: 0.014 });
    // 3. Colossal 4 AM deletion bass drop + digital shred
    this.playTone({ freq: 170, endFreq: 26, duration: 0.52, type: 'sine', gain: 0.32, attack: 0.004, delay: 0.042 });
    this.playTone({
      freq: 560,
      endFreq: 52,
      duration: 0.38,
      type: 'sawtooth',
      gain: 0.18,
      delay: 0.042,
      filterFreq: 1500,
      endFilterFreq: 180,
    });
    this.playNoise({
      duration: 0.44,
      gain: 0.24,
      filterFreq: 960,
      endFilterFreq: 140,
      filterType: 'lowpass',
      delay: 0.042,
    });
  }

  apology(): void {
    // Signature Skill 4 (Ring-Light Apology): Cheesy harp glissando + dramatic soap-opera violin swell!
    this.duckBgm(0.45, 0.55, 0.5);
    // Shimmering cheesy harp glissando (Dmaj9)
    const harp = [293.66, 369.99, 440.0, 554.37, 659.25, 880.0];
    harp.forEach((n, idx) => {
      this.playTone({
        freq: n,
        endFreq: n * 1.003,
        duration: 0.34,
        type: 'triangle',
        gain: 0.095,
        attack: 0.006,
        delay: idx * 0.036,
        filterFreq: 2800,
      });
    });
    // Dramatic cheesy violin triad swell with lush vibrato
    const strings = [440.0, 554.37, 659.25];
    strings.forEach((n, idx) => {
      this.playTone({
        freq: n,
        endFreq: n * (idx === 2 ? 0.945 : 0.992), // theatrical wistful sigh at tail
        duration: 0.62,
        type: 'sawtooth',
        gain: 0.068,
        attack: 0.14,
        delay: 0.11,
        detune: idx === 1 ? 6 : -5,
        filterFreq: 1750,
        endFilterFreq: 950,
        vibratoHz: 5.6,
        vibratoDepth: 6,
      });
    });
  }

  alarmSiren(): void {
    if (!this.canTrigger('alarmSiren', 320)) return;
    for (let i = 0; i < 3; i++) {
      const delay = i * 0.19;
      this.playTone({
        freq: 590,
        endFreq: 960,
        duration: 0.15,
        type: 'sawtooth',
        gain: 0.14,
        delay,
        filterFreq: 1450,
        filterType: 'bandpass',
        q: 1.6,
      });
      this.playTone({
        freq: 295,
        endFreq: 480,
        duration: 0.15,
        type: 'triangle',
        gain: 0.08,
        delay,
      });
    }
  }

  waveHorn(): void {
    // Heroic medieval castle warhorn fifth
    const layers: readonly [number, number, number, number, number][] = [
      [146.83, 220.0, 0.24, 0.13, 0],
      [220.0, 293.66, 0.34, 0.14, 0.13],
      [293.66, 369.99, 0.36, 0.11, 0.15],
    ];
    for (const [f1, f2, dur, gain, delay] of layers) {
      this.playTone({
        freq: f1,
        endFreq: f2,
        duration: dur,
        type: 'sawtooth',
        gain,
        attack: 0.035,
        delay,
        detune: 4,
        filterFreq: 520,
        endFilterFreq: 1650,
      });
      this.playTone({
        freq: f1,
        endFreq: f2,
        duration: dur,
        type: 'triangle',
        gain: gain * 0.75,
        attack: 0.03,
        delay,
        detune: -4,
      });
    }
  }

  victory(): void {
    this.duckBgm(0.25, 0.9, 0.7);
    // Triumphant medieval castle brass & chime fanfare
    const lead = [523.25, 659.25, 783.99, 1046.5];
    const harmony = [392.0, 523.25, 659.25, 783.99];
    lead.forEach((n, idx) => {
      const delay = idx * 0.115;
      const dur = idx === lead.length - 1 ? 0.48 : 0.22;
      this.playTone({ freq: n, duration: dur, type: 'triangle', gain: 0.15, attack: 0.015, delay });
      this.playTone({
        freq: harmony[idx],
        duration: dur,
        type: 'sawtooth',
        gain: 0.075,
        attack: 0.02,
        delay,
        filterFreq: 1500,
      });
    });
    // Celebratory final timpani + bright sparkle
    this.playTone({ freq: 130.81, endFreq: 65.4, duration: 0.35, type: 'sine', gain: 0.22, delay: 0.345 });
    this.playTone({ freq: 2093.0, duration: 0.28, type: 'sine', gain: 0.06, delay: 0.36 });
  }

  defeat(): void {
    this.duckBgm(0.25, 0.9, 0.7);
    // Dramatic falling medieval minor cadence + low timpani thud
    const notes = [392.0, 349.23, 311.13, 261.63];
    notes.forEach((n, idx) => {
      const delay = idx * 0.15;
      const last = idx === notes.length - 1;
      this.playTone({
        freq: n,
        endFreq: last ? n * 0.88 : n * 0.96,
        duration: last ? 0.5 : 0.25,
        type: 'sawtooth',
        gain: 0.12,
        attack: 0.02,
        delay,
        filterFreq: 1100,
        endFilterFreq: 420,
      });
      this.playTone({
        freq: n * 0.5,
        endFreq: last ? n * 0.44 : n * 0.48,
        duration: last ? 0.5 : 0.25,
        type: 'triangle',
        gain: 0.11,
        delay,
      });
    });
    this.playTone({ freq: 110, endFreq: 42, duration: 0.42, type: 'sine', gain: 0.22, delay: 0.45 });
  }

  achievement(): void {
    if (!this.canTrigger('achievement', 120)) return;
    this.duckBgm(0.55, 0.36, 0.42);
    // Bright celebratory 4-note sparkling trophy arpeggio (C5-E5-G5-C6) + shimmering harmonic tail
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      const delay = idx * 0.068;
      const isLast = idx === notes.length - 1;
      this.playTone({
        freq: n,
        endFreq: n * 1.004,
        duration: isLast ? 0.42 : 0.16,
        type: 'triangle',
        gain: isLast ? 0.16 : 0.125,
        attack: 0.005,
        delay,
        filterFreq: 3800,
      });
      // Golden glockenspiel octave overtone
      this.playTone({
        freq: n * 2,
        duration: isLast ? 0.34 : 0.12,
        type: 'sine',
        gain: isLast ? 0.068 : 0.042,
        attack: 0.004,
        delay: delay + 0.008,
      });
    });
    // Warm fifth resolution under C6
    this.playTone({
      freq: 783.99,
      duration: 0.36,
      type: 'triangle',
      gain: 0.065,
      attack: 0.012,
      delay: 0.204,
      detune: 4,
    });
    // Shimmering harmonic tail (E6 -> G6 -> C7) + tiny sparkle air
    const sparkles = [1318.51, 1567.98, 2093.0];
    sparkles.forEach((n, idx) => {
      this.playTone({
        freq: n,
        duration: 0.24 + idx * 0.04,
        type: 'sine',
        gain: idx === 2 ? 0.042 : 0.036,
        attack: 0.01,
        delay: 0.248 + idx * 0.048,
        vibratoHz: 7.5,
        vibratoDepth: 6,
      });
    });
    this.playNoise({
      duration: 0.075,
      gain: 0.024,
      filterFreq: 6800,
      filterType: 'highpass',
      delay: 0.21,
    });
  }

  policyPick(): void {
    if (!this.canTrigger('policyPick', 80)) return;
    this.duckBgm(0.52, 0.28, 0.35);
    const j = this.jitter(0.025);
    // 1. Heavy boardroom wax-seal stamp thump + parchment press
    this.playTone({
      freq: 155 * j,
      endFreq: 48 * j,
      duration: 0.13,
      type: 'sine',
      gain: 0.25,
      attack: 0.003,
    });
    this.playTone({
      freq: 290 * j,
      endFreq: 112 * j,
      duration: 0.065,
      type: 'triangle',
      gain: 0.16,
      attack: 0.003,
    });
    this.playNoise({
      duration: 0.035,
      gain: 0.16,
      attack: 0.002,
      filterFreq: 1350 * j,
      endFilterFreq: 420,
      filterType: 'bandpass',
      q: 1.8,
    });
    this.playNoise({
      duration: 0.055,
      gain: 0.048,
      attack: 0.005,
      filterFreq: 2600,
      endFilterFreq: 900,
      filterType: 'bandpass',
      q: 1.3,
      delay: 0.015,
    });
    // 2. Crisp triumphant brass fifth chime (D4 -> A4 + bright D5/A5 chime crown)
    this.playTone({
      freq: 293.66,
      endFreq: 295.0,
      duration: 0.19,
      type: 'sawtooth',
      gain: 0.105,
      attack: 0.014,
      delay: 0.075,
      detune: 4,
      filterFreq: 720,
      endFilterFreq: 1900,
    });
    this.playTone({
      freq: 293.66,
      duration: 0.18,
      type: 'triangle',
      gain: 0.09,
      attack: 0.01,
      delay: 0.075,
      detune: -4,
    });
    this.playTone({
      freq: 440.0,
      endFreq: 442.0,
      duration: 0.34,
      type: 'sawtooth',
      gain: 0.125,
      attack: 0.015,
      delay: 0.155,
      detune: 5,
      filterFreq: 860,
      endFilterFreq: 2250,
    });
    this.playTone({
      freq: 440.0,
      duration: 0.34,
      type: 'triangle',
      gain: 0.1,
      attack: 0.012,
      delay: 0.155,
      detune: -5,
    });
    this.playTone({
      freq: 587.33,
      duration: 0.24,
      type: 'sine',
      gain: 0.062,
      attack: 0.006,
      delay: 0.155,
    });
    this.playTone({
      freq: 880.0,
      duration: 0.28,
      type: 'sine',
      gain: 0.07,
      attack: 0.005,
      delay: 0.165,
    });
  }

  inspect(): void {
    if (!this.canTrigger('inspect', 55)) return;
    const j = this.jitter(0.04);
    // Subtle, warm wooden parchment tap (gentle and never intrusive)
    this.playTone({
      freq: 410 * j,
      endFreq: 265 * j,
      duration: 0.042,
      type: 'triangle',
      gain: 0.068,
      attack: 0.003,
      filterFreq: 1200,
    });
    this.playTone({
      freq: 820 * j,
      endFreq: 690 * j,
      duration: 0.028,
      type: 'sine',
      gain: 0.032,
      attack: 0.002,
      delay: 0.004,
    });
    this.playNoise({
      duration: 0.034,
      gain: 0.03,
      attack: 0.004,
      filterFreq: 1950 * j,
      endFilterFreq: 950,
      filterType: 'bandpass',
      q: 1.6,
      delay: 0.005,
    });
  }

  error(): void {
    if (!this.canTrigger('error', 90)) return;
    const j = this.jitter(0.025);
    // Soft low double-buzz for unaffordable / locked actions
    this.playTone({
      freq: 185 * j,
      endFreq: 172 * j,
      duration: 0.07,
      type: 'sawtooth',
      gain: 0.085,
      attack: 0.006,
      filterFreq: 520,
      endFilterFreq: 320,
    });
    this.playTone({
      freq: 185 * j,
      endFreq: 172 * j,
      duration: 0.072,
      type: 'triangle',
      gain: 0.08,
      attack: 0.005,
    });
    this.playTone({
      freq: 152 * j,
      endFreq: 132 * j,
      duration: 0.105,
      type: 'sawtooth',
      gain: 0.095,
      attack: 0.006,
      delay: 0.088,
      filterFreq: 460,
      endFilterFreq: 260,
    });
    this.playTone({
      freq: 152 * j,
      endFreq: 132 * j,
      duration: 0.105,
      type: 'triangle',
      gain: 0.09,
      attack: 0.005,
      delay: 0.088,
    });
  }

  bossSpawn(): void {
    if (!this.canTrigger('bossSpawn', 400)) return;
    this.duckBgm(0.28, 0.95, 0.75);
    // 1. Ominous war timpani pickup & colossal rumble downbeat
    this.playTone({
      freq: 98,
      endFreq: 72,
      duration: 0.13,
      type: 'sine',
      gain: 0.19,
      attack: 0.005,
      delay: 0,
    });
    this.playTone({
      freq: 108,
      endFreq: 76,
      duration: 0.13,
      type: 'sine',
      gain: 0.22,
      attack: 0.005,
      delay: 0.095,
    });
    this.playTone({
      freq: 112,
      endFreq: 38,
      duration: 0.68,
      type: 'sine',
      gain: 0.3,
      attack: 0.006,
      delay: 0.19,
    });
    this.playTone({
      freq: 73.42,
      endFreq: 52,
      duration: 0.58,
      type: 'triangle',
      gain: 0.15,
      attack: 0.008,
      delay: 0.19,
      filterFreq: 240,
    });
    this.playNoise({
      duration: 0.45,
      gain: 0.16,
      attack: 0.01,
      filterFreq: 340,
      endFilterFreq: 95,
      filterType: 'lowpass',
      delay: 0.19,
    });
    this.playTone({
      freq: 96,
      endFreq: 42,
      duration: 0.55,
      type: 'sine',
      gain: 0.23,
      attack: 0.008,
      delay: 0.72,
    });

    // 2. Dramatic low brass EU regulatory horn chord (ominous D minor + regal fifth)
    const brassVoices: readonly {
      freq: number;
      gain: number;
      attack: number;
      delay: number;
      duration: number;
      detune: number;
      filterStart: number;
      filterEnd: number;
      vibrato?: boolean;
    }[] = [
      { freq: 73.42, gain: 0.15, attack: 0.07, delay: 0.18, duration: 1.05, detune: -6, filterStart: 260, filterEnd: 780 },
      { freq: 146.83, gain: 0.135, attack: 0.06, delay: 0.18, duration: 1.05, detune: 5, filterStart: 340, filterEnd: 1350 },
      { freq: 174.61, gain: 0.09, attack: 0.09, delay: 0.2, duration: 1.0, detune: 7, filterStart: 380, filterEnd: 1200, vibrato: true },
      { freq: 220.0, gain: 0.115, attack: 0.07, delay: 0.18, duration: 1.05, detune: -5, filterStart: 420, filterEnd: 1600 },
      { freq: 293.66, gain: 0.075, attack: 0.08, delay: 0.22, duration: 0.82, detune: 3, filterStart: 520, filterEnd: 1700, vibrato: true },
    ];
    for (const v of brassVoices) {
      this.playTone({
        freq: v.freq,
        endFreq: v.freq * 0.996,
        duration: v.duration,
        type: 'sawtooth',
        gain: v.gain,
        attack: v.attack,
        delay: v.delay,
        detune: v.detune,
        filterFreq: v.filterStart,
        endFilterFreq: v.filterEnd,
        vibratoHz: v.vibrato ? 4.2 : 0,
        vibratoDepth: v.vibrato ? 3.5 : 0,
      });
    }
    // Warm low horn triangle reinforcement for rich body
    this.playTone({
      freq: 146.83,
      duration: 1.0,
      type: 'triangle',
      gain: 0.11,
      attack: 0.05,
      delay: 0.18,
    });
    this.playTone({
      freq: 220.0,
      duration: 0.96,
      type: 'triangle',
      gain: 0.08,
      attack: 0.06,
      delay: 0.19,
    });
  }
}

export const sfx = new SoundEngine();

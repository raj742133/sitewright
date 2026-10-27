/* Procedural Web Audio synth for the glass audio player.
   Based on TactileAudioSynth from "Tactile Glass UI" by uixNinja (https://github.com/uixninja/tactile-glass-ui), MIT licence,
   Copyright (c) 2026 uixNinja; the licence ships as LICENSE-tactile-glass.txt. Renamed only: nothing here touches window or creates an
   AudioContext until setPlaying(true) is called, which the player does from a click or key press and never on its own. */

'use client';
/**
 * GlassAudioSynth
 * Real-time procedural Web Audio API synthesizer and FFT spectrum analyzer
 * for the glass audio player.
 * Generates 3 distinct multi-layered electronic compositions with full timeline
 * arrangement (Intro, Verse, Chorus, Bridge, Climax, Outro) and instant seek.
 */

interface TrackComposition {
  bpm: number;
  durationSec: number;
  // Primary 4-bar chord progression (each chord has 4 MIDI notes)
  chords: [number, number, number, number][];
  // Bridge / Breakdown 4-bar chord progression for distinct harmonic shift
  altChords: [number, number, number, number][];
  // Primary bass root MIDI notes per bar
  bassNotes: [number, number, number, number];
  // Bridge bass root MIDI notes per bar
  altBassNotes: [number, number, number, number];
  // 16-step arpeggio scale offsets (or -1 for rest)
  arpPattern: number[];
  // 16-step lead counter-melody scale offsets (or -1 for rest)
  leadPattern: number[];
  // Timbre profile
  style: "solaris" | "obsidian" | "caustic";
}

const TRACK_COMPOSITIONS: TrackComposition[] = [
  // Track 01: SOLARIS PHASE — 114 BPM, 228s, F Minor 9 Melodic Electronica
  {
    bpm: 114,
    durationSec: 228,
    chords: [
      [53, 56, 60, 67], // Fm9 (F3, Ab3, C4, G4)
      [49, 53, 56, 63], // Dbmaj9 (Db3, F3, Ab3, Eb4)
      [56, 60, 63, 67], // Abmaj7 (Ab3, C4, Eb4, G4)
      [51, 55, 58, 65], // Eb9 (Eb3, G3, Bb3, F4)
    ],
    altChords: [
      [58, 61, 65, 72], // Bbm9 (Bb3, Db4, F4, C5)
      [56, 60, 63, 70], // Abmaj9 (Ab3, C4, Eb4, Bb4)
      [49, 53, 56, 65], // Dbmaj7#11 (Db3, F3, Ab3, F4)
      [55, 58, 64, 67], // C7alt / Edim (G3, Bb3, E4, G4)
    ],
    bassNotes: [29, 25, 32, 27], // F1, Db1, Ab1, Eb1
    altBassNotes: [34, 32, 25, 36], // Bb1, Ab1, Db1, C2
    arpPattern: [0, 2, 3, 2, 1, 3, 2, 0, 0, 2, 3, 1, 2, 3, 1, 0],
    leadPattern: [3, -1, -1, 2, -1, 3, 1, -1, 2, -1, 3, -1, 1, 2, 0, -1],
    style: "solaris",
  },
  // Track 02: OBSIDIAN BLOOM — 92 BPM, 256s, D Dorian Warm Halftime Synthwave
  {
    bpm: 92,
    durationSec: 256,
    chords: [
      [50, 53, 57, 64], // Dm9 (D3, F3, A3, E4)
      [55, 58, 62, 65], // Gm7 (G3, Bb3, D4, F4)
      [46, 50, 53, 60], // Bbmaj9 (Bb2, D3, F3, C4)
      [45, 52, 55, 61], // A7sus/A7 (A2, E3, G3, C#4)
    ],
    altChords: [
      [53, 57, 60, 67], // Fmaj9 (F3, A3, C4, G4)
      [52, 55, 59, 64], // Em7 (E3, G3, B3, E4)
      [46, 50, 57, 62], // Bbmaj7 (Bb2, D3, A3, D4)
      [45, 52, 57, 64], // Asus4 (A2, E3, A3, E4)
    ],
    bassNotes: [26, 31, 34, 33], // D1, G1, Bb1, A1
    altBassNotes: [29, 28, 34, 33], // F1, E1, Bb1, A1
    arpPattern: [3, -1, 2, 1, -1, 3, 2, -1, 1, -1, 0, 2, -1, 1, 0, -1],
    leadPattern: [-1, 3, 2, -1, 1, -1, 3, 2, -1, 0, 1, -1, 2, -1, 3, -1],
    style: "obsidian",
  },
  // Track 03: CAUSTIC HORIZON — 126 BPM, 192s, A Minor 11 Atmospheric Liquid Breakbeat
  {
    bpm: 126,
    durationSec: 192,
    chords: [
      [57, 60, 64, 71], // Am9 (A3, C4, E4, B4)
      [53, 57, 60, 67], // Fmaj9 (F3, A3, C4, G4)
      [48, 55, 59, 64], // Cmaj7 (C3, G3, B3, E4)
      [55, 59, 62, 69], // G6 (G3, B3, D4, A4)
    ],
    altChords: [
      [50, 53, 57, 64], // Dm9 (D3, F3, A3, E4)
      [52, 56, 59, 64], // E7 (E3, G#3, B3, E4)
      [57, 60, 64, 69], // Am7 (A3, C4, E4, A4)
      [53, 57, 60, 64], // Fmaj7 (F3, A3, C4, E4)
    ],
    bassNotes: [33, 29, 36, 31], // A1, F1, C2, G1
    altBassNotes: [26, 28, 33, 29], // D1, E1, A1, F1
    arpPattern: [0, 1, 2, 3, 2, 1, 3, 2, 0, 3, 2, 1, 3, 2, 1, 0],
    leadPattern: [3, 2, -1, 1, 3, -1, 2, 0, 3, -1, 1, 2, -1, 3, 2, -1],
    style: "caustic",
  },
];

type SongSection = "intro" | "verse" | "chorus" | "bridge" | "climax" | "outro";

function getSectionForProgress(p: number): SongSection {
  if (p < 0.14) return "intro";
  if (p < 0.32) return "verse";
  if (p < 0.56) return "chorus";
  if (p < 0.72) return "bridge";
  if (p < 0.90) return "climax";
  return "outro";
}

function getFilterCutoffForProgress(p: number): number {
  const sec = getSectionForProgress(p);
  switch (sec) {
    case "intro": {
      const t = p / 0.14;
      return 1650 + t * 1050;
    }
    case "verse":
      return 2750;
    case "chorus":
      return 4800;
    case "bridge": {
      const t = (p - 0.56) / 0.16;
      return 1650 + Math.sin(t * Math.PI) * 1400;
    }
    case "climax":
      return 5800;
    case "outro": {
      const t = (p - 0.90) / 0.10;
      return Math.max(700, 2600 * (1 - t * 0.72));
    }
  }
}

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class GlassAudioSynth {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private delayLeft: DelayNode | null = null;
  private delayRight: DelayNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private fftData: Uint8Array<ArrayBuffer> | null = null;
  private timeDomainData: Uint8Array<ArrayBuffer> | null = null;
  private smoothedBars: Float32Array = new Float32Array(72);
  private smoothedIdleBars: Float32Array = new Float32Array(72);
  private smoothedGlowBars: Float32Array = new Float32Array(72);
  private lastActivePlayTime = -999;

  private isPlaying = false;
  private trackIndex = 0;
  private progress = 0;
  private currentStep = 0;
  private nextStepTime = 0;
  private lastSeekAudioTime = 0;
  private schedulerTimer: number | null = null;

  private getTotalSteps(comp: TrackComposition): number {
    const stepDuration = 60 / comp.bpm / 4;
    return Math.max(64, Math.round(comp.durationSec / stepDuration));
  }

  private ensureContext(): void {
    if (this.ctx) return;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    this.ctx = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.0001;
    this.masterGain = masterGain;

    const filterNode = ctx.createBiquadFilter();
    filterNode.type = "lowpass";
    filterNode.frequency.value = getFilterCutoffForProgress(this.progress);
    filterNode.Q.value = 0.85;
    this.filterNode = filterNode;

    const musicBus = ctx.createGain();
    musicBus.gain.value = 1.0;
    this.musicBus = musicBus;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 10;
    compressor.ratio.value = 3.5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.16;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.minDecibels = -80;
    analyser.maxDecibels = -10;
    analyser.smoothingTimeConstant = 0.72;
    this.analyser = analyser;
    this.fftData = new Uint8Array(analyser.frequencyBinCount);
    this.timeDomainData = new Uint8Array(analyser.fftSize);

    // Stereo ping-pong spatial echo network
    const delayLeft = ctx.createDelay(1.0);
    const delayRight = ctx.createDelay(1.0);
    delayLeft.delayTime.value = 0.26;
    delayRight.delayTime.value = 0.39;

    const fbLeft = ctx.createGain();
    const fbRight = ctx.createGain();
    fbLeft.gain.value = 0.32;
    fbRight.gain.value = 0.32;

    const delayWet = ctx.createGain();
    delayWet.gain.value = 0.28;

    const merger = ctx.createChannelMerger(2);

    delayLeft.connect(fbLeft);
    fbLeft.connect(delayRight);
    delayRight.connect(fbRight);
    fbRight.connect(delayLeft);

    delayLeft.connect(merger, 0, 0);
    delayRight.connect(merger, 0, 1);
    merger.connect(delayWet);

    this.delayLeft = delayLeft;
    this.delayRight = delayRight;

    musicBus.connect(filterNode);
    filterNode.connect(masterGain);
    filterNode.connect(delayLeft);
    delayWet.connect(masterGain);

    masterGain.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(ctx.destination);

    // Pre-generate white/pink noise buffer for crisp percussion transients
    const bufLen = ctx.sampleRate * 1;
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  /**
   * Smoothly fades out the active musicBus over 18ms and replaces it with a fresh bus
   * so sustained pad chords and bass notes from a previous timeline section stop cleanly.
   */
  private flushMusicBus(): void {
    if (!this.ctx || !this.filterNode) return;
    const now = this.ctx.currentTime;
    const oldBus = this.musicBus;
    if (oldBus) {
      try {
        oldBus.gain.cancelScheduledValues(now);
        oldBus.gain.setValueAtTime(Math.max(0.0001, oldBus.gain.value), now);
        oldBus.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);
        window.setTimeout(() => {
          try {
            oldBus.disconnect();
          } catch {
            // ignore
          }
        }, 35);
      } catch {
        // ignore
      }
    }

    const newBus = this.ctx.createGain();
    newBus.gain.setValueAtTime(0.0001, now);
    newBus.gain.linearRampToValueAtTime(1.0, now + 0.015);
    newBus.connect(this.filterNode);
    this.musicBus = newBus;
  }

  public setPlaying(playing: boolean): void {
    this.isPlaying = playing;
    if (playing) {
      this.ensureContext();
      if (!this.ctx || !this.masterGain) return;
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      const comp = TRACK_COMPOSITIONS[this.trackIndex];
      const totalSteps = this.getTotalSteps(comp);
      this.currentStep = Math.min(totalSteps - 1, Math.floor(this.progress * totalSteps));

      const now = this.ctx.currentTime;
      if (this.filterNode) {
        this.filterNode.frequency.setTargetAtTime(getFilterCutoffForProgress(this.progress), now, 0.04);
      }
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.90, now, 0.05);

      this.flushMusicBus();
      const stepDuration = 60 / comp.bpm / 4;
      this.triggerStep(this.currentStep, now + 0.01, stepDuration, comp, true);
      this.currentStep = (this.currentStep + 1) % totalSteps;
      this.nextStepTime = now + 0.01 + stepDuration;

      if (this.schedulerTimer === null) {
        this.schedulerTimer = window.setInterval(() => this.scheduleSteps(), 25);
      }
    } else {
      if (this.ctx && this.masterGain) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setTargetAtTime(0.0001, now, 0.06);
      }
      if (this.schedulerTimer !== null) {
        clearInterval(this.schedulerTimer);
        this.schedulerTimer = null;
      }
    }
  }

  public setTrack(index: number): void {
    const clamped =
      ((index % TRACK_COMPOSITIONS.length) + TRACK_COMPOSITIONS.length) %
      TRACK_COMPOSITIONS.length;
    const changed = clamped !== this.trackIndex;
    this.trackIndex = clamped;
    if (changed) {
      const comp = TRACK_COMPOSITIONS[this.trackIndex];
      const totalSteps = this.getTotalSteps(comp);
      this.currentStep = Math.min(totalSteps - 1, Math.floor(this.progress * totalSteps));
      if (this.ctx && this.delayLeft && this.delayRight) {
        const sixteenth = 60 / comp.bpm / 4;
        this.delayLeft.delayTime.setTargetAtTime(sixteenth * 3, this.ctx.currentTime, 0.05);
        this.delayRight.delayTime.setTargetAtTime(sixteenth * 4, this.ctx.currentTime, 0.05);
      }
      if (this.isPlaying && this.ctx) {
        this.flushMusicBus();
        const now = this.ctx.currentTime;
        const stepDuration = 60 / comp.bpm / 4;
        this.triggerStep(this.currentStep, now + 0.01, stepDuration, comp, true);
        this.currentStep = (this.currentStep + 1) % totalSteps;
        this.nextStepTime = now + 0.01 + stepDuration;
      }
    }
  }

  public getProgress(): number {
    return this.progress;
  }

  public seek(progress01: number): void {
    const clamped = Math.max(0, Math.min(1, progress01));
    this.progress = clamped;

    const comp = TRACK_COMPOSITIONS[this.trackIndex];
    const totalSteps = this.getTotalSteps(comp);
    const targetStep = Math.min(totalSteps - 1, Math.floor(clamped * totalSteps));
    const stepChanged = targetStep !== this.currentStep;
    this.currentStep = targetStep;

    if (!this.ctx || !this.filterNode) return;

    const now = this.ctx.currentTime;
    const cutoff = getFilterCutoffForProgress(clamped);
    this.filterNode.frequency.cancelScheduledValues(now);
    this.filterNode.frequency.setTargetAtTime(cutoff, now, 0.03);

    // If playing, re-anchor the step scheduler and trigger the new section's harmony & beat immediately
    if (this.isPlaying && stepChanged) {
      const perfNow = performance.now();
      const stepDuration = 60 / comp.bpm / 4;
      if (perfNow - this.lastSeekAudioTime >= 60) {
        this.lastSeekAudioTime = perfNow;
        this.flushMusicBus();
        this.triggerStep(this.currentStep, now + 0.008, stepDuration, comp, true);
        this.currentStep = (this.currentStep + 1) % totalSteps;
        this.nextStepTime = now + 0.008 + stepDuration;
      } else {
        this.nextStepTime = Math.min(this.nextStepTime, now + stepDuration * 0.5);
      }
    }
  }

  private scheduleSteps(): void {
    if (!this.ctx || !this.isPlaying) return;
    const comp = TRACK_COMPOSITIONS[this.trackIndex];
    const stepDuration = 60 / comp.bpm / 4; // 16th note
    const totalSteps = this.getTotalSteps(comp);

    while (this.nextStepTime < this.ctx.currentTime + 0.12) {
      this.progress = this.currentStep / totalSteps;
      if (this.filterNode) {
        const cutoff = getFilterCutoffForProgress(this.progress);
        this.filterNode.frequency.setTargetAtTime(cutoff, this.nextStepTime, 0.08);
      }
      this.triggerStep(this.currentStep, this.nextStepTime, stepDuration, comp, false);
      this.nextStepTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % totalSteps;
    }
  }

  private triggerStep(
    step: number,
    time: number,
    stepDur: number,
    comp: TrackComposition,
    forceImmediateContext: boolean
  ): void {
    if (!this.ctx || !this.musicBus) return;

    const totalSteps = this.getTotalSteps(comp);
    const stepProgress = step / totalSteps;
    const section = getSectionForProgress(stepProgress);

    const barNumber = Math.floor(step / 16);
    const barIdx = barNumber % 4;
    const stepInBar = step % 16;

    // Select chord & bass progression based on song section
    const useAltHarmony =
      section === "bridge" || (section === "climax" && Math.floor(barNumber / 4) % 2 === 1);
    const chord = useAltHarmony ? comp.altChords[barIdx] : comp.chords[barIdx];
    const bassMidi = useAltHarmony ? comp.altBassNotes[barIdx] : comp.bassNotes[barIdx];

    // 1. Lush Pad Chords at bar boundaries OR immediately upon seeking to a new position
    const isPadBoundary = stepInBar === 0 || (comp.style === "caustic" && stepInBar === 8);
    if (isPadBoundary || forceImmediateContext) {
      const remainingStepsInCycle =
        comp.style === "caustic" ? 8 - (stepInBar % 8) : 16 - stepInBar;
      const padDur = Math.max(2, remainingStepsInCycle) * stepDur;
      const padOctaveShift = section === "bridge" || section === "climax" || section === "outro" ? 12 : 0;
      const addShimmerFifth = section === "chorus" || section === "climax";
      this.triggerPadChord(chord, time, padDur, comp.style, padOctaveShift, addShimmerFifth);
    }

    // 2. Bassline arranged by section
    if (section === "intro" || section === "outro") {
      // Deep atmospheric sub-bass drone on bar downbeat (or seek)
      if (stepInBar === 0 || forceImmediateContext) {
        const remDur = Math.max(2, 12 - stepInBar) * stepDur;
        this.triggerBass(midiToFreq(bassMidi), time, remDur, comp.style, 0.20);
      }
    } else if (section === "bridge") {
      // Expressive sustained sub-bass on beats 0 and 8
      if (stepInBar === 0 || stepInBar === 8 || forceImmediateContext) {
        this.triggerBass(midiToFreq(bassMidi), time, stepDur * 6.5, comp.style, 0.24);
      }
    } else {
      // Verse, Chorus, Climax: Full rhythmic bassline
      const octaveBoost = section === "climax" && stepInBar % 4 === 2 ? 12 : 0;
      if (comp.style === "solaris") {
        if (stepInBar % 4 === 2 || stepInBar === 7 || stepInBar === 15 || forceImmediateContext) {
          const oct = stepInBar === 15 ? 12 : octaveBoost;
          this.triggerBass(midiToFreq(bassMidi + oct), time, stepDur * 2.2, "solaris", 0.30);
        }
      } else if (comp.style === "obsidian") {
        if (stepInBar === 0 || stepInBar === 10 || (section === "climax" && stepInBar === 6) || forceImmediateContext) {
          const dur = stepInBar === 0 ? stepDur * 6.5 : stepDur * 4.5;
          this.triggerBass(midiToFreq(bassMidi + octaveBoost), time, dur, "obsidian", 0.30);
        }
      } else {
        if (
          stepInBar === 0 ||
          stepInBar === 3 ||
          stepInBar === 6 ||
          stepInBar === 10 ||
          stepInBar === 12 ||
          forceImmediateContext
        ) {
          const oct = stepInBar === 6 ? 12 : octaveBoost;
          this.triggerBass(midiToFreq(bassMidi + oct), time, stepDur * 2.4, "caustic", 0.30);
        }
      }
    }

    // 3. Arpeggiator & Counter-Melody Lead arranged by section
    const arpDegree = comp.arpPattern[stepInBar];
    const shouldPlayArp =
      section === "intro" || section === "outro"
        ? stepInBar % 2 === 0
        : true;

    if (arpDegree >= 0 && shouldPlayArp) {
      const baseNote = chord[arpDegree % chord.length];
      let octaveShift = comp.style === "caustic" && stepInBar % 2 === 1 ? 24 : 12;
      if (section === "climax") octaveShift += 12;
      const freq = midiToFreq(baseNote + octaveShift);
      this.triggerArpNote(freq, time, stepDur, comp.style, section === "intro" ? 0.095 : 0.115);
    }

    // Counter-melody lead active in Chorus, Bridge, and Climax
    if (section === "chorus" || section === "bridge" || section === "climax") {
      const leadDegree = comp.leadPattern[stepInBar];
      if (leadDegree >= 0) {
        const leadMidi = chord[leadDegree % chord.length] + (section === "bridge" ? 24 : 19);
        this.triggerLeadNote(midiToFreq(leadMidi), time, stepDur * 2.4, comp.style);
      }
    }

    // 4. Percussion / Rhythm Pulse arranged by section
    if (section === "intro") {
      if (stepInBar === 0 || stepInBar === 8) this.triggerKick(time, 0.28);
      if (stepInBar % 4 === 2) this.triggerHat(time, 0.055, 0.05);
    } else if (section === "bridge") {
      if (stepInBar === 8) this.triggerSnare(time, 0.095);
      if (stepInBar % 2 === 0) this.triggerHat(time, 0.042, 0.045);
    } else if (section === "outro") {
      if (stepInBar % 4 === 0) this.triggerHat(time, 0.038, 0.04);
    } else {
      // Verse, Chorus, Climax
      const isFullDrums = section === "chorus" || section === "climax";
      const isFillBar = section === "climax" && barIdx === 3 && stepInBar >= 12;

      if (comp.style === "solaris") {
        if (stepInBar % 4 === 0) this.triggerKick(time, isFullDrums ? 0.42 : 0.34);
        if (isFullDrums && (stepInBar === 4 || stepInBar === 12)) this.triggerSnare(time, 0.115);
        if (isFillBar) this.triggerSnare(time, 0.095);
        if (stepInBar % 4 === 2) this.triggerHat(time, 0.080, 0.08);
        else if (isFullDrums && stepInBar % 2 === 1) this.triggerHat(time, 0.042, 0.04);
      } else if (comp.style === "obsidian") {
        if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) {
          this.triggerKick(time, isFullDrums ? 0.44 : 0.35);
        }
        if (stepInBar === 8 || isFillBar) this.triggerSnare(time, isFullDrums ? 0.155 : 0.115);
        if (stepInBar % 2 === 0 || (isFullDrums && stepInBar % 4 === 3)) {
          this.triggerHat(time, 0.048, 0.05);
        }
      } else {
        if (stepInBar === 0 || stepInBar === 10 || (section === "climax" && stepInBar === 6)) {
          this.triggerKick(time, isFullDrums ? 0.40 : 0.32);
        }
        if (stepInBar === 4 || stepInBar === 12 || isFillBar) {
          this.triggerSnare(time, isFullDrums ? 0.140 : 0.095);
        }
        if (isFullDrums || stepInBar % 2 === 0) {
          this.triggerHat(time, stepInBar % 2 === 0 ? 0.058 : 0.032, 0.035);
        }
      }
    }
  }

  private triggerPadChord(
    notes: [number, number, number, number],
    time: number,
    duration: number,
    style: TrackComposition["style"],
    octaveShift: number,
    addShimmerFifth: boolean
  ): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const targetBus = this.musicBus;

    const voicings = addShimmerFifth
      ? [...notes, notes[0] + 12 + octaveShift]
      : notes.map((n, i) => (i >= 2 ? n + octaveShift : n));

    voicings.forEach((midi, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = style === "obsidian" ? "sawtooth" : idx % 2 === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(midiToFreq(midi), time);
      osc.detune.setValueAtTime((idx - 1.5) * 8, time);

      const peakGain = style === "obsidian" ? 0.062 : 0.078;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(peakGain, time + Math.min(0.18, duration * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc.connect(gain);
      gain.connect(targetBus);

      osc.start(time);
      osc.stop(time + duration + 0.02);
    });
  }

  private triggerBass(
    freq: number,
    time: number,
    duration: number,
    style: TrackComposition["style"],
    peakGain: number
  ): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const targetBus = this.musicBus;

    const osc = ctx.createOscillator();
    const sub = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = style === "caustic" ? "triangle" : "sawtooth";
    osc.frequency.setValueAtTime(freq, time);

    sub.type = "sine";
    sub.frequency.setValueAtTime(freq, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(style === "obsidian" ? 280 : 440, time);
    filter.frequency.exponentialRampToValueAtTime(110, time + duration);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    sub.connect(filter);
    filter.connect(gain);
    gain.connect(targetBus);

    osc.start(time);
    sub.start(time);
    osc.stop(time + duration + 0.02);
    sub.stop(time + duration + 0.02);
  }

  private triggerArpNote(
    freq: number,
    time: number,
    stepDur: number,
    style: TrackComposition["style"],
    peak: number
  ): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = style === "solaris" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(freq, time);

    const noteDur = style === "obsidian" ? stepDur * 3.0 : stepDur * 1.6;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + noteDur);

    osc.connect(gain);
    gain.connect(this.musicBus);

    osc.start(time);
    osc.stop(time + noteDur + 0.02);
  }

  private triggerLeadNote(
    freq: number,
    time: number,
    noteDur: number,
    style: TrackComposition["style"]
  ): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = style === "obsidian" ? "sawtooth" : "triangle";
    osc.frequency.setValueAtTime(freq, time);
    osc.detune.setValueAtTime(6, time);

    const peak = style === "obsidian" ? 0.065 : 0.080;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + noteDur);

    osc.connect(gain);
    gain.connect(this.musicBus);

    osc.start(time);
    osc.stop(time + noteDur + 0.02);
  }

  private triggerKick(time: number, peakGain: number): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(132, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.09);
    osc.frequency.exponentialRampToValueAtTime(28, time + 0.24);

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.25);

    osc.connect(gain);
    gain.connect(this.musicBus);

    osc.start(time);
    osc.stop(time + 0.26);
  }

  private triggerSnare(time: number, peakGain: number): void {
    if (!this.ctx || !this.musicBus || !this.noiseBuffer) return;
    const ctx = this.ctx;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1850, time);
    filter.Q.setValueAtTime(1.2, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);

    noise.start(time);
    noise.stop(time + 0.15);
  }

  private triggerHat(time: number, peakGain: number, duration: number): void {
    if (!this.ctx || !this.musicBus || !this.noiseBuffer) return;
    const ctx = this.ctx;

    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(6800, time);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peakGain, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicBus);

    noise.start(time);
    noise.stop(time + duration + 0.01);
  }

  /**
   * Populates `outBars` with normalized [0..1] real-time audio spectrum amplitudes
   * driven 100% by the Web Audio API AnalyserNode (FFT + Time-Domain waveform).
   */
  public getSpectrumBars(barCount: number, outBars: Float32Array, _time = 0): void {
    const hasAudio =
      this.isPlaying &&
      this.analyser !== null &&
      this.fftData !== null &&
      this.timeDomainData !== null &&
      this.ctx?.state === "running";

    if (hasAudio && this.analyser && this.fftData && this.timeDomainData) {
      this.analyser.getByteFrequencyData(this.fftData);
      this.analyser.getByteTimeDomainData(this.timeDomainData);
    }

    const binCount = this.fftData ? this.fftData.length : 0;
    const sampleRate = this.ctx?.sampleRate || 48000;
    const hzPerBin = (sampleRate * 0.5) / Math.max(1, binCount);

    const sampleFftBand = (freqHz: number, radiusBins: number): number => {
      if (!this.fftData || binCount === 0) return 0;
      const centerBin = freqHz / hzPerBin;
      const startBin = Math.max(1, Math.floor(centerBin - radiusBins));
      const endBin = Math.min(binCount - 1, Math.ceil(centerBin + radiusBins));
      let sum = 0;
      let weightSum = 0;
      for (let b = startBin; b <= endBin; b++) {
        const dist = Math.abs(b - centerBin) / Math.max(1, radiusBins + 0.5);
        const w = Math.max(0.15, 1.0 - dist * 0.75);
        sum += (this.fftData[b] / 255) * w;
        weightSum += w;
      }
      return weightSum > 0 ? sum / weightSum : 0;
    };

    for (let i = 0; i < barCount; i++) {
      const u = barCount > 1 ? i / (barCount - 1) : 0.5;

      let targetVal = 0.0;
      if (hasAudio && this.fftData && this.timeDomainData && binCount > 0) {
        // Symmetrical center-out musical frequency mapping with slight stereo offset
        const distFromCenter = Math.abs(u - 0.5) * 2.0;
        const sideOffset = u < 0.5 ? 0.0 : 0.035;
        const bandPos = Math.min(1.0, distFromCenter * 0.92 + sideOffset);

        // Core musical fundamentals & harmonics (48 Hz .. 3200 Hz)
        const freqMain = 48 * Math.pow(3200 / 48, bandPos);
        const mainRaw = sampleFftBand(freqMain, 2 + Math.floor(bandPos * 5));
        const pinkTilt = Math.pow(freqMain / 90, 0.24);
        const mainEnergy = Math.min(1.0, mainRaw * pinkTilt);

        // Upper harmonic & percussion transient air (1800 Hz .. 8600 Hz)
        const freqAir = 1800 * Math.pow(8600 / 1800, bandPos);
        const airEnergy = Math.min(1.0, sampleFftBand(freqAir, 6) * 1.45);

        // Real time-domain oscilloscope displacement at bar position u
        const tdLen = this.timeDomainData.length;
        const tdCenter = Math.floor(u * (tdLen - 16));
        let tdPeak = 0;
        for (let k = 0; k < 16; k++) {
          const sample = Math.abs((this.timeDomainData[tdCenter + k] - 128) / 128);
          if (sample > tdPeak) tdPeak = sample;
        }
        const waveEnv = Math.min(1.0, tdPeak * 2.6);

        const combined = mainEnergy * 0.68 + airEnergy * 0.22 + waveEnv * 0.32;
        targetVal = combined > 0.01 ? Math.min(1.0, Math.pow(combined, 0.88)) : 0.0;
      }

      const prev = this.smoothedBars[i] || 0;
      const ease = targetVal > prev ? 0.34 : 0.16;
      let next = prev + (targetVal - prev) * ease;
      if (!this.isPlaying && next < 0.002) {
        next = 0;
      }
      this.smoothedBars[i] = next;
      outBars[i] = next;
    }
  }

  /**
   * Populates `outSignedBars` with a periodic [-1..1] traveling sine wave packet
   * from left to right when playback is paused, and optionally `outGlowBars` with [0..1]
   * local illumination (0 at rest, 1 inside the passing wave or during active playback).
   */
  public getIdleWaveBars(
    barCount: number,
    outSignedBars: Float32Array,
    time = 0,
    outGlowBars?: Float32Array
  ): void {
    if (this.isPlaying) {
      this.lastActivePlayTime = time;
    }

    const timeSinceStop = this.lastActivePlayTime > -100 ? time - this.lastActivePlayTime : 999;
    const isIdleReady = !this.isPlaying && timeSinceStop > 0.75;

    // 3.9s total cycle: 2.35s slower left-to-right sine wave sweep + 1.55s calm rest pause
    const cyclePeriod = 3.9;
    const waveDuration = 2.35;
    const idleClock = this.lastActivePlayTime > -100 ? Math.max(0, timeSinceStop - 0.75) : time;
    const cycleTime = ((idleClock % cyclePeriod) + cyclePeriod) % cyclePeriod;
    const inWaveWindow = isIdleReady && cycleTime < waveDuration;
    const tWave = inWaveWindow ? cycleTime / waveDuration : 0;

    // Packet center sweeps smoothly from outside the left edge (-0.38) past the right edge (+1.38)
    const centerU = -0.38 + tWave * 1.76;
    const packetRadius = 0.44;
    const timeEnvelope = inWaveWindow ? Math.pow(Math.sin(tWave * Math.PI), 0.6) : 0;

    for (let i = 0; i < barCount; i++) {
      const u = barCount > 1 ? i / (barCount - 1) : 0.5;
      let targetSigned = 0;
      let targetGlow = this.isPlaying ? 1.0 : 0.0;

      if (inWaveWindow) {
        const du = u - centerU;
        if (Math.abs(du) < packetRadius) {
          const normDist = du / packetRadius;
          const bell = 0.5 * (1 + Math.cos(normDist * Math.PI));
          const packetEnv = bell * Math.sqrt(bell);
          const edgeTaper = 0.35 + 0.65 * Math.pow(Math.sin(u * Math.PI), 0.5);
          // True traveling sine wave packet: balanced crest (+) and trough (-) gliding left to right
          const phase = -normDist * Math.PI * 1.65;
          targetSigned = Math.sin(phase) * packetEnv * edgeTaper * timeEnvelope * 1.32;
          targetGlow = Math.min(
            1.0,
            Math.max(packetEnv * edgeTaper * timeEnvelope * 1.18, Math.abs(targetSigned) * 1.15)
          );
        }
      }

      const prev = this.smoothedIdleBars[i] || 0;
      const ease = this.isPlaying ? 0.28 : 0.20;
      let next = prev + (targetSigned - prev) * ease;
      if (Math.abs(next) < 0.001) {
        next = 0;
      }
      this.smoothedIdleBars[i] = next;
      outSignedBars[i] = next;

      const prevGlow = this.smoothedGlowBars[i] || 0;
      const glowEase = targetGlow > prevGlow ? 0.24 : 0.14;
      let nextGlow = prevGlow + (targetGlow - prevGlow) * glowEase;
      if (nextGlow < 0.001) {
        nextGlow = 0;
      }
      this.smoothedGlowBars[i] = nextGlow;
      if (outGlowBars) {
        outGlowBars[i] = nextGlow;
      }
    }
  }

  public dispose(): void {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

let sharedAudioSynth: GlassAudioSynth | null = null;

export function getGlassAudioSynth(): GlassAudioSynth {
  if (!sharedAudioSynth) {
    sharedAudioSynth = new GlassAudioSynth();
  }
  return sharedAudioSynth;
}

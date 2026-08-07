export type SoundCue =
  | 'ui'
  | 'launch'
  | 'door-close'
  | 'door-open'
  | 'inspect'
  | 'hazard'
  | 'repair'
  | 'attack'
  | 'defend'
  | 'overload'
  | 'extract'

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext
}

class GameAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private enabled = true
  private ambience: AudioScheduledSourceNode[] = []

  setEnabled(enabled: boolean) {
    this.enabled = enabled
    if (!enabled) {
      this.stopAmbience()
      return
    }
    this.context?.resume()
  }

  play(cue: SoundCue) {
    if (!this.enabled) return
    const context = this.getContext()
    if (!context) return
    void context.resume()

    switch (cue) {
      case 'ui':
        this.tone(620, 0.055, 'sine', 0.035)
        break
      case 'launch':
        this.sweep(92, 210, 0.42, 'sawtooth', 0.055)
        this.tone(520, 0.08, 'sine', 0.04, 0.3)
        break
      case 'door-close':
        this.sweep(118, 42, 0.32, 'sawtooth', 0.075)
        this.noise(0.22, 0.035, 0.08)
        break
      case 'door-open':
        this.sweep(48, 132, 0.38, 'triangle', 0.06)
        this.tone(390, 0.07, 'sine', 0.025, 0.25)
        break
      case 'inspect':
        this.tone(720, 0.06, 'sine', 0.04)
        this.tone(980, 0.09, 'sine', 0.025, 0.075)
        break
      case 'hazard':
        this.tone(168, 0.1, 'square', 0.055)
        this.tone(132, 0.13, 'square', 0.045, 0.14)
        break
      case 'repair':
        this.tone(330, 0.12, 'sine', 0.035)
        this.tone(440, 0.13, 'sine', 0.035, 0.1)
        this.tone(660, 0.16, 'sine', 0.03, 0.2)
        break
      case 'attack':
        this.noise(0.12, 0.055)
        this.sweep(105, 55, 0.16, 'square', 0.05)
        break
      case 'defend':
        this.tone(215, 0.16, 'triangle', 0.055)
        this.tone(108, 0.18, 'sine', 0.035, 0.025)
        break
      case 'overload':
        this.sweep(240, 68, 0.28, 'sawtooth', 0.07)
        this.noise(0.18, 0.06, 0.08)
        break
      case 'extract':
        this.tone(330, 0.28, 'sine', 0.035)
        this.tone(440, 0.3, 'sine', 0.035, 0.08)
        this.tone(660, 0.38, 'sine', 0.03, 0.16)
        break
    }
  }

  startAmbience() {
    if (!this.enabled || this.ambience.length > 0) return
    const context = this.getContext()
    const master = this.master
    if (!context || !master) return
    void context.resume()

    const bed = context.createGain()
    const low = context.createOscillator()
    const machinery = context.createOscillator()
    const lfo = context.createOscillator()
    const lfoGain = context.createGain()

    bed.gain.value = 0.014
    low.type = 'sine'
    low.frequency.value = 43
    machinery.type = 'triangle'
    machinery.frequency.value = 57
    lfo.type = 'sine'
    lfo.frequency.value = 0.16
    lfoGain.gain.value = 0.004

    low.connect(bed)
    machinery.connect(bed)
    lfo.connect(lfoGain)
    lfoGain.connect(bed.gain)
    bed.connect(master)
    low.start()
    machinery.start()
    lfo.start()
    this.ambience = [low, machinery, lfo]
  }

  stopAmbience() {
    this.ambience.forEach((node) => {
      try {
        node.stop()
      } catch {
        // The node may already be stopped by the browser.
      }
    })
    this.ambience = []
  }

  private getContext() {
    if (typeof window === 'undefined') return null
    if (!this.context) {
      const audioWindow = window as AudioWindow
      const Context = audioWindow.AudioContext ?? audioWindow.webkitAudioContext
      if (!Context) return null
      this.context = new Context()
      this.master = this.context.createGain()
      this.master.gain.value = 0.72
      this.master.connect(this.context.destination)
    }
    return this.context
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0) {
    const context = this.context
    const master = this.master
    if (!context || !master) return
    const start = context.currentTime + delay
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain)
    gain.connect(master)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }

  private sweep(from: number, to: number, duration: number, type: OscillatorType, volume: number) {
    const context = this.context
    const master = this.master
    if (!context || !master) return
    const start = context.currentTime
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(from, start)
    oscillator.frequency.exponentialRampToValueAtTime(to, start + duration)
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.025)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
    oscillator.connect(gain)
    gain.connect(master)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  }

  private noise(duration: number, volume: number, delay = 0) {
    const context = this.context
    const master = this.master
    if (!context || !master) return
    const frameCount = Math.ceil(context.sampleRate * duration)
    const buffer = context.createBuffer(1, frameCount, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < frameCount; index += 1) {
      data[index] = (Math.random() * 2 - 1) * (1 - index / frameCount)
    }
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    const start = context.currentTime + delay
    source.buffer = buffer
    filter.type = 'lowpass'
    filter.frequency.value = 720
    gain.gain.value = volume
    source.connect(filter)
    filter.connect(gain)
    gain.connect(master)
    source.start(start)
  }
}

export const gameAudio = new GameAudio()

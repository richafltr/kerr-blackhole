/** Local, pre-rendered audio only. No API requests, keys, or inference in the game. */
export class MissionSound {
  readonly voice = new Audio('/assets/audio/prologue-voice.mp3');
  private readonly bed = new Audio('/assets/audio/signal-to-noise.mp3');
  private readonly descent = new Audio('/assets/audio/titan.mp3');
  voiceEnabled = true;
  musicEnabled = true;
  failed = new Set<string>();
  private phase = 'hold';
  private entered = false;
  private started = false;
  private suspended = false;
  private fallbackTime = 0;
  private last = 0;
  private frame = 0;
  private duck = false;
  constructor() {
    this.voice.preload = 'auto';
    this.bed.loop = true;
    this.bed.volume = 0;
    this.descent.volume = 0;
    this.voice.volume = 0.9;
    for (const [name, element] of this.channels()) {
      element.addEventListener('error', () => this.failed.add(name));
    }
  }
  private channels(): [string, HTMLAudioElement][] {
    return [
      ['voice', this.voice],
      ['score', this.bed],
      ['descent score', this.descent],
    ];
  }
  private play(name: string, element: HTMLAudioElement) {
    if (name === 'voice' && this.failed.has(name))
      element.currentTime = this.fallbackTime;
    void element
      .play()
      .then(() => this.failed.delete(name))
      .catch(() => this.failed.add(name));
  }
  start() {
    if (this.started) return;
    this.started = true;
    this.voice.muted = !this.voiceEnabled;
    this.bed.muted = !this.musicEnabled;
    this.descent.muted = !this.musicEnabled;
    // Unlock all three elements within the initial user gesture. Titan stays inaudible
    // until release, then rewinds. Keeping one mixer alive avoids intro/game autoplay gaps.
    for (const [name, element] of this.channels()) this.play(name, element);
    const tick = (now: number) => {
      const dt = this.last ? Math.min((now - this.last) / 1000, 0.2) : 0;
      this.last = now;
      if (!this.suspended) this.fallbackTime += dt;
      const approach = (a: HTMLAudioElement, target: number) => {
        a.volume += (target - a.volume) * (1 - Math.exp(-dt / 1.2));
      };
      const falling = this.phase === 'fall' || this.phase === 'memory';
      const gain = this.musicEnabled ? 1 : 0;
      approach(
        this.bed,
        gain *
          (falling || ['threshold', 'home', 'lost'].includes(this.phase)
            ? 0
            : this.duck
              ? 0.2
              : this.entered
                ? 0.27
                : 0.62),
      );
      approach(
        this.descent,
        gain *
          (falling
            ? 0.68
            : ['threshold', 'home', 'lost'].includes(this.phase)
              ? 0.12
              : 0),
      );
      this.voice.muted = !this.voiceEnabled;
      this.bed.muted = !this.musicEnabled;
      this.descent.muted = !this.musicEnabled;
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  get time() {
    return this.failed.has('voice')
      ? this.fallbackTime
      : this.voice.currentTime;
  }
  duckVoice(active: boolean) {
    this.duck = active && this.voiceEnabled;
  }
  setPhase(phase: string) {
    if (phase === 'fall' && this.phase !== 'fall') {
      this.descent.currentTime = 0;
      if (this.started && !this.suspended)
        this.play('descent score', this.descent);
    }
    this.phase = phase;
  }
  enter() {
    this.entered = true;
    this.duck = false;
    this.voice.pause();
  }
  pause(paused: boolean) {
    if (this.suspended === paused) return;
    this.suspended = paused;
    if (!this.started) return;
    for (const [name, element] of this.channels()) {
      if (paused) element.pause();
      else if (name !== 'voice' || !this.entered) this.play(name, element);
    }
  }
  retry() {
    if (this.suspended) return;
    for (const [name, element] of this.channels()) {
      if (this.failed.has(name) && (name !== 'voice' || !this.entered)) {
        if (element.error) element.load();
        if (name === 'voice') element.currentTime = this.fallbackTime;
        this.play(name, element);
      }
    }
  }
  dispose() {
    cancelAnimationFrame(this.frame);
    for (const [, element] of this.channels()) {
      element.pause();
      element.removeAttribute('src');
      element.load();
    }
  }
}

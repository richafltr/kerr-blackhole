'use client';
import { useEffect, useRef, useState } from 'react';
import prologue from '@/lib/prologue.json';
import { MissionSound } from '@/lib/mission-sound';
export type PrologueShot =
  | 'title'
  | 'black'
  | 'scale'
  | 'carrier'
  | 'probe'
  | 'cabin';
export type PrologueFrame = {
  shot: PrologueShot;
  progress: number;
  time?: number;
};
export function MissionIntro({
  active,
  phase,
  playing,
  onEnter,
  onFrame,
}: {
  active: boolean;
  phase: string;
  playing: boolean;
  onEnter: () => void;
  onFrame: (frame: PrologueFrame) => void;
}) {
  const [begun, setBegun] = useState(false);
  const [paused, setPaused] = useState(false);
  const voice = true;
  const [music, setMusic] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [audioError, setAudioError] = useState('');
  const sound = useRef<MissionSound | null>(null);
  const reducedMotion = useRef(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      reducedMotion.current = query.matches;
    };
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  const subtitle = useRef<HTMLParagraphElement>(null);
  const ready = elapsed >= prologue.duration - 0.15;
  const index = Math.max(
    0,
    prologue.cues.findIndex((cue) => elapsed < cue.end),
  );
  const cue = prologue.cues[ready ? prologue.cues.length - 1 : index];
  const start = () => {
    if (!sound.current) sound.current = new MissionSound();
    sound.current.voiceEnabled = voice;
    sound.current.musicEnabled = music;
    sound.current.start();
    setBegun(true);
  };
  const enter = () => {
    start();
    sound.current?.enter();
    onEnter();
  };
  useEffect(() => () => sound.current?.dispose(), []);
  useEffect(() => {
    sound.current?.setPhase(phase);
  }, [phase]);
  useEffect(() => {
    const pause = () =>
      sound.current?.pause(document.hidden || (active ? paused : !playing));
    pause();
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, [active, paused, playing, begun]);
  useEffect(() => {
    if (!begun) return;
    let id = 0;
    let lastUi = 0;
    const tick = (now: number) => {
      const seconds = Math.min(sound.current?.time ?? 0, prologue.duration);
      const current =
        prologue.cues.find((c) => seconds < c.end) ?? prologue.cues.at(-1)!;
      const progress = Math.min(
        1,
        (seconds - current.start) / (current.end - current.start),
      );
      if (active)
        onFrame({
          shot: current.shot as PrologueShot,
          time: seconds,
          progress: reducedMotion.current ? 0 : progress,
        });
      sound.current?.duckVoice(
        active &&
          seconds >= current.speechStart - 0.3 &&
          seconds < current.speechEnd + 0.4,
      );
      if (subtitle.current) {
        const reveal = Math.max(
          0,
          Math.floor((seconds - current.speechStart) * 24),
        );
        subtitle.current.textContent =
          current.shot === 'black' && !reducedMotion.current
            ? current.text.slice(0, reveal)
            : current.text;
      }
      if (now - lastUi > 100) {
        setElapsed(seconds);
        setAudioError([...(sound.current?.failed ?? [])].join(', '));
        lastUi = now;
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [begun, active, onFrame]);
  const toggleMusic = () => {
    if (sound.current) sound.current.musicEnabled = !music;
    setMusic(!music);
  };
  if (!active)
    return (
      <div className="mission-audio-controls">
        <button aria-pressed={music} onClick={toggleMusic}>
          SCORE {music ? 'ON' : 'OFF'}
        </button>
        {audioError && (
          <button onClick={() => sound.current?.retry()}>RETRY AUDIO</button>
        )}
      </div>
    );
  return (
    <section
      className={`mission-intro ${!begun ? 'title-sequence' : `film-sequence shot-${cue.shot}`} ${ready ? 'handoff' : ''}`}
      aria-label="Mission entrance"
    >
      {!begun ? (
        <div className="title-lockup">
          <h1>
            interstellar<span>: ad astra</span>
          </h1>
          <button className="intro-primary" onClick={start}>
            PLAY <span>▷</span>
          </button>
          <button className="intro-skip" onClick={enter}>
            SKIP INTRO
          </button>
        </div>
      ) : (
        <>
          <div className="film-letterbox" aria-hidden="true" />
          <div className="film-caption" key={cue.start}>
            <p ref={subtitle} aria-hidden="true" />
            <span className="sr-only" aria-live="polite">
              {cue.text}
            </span>
          </div>
          {ready && (
            <button className="intro-primary enter-vesper" onClick={enter}>
              ENTER VESPER <span>↗</span>
            </button>
          )}
          <div className="film-transport">
            <button aria-pressed={paused} onClick={() => setPaused(!paused)}>
              {paused ? 'RESUME' : 'PAUSE'}
            </button>
            <button onClick={enter}>SKIP TO CABIN ↗</button>
          </div>
          <div className="film-progress" aria-hidden="true">
            <i
              style={{ transform: `scaleX(${elapsed / prologue.duration})` }}
            />
          </div>
        </>
      )}
      {audioError && (
        <button className="audio-retry" onClick={() => sound.current?.retry()}>
          RETRY AUDIO / {audioError}
        </button>
      )}
    </section>
  );
}

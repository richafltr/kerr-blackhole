'use client';
import { useEffect, useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { createRenderer, defaultView, type View } from '@/lib/renderer';
export default function Page() {
  const canvas = useRef<HTMLCanvasElement>(null),
    settings = useRef(defaultView),
    paused = useRef(false);
  const [view, setView] = useState<View>(defaultView),
    [playing, setPlaying] = useState(true),
    [controls, setControls] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    settings.current = view;
  }, [view]);
  useEffect(() => {
    paused.current = !playing;
  }, [playing]);
  useEffect(() => {
    if (!canvas.current) return;
    let renderer: ReturnType<typeof createRenderer>;
    try {
      renderer = createRenderer(canvas.current);
    } catch (e) {
      queueMicrotask(() => setError(String(e)));
      return;
    }
    let frame = 0,
      last = 0,
      time = 0;
    const tick = (now: number) => {
      if (last && !paused.current) time += Math.min(0.1, (now - last) / 1000);
      last = now;
      renderer.render(time, settings.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
    };
  }, []);
  const update = (key: keyof View, value: number | readonly number[]) =>
    setView((v) => ({
      ...v,
      [key]: typeof value === 'number' ? value : value[0],
    }));
  return (
    <main>
      <canvas
        ref={canvas}
        aria-label="Gravitationally lensed black hole and accretion disk"
      />
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
      <div className="toolbar">
        <button
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause' : 'Play'}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? 'Ⅱ' : '▶'}
        </button>
        <button
          aria-label="Camera controls"
          title="Camera controls"
          aria-expanded={controls}
          onClick={() => setControls(!controls)}
        >
          ☷
        </button>
        <button
          aria-label="Reset camera"
          title="Reset camera"
          onClick={() => setView(defaultView)}
        >
          ↺
        </button>
      </div>
      {controls && (
        <section className="controls" aria-label="Camera controls">
          {(
            [
              {
                key: 'inclination',
                label: 'Inclination',
                min: 30,
                max: 88,
                step: 1,
              },
              { key: 'roll', label: 'Roll', min: -90, max: 90, step: 1 },
              { key: 'distance', label: 'Distance', min: 24, max: 55, step: 1 },
              {
                key: 'exposure',
                label: 'Exposure',
                min: 0.3,
                max: 3,
                step: 0.1,
              },
              {
                key: 'quality',
                label: 'Resolution',
                min: 0.4,
                max: 1,
                step: 0.1,
              },
            ] as const
          ).map((c) => (
            <div key={c.key}>
              <div id={c.key} className="label">
                {c.label}
                <span>{view[c.key].toFixed(c.step < 1 ? 1 : 0)}</span>
              </div>
              <Slider
                aria-labelledby={c.key}
                min={c.min}
                max={c.max}
                step={c.step}
                value={[view[c.key]]}
                onValueChange={(v) => update(c.key, v)}
              />
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

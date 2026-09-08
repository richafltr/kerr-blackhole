'use client';
import { useEffect, useRef, useState } from 'react';
import { createProbeRenderer, type Perspective } from '@/lib/probe';
import { physicalScale, staticClockRate, clockDisplay } from '@/lib/mission';
import { Slider } from '@/components/ui/slider';
import { createRenderer, defaultView, type View } from '@/lib/renderer';
export default function Page() {
  const [perspective, setPerspective] = useState<Perspective>('onboard');
  const [telemetry, setTelemetry] = useState({ local: 0, reference: 0 });
  const [sequence, setSequence] = useState(false);
  const sequenceRef = useRef(false),
    sequenceTime = useRef(0);
  const perspectiveRef = useRef<Perspective>('onboard');
  const probeCanvas = useRef<HTMLCanvasElement>(null);
  const scale = physicalScale();
  const canvas = useRef<HTMLCanvasElement>(null),
    settings = useRef(defaultView),
    paused = useRef(false);
  const [view, setView] = useState<View>(defaultView),
    [playing, setPlaying] = useState(true),
    [controls, setControls] = useState(false),
    [error, setError] = useState('');
  useEffect(() => {
    perspectiveRef.current = perspective;
  }, [perspective]);
  useEffect(() => {
    sequenceRef.current = sequence;
    sequenceTime.current = 0;
  }, [sequence]);
  useEffect(() => {
    settings.current = view;
  }, [view]);
  useEffect(() => {
    paused.current = !playing;
  }, [playing]);
  useEffect(() => {
    if (!canvas.current) return;
    let renderer: ReturnType<typeof createRenderer>;
    let probe: ReturnType<typeof createProbeRenderer> | undefined;
    try {
      renderer = createRenderer(canvas.current);
      if (probeCanvas.current) probe = createProbeRenderer(probeCanvas.current);
    } catch (e) {
      queueMicrotask(() => setError(String(e)));
      return;
    }
    let frame = 0,
      last = 0,
      time = 0,
      local = 0,
      lastTelemetry = 0,
      clockKey = '';
    const tick = (now: number) => {
      const current = settings.current;
      const nextClockKey = [
        current.distance,
        current.inclination,
        current.spin,
      ].join('/');
      if (nextClockKey !== clockKey) {
        // A camera preset change is a new stationary experiment, not a flown trajectory.
        time = 0;
        local = 0;
        last = 0;
        clockKey = nextClockKey;
      }
      if (last && !paused.current) {
        const dt = Math.min(0.1, (now - last) / 1000);
        time += dt;
        const v = settings.current;
        local += dt * staticClockRate(v.distance, v.inclination, v.spin);
        if (sequenceRef.current) {
          sequenceTime.current += dt;
          const t = sequenceTime.current;
          const next: Perspective =
            t < 10
              ? 'onboard'
              : t < 22
                ? 'beside'
                : t < 32
                  ? 'wide'
                  : 'onboard';
          if (perspectiveRef.current !== next) {
            perspectiveRef.current = next;
            setPerspective(next);
          }
          if (t >= 36) setSequence(false);
        }
      }
      last = now;
      try {
        // Convert physical coordinate seconds to the legacy disk shader's animation input.
        renderer.render(time / (6 * physicalScale().time), settings.current);
        probe?.render(perspectiveRef.current);
        if (now - lastTelemetry > 250) {
          setTelemetry({ local, reference: time });
          lastTelemetry = now;
        }
      } catch (e) {
        setError(String(e));
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
      probe?.dispose();
    };
  }, []);
  const update = (key: keyof View, value: number | readonly number[]) =>
    setView((v) => ({
      ...v,
      [key]: typeof value === 'number' ? value : value[0],
    }));
  return (
    <main className={`perspective-${perspective}`}>
      <canvas
        ref={canvas}
        aria-label="Gravitationally lensed black hole and accretion disk"
      />
      <canvas
        ref={probeCanvas}
        className="probe-layer"
        aria-label={
          perspective === 'onboard'
            ? 'Probe observation cabin'
            : 'Ten metre exploration probe'
        }
      />
      <div className="mission-header">
        <span className="mission-id">KERR / OBSERVER 01</span>
        <span className="mission-status">
          <i /> STATION KEEPING
        </span>
      </div>
      <nav className="perspectives" aria-label="Observation viewpoint">
        {(['onboard', 'beside', 'wide', 'optics'] as const).map((mode) => (
          <button
            key={mode}
            aria-pressed={perspective === mode}
            onClick={() => {
              setSequence(false);
              setPerspective(mode);
            }}
          >
            {
              {
                onboard: 'Onboard',
                beside: 'Probe',
                wide: 'Scale',
                optics: 'Optics',
              }[mode]
            }
          </button>
        ))}
      </nav>
      {perspective === 'onboard' && (
        <div className="instruments">
          <section>
            <span>ONBOARD ELAPSED</span>
            <strong>{clockDisplay(telemetry.local)}</strong>
            <small>LOCAL PROPER TIME</small>
          </section>
          <section className="reference-clock">
            <span>REFERENCE · ∞</span>
            <strong>{clockDisplay(telemetry.reference)}</strong>
            <small>COORDINATE TIME · SAME START</small>
          </section>
          <section>
            <span>CLOCK RATE · dτ/dt</span>
            <strong>
              {staticClockRate(
                view.distance,
                view.inclination,
                view.spin,
              ).toFixed(5)}
            </strong>
            <small>SUPPORTED STATIC OBSERVER</small>
          </section>
        </div>
      )}
      {(perspective === 'beside' || perspective === 'wide') && (
        <div className="scale-caption" key={perspective}>
          <span>
            {perspective === 'beside'
              ? 'LOCAL EXTERIOR VIEW'
              : 'WIDE REFERENCE VIEW'}
          </span>
          <strong>{perspective === 'beside' ? '10 m' : '10,000 km'}</strong>
          <p>
            {perspective === 'beside'
              ? 'Probe span · camera 25 m away'
              : 'Camera separation · probe below one pixel'}
          </p>
          {perspective === 'wide' && (
            <small>1 gravitational radius ≈ 148 million km</small>
          )}
        </div>
      )}
      <div className="mission-footer">
        <span>
          100 MILLION M☉ <b>/</b> r = {view.distance.toFixed(0)} GM/c² <b>/</b>{' '}
          {((view.distance * scale.length) / 1e12).toFixed(2)} BILLION KM
        </span>
        <button
          className="sequence-button"
          onClick={() => {
            setPerspective('onboard');
            setSequence(!sequence);
          }}
          aria-pressed={sequence}
        >
          {sequence ? 'Stop sequence' : 'Scale sequence · 36s'}
        </button>
      </div>
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
              { key: 'spin', label: 'Spin', min: -0.9, max: 0.9, step: 0.05 },
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
                <span>
                  {view[c.key].toFixed(c.step < 0.1 ? 2 : c.step < 1 ? 1 : 0)}
                </span>
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

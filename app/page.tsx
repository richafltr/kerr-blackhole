'use client';
/* Static Vite deployment serves the original foreground asset without a Next image server. */
/* oxlint-disable next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import { createProbeRenderer, type Perspective } from '@/lib/probe';
import { physicalScale, staticClockRate, clockDisplay } from '@/lib/mission';
import {
  releaseProbe,
  stepFlight,
  flightCamera,
  type Flight,
} from '@/lib/flight';
import { Slider } from '@/components/ui/slider';
import { createRenderer, defaultView, type View } from '@/lib/renderer';
import {
  ScanLine,
  Orbit,
  Camera,
  SlidersHorizontal,
  RotateCcw,
  Play,
  Pause,
} from 'lucide-react';
export default function Page() {
  const canvas = useRef<HTMLCanvasElement>(null),
    probeCanvas = useRef<HTMLCanvasElement>(null);
  const [perspective, setPerspective] = useState<Perspective>('onboard'),
    [view, setView] = useState<View>(defaultView);
  const [playing, setPlaying] = useState(true),
    [controls, setControls] = useState(false),
    [error, setError] = useState('');
  const [phase, setPhase] = useState<'hold' | 'armed' | 'fall' | 'end'>('hold');
  const [telemetry, setTelemetry] = useState({
    local: 0,
    reference: 0,
    radius: 30,
    warp: 1,
  });
  const settings = useRef(view),
    mode = useRef(perspective),
    paused = useRef(false),
    flight = useRef<Flight | null>(null),
    reset = useRef(0);
  useEffect(() => {
    settings.current = view;
  }, [view]);
  useEffect(() => {
    mode.current = perspective;
  }, [perspective]);
  useEffect(() => {
    paused.current = !playing;
  }, [playing]);
  useEffect(() => {
    if (!canvas.current || !probeCanvas.current) return;
    let renderer: ReturnType<typeof createRenderer> | undefined,
      probe: ReturnType<typeof createProbeRenderer> | undefined;
    try {
      renderer = createRenderer(canvas.current);
      probe = createProbeRenderer(probeCanvas.current);
    } catch (e) {
      renderer?.dispose();
      probe?.dispose();
      queueMicrotask(() => setError(String(e)));
      return;
    }
    let frame = 0,
      last = 0,
      time = 0,
      local = 0,
      lastTelemetry = 0,
      lastCamera = 0,
      flightWall = 0,
      key = '';
    let movingView: View | undefined;
    let releasePosition: number[] | undefined;
    const tg = physicalScale().time;
    const tick = (now: number) => {
      try {
        const v = settings.current,
          nextKey = [v.distance, v.inclination, v.spin, reset.current].join(
            '/',
          );
        if (nextKey !== key) {
          key = nextKey;
          time = 0;
          local = 0;
          last = 0;
          flightWall = 0;
          movingView = undefined;
          releasePosition = flight.current
            ? flight.current.state.slice(0, 3)
            : undefined;
          lastCamera = 0;
        }
        const dt =
          last && !paused.current ? Math.min(0.25, (now - last) / 1000) : 0;
        last = now;
        let warp = 1;
        if (flight.current) {
          flightWall += dt;
          warp = flightWall < 4 ? 1 : 2400;
          const wasComplete = flight.current.complete;
          flight.current = stepFlight(flight.current, (dt * warp) / tg);
          const f = flight.current;
          local = f.properTime * tg;
          time = f.coordinateTime * tg;
          if (!wasComplete && f.complete) setPhase('end');
          if (
            !movingView ||
            now - lastCamera >= 100 ||
            (!wasComplete && f.complete)
          ) {
            movingView = {
              ...v,
              camera: flightCamera(f),
              moving: !f.complete && !paused.current,
              quality: Math.min(v.quality, 0.8),
            };
            lastCamera = now;
          }
        } else {
          time += dt;
          local += dt * staticClockRate(v.distance, v.inclination, v.spin);
        }
        const active = movingView ? { ...movingView, exposure: v.exposure } : v;
        renderer!.render(time / (6 * tg), active);
        const separation =
          flight.current && releasePosition
            ? Math.hypot(
                ...releasePosition.map((x, i) => x - flight.current!.state[i]),
              ) * physicalScale().length
            : 0;
        probe!.render(
          mode.current === 'onboard' ? 'optics' : mode.current,
          separation,
        );
        if (now - lastTelemetry > 200) {
          setTelemetry({
            local,
            reference: time,
            radius: flight.current?.radius ?? v.distance,
            warp,
          });
          lastTelemetry = now;
        }
        frame = requestAnimationFrame(tick);
      } catch (e) {
        setError(String(e));
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      renderer?.dispose();
      probe?.dispose();
    };
  }, []);
  const restart = () => {
    flight.current = null;
    reset.current++;
    setPhase('hold');
    setPlaying(true);
  };
  const release = () => {
    flight.current = releaseProbe(view.distance, view.inclination, view.spin);
    reset.current++;
    setPhase('fall');
    setPlaying(true);
    setControls(false);
  };
  const update = (key: keyof View, value: number | readonly number[]) =>
    setView((v) => ({
      ...v,
      [key]: typeof value === 'number' ? value : value[0],
    }));
  return (
    <main className={`perspective-${perspective} flight-${phase}`}>
      <div className="universe">
        <canvas ref={canvas} aria-label="Live Kerr spacetime rendering" />
      </div>
      <canvas
        ref={probeCanvas}
        className="probe-layer"
        aria-label="Exterior probe camera"
      />
      {perspective === 'onboard' && (
        <img
          className="cabin-art"
          src="/assets/cabin-v2.png"
          alt="Pilot's view through the spacecraft window"
        />
      )}
      <header className="flight-heading">
        <span>
          VESPER <b>/</b> 01
        </span>
        <span>
          {phase === 'fall'
            ? 'FREE FALL'
            : phase === 'end'
              ? 'END OF TRACK'
              : 'HOLDING'}
        </span>
      </header>
      <div className="flight-readout">
        <span>
          τ <b>{clockDisplay(telemetry.local)}</b>
        </span>
        <span>
          r <b>{telemetry.radius.toFixed(2)} M</b>
        </span>
        {phase === 'fall' && telemetry.warp > 1 && (
          <span className="timewarp">TIME LAPSE ×2400</span>
        )}
      </div>
      {perspective === 'onboard' && (
        <div className="console-choice">
          {phase === 'hold' || phase === 'armed' ? (
            <>
              <span className="choice-eyebrow">
                {phase === 'armed' ? 'COMMIT TO DESCENT' : 'AT THE EDGE'}
              </span>
              <button
                className="release"
                onClick={() =>
                  phase === 'hold' ? setPhase('armed') : release()
                }
              >
                {phase === 'armed' ? 'RELEASE' : 'LET GO'}
              </button>
              {phase === 'armed' && (
                <button className="remain" onClick={() => setPhase('hold')}>
                  HOLD POSITION
                </button>
              )}
            </>
          ) : phase === 'end' ? (
            <>
              <span className="choice-eyebrow">EXTERIOR LIMIT</span>
              <button className="release" onClick={restart}>
                BEGIN AGAIN
              </button>
            </>
          ) : (
            <>
              <span className="choice-eyebrow">PROPER TIME</span>
              <strong className="flight-clock">
                {clockDisplay(telemetry.local)}
              </strong>
            </>
          )}
        </div>
      )}
      {perspective !== 'onboard' && phase === 'end' && (
        <button className="exterior-restart" onClick={restart}>
          BEGIN AGAIN
        </button>
      )}
      <nav className="view-dock" aria-label="Camera views">
        {(
          [
            { mode: 'onboard', label: '01 / CABIN', Icon: ScanLine },
            { mode: 'beside', label: '02 / CHASE', Icon: Camera },
            { mode: 'optics', label: '03 / OPTICS', Icon: Orbit },
          ] as const
        ).map(({ mode: target, label, Icon }) => (
          <button
            key={target}
            aria-label={label}
            aria-pressed={perspective === target}
            onClick={() => setPerspective(target)}
          >
            <Icon size={22} strokeWidth={1} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="flight-tools">
        <button
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause' : 'Play'}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </button>
        <button
          aria-label="Camera controls"
          title="Camera controls"
          aria-expanded={controls}
          onClick={() => setControls(!controls)}
        >
          <SlidersHorizontal size={15} />
        </button>
        <button
          aria-label="Restart observation"
          title="Restart observation"
          onClick={restart}
        >
          <RotateCcw size={15} />
        </button>
      </div>
      {controls && (
        <section className="controls" aria-label="Camera controls">
          <div className="reference-note">
            REFERENCE CLOCK {clockDisplay(telemetry.reference)}
          </div>
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
              {
                key: 'distance',
                label: 'Release radius',
                min: 24,
                max: 55,
                step: 1,
              },
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
                disabled={
                  (phase === 'fall' || phase === 'end') && c.key !== 'exposure'
                }
                value={[view[c.key]]}
                onValueChange={(v) => update(c.key, v)}
              />
            </div>
          ))}
        </section>
      )}
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
    </main>
  );
}

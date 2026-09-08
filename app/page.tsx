'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { trajectory, presets } from '@/lib/physics';
import { createRenderer } from '@/lib/renderer';
type Preset = keyof typeof presets;
export default function Page() {
  const [preset, setPreset] = useState<Preset>('precession'),
    [l, setL] = useState(3.8),
    [speed, setSpeed] = useState(1),
    [playing, setPlaying] = useState(true),
    [compare, setCompare] = useState(false),
    [reset, setReset] = useState(0),
    [error, setError] = useState(''),
    [readout, setReadout] = useState({ r: 14, t: 0, frames: 0, ended: false });
  const canvas = useRef<HTMLCanvasElement>(null);
  const running = useRef(playing),
    rate = useRef(speed);
  useEffect(() => {
    running.current = playing;
  }, [playing]);
  useEffect(() => {
    rate.current = speed;
  }, [speed]);
  const orbit = useMemo(() => trajectory(presets[preset].r, l), [preset, l]);
  const newton = useMemo(
    () => (compare ? trajectory(presets[preset].r, l, false) : null),
    [preset, l, compare],
  );
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
      cursor = 0,
      last = 0,
      report = 0,
      frames = 0,
      start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      if (running.current)
        cursor = Math.min(
          orbit.states.length - 1,
          cursor + dt * rate.current * 500,
        );
      const i = Math.floor(cursor);
      renderer.render(orbit.states, newton?.states || null, i);
      frames++;
      if (now - report > 250) {
        setReadout({
          r: orbit.states[i][0],
          t: i * orbit.h,
          frames: Math.round((frames * 1000) / Math.max(1, now - start)),
          ended: i === orbit.states.length - 1,
        });
        report = now;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      renderer.dispose();
    };
  }, [orbit, newton, reset]);
  function choose(key: Preset) {
    setPreset(key);
    setL(presets[key].l);
    setReset((x) => x + 1);
    setPlaying(true);
  }
  return (
    <main>
      <header>
        <Link className="brand" href="/">
          ◉ <span>KERR / LAB</span>
        </Link>
        <span className="edition">
          EXPERIMENT 01 <i /> SCHWARZSCHILD
        </span>
        <span className="badge">Live orbit experiment</span>
      </header>
      <div className="workspace">
        <section className="stage">
          <div className="stage-title">
            <span className="eyebrow">GRAVITY, BEFORE THE IMAGE</span>
            <h1>
              When an orbit
              <br />
              doesn’t close.
            </h1>
            <p>
              A particle in curved spacetime.
              <br />
              Follow the path. Change the experiment.
            </p>
          </div>
          <canvas
            ref={canvas}
            aria-label="Animated coordinate diagram of a particle orbit around a Schwarzschild black hole"
          />
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <div className="axis-label">EQUATORIAL PLANE · DISTANCES IN M</div>
          <div className="legend">
            <span>
              <b className="gold" />
              Relativistic trajectory
            </span>
            {compare && (
              <span>
                <b className="blue" />
                Newtonian reference
              </span>
            )}
            <span>Horizon 2 M</span>
            <span>Photon sphere 3 M</span>
            <span>ISCO 6 M</span>
          </div>
          <div className="transport">
            <button onClick={() => setPlaying(!playing)}>
              {playing ? 'Ⅱ Pause' : '▶ Play'}
            </button>
            <button onClick={() => setReset((x) => x + 1)}>↺ Restart</button>
            <span>
              {readout.ended
                ? orbit.captured
                  ? 'Reached capture cutoff'
                  : 'Trajectory complete'
                : 'Proper time'}{' '}
              <strong>{readout.t.toFixed(1)} M</strong>
            </span>
          </div>
        </section>
        <aside>
          <div className="eyebrow">CHOOSE A TRAJECTORY</div>
          <div className="presets">
            {(Object.keys(presets) as Preset[]).map((key, i) => (
              <button
                key={key}
                className={preset === key ? 'selected' : ''}
                onClick={() => choose(key)}
              >
                <span>0{i + 1}</span>
                {presets[key].name}
                <b>↗</b>
              </button>
            ))}
          </div>
          <p className="explanation">
            {presets[preset].description}
            {Math.abs(l - presets[preset].l) > 1e-8
              ? ' Angular momentum has been modified from this preset.'
              : ''}
          </p>
          <div className="control">
            <label id="momentum">
              Angular momentum <strong>{l.toFixed(3)} M</strong>
            </label>
            <Slider
              aria-labelledby="momentum"
              min={2.8}
              max={4.3}
              step={0.01}
              value={[l]}
              onValueChange={(v) => {
                setL(Array.isArray(v) ? v[0] : v);
              }}
            />
            <div className="ends">
              <span>More capture</span>
              <span>More support</span>
            </div>
          </div>
          <div className="control">
            <label id="speed">
              Playback speed <strong>{speed.toFixed(1)}×</strong>
            </label>
            <Slider
              aria-labelledby="speed"
              min={0.2}
              max={3}
              step={0.1}
              value={[speed]}
              onValueChange={(v) => setSpeed(Array.isArray(v) ? v[0] : v)}
            />
          </div>
          <label className="toggle" htmlFor="compare">
            Newtonian comparison
            <Switch
              id="compare"
              checked={compare}
              onCheckedChange={setCompare}
            />
          </label>
          {compare && (
            <p className="small">
              Same initial radius, radial derivative, and angular momentum. Each
              model uses its own time parameter.
            </p>
          )}
          <div className="stats">
            <div>
              <span>Current radius</span>
              <strong>
                {readout.r.toFixed(2)} <small>M</small>
              </strong>
            </div>
            <div>
              <span>Energy² drift · full path</span>
              <strong>{orbit.error.toExponential(1)}</strong>
            </div>
            <div>
              <span>Display rate · average</span>
              <strong>
                {readout.frames} <small>FPS</small>
              </strong>
            </div>
            <div>
              <span>Integration</span>
              <strong>
                RK4 <small>float64</small>
              </strong>
            </div>
          </div>
          <div className="note">
            <span className="eyebrow">WHAT YOU’RE SEEING</span>
            <p>
              A coordinate map of a test-particle geodesic, animated in proper
              time. No gravitational lensing, spin, accretion physics, or camera
              light-travel effects yet.
            </p>
            <p>
              The rings mark radii; they are not a rendered black-hole shadow.
            </p>
          </div>
        </aside>
      </div>
      <footer>
        <span>G = c = M = 1 · Nonrotating black hole</span>
        <a
          href="https://www.damtp.cam.ac.uk/user/tong/gr/grhtml/S1.html"
          target="_blank"
          rel="noreferrer"
        >
          Explore the equations ↗
        </a>
        <span>WebGL2 display / CPU physics</span>
      </footer>
    </main>
  );
}

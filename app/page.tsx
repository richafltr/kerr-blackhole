'use client';
/* Static Vite deployment serves the original foreground asset without a Next image server. */
/* oxlint-disable next/no-img-element */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createProbeRenderer, type Perspective } from '@/lib/probe';
import { physicalScale, staticClockRate, clockDisplay } from '@/lib/mission';
import {
  releaseProbe,
  stepFlight,
  flightCamera,
  type Flight,
} from '@/lib/flight';
import {
  MissionIntro,
  type PrologueFrame,
  type PrologueShot,
} from './mission-intro';
import { makeCamera, rotateCamera, relativeRotation } from '@/lib/camera';
import { tidalStretch, tidalTensor } from '@/lib/tides';
import { loadFlightPath, sampleFlightPath } from '@/lib/flight-path';
import {
  newNavigation,
  stepNavigation,
  type Navigation,
  type Input,
} from '@/lib/navigation';
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
    [view, setView] = useState<View>({ ...defaultView, roll: 0 });
  const introFrame = useRef<PrologueFrame | undefined>({
    shot: 'title',
    progress: 0,
  });
  const [introShot, setIntroShot] = useState<PrologueShot>('title');
  const onIntroFrame = useCallback((frame: PrologueFrame) => {
    if (introFrame.current?.shot !== frame.shot) setIntroShot(frame.shot);
    introFrame.current = frame;
  }, []);
  const [intro, setIntro] = useState(true),
    [cinematic, setCinematic] = useState(true);
  const [playing, setPlaying] = useState(false),
    [controls, setControls] = useState(false),
    [error, setError] = useState('');
  type Phase =
    | 'hold'
    | 'armed'
    | 'fall'
    | 'threshold'
    | 'memory'
    | 'lost'
    | 'home';
  const [phase, setPhase] = useState<Phase>('hold');
  const phaseRef = useRef<Phase>('hold');
  const navigation = useRef<Navigation | undefined>(undefined);
  const look = useRef([0, 0]);
  const dragging = useRef<{ x: number; y: number } | null>(null);
  const inputs = useRef<Input>({ x: 0, y: 0, brake: false });
  const trajectory = useRef<Flight[]>([]);
  const localTide = useRef([
    [0, 0],
    [0, 0],
  ]);
  const [pilot, setPilot] = useState({
    hull: 3,
    fuel: 70,
    x: 0,
    y: 0,
    flash: 0,
    active: false,
    gates: 0,
  });
  const changePhase = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    let cancelled = false;
    trajectory.current = [];
    void loadFlightPath(view.distance, view.inclination, view.spin)
      .then((path) => {
        if (!cancelled) trajectory.current = path;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [view.distance, view.inclination, view.spin]);
  useEffect(() => {
    const keys = new Set<string>();
    const sync = () => {
      inputs.current = {
        x:
          Number(keys.has('d') || keys.has('arrowright')) -
          Number(keys.has('a') || keys.has('arrowleft')),
        y:
          Number(keys.has('w') || keys.has('arrowup')) -
          Number(keys.has('s') || keys.has('arrowdown')),
        brake: keys.has(' '),
        roll: Number(keys.has('q')) - Number(keys.has('e')),
      };
    };
    const down = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (
        [
          'w',
          'a',
          's',
          'd',
          'q',
          'e',
          'arrowup',
          'arrowdown',
          'arrowleft',
          'arrowright',
          ' ',
        ].includes(e.key.toLowerCase()) &&
        ['fall', 'memory'].includes(phaseRef.current)
      ) {
        e.preventDefault();
        keys.add(e.key.toLowerCase());
        sync();
      }
    };
    const up = (e: KeyboardEvent) => {
      keys.delete(e.key.toLowerCase());
      sync();
    };
    const clear = () => {
      keys.clear();
      sync();
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);
  useEffect(() => {
    if (phase !== 'threshold' || !playing) return;
    const timer = window.setTimeout(() => {
      inputs.current = { x: 0, y: 0, brake: false };
      navigation.current = newNavigation('memory');
      changePhase('memory');
      setPlaying(true);
    }, 3200);
    return () => clearTimeout(timer);
  }, [phase, playing]);
  const [telemetry, setTelemetry] = useState({
    local: 0,
    reference: 0,
    radius: 30,
    warp: 1,
    tide: 0,
  });
  const settings = useRef(view),
    mode = useRef<Perspective>('wide'),
    paused = useRef(true),
    flight = useRef<Flight | null>(null),
    reset = useRef(0);
  useEffect(() => {
    settings.current = view;
  }, [view]);
  useEffect(() => {
    mode.current = intro ? 'wide' : perspective;
  }, [perspective, intro]);
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
      introProper = 0,
      archiveIndex = 0,
      key = '';
    let movingView: View | undefined;
    let skyAttitude = [1, 0, 0, 0, 1, 0, 0, 0, 1];
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
          introProper = 0;
          archiveIndex = 0;
          probe!.clearMemories();
          movingView = undefined;
          releasePosition = flight.current
            ? flight.current.state.slice(0, 3)
            : undefined;
          lastCamera = 0;
        }
        const dt =
          last && !paused.current ? Math.min(0.25, (now - last) / 1000) : 0;
        last = now;
        if (
          navigation.current &&
          !navigation.current.complete &&
          !navigation.current.failed
        ) {
          navigation.current = stepNavigation(
            navigation.current,
            dt,
            inputs.current,
            localTide.current,
          );
          if (navigation.current.failed) {
            phaseRef.current = 'lost';
            setPhase('lost');
          } else if (
            navigation.current.complete &&
            navigation.current.kind === 'memory'
          ) {
            phaseRef.current = 'home';
            setPhase('home');
          }
        }
        let warp = 1;
        if (flight.current) {
          flightWall += dt;
          if (
            flight.current.radius <= 8 &&
            !navigation.current &&
            phaseRef.current === 'fall'
          )
            navigation.current = newNavigation('exterior');
          warp =
            flightWall < 4 ||
            (navigation.current && !navigation.current.complete)
              ? 1
              : 2400;
          const wasComplete = flight.current.complete;
          if (phaseRef.current === 'fall')
            flight.current = stepFlight(flight.current, (dt * warp) / tg);
          const f = flight.current;
          local = f.properTime * tg;
          time = f.coordinateTime * tg;
          if (!wasComplete && f.complete) {
            phaseRef.current = 'threshold';
            setPhase('threshold');
          }
          if (
            !movingView ||
            now - lastCamera >= 150 ||
            (!wasComplete && f.complete)
          ) {
            movingView = {
              ...v,
              camera: flightCamera(
                trajectory.current.length
                  ? sampleFlightPath(trajectory.current, f.properTime)
                  : f,
              ),
              moving: !f.complete && !paused.current,
              quality: Math.min(v.quality, 0.8),
            };
            lastCamera = now;
          }
        } else {
          time += dt;
          local += dt * staticClockRate(v.distance, v.inclination, v.spin);
        }
        let active = movingView ? { ...movingView, exposure: v.exposure } : v;
        if (introFrame.current?.time && trajectory.current.length) {
          introProper = Math.min(145, (introFrame.current.time / 57.932) * 145);
          const staged = sampleFlightPath(trajectory.current, introProper);
          active = { ...v, camera: flightCamera(staged), moving: true };
        }
        const separation =
          flight.current && releasePosition
            ? Math.hypot(
                ...releasePosition.map((x, i) => x - flight.current!.state[i]),
              ) * physicalScale().length
            : 0;
        const physicalFrame = {
          dt,
          elapsed: flightWall,
          clock: local,
          separation,
          radius: flight.current?.radius ?? v.distance,
          navigation: navigation.current,
          light: renderer!.illumination,
          reset: reset.current,
          look: look.current,
        };
        if (!introFrame.current) {
          const orientation = probe!.prepare(mode.current, physicalFrame);
          let residual = relativeRotation(skyAttitude, orientation);
          const angle = Math.acos(
            Math.max(
              -1,
              Math.min(1, (residual[0] + residual[4] + residual[8] - 1) / 2),
            ),
          );
          // Only rotation is reprojected. Rebase before leaving the overscanned optical view.
          if (angle > 0.04) {
            skyAttitude = orientation;
            residual = relativeRotation(skyAttitude, orientation);
          }
          const carried =
            active.camera ?? makeCamera(v.distance, v.inclination, v.spin);
          active = {
            ...active,
            roll: 0,
            camera: rotateCamera(carried, skyAttitude),
            lightingCamera: carried,
            orientation: residual,
          };
        }
        if (!['threshold', 'memory', 'home', 'lost'].includes(phaseRef.current))
          renderer!.render(
            (introFrame.current ? introProper : time / tg) / 6,
            active,
          );
        probe!.render(
          mode.current,
          separation,
          introFrame.current,
          navigation.current &&
            (!navigation.current.complete ||
              navigation.current.kind === 'memory')
            ? navigation.current
            : undefined,
          introFrame.current ? undefined : physicalFrame,
        );
        if (
          phaseRef.current === 'fall' &&
          flight.current &&
          archiveIndex < 6 &&
          flight.current.properTime >= [0, 20, 60, 100, 145, 175][archiveIndex]
        ) {
          probe!.remember(canvas.current!, local);
          archiveIndex++;
        }
        if (now - lastTelemetry > 200) {
          const nav = navigation.current;
          setPilot({
            hull: nav?.hull ?? 3,
            fuel: nav?.fuel ?? 70,
            x: nav?.x ?? 0,
            y: nav?.y ?? 0,
            flash: nav?.flash ?? 0,
            active: !!nav && !nav.complete && !nav.failed,
            gates: nav?.gates ?? 0,
          });
          if (nav?.kind === 'exterior' && !nav.complete && flight.current) {
            const tensor = tidalTensor(flightCamera(flight.current), v.spin);
            localTide.current = [
              [tensor[1][1] / (tg * tg), tensor[1][2] / (tg * tg)],
              [tensor[2][1] / (tg * tg), tensor[2][2] / (tg * tg)],
            ];
          } else
            localTide.current = [
              [0, 0],
              [0, 0],
            ];
          setTelemetry({
            local,
            reference: time,
            radius: flight.current?.radius ?? v.distance,
            warp,
            tide: tidalStretch(
              flight.current
                ? flightCamera(flight.current)
                : makeCamera(v.distance, v.inclination, v.spin),
              v.spin,
            ),
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
    look.current = [0, 0];
    reset.current++;
    navigation.current = undefined;
    inputs.current = { x: 0, y: 0, brake: false };
    changePhase('hold');
    setPlaying(true);
  };
  const release = () => {
    flight.current = releaseProbe(view.distance, view.inclination, view.spin);
    reset.current++;
    navigation.current = undefined;
    inputs.current = { x: 0, y: 0, brake: false };
    changePhase('fall');
    setPlaying(true);
    setControls(false);
  };
  const update = (key: keyof View, value: number | readonly number[]) =>
    setView((v) => ({
      ...v,
      [key]: typeof value === 'number' ? value : value[0],
    }));
  return (
    <main
      onPointerDown={(e) => {
        if (
          intro ||
          perspective !== 'onboard' ||
          (e.target as HTMLElement).closest('button,input,nav,section')
        )
          return;
        dragging.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const last = dragging.current;
        if (!last) return;
        look.current = [
          Math.max(
            -0.4,
            Math.min(0.4, look.current[0] - (e.clientX - last.x) * 0.0018),
          ),
          Math.max(
            -0.23,
            Math.min(0.23, look.current[1] - (e.clientY - last.y) * 0.0018),
          ),
        ];
        dragging.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={() => (dragging.current = null)}
      onPointerCancel={() => (dragging.current = null)}
      onLostPointerCapture={() => (dragging.current = null)}
      className={`physical-cut perspective-${intro ? (introShot === 'cabin' ? 'onboard' : 'wide') : perspective} flight-${phase} ${cinematic ? 'cinematic' : 'spectral'} ${intro ? `in-prologue prologue-${introShot}` : ''}`}
    >
      <div className="universe">
        <canvas ref={canvas} aria-label="Live Kerr spacetime rendering" />
      </div>
      <canvas
        ref={probeCanvas}
        className="probe-layer"
        aria-label="Exterior probe camera"
      />
      {intro && introShot === 'cabin' && (
        <img
          className="cabin-art"
          src="/assets/cabin-v2.png"
          alt="Pilot's view through the spacecraft window"
        />
      )}
      <div className="flight-interface" hidden={intro}>
        <header className="flight-heading">
          <span>
            VESPER <b>/</b> 01
          </span>
          <span>
            {phase === 'fall'
              ? 'FREE FALL'
              : phase === 'home'
                ? 'TRANSMISSION RECEIVED'
                : 'AWAITING COMMAND'}
          </span>
        </header>
        <div className="flight-readout">
          <span>
            τ <b>{clockDisplay(telemetry.local)}</b>
          </span>
          <span>
            r <b>{telemetry.radius.toFixed(2)} M</b>
          </span>
          <span>
            Δa₂ₘ <b>{(telemetry.tide * 1e6).toFixed(3)} µm/s²</b>
          </span>
          {phase === 'fall' && telemetry.warp > 1 && (
            <span className="timewarp">TIME LAPSE ×2400</span>
          )}
        </div>
        {!intro &&
          perspective === 'onboard' &&
          !['threshold', 'memory', 'home', 'lost'].includes(phase) && (
            <div className="console-choice">
              {phase === 'hold' || phase === 'armed' ? (
                <>
                  <span className="choice-eyebrow">
                    {phase === 'armed' ? 'RETURN SEAT → MARA' : 'ONE SEAT HOME'}
                  </span>
                  <button
                    className="release"
                    onClick={() =>
                      phase === 'hold' ? setPhase('armed') : release()
                    }
                  >
                    {phase === 'armed' ? 'RELEASE VESPER' : 'TAKE THE DESCENT'}
                  </button>
                  {phase === 'armed' && (
                    <button className="remain" onClick={() => setPhase('hold')}>
                      ABORT RELEASE
                    </button>
                  )}
                </>
              ) : phase === 'home' ? (
                <>
                  <span className="choice-eyebrow">EXTERIOR LIMIT</span>
                  <button className="release" onClick={restart}>
                    BEGIN AGAIN
                  </button>
                </>
              ) : (
                <>
                  <span className="choice-eyebrow">SEAT ASSIGNED / MARA</span>
                  <strong className="flight-clock">
                    {clockDisplay(telemetry.local)}
                  </strong>
                </>
              )}
            </div>
          )}

        <nav
          hidden={['threshold', 'memory', 'home', 'lost'].includes(phase)}
          className="view-dock"
          aria-label="Camera views"
        >
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
            <button
              className="grade-toggle"
              aria-pressed={cinematic}
              onClick={() => setCinematic(!cinematic)}
            >
              COLOR / {cinematic ? 'CINEMA' : 'SPECTRAL'}
            </button>
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
                    !['hold', 'armed'].includes(phase) && c.key !== 'exposure'
                  }
                  value={[view[c.key]]}
                  onValueChange={(v) => update(c.key, v)}
                />
              </div>
            ))}
          </section>
        )}
      </div>
      {(phase === 'fall' || phase === 'memory') && (
        <>
          <div className="pilot-status">
            <span>
              {pilot.hull > 1 ? 'HULL' : 'HULL CRITICAL'}{' '}
              {'Ⅰ'.repeat(Math.max(0, pilot.hull))}
            </span>
            <span>ΔV {pilot.fuel.toFixed(0)}</span>
            <span>
              {phase === 'memory'
                ? `FOLLOW THE LIGHT / ${pilot.gates + 1}`
                : pilot.active
                  ? 'WASD / STEER · SPACE / BRAKE'
                  : telemetry.warp > 1
                    ? 'COAST / TIME LAPSE ×2400'
                    : 'COAST'}
            </span>
            {(Math.abs(pilot.x) > 20 || Math.abs(pilot.y) > 16) && (
              <span>OFF VECTOR</span>
            )}
          </div>
          {pilot.active && (
            <div className="touch-flight">
              <div
                className="steering-pad"
                aria-label="Drag to steer"
                role="application"
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const r = e.currentTarget.getBoundingClientRect();
                  inputs.current.x =
                    (e.clientX - r.left - r.width / 2) / (r.width / 2);
                  inputs.current.y =
                    -(e.clientY - r.top - r.height / 2) / (r.height / 2);
                }}
                onPointerMove={(e) => {
                  if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  inputs.current.x = Math.max(
                    -1,
                    Math.min(
                      1,
                      (e.clientX - r.left - r.width / 2) / (r.width / 2),
                    ),
                  );
                  inputs.current.y = Math.max(
                    -1,
                    Math.min(
                      1,
                      -(e.clientY - r.top - r.height / 2) / (r.height / 2),
                    ),
                  );
                }}
                onPointerUp={() => {
                  inputs.current.x = inputs.current.y = 0;
                }}
                onPointerCancel={() => {
                  inputs.current.x = inputs.current.y = 0;
                }}
              >
                ＋
              </div>
              <button
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  inputs.current.brake = true;
                }}
                onPointerUp={() => {
                  inputs.current.brake = false;
                }}
                onPointerCancel={() => {
                  inputs.current.brake = false;
                }}
              >
                BRAKE
              </button>
            </div>
          )}
          <div
            className="impact-glass"
            style={{ opacity: pilot.flash * 0.65 }}
            aria-hidden="true"
          />
        </>
      )}
      {phase === 'threshold' && (
        <div className="chapter-threshold">
          <span>SPECULATIVE INTERIOR</span>
          <p>Beyond the model.</p>
        </div>
      )}
      {(phase === 'home' || phase === 'lost') && (
        <div className="mission-ending">
          <span>
            {phase === 'home' ? 'TRANSMISSION RECEIVED' : 'SIGNAL LOST'}
          </span>
          <h2>{phase === 'home' ? 'Somewhere. Somewhen.' : 'Vesper.'}</h2>
          <button className="intro-primary" onClick={restart}>
            {phase === 'home' ? 'PLAY AGAIN' : 'RETRY'}
          </button>
        </div>
      )}
      <MissionIntro
        active={intro}
        phase={phase}
        playing={playing}
        onFrame={onIntroFrame}
        onEnter={() => {
          introFrame.current = undefined;
          setIntro(false);
          setPlaying(true);
          reset.current++;
        }}
      />
      {error && (
        <div role="alert" className="error">
          {error}
        </div>
      )}
    </main>
  );
}

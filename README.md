# Kerr Black Hole Lab

An interactive gravity laboratory, starting with accurate test-particle orbits and progressing toward a GPU Kerr black-hole renderer inspired by Interstellar.

**Implemented now:** a low-fidelity Schwarzschild orbit experiment with relativistic precession, a stable circular orbit, capture, angular-momentum controls, a Newtonian comparison, and numerical energy diagnostics. This is a coordinate diagram, not a camera image. No lensing or Kerr spin is implemented yet.

## Stack decision

**Use TypeScript + React for the interface, double-precision JavaScript for reference physics, and direct WebGL2 / GLSL ES 3.00 for the current GPU display and next ray-tracing pass.** Vinext/Vite and Sites provide the scaffold, build, and preview. The numerical core has no dependency on React or hosting and can be moved into a minimal Vite application or worker.

This is the most efficient *delivery choice for this 2–3 hour prototype*, not a claim that WebGL2 is the fastest possible renderer. We have not benchmarked alternative backends.

| Layer | Choice | Reason |
| --- | --- | --- |
| UI and state | React + TypeScript, existing Sites control primitives | A small interactive laboratory with accessible controls; React stays out of the per-frame drawing loop. |
| Physics today | TypeScript, JavaScript `number` (float64), RK4 | A few trajectories are inexpensive on CPU; double precision makes validation easier. |
| Rendering today | Direct WebGL2, GLSL ES 3.00 | GPU line/point rasterization, no scene-graph dependency. |
| Next rendering stage | WebGL2 full-screen fragment shader | One independent light ray per pixel; no compute pipeline required for this first ray tracer. |
| Tooling | Vinext/Vite, npm lockfile, TypeScript, Node test runner | Reproducible local setup and production build. |
| Hosting | Sites | Preview/distribution only; physics executes on the viewer's device. |
| Later reference workload | CPU float64 in a Web Worker if needed | Keep heavier validation off the UI thread. |

Three.js can host custom geodesic shaders, but it does not provide relativistic physics by itself. It is unnecessary for this small coordinate experiment or a single full-screen ray-tracing pass. No CUDA: the development machine is an Apple M4. Native Metal could suit a later Apple-specific renderer, but its platform/tooling cost does not fit this browser demo sprint.

## WebGPU limits and fidelity

WebGPU is a useful future option for compute passes, storage buffers, batching, and more explicit GPU scheduling. It does not automatically make the geodesics more accurate or a renderer faster.

- **Precision:** WGSL has runtime `f32` and optional `f16`, not runtime `f64`. Its abstract floating-point constants are not a double-precision GPU execution mode. WebGL2 `highp` shaders also do not supply a portable double-precision solver. Use nondimensional units, well-conditioned coordinates, bounded parameters, and convergence tests either way.
- **Divergent ray work:** photons near critical orbits may require many more integration steps than escaping rays. WebGPU does not remove this workload or guarantee that neighboring GPU lanes finish together.
- **Quality costs:** more steps, more pixels, antialiasing, multiple disk crossings, and radiative transfer increase cost. Resolution scaling is a quality/performance tradeoff, not a same-quality speedup.
- **Numerical limits:** single-precision accumulation and near-critical paths need explicit error checks. Changing the API cannot correct a wrong metric, camera frame, disk intersection, or integrator.
- **Device limits:** test the actual browser/device and query capabilities. This M4's Metal support does not by itself prove that a particular browser exposes WebGPU or all optional features.
- **Interstellar fidelity:** an interactive individual-ray approximation with illustrative emission is substantially narrower than DNGR's film-quality ray-bundle rendering. Cinematic bloom and color should be labeled as presentation choices.

Decision gate: keep one backend until a measured bottleneck calls for WebGPU compute. Do not spend this sprint implementing both APIs. Add a GPU ray tracer only after a CPU reference and selected analytic checks exist.

Specifications: [WGSL](https://www.w3.org/TR/WGSL/), [WebGL2](https://registry.khronos.org/webgl/specs/latest/2.0/). Film context: [James et al., 2015](https://arxiv.org/abs/1502.03808).

## Run

Requires Node 22.13+ and npm. Node 25.4.0 was used during development.

```sh
npm ci
npm run dev
```

Open the local URL printed by the server. Use a WebGL2-capable browser with GPU acceleration. Unsupported contexts display an error instead of silently substituting a simulation.

```sh
npm test
npm run typecheck
npm run build
```

## What the first simulation accurately models

A negligible-mass test particle follows an equatorial timelike geodesic in a fixed, nonrotating Schwarzschild spacetime. Units are `G = c = M = 1`; radius is the Schwarzschild areal coordinate and animation advances particle proper time `τ`.

```text
dr/dτ = v
 dv/dτ = −1/r² + L²/r³ − 3L²/r⁴
 dφ/dτ = L/r²
 E² = v² + (1 − 2/r)(1 + L²/r²)
```

`L` is conserved specific angular momentum. RK4 integrates `(r, v, φ)` at a fixed proper-time step of `0.08 M`. The complete trajectory is computed when its parameters change, then progressively drawn; this is not live GPU numerical integration. Circular orbit initialization uses `L = r / sqrt(r − 3)`.

Experiments:

1. **Relativistic precession:** start at `r = 14 M`, `v = 0`, `L = 3.8 M`. The bound trajectory produces an advancing periapsis and a rosette.
2. **Stable circular orbit:** start at `r = 10 M`, with the analytic circular-orbit angular momentum. The radius remains constant.
3. **Capture:** start at `r = 12 M`, `v = 0`, `L = 3.2 M`. Integration stops after crossing the exterior cutoff at `2.05 M`; the last fixed step can overshoot that cutoff. It does not model the interior.
4. **Newtonian comparison:** remove the relativistic `−3L²/r⁴` term. Initial radius, radial derivative, and angular momentum match. Relativistic proper time and Newtonian time are different parameters; simultaneous positions are not a common observer's synchronized measurement.

The plotted `x = r cos φ`, `y = r sin φ` coordinates are a convenient diagram, not proper spatial distances or an optical image. Rings indicate the horizon at `2 M`, photon sphere at `3 M`, and ISCO at `6 M`. Their displayed sizes are not the apparent shadow size. The photon sphere is a reference ring; this version does not simulate photons.

At most 18,000 steps are computed. Paths also stop beyond `100 M`; the fixed viewport can clip large excursions when angular momentum is changed. At the end, use Restart to replay. The path remains visible instead of silently looping a captured particle.

Physics reference: [David Tong, General Relativity, §1.3.3](https://www.damtp.cam.ac.uk/user/tong/gr/grhtml/S1.html).

## Validation and measured results

Four automated physics checks pass:

- Analytically initialized circular orbit remains at `10 M` within `1e-9 M`.
- The bound orbit stays outside `6 M`, conserves energy, and has an apsidal advance greater than `2π` between successive periapses.
- Low-angular-momentum capture occurs and energy drift decreases when the step is halved.
- Bound-orbit final radius and angle agree within `1e-7` under step refinement at matching proper time.

With the current preset parameters and `h = 0.08 M`, measured maximum relative `E²` drift over the computed path is about `1.93e-15` for precession, zero at displayed precision for the exact circular initialization, and `2.61e-6` for capture. These are diagnostics for these trajectories, not a general error bound. Fixed-step capture is the least accurate preset; event localization/adaptive stepping is a next improvement.

The on-screen FPS value is an average requestAnimationFrame display rate. It is not GPU kernel time, a CPU/GPU speedup, or evidence that a full ray tracer will attain the same rate. The renderer currently uploads the displayed path each frame; incremental buffers would be a later measured optimization.

## Fidelity ladder and remaining timebox

| Stage | Scope | Status / gate |
| --- | --- | --- |
| 0: orbit laboratory | Precession, circular geodesic, capture, Newtonian comparison | Implemented with automated physics checks. |
| 1: Schwarzschild optics | CPU null-geodesic reference, GPU image, capture/escape, procedural background | Next. Verify distant shadow critical impact parameter `3√3 M` and step convergence. |
| 2: disk lensing | Disk-plane intersection, upper/lower lensed image, camera inclination | After stage 1. Thin illustrative disk; no fluid dynamics. |
| 3: Kerr | Consistent Kerr metric/camera initialization, spin, conservation diagnostics | Stretch within the original sprint. Do not fake spin with texture rotation. |
| 4: cinematic polish | Sampling, exposure/bloom, optional frequency-shift model | Only after physics/performance gates. |

Suggested next 90–120 minutes: 30 minutes for CPU null geodesics and GPU shadow, 30 minutes for disk intersections and controls, 15–30 minutes for checks/profiling, and 15–30 minutes for demo packaging. This is a planning estimate. Kerr remains a separate, higher-risk step; finish a checked Schwarzschild image before expanding.

Excluded from this sprint: mergers, dynamical spacetime, fluid/magnetic accretion, gravitational-wave evolution, a singularity interior, wormholes, and film-quality ray-bundle rendering.

## Submission scope

The supplied form asks for a team name, eligible teammates, a description, a public open-source repository, a one-minute video URL, actual OpenAI/Astra use, and experience feedback. A public demo URL is useful but was not shown as mandatory. This preview is initially private; it is not yet a public submission.

Before submitting: publish the intended repository and demo audience, select an open-source license, document completed features and limitations, verify a clean install/build, record the video, and describe only the Astra contributions actually made. No submission has been sent. The repository's initial planning document is retained in [docs/initial-hackathon-scope.md](docs/initial-hackathon-scope.md) as historical context; this README supersedes its implementation plan.

Existing GPU educational Kerr tools include [Odyssey_Edu](https://arxiv.org/abs/1601.02063). Our proposed differentiation is an accessible experiment with visible numerical evidence, rather than a first-ever simulator claim.

Development checks: production build, TypeScript, and lint over authored `app`, `lib`, and `tests` pass. Full-scaffold lint still reports issues in unused generated UI components/hooks. The pinned scaffold's npm audit reports 11 dependency advisories (8 high); these have not been remediated in this prototype. Browser interaction/visual QA and a GPU benchmark have not been performed by automation.

# Kerr Black Hole

A full-screen GPU black-hole renderer inspired by Interstellar. The interface contains only pause, camera controls, and reset. Explanatory and teaching material is intentionally absent from the experience.

**Current physics: Schwarzschild, not Kerr.** Each pixel traces a null geodesic through a nonrotating black-hole spacetime and samples a thin accretion disk or distant procedural star field. The dark shadow and disk lensing emerge from light propagation. Disk emission, texture, rotation animation, exposure, and vignette are illustrative presentation models. This is not an accretion-fluid simulation or a reproduction of the film's renderer.

## Run

Node 22.13+ and npm; developed using Node 25.4.0.

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

Open the local URL printed by the server. WebGL2 and hardware acceleration are required. The page updates through the running development server.

## Stack and why

| Layer | Choice | Purpose |
| --- | --- | --- |
| GPU image | Direct WebGL2 / GLSL ES 3.00 | Full-screen per-pixel numerical light tracing. |
| Reference physics | TypeScript / JavaScript float64 | Analytic-limit and integration checks. |
| Interface | React + TypeScript | Minimal, hidden-by-default camera controls, outside the render loop. |
| Build | Vinext / Vite, npm lockfile | Existing scaffold and reproducible build. |
| Preview | Sites | Distribution only; the viewer's device renders the image. |

This stack minimizes implementation overhead for the current sprint. It is not a measured claim that WebGL2 outperforms WebGPU. Three.js is optional scene plumbing, not a relativity solver; a single full-screen pass does not need it.

WebGPU offers compute pipelines and storage buffers, but does not by itself increase physical fidelity. WGSL supports runtime f32 and optional f16, not runtime f64. WebGL2 also does not provide portable double-precision shaders. Native Metal targets this Apple M4, while CUDA does not; neither is needed for this browser prototype. Keep one GPU backend until profiling establishes a reason to migrate.

Sources: [WGSL specification](https://www.w3.org/TR/WGSL/), [WebGL2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/).

## Implemented image formation

Use `G = c = M = 1`. Spherical symmetry confines each Schwarzschild ray to a plane. In that plane, with `u = 1/r` and `q = du/dφ`, the null orbit equation is:

```text
du/dφ = q
dq/dφ = −u + 3u²
q² + u² − 2u³ = 1/b²
```

A static camera at radius R initializes the impact parameter from its local viewing angle α:

```text
b = R sin(α) / sqrt(1 − 2/R)
```

The shader integrates with RK4 at angular step `0.012`, up to 650 steps. It checks disk-plane crossings, capture at `r = 2 M`, and escape at `u = 0`. Escape direction is interpolated across the last angular step. Disk crossings use linear interpolation between adjacent positions. A first hit in the disk annulus `6 ≤ r/M ≤ 22` terminates the ray as an opaque surface.

The disk's inner edge is at the Schwarzschild ISCO. Warm emission and differential angular animation are procedural. Gravitational/Doppler frequency shifts, fluid dynamics, optical depth, returning radiation, finite light-travel time in the evolving texture, and film-style ray bundles are not implemented. The camera is kept outside the disk at radii 24–55 M.

Near-critical rays that exhaust the step budget render dark; they are not proven captured. This can bias the narrow photon-ring region. Single-precision GPU integration, fixed steps, and single-sample pixel rendering also limit fidelity. CPU reference results do not establish equivalent GPU error; direct GPU readback validation remains to be added.

Internal resolution is capped to a 1,100-pixel longest edge, multiplied by the resolution control (default 0.7). This is an explicit quality/performance tradeoff. No FPS or speedup claim has been measured for this renderer.

## Checks

`tests/light.test.ts` checks capture/escape on either side of analytic `bcrit = 3√3 M`, the photon sphere fixed orbit at `r = 3 M`, the null-orbit invariant, and step refinement for an escaping ray.

Float64 reference at impact parameter `b = 6 M`: maximum relative invariant drift about `7.61e-11` at step 0.012. Escaping direction agrees within `1e-5` radians when the step is halved. These are CPU reference checks, not GPU error bounds.

The previous timelike-orbit reference and its four tests remain in `lib/physics.ts` and `tests/physics.test.ts`; they are not displayed in the interface. Seven physics tests, TypeScript, authored-code lint, and the production build pass. Automated browser interaction/visual QA and a GPU timing benchmark have not been performed.

The generated scaffold has pre-existing lint issues in unused UI components/hooks and 11 npm audit advisories (8 high), not remediated in this prototype.

## Next fidelity gates

1. Compare GPU ray results against the float64 reference, including near-critical rays and disk intersections.
2. Improve intersection localization, antialiasing, and ray-budget convergence; profile the actual M4/browser.
3. Add bloom as a clearly separated display pass if desired, and refine disk emission.
4. Implement Kerr geodesics and consistent camera frames, then validate spin-zero agreement before exposing spin.

A full Kerr renderer requires a different geodesic solver: the planar Schwarzschild reduction cannot model frame dragging. Do not fake spin by rotating disk textures.

[James et al., Interstellar's DNGR paper](https://arxiv.org/abs/1502.03808) provides the film reference. [David Tong's GR notes](https://www.damtp.cam.ac.uk/user/tong/gr/grhtml/S1.html) give Schwarzschild geodesic background.

## Submission

The original event/form requirements are retained in [docs/initial-hackathon-scope.md](docs/initial-hackathon-scope.md); its educational interface proposal is superseded by this visual-first direction. Final submission still needs a public open-source repository/license, one-minute video, project description, actual Astra-use description, and experience feedback. No submission has been sent, and a private preview is not a public submission.

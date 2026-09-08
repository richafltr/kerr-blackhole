# Kerr Black Hole

**Public simulation:** https://kerr-blackhole.vercel.app

Make general-relativistic simulation accessible on ordinary consumer hardware, without server GPU costs. The first application is a full-screen black-hole renderer inspired by Interstellar. The interface opens inside a minimal probe observation cabin, with viewpoint controls and physical clock instruments. Explanatory essays remain in the repository.

The committed [objective](docs/OBJECTIVE.md) separates achieved capabilities from targets. The [technical plan](docs/TECHNICAL_PLAN.md) specifies the Hamiltonian equations, kernel costs, precision, memory, divergence, validation, and performance gates.

**Current physics: Kerr null geodesics on the GPU.** A local orthonormal camera launches past-directed rays through the exact stationary Kerr metric. The shader integrates Hamilton's equations in Cartesian ingoing Kerr–Schild coordinates, with analytic metric derivatives, RK4, and position-dependent step sizes. Spin, shadow, disk lensing, and emitter/observer frequency shifts come from this model. This is light propagation in a prescribed spacetime, not an evolving Einstein-equation or accretion-fluid simulation.

The expensive light transport is cached. Camera or spin changes produce a coarse preview and then refine the image in tiles; disk animation and exposure reuse the completed paths. [Measured validation](docs/VALIDATION.md) compares actual GPU readback with the float64 reference.

## Preserved baseline — 8 September 2026

**Checkpoint:** [`baseline-kerr-v1`](https://github.com/richafltr/kerr-blackhole/tree/baseline-kerr-v1), an annotated tag at commit `1bbcd14`, preserved on GitHub before probe work.

This milestone delivers real GPU Kerr null-geodesic transport, a tetrad camera, relativistic frequency shifts, progressive spatial refinement, and reusable stationary transport on consumer hardware. Eighteen CPU tests and the production GPU/reference suite passed; all 140 sampled rays agreed in classification. It is a checked numerical rendering baseline, with the finite sampling and emission limitations recorded in [validation](docs/VALIDATION.md).

To inspect or rebuild it without changing current work:

```sh
git worktree add --detach ../kerr-blackhole-baseline baseline-kerr-v1
cd ../kerr-blackhole-baseline
npm ci
npm run build:vercel
```

A production rollback is a separate deployment action: deploy that checkout to the existing Vercel project if needed. The tag preserves source and the dependency lockfile, not a guarantee that hosting URLs or future build infrastructure remain unchanged.

**Current extension:** a procedural probe/cabin, scale sequence, and stationary-observer clocks now build on this preserved checkpoint. The tag itself contains only the original renderer. [Scope and staged architecture](docs/PROBE_EXPERIENCE_SCOPE.md); [hackathon milestone and demo script](docs/HACKATHON_MILESTONE.md).

## Run

Node 22.13+ and npm; developed using Node 25.4.0.

```sh
npm ci
npm run dev:vercel
npm test
npm run typecheck
npm run build:vercel
```

Open the local URL printed by the server. WebGL2, floating-point render targets, and hardware acceleration are required. The Vercel target is a static Vite/React build with no server-side runtime or secrets. `vercel.json` configures the build and output; `npx vercel --prod` deploys after Vercel login. The original Sites scripts (`dev`, `build`, `start`) remain available separately.

## Stack and why

| Layer | Choice | Purpose |
| --- | --- | --- |
| GPU image | Direct WebGL2 / GLSL ES 3.00 | Full-screen per-pixel numerical light tracing. |
| Reference physics | TypeScript / JavaScript float64 | Schwarzschild checks plus Kerr–Schild Hamiltonian solver with automatic metric derivatives. |
| Interface | React + TypeScript | Minimal, hidden-by-default camera controls, outside the render loop. |
| Public build | Static Vite/React, npm lockfile | Vercel CDN; no request-time server or GPU bill. |
| Alternate build | Vinext / Sites | Retained existing preview target. |

This stack minimizes implementation overhead for the current sprint. It is not a measured claim that WebGL2 outperforms WebGPU. Three.js is optional scene plumbing, not a relativity solver; a single full-screen pass does not need it.

WebGPU offers compute pipelines and storage buffers, but does not by itself increase physical fidelity. WGSL supports runtime f32 and optional f16, not runtime f64. WebGL2 also does not provide portable double-precision shaders. Native Metal targets this Apple M4, while CUDA does not; neither is needed for this browser prototype. Keep one GPU backend until profiling establishes a reason to migrate.

Sources: [WGSL specification](https://www.w3.org/TR/WGSL/), [WebGL2 specification](https://registry.khronos.org/webgl/specs/latest/2.0/).

## Implemented image formation

Use `G = c = M = 1`, signature (−,+,+,+), and spin axis z. The null Hamiltonian is `H = ½ g^{μν} pμ pν = 0`; integrate `dx^i/dλ = ∂H/∂p_i` and `dp_i/dλ = −∂H/∂x^i`. Stationarity conserves `p_t`. The CPU reference differentiates the metric with forward-mode automatic differentiation; the GLSL kernel uses separately written analytic derivatives.

The camera is static at Kerr radius 24–55 M and initializes rays with a metric-orthonormal tetrad. Spin is restricted to −0.9…0.9. An opaque equatorial disk extends from the spin-dependent ISCO to 22 M. Disk crossings receive two Newton refinements. Circular emitter velocities determine the covariant frequency ratio; a three-band blackbody approximation at shifted temperature supplies color and intensity. The prescribed temperature profile, procedural texture, prescribed orbital texture animation, bloom, and tone mapping are presentation approximations. The mission view now converts seconds using GM/c³ and cancels the legacy shader’s sixfold animation multiplier; motion is consequently slow at 100 million solar masses. Texture animation still does not include travel-time delays. This is not a calibrated radiative-transfer or fluid simulation.

Each ray has at most 900 RK4 steps. Capture uses a cutoff 0.025 M outside the horizon; escape uses radius 100 M and its outgoing direction, neglecting the remaining weak deflection. Exhausted and invalid rays have separate diagnostic statuses, although both display dark. Near-critical photon-ring accuracy needs further refinement; no film-style ray bundles or pixel-footprint antialiasing are implemented.

## Compute budget

- WebGL2 plus `EXT_color_buffer_float` is required. Unsupported hardware shows an error.
- Transport uses RGBA32F; emission uses RGBA16F. No synchronous readback occurs in the normal render loop.
- Internal longest edge is capped at 1280 pixels, multiplied by quality (default 0.8).
- A coarse preview is followed by roughly 8,192-pixel refinement tiles. Refinement adds spatial resolution, not additional samples per pixel.
- Camera, spin, viewport, or resolution changes invalidate transport. Exposure and disk animation do not. This cache is valid because the metric and opaque disk geometry are stationary.
- Diagnostic GPU timing uses asynchronous disjoint timer queries when available. Current measurements are a short development-device check, not a sustained FPS guarantee or a cross-device benchmark.

## Verification

Run `npm test`, `npm run typecheck`, `npx oxlint app lib tests client vite.vercel.config.ts`, and `npm run build:vercel`. Twenty-two CPU tests cover the reference equations, tetrad, ISCO, conservation, convergence, physical units, static clocks, and probe angular size. Open `/?validate=1` to run actual GPU/reference comparisons and cache checks; it is a diagnostic page, absent from the normal interface.

On the recorded browser run, all 140 sampled Kerr rays agreed in classification, with maximum disk-hit discrepancy `1.473e-5 M`. See [validation results and limitations](docs/VALIDATION.md), rather than interpreting these selected-ray checks as a global accuracy guarantee.

The generated scaffold has pre-existing lint issues in unused UI components/hooks and 11 npm audit advisories (8 high), not remediated in this prototype.

## Next fidelity gates

1. Dense near-critical ray tests, Carter-constant monitoring, and budget/escape-radius convergence.
2. Pixel-footprint filtering or ray bundles to resolve narrow images without shimmer.
3. Retarded disk animation and a more complete emission/transfer model.
4. Sustained profiling and quality adaptation across integrated GPUs and mobile devices. Consider WebGPU only when measured scheduling gains justify a second backend.

[James et al., Interstellar's DNGR paper](https://arxiv.org/abs/1502.03808) is the scientific film reference, not source code incorporated into this repository. Film-quality beam tracing is a later milestone.

## Submission

The original event/form requirements are retained in [docs/initial-hackathon-scope.md](docs/initial-hackathon-scope.md); its educational interface proposal is superseded by this visual-first direction. Final submission still needs a public open-source repository/license, one-minute video, project description, actual Astra-use description, and experience feedback. No submission has been sent, and a private preview is not a public submission.

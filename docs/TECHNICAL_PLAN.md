# Numerical and GPU implementation plan

## Equations before effects

Use units G=c=M=1. For a stationary metric, use the null Hamiltonian

H = 1/2 g^{μν} pμ pν = 0,
dxμ/dλ = g^{μν} pν,
dpμ/dλ = −1/2 (∂μ g^{αβ}) pα pβ.

For Kerr, use Cartesian Kerr–Schild coordinates for horizon-penetrating evolution. Adopt signature (−,+,+,+) and document ingoing/outgoing convention. The CPU reference should calculate metric derivatives explicitly or by automatic differentiation; finite-difference gradients inside every GPU RK stage are too expensive and harder to control.

Initialize camera rays in a local orthonormal tetrad and transform them into coordinate momenta. Solving the null condition for arbitrary coordinate momenta is useful for reference tests but does not by itself define a physically calibrated camera.

Before GPU porting, check metric inversion, the null constraint, conservation of energy and axial angular momentum, step convergence, a=0 agreement, horizon capture, and spin-reversal symmetry with corresponding scene transformations. Define capture, escape, nonfinite numerical failure, and exhausted budget as separate statuses. Do not label unresolved rays captured.

## Kernel constraints

One ray per pixel is parallel, but computational cost scales with rays × integration steps × derivative evaluations. At 1280×720, 300 steps and RK4's four derivative evaluations, one frame requires about 1.1 billion derivative evaluations before disk shading. That arithmetic estimate explains why a straightforward Kerr shader can exceed a laptop frame budget; it is not a benchmark.

Key limits:

- Register pressure: position, momentum, metric derivatives and RK stages can reduce GPU occupancy. Reuse expressions and stage storage; inspect timing rather than assuming fewer source lines are faster.
- Divergence: near-critical rays orbit for much longer. Early termination saves work but neighboring lanes may remain active. Consider bounded passes and ray compaction only if their memory/dispatch overhead is justified by measurements.
- Precision: WGSL has no runtime f64; WebGL2 has no portable double-precision shader solver. Use nondimensional values and horizon-penetrating coordinates. Avoid near-extremal spin until tested. Keep float64 reference work on CPU.
- WebGPU workgroups: query adapter/device limits and optional features. Start by comparing 8×8 and 16×8 groups where supported; do not infer the best size from core count or hardcode a device's maximum as an optimum.
- Memory: a 1280×720 RGBA16F target is about 7.0 MiB. Two such buffers use about 14.1 MiB. Additional position/momentum buffers multiply this; allocate only after a measured need. These are buffer-size estimates, not process memory measurements.
- Readback: avoid synchronous per-frame CPU/GPU transfers. Sample diagnostics separately, asynchronously where available. GPU timing must reject disjoint/invalid timer samples.
- Thermal/power limits: laptop/mobile sustained performance differs from a cold-device burst. Include a sustained run; unsupported WebGL2/GPU devices need an honest error rather than an inaccurate substitute.

## Optimization order

1. Correct reference and unoptimized GPU baseline.
2. Analytic metric derivatives and common-subexpression reuse.
3. Capture/escape termination, bounded error-aware steps and robust intersections.
4. Interaction resolution scaling, then progressive refinement while stationary. Report image resolution and sample count explicitly.
5. Optional temporal accumulation with reset on camera/model changes; avoid history smearing.
6. Migrate to WebGPU compute only if storage/work scheduling measurably helps. Retain WebGL2 as the accessibility path if affordable to maintain.

The Schwarzschild planar ODE is already a powerful symmetry-based optimization. It does not extend to generic Kerr rays. A Schwarzschild ray lookup table can accelerate a constrained scene but must be labeled and tested for interpolation error; it cannot be sold as a generic metric solver.

## Fidelity beyond the path

A realistic image also requires source physics. For an emitter and observer with four-velocities u, use the photon frequency ratio g=(p·u_obs)/(p·u_emit) with consistent momenta and conventions. In vacuum Iν/ν³ is invariant. Disk radiance, bolometric intensity, temperature and exposure are different quantities; do not apply an arbitrary brightness multiplier and call it Doppler beaming. Treat a thin prescribed disk as an approximation, not evolved accretion matter. Antialiasing and bloom cannot repair a wrong geodesic.

## Measurable gates

- CPU Kerr: normalized Hamiltonian residual and energy/angular-momentum drift on selected noncritical trajectories; step refinement must improve error.
- GPU: compare capture/escape and disk-hit positions on a fixed ray grid, with a separate near-critical set. Document tolerances before claiming success.
- Schwarzschild: critical impact parameter 3√3 M for a distant camera, photon sphere 3 M, horizon 2 M. Match camera conventions when comparing apparent radii.
- Performance target, not result: interactive 30 FPS at a documented internal resolution on the development M4; measure at least 10 seconds after warmup, plus a longer thermal run. Include browser, GPU, resolution, steps, sample count, median/p95 GPU time, invalid timer samples and unresolved fraction.
- Compare lower-resource hardware before claiming reach beyond the development device. Adaptive quality should change resolution/sampling and report limits, not alter the metric.

## Delivery architecture

Publish a static Vite/React build to Vercel's CDN. No request-time React server, Cloudflare binding, account system, API key or server GPU is needed. Retain the existing Sites build separately during migration; share the same renderer and UI source. Hosting compute limits therefore do not set the simulation's GPU budget: the visitor's browser/device does.

## Sources

- [OSIRIS](https://arxiv.org/abs/2202.00086): Hamiltonian ray tracing and constraint monitoring.
- [GYOTO](https://arxiv.org/abs/1109.4769): general-relativistic null/timelike geodesic integration.
- [DNGR / Interstellar](https://arxiv.org/abs/1502.03808): Kerr ray bundles and image formation.
- [WGSL](https://www.w3.org/TR/WGSL/) and [WebGPU](https://www.w3.org/TR/webgpu/): language and device limits.
- [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build): static build/output settings.

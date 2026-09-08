# Kerr Black Hole Lab

An Interstellar-inspired, GPU-rendered laboratory for exploring how a spinning black hole bends light.

**Status: scoped, not implemented.** The repository was empty when cloned on September 8, 2026. This first commit records the proposed hackathon scope, implementation gates, and submission requirements. No renderer, benchmark, validation result, or live demo exists yet.

## The project we should ship

Build one compelling browser experience: an accretion disk and star field lensed by a Kerr black hole, with spin and camera controls, an educational explanation of the visible effects, and inspectable evidence that the renderer follows the intended equations.

The pitch: **Explore curved spacetime interactively, and see the numerical evidence behind the image.**

GPU-based educational Kerr simulators already exist. Our differentiation should be accessibility, clear experiments, transparent accuracy/performance tradeoffs, and evidence of what was built with Astra during the event. Do not claim to be the first or only physically based black-hole simulator.

## Scope and confidence

These are planning estimates, not delivery guarantees. The main risk is implementing and checking Kerr geodesics within the time limit.

| Capability | Priority | Feasibility in 2–3 hours |
| --- | --- | --- |
| Browser canvas, camera, controls, procedural stars and disk | Required | High |
| GPU Schwarzschild light propagation as a validated baseline | Required checkpoint | Medium–high |
| Kerr null-geodesic integration with spin-dependent lensing | Primary technical objective | Medium; must pass checks before being advertised |
| Lensed disk above/below the shadow, capture/escape behavior | Required visual objective | Medium |
| Spin, inclination, pause/reset, quality presets | Required | High after renderer works |
| Measured frame time, resolution, step budget, device record | Required | High |
| Educational presets and explanations of shadow versus horizon | Required | High |
| Selected photon trajectory inspector sharing the physics model | Third-hour stretch | Medium |
| Relativistic frequency shift and Doppler beaming | Stretch | Medium–low; requires emitter/observer model |
| Additional wormhole, orbit, or tidal-force simulations | Defer | Would fragment the demo |
| Fluid dynamics, evolving spacetime, mergers, gravitational waves | Excluded | Outside the time budget |
| Physically established view of a singularity/interior | Excluded | Outside this exterior ray-tracing model |

A 2-hour submission is plausible with strict scope and a Schwarzschild fallback. A credible, checked Kerr implementation is the ambitious 3-hour objective. A beautiful image alone does not establish Kerr correctness.

## Proposed implementation

Use TypeScript, a minimal browser UI, and a WebGL2 fragment shader that integrates one backward-traced photon per pixel. WebGL2 is already GPU computation; a compute-shader backend is not necessary to demonstrate GPU optimization. Pick one backend for this sprint. WebGPU can be revisited after the demo.

The available development machine has an Apple M4 with a 10-core GPU. Actual browser support and runtime performance still need a smoke test. Start at an internal resolution around 640 × 360 and increase only after profiling.

Physics design:

- Use geometric units, with `G = c = M = 1`, and dimensionless spin `a* = Jc/(GM²)`.
- Integrate null geodesics in a fixed Kerr spacetime, preferably using a Hamiltonian formulation in horizon-penetrating Kerr–Schild coordinates to avoid the Boyer–Lindquist horizon coordinate singularity.
- Initialize photon momenta consistently with the camera frame and null condition. Document metric signature, coordinate conventions, and backward tracing signs.
- Start with RK4 and conservative bounded steps. Handle capture, escape, disk intersections, and exhausted iteration budgets separately. Do not classify an unfinished ray as a captured photon.
- Use a thin equatorial disk with an explicitly illustrative emission model. Disk texture, glow, exposure, and star colors are visual choices unless a physical model is implemented and documented.
- Restrict the demo to exterior cameras and moderate spin, initially `0 ≤ a* ≤ 0.9`. Avoid near-extremal and near-horizon camera cases in the first version.
- At spin zero the same physics should reduce to Schwarzschild. Never simulate Kerr spin solely by twisting a texture or adding an arbitrary force.

GPU optimization plan:

1. Establish a fixed-resolution, fixed-step baseline with identical camera, spin, disk, and ray budget for comparisons.
2. Terminate rays after capture or escape; cap iterations and expose the cap.
3. Hoist uniform calculations and reduce repeated metric work inside the integration loop.
4. Use lower resolution during interaction and restore quality when stationary. Report the resolution change rather than presenting it as a same-quality speedup.
5. Consider larger steps far from the hole only after convergence checks show acceptable error.

Target: at least 30 FPS at a documented internal resolution on the development machine. This is an unmeasured target, not a claim. Report median and p95 frame time over a fixed 10-second scene after warmup. Use GPU timer queries if available; otherwise label requestAnimationFrame measurements as end-to-end frame timing. Record browser, hardware, resolution, steps, and settings. Do not claim a CPU/GPU speedup without an equivalent CPU benchmark.

## Minimum evidence for a physics claim

Create a small double-precision CPU reference and compare selected GPU rays or their final classifications against it. Agreement between two copies of the same equations is insufficient by itself, so also check analytic limits.

- Schwarzschild limit: horizon radius `2M`, photon sphere `3M`, and distant-observer critical impact parameter `3√3 M`. The photon sphere and apparent shadow are distinct quantities.
- Kerr horizon: `r+ = M(1 + sqrt(1 - a*²))`, evaluated using the Kerr radial coordinate, not ordinary Euclidean distance.
- Null constraint: monitor a normalized residual of `g^{μν} pμ pν = 0` for representative trajectories.
- Convergence: halve step size for representative escaping/captured rays and compare disk-hit coordinates and output images. Treat rays near the capture boundary separately because they are sensitive to numerical error.
- Symmetry: check spin-zero symmetry with symmetric background/emission; check expected mirror behavior when reversing spin and corresponding scene conventions in validation code.

Provisional acceptance goals: distant Schwarzschild shadow radius within 2% of the analytic result under a matching camera setup; normalized null residual below `1e-3` for selected noncritical reference trajectories; stable classifications and disk hits under step refinement away from boundaries. Define normalization and sampling in the test output. If these fail, report the failure and narrow claims rather than changing tolerances merely to pass.

## Timebox and decision gates

Times are elapsed implementation time; reserve the final 30 minutes for submission materials.

| Time | Work and exit condition |
| --- | --- |
| 0–15 min | Scaffold, GPU/browser smoke test, render one shader frame, establish camera conventions. |
| 15–45 min | Implement spin-zero geodesics and CPU checks; display a shadow and lensed disk. |
| 45–75 min | Extend to Kerr; check spin-zero regression, capture radius, constraints, and selected spin cases. |
| 75–90 min | Profile, add bounded quality controls, polish the main scene and explanatory presets. |
| 90–120 min, 2-hour route | Freeze features; verify, publish demo if available, update README, record and submit video. |
| 90–150 min, 3-hour route | Improve Kerr validation, measured optimization, and at most one stretch feature: photon inspection. |
| 150–180 min, 3-hour route | Freeze, verify public repository/demo, record video, complete submission. |

If a stable, checked Kerr image is unavailable at minute 75, freeze a validated Schwarzschild renderer and explicitly describe Kerr as unfinished. If performance misses target, reduce internal resolution and disclose it. If a feature risks the final 30-minute submission window, cut it.

## Why this can be technically impressive

The technical demonstration is the combination of a numerical relativity model, a parallel GPU implementation, measurable performance, and an interface that makes the result understandable. A judge should be able to change spin, observe the image respond, inspect a physics check, and see the actual performance configuration within one minute.

Interstellar's DNGR renderer used ray bundles for film-quality imagery. This sprint proposes individual-ray interactive rendering with simplified emission; it is inspired by that work, not a reproduction of DNGR or a film-quality accuracy claim.

The supplied event screenshot asks entrants to show what they can ship with Astra and to submit public open-source work built during the hackathon. This proposal fits that stated brief if implemented during the event and documented honestly. The screenshot does not provide a scoring rubric or require an AI feature inside the finished app. Keep a brief record of Astra's actual contributions to equation translation, shader development, debugging, numerical checks, and profiling. Describe only work actually performed.

## Submission checklist

Transcribed from the user's screenshots; these are event requirements, not instructions to submit automatically. The first screenshot lists event hours of 9 AM–10 PM PDT, September 8, but does not establish a separate project submission cutoff.

Required form fields:

- [ ] Team name.
- [ ] Team members, if any; only approved attendees, maximum team size four according to the event screenshot.
- [ ] Project description and the problem it solves.
- [ ] Public project GitHub repository URL.
- [ ] One-minute demo video URL.
- [ ] Description of actual OpenAI/Astra use in building the project.
- [ ] Feedback from actual experience using Astra.

Repository/demo readiness:

- [ ] Implementation created during the hackathon; attribute any dependencies and reused assets accurately.
- [ ] Public repository containing runnable code, setup instructions, and an open-source license.
- [ ] README updated from this proposal to actual completed features, limitations, validation results, and benchmark settings.
- [ ] Demo URL if available; recommended for judging, not shown as a required form field.
- [ ] Video link accessible to judges; recommended to test signed out.
- [ ] Clean-checkout run/build verified and no credentials committed.
- [ ] Confirm exact submission cutoff with the organizer/form if it is not otherwise known.

Suggested 60-second video:

| Seconds | Demonstration |
| --- | --- |
| 0–8 | State the learning problem and show the strongest rendered view. |
| 8–23 | Change spin and camera inclination; explain one visible effect. |
| 23–38 | Show a photon path if implemented, otherwise an analytic/reference check. |
| 38–48 | Show measured performance and the quality setting behind it. |
| 48–60 | Explain what Astra helped build and show the public repository/demo. |

Draft description to use only after verifying the corresponding features:

> Kerr Black Hole Lab is an interactive browser experiment that explores how a spinning black hole bends light. GPU ray tracing, adjustable viewpoints, and visible numerical checks connect an Interstellar-inspired image to the physics behind it. Built during the hackathon with Astra, the project makes accuracy and performance tradeoffs inspectable.

Revise this description to Schwarzschild if the Kerr gate is not met. Write the Astra-use and feedback fields after implementation so they describe observed work and experience.

## References and prior art

- James, von Tunzelmann, Franklin, and Thorne, [Gravitational Lensing by Spinning Black Holes in Astrophysics, and in the Movie Interstellar](https://arxiv.org/abs/1502.03808): film renderer and Kerr lensing context.
- Pu et al., [Odyssey: A Public GPU-Based Code for General-Relativistic Radiative Transfer in Kerr Spacetime](https://arxiv.org/abs/1601.02063): GPU Kerr ray tracing and the educational Odyssey_Edu tool.
- Brandon Li, [Interactive general relativity](https://brandonli.net/blackhole/grraytracer): an existing interactive black-hole/wormhole visualization.

These are research and prior-art references. No implementation code has been copied from them in this initial commit.

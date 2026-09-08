# Vesper: release and exterior descent

This checkpoint changes the prototype into a short interactive experience. The pilot can remain in a supported frame or choose release, switch between cabin/chase/optics in the bottom-right, pause, and restart. The previous numerical baseline remains tagged `baseline-kerr-v1`.

## Implemented physics

Release initializes the massive probe with the static observer's covariant four-velocity. The same stationary Kerr Hamiltonian now evolves a **timelike** trajectory with H = −1/2, rather than H = 0. Float64 RK4 advances spatial position/momentum and Kerr–Schild coordinate time, with proper time as its parameter and maximum step 0.05 GM/c³. Energy is constant; mass-shell and axial-angular-momentum errors are checked.

The camera uses the probe four-velocity, converted through the inverse metric and an orthonormal tetrad. Its attitude tracks the hole: it is not an unforced gyroscope model. The existing GPU kernel traces past-directed null rays from this moving observer. Disk frequency ratios therefore include the observer's motion. Background-star spectra are not frequency shifted in this milestone.

There are four seconds of ordinary-speed release followed by **2400× proper-time playback**, explicitly identified on screen. At 100 million solar masses the physical journey takes many hours. Playback acceleration is distinct from relativistic clock-rate differences. The displayed coordinate/reference time during flight uses ingoing Kerr–Schild time; it is not a signal received from a distant clock or the Schwarzschild-coordinate horizon divergence.

The trajectory stops approximately **0.3 M outside the event horizon**, with a final integration step potentially up to 0.05 proper-time units beyond that stopping threshold. The interface identifies this as the exterior limit. No horizon crossing, singularity interior, quantum-gravity prediction, spacecraft damage, or retarded radio communication is simulated.

The initial supported frame is an idealized release condition. Maintaining it this close to such a massive object requires substantial proper acceleration; crew survivability, propulsion, and energy budgets are not solved. This is not yet a physically designed mission departing a stable orbital mothership. The separate carrier rendering is visual context, not a validated second worldline or docking dynamics model.

## Graphics and compute

The cabin is original generated foreground artwork. Its window is masked in the compositor so the black hole behind it remains live. It is a fixed-view 2D asset, not a navigable 3D cabin. The independent textured spacecraft geometry is from NASA's Apollo–Soyuz model, with the Apollo section used for the probe and Soyuz section for the carrier. Three.js handles those meshes and materials only; the relativity solver remains direct GLSL/WebGL2.

The chase camera keeps a nearby, approximately comoving spacecraft in view. Its mesh shading, attitude, lighting and the carrier's local visual separation are presentation approximations. The carrier offset uses the magnitude of the coordinate separation from the initial position, mapped to a local display axis; it is removed beyond 80 m. This is not a distant observer's lensed, delayed image of the spacecraft. No fake tidal deformation is applied.

During flight, the observer frame is sampled every 100 ms. A 240-pixel-wide preview is traced on updates, with refinement between updates. Moving renders cap the longest edge at 640 pixels times quality; pausing/ending allows full-resolution refinement. This is visibly lower resolution during motion and not a promise of 60 FPS or 4K rendering. The cabin asset retains its independent image resolution.

## Validation

The CPU suite now contains 26 tests. New checks cover the timelike mass shell, the analytic Schwarzschild radial energy relation, Kerr angular momentum conservation through the route for several spins, moving-camera null initialization, and timestep convergence. The convergence comparison uses 0.8/0.4/0.2 steps to stay above the float64 roundoff floor; the actual default 0.05-step error is already much smaller on that test trajectory.

The browser diagnostic adds 252 moving-camera rays across spins 0, 0.6, 0.9 and four proper-time samples, including the route endpoint. Its acceptance requires matching classifications without unresolved/invalid reference rays, disk-hit discrepancies under 0.01 M, and frequency-ratio discrepancies under 0.002. Selected-ray agreement is not a global error bound or full image-formation validation. Recorded on 8 September 2026: all 140 stationary and 252 infalling-camera ray classifications agreed, with no unresolved/invalid samples. Moving-camera maximum disk-hit discrepancy was 1.449e-3 M and frequency-ratio discrepancy 3.251e-6. Stationary disk-hit discrepancy was 1.754e-5 M. The moving kernel uses half-sized steps and a matching 1,800-step budget. All 26 CPU tests passed.

## Hackathon claim

“A first-person encounter with a Kerr black hole, built with Astra: release a probe, watch the sky change through its moving relativistic frame, and compare the browser GPU calculation with a double-precision reference.”

This is a short exterior-descent experience, not yet a film-quality game. Next gates are a physically specified orbital carrier/release maneuver, proper separation and signal transport, ray-footprint antialiasing, a navigable 3D cabin, higher-quality spacecraft illumination, and sustained hardware benchmarks. A singularity endpoint remains a question about the limits of the model, not a known scene to reproduce.

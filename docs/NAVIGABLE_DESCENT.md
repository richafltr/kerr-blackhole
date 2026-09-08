# Navigable descent and the boundary of the model

## What this revision changes

The entrance contains the title, Play and Skip Intro. Mission actions use terminal-style text instead of boxed cards. Visible credit banners and technical readouts were removed from the game surface; attribution and specifications are in the README and asset documentation. Free-tier ElevenLabs attribution remains in document-title metadata, as required by the current audio terms. The original voice recordings and score files are unchanged.

The prologue now previews a sequence of **calculated falling-observer cameras** from the same exterior Kerr trajectory used by the mission, instead of cropping a stationary image. This is an editorial preview, not a continuous worldline joining the prologue to the player's initial held position. The sky and local mesh cameras use the same vertical field of view; the artificial CSS zoom/crop is removed. The chase camera is 95 m from the local probe origin instead of 30 m, reducing the spacecraft's apparent size. The carrier remains a nearby, staged mesh. This does not implement full relativistic imaging of its geometry.

## Playable sequence

1. Enter the cabin, choose the descent, and confirm release. The first four seconds run at real proper-time playback, followed by 2400× travel playback.
2. Near `r = 8 M`, travel returns to **1× proper time** for a 28-second local debris encounter. Use WASD/arrows or the touch pad to thrust; Space or the Brake control reduces velocity. Releasing the controls leaves inertial drift. Thrust and braking spend the finite delta-v reserve.
3. Survive the encounter and the accelerated Kerr descent resumes to the existing exterior cutoff. Failure can occur earlier through collisions or departure from the authored encounter corridor.
4. A short **“Speculative interior / Beyond the model”** transition explicitly ends the scientific renderer. No horizon crossing or computed singularity is claimed by that transition.
5. The fictional final chapter projects and repeats a four-dimensional hypercube, with six captured views from the player's actual descent appearing as memory surfaces. Steer through three illuminated apertures to reach the ending; missed apertures and collisions can end the attempt. This is a playable representation of navigating memories, not a physical escape solution.

The exterior encounter runs in local metres and seconds with fixed 1/120 s steps. The controlled craft has inertial velocity, a finite thrust acceleration and a finite delta-v budget. Small transverse tidal terms come from the computed Kerr curvature in the observer frame, converted to SI. This is a first-order local approximation: it omits a fully transported Fermi frame, a relativistic rocket equation and mutual gravity. The authored debris positions/velocities and hull hit counter are **game rules**, not a simulated accretion flow or validated structural/biological injury model. Damage feedback is collision-triggered; it does not inflate the tidal tensor.

The final chapter resets its local game state and uses its own fictional passage clock. It does not continue the probe's measured proper-time clock or apply an invented general-relativistic force to the memory space.

## What is actually cached

| Resource | Reuse | Bound / invalidation |
| --- | --- | --- |
| Float64 exterior trajectory | IndexedDB plus a small in-memory map; one sample per quarter geometric proper-time unit. Preparation yields to the event loop. | Version, release radius, inclination and spin in the key. Persisted store retains up to four paths. Readback checks finite state, spin, length, completion and mass-shell residual. Storage failure falls back to recomputation. |
| GPU transport maps | An LRU cache preserves low-resolution rays, partially refined high-resolution rays and render targets. Compatible evicted allocations are recycled. | 32 MiB **additional cache**, plus the active targets. Key includes dimensions, camera, spin, roll and release settings. Exposure and emission time can change without retracing stationary geometry. |
| Six memory images | Capture live sky and nearby geometry once at selected trajectory milestones, then reuse those canvas textures in the finale. | Six 512×288 RGBA images: approximately 3.4 MiB before mipmaps and canvas copies. Cleared/disposed on restart. These images remain local to the current run and are not uploaded. |
| Debris and memory geometry | Instanced meshes and one updated line buffer; no new object per particle per frame. | Six obstacles, 36 memory panels and 28 projected hypercubes. |
| Voice and music | Existing static MP3s, served by the CDN and normal browser HTTP caching. | No live inference or runtime API key. |

The trajectory cache supplies **sampled render cameras**, while the live float64 integrator remains responsible for the physical state and clock. Camera sampling may lag by less than 0.25 `GM/c³` units; at the chosen mass that is about 123 s of physical time, or about 0.05 s during 2400× playback, plus the display camera update interval (up to 150 ms). It is a display approximation and can be noticeable near the endpoint. This is not temporal super-resolution or a ray-bundle implementation.

The coarse preview now filters **emitted radiance** from neighboring samples. It never interpolates capture/escape classifications or mixes disk coordinates with sky directions. This removes hard nearest-neighbor squares but does not recover unresolved photon-ring detail. The moving output cap is now 960 pixels before the quality multiplier; the stationary cap remains 1280. Moving preview width adapts within 224–384 pixels when asynchronous GPU timers are available (320 initially). A measured per-pixel cost guides nominal 16 ms preview and 12 ms refinement budgets. These are estimates, not guaranteed frame-time limits; without timer support the renderer uses fixed bounded work sizes.

Pre-rendering every possible free-flying observer is not practical. These caches help because the major relativistic trajectory is prescribed, while player navigation occurs over metres around it. A fully steerable global orbit, continuously changing disk geometry, new inclination or new spin requires new transport.

## The scientific limit

For a supermassive black hole, weak outer-horizon tides do not justify the violent stretching often associated with stellar-mass holes. [Andrew Hamilton's discussion of realistic interiors](https://jila.colorado.edu/~ajsh/courses/insidebh/realistic.html) describes survivability deeper inside and the inner-horizon counter-streaming instability. A reliable depiction of that region needs a model of accretion and instability beyond the stationary exterior Kerr implementation here. This revision does **not** compute mass inflation, hull tearing by interior curvature, human tissue failure, or quantum gravity.

[DNEG describes the film's tesseract](https://www.dneg.com/news/celebrating-world-space-week-2023) as a representation in which time can be seen as a physical dimension. That provides an artistic direction for the memory-space ending. It does not establish a physically possible escape from a black hole. The [DNGR paper](https://arxiv.org/abs/1502.03808) supports the exterior optical approach, including the importance of ray bundles for smooth images; its optical achievements do not validate the film's fictional ending.

The next scientific milestone is a separately validated horizon-crossing camera and timelike integration in regular coordinates, with interior null-ray source treatment and convergence tests. Strong-curvature damage would then require geodesic deviation, material response and an explicit model-validity boundary. The current game deliberately exposes its software boundary before its fictional ending.

## Verification

Forty CPU tests pass: the previous thirty physics tests, four audio tests, and six checks for collision failure, a survivable encounter, frame-rate-independent local integration, finite delta-v, a reachable/missable finale and cached trajectory invariants. The game rules are reachable under tested control inputs; this is not a subjective playtesting claim.

TypeScript, authored-code lint and the Vercel production build pass. `scripts/check-shaders.mjs` additionally compiles and links the actual transport, shading and display GLSL ES sources with glslang. This checks shader syntax/link interfaces; it does not establish a browser-specific GPU benchmark or revalidate all sampled rays in a live driver.

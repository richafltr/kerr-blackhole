# Physical descent — separate development checkpoint

The submitted game is preserved locally by `baseline-submission-v1` at `f79b53a`. This work lives on **feature/physical-descent** in the separate `kerr-blackhole-physical` worktree. It is published separately at **https://kerr-blackhole-physical.vercel.app/**. The original Vercel game remains at **https://kerr-blackhole.vercel.app/**. The original worktree's uncommitted submission documentation is also left in place.

The visual target is the scale, material presence, restraint, and human viewpoint of Interstellar. The film is an art-direction reference; its interior spectacle is not treated as an independently validated physics solution.

## First implemented milestone

- **Carried observer frame.** Three spatial legs are parallel transported using `de^μ/dτ = −Γ^μ_ab u^a e^b` along the existing float64 RK4 timelike Kerr trajectory. The same RK stages advance trajectory and frame. Metric Gram–Schmidt removes accumulated frame drift. Gameplay no longer forces the camera to aim continually at the hole. The previous tracking camera remains available in code for comparison. The initial right leg now uses the right-handed right/up/back convention of the mesh camera; this corrects the previous mirrored horizontal sky orientation.
- **Common camera orientation.** The nearby mesh layer and optical display share camera rotations. A 1.3× field-of-view overscan supports exact pure-rotation reprojection between optical updates. Once relative rotation exceeds 0.04 radians, the optical view is retraced in the new orientation. This does not synthesize missing translational information, resolve photon rings, or implement temporal super-resolution. Translation continues to use the existing sampled exterior path and bounded updates.
- **Sky-driven lighting.** A 32×16 full-sphere optical pass traces 512 rays with the same Kerr transport and emission model. A single 8 KiB pixel-pack buffer and GPU fence allow later nonblocking readback, at most once per 700 ms. Solid-angle quadrature produces order-two spherical harmonics for a Three.js diffuse light probe. A bounded dominant-source directional fill approximates specular highlights. It is not full spectral material transport, cabin occlusion, or a full-resolution reflection environment.
- **Live 3D cabin.** Original geometry includes canopy seals and supports, instrument housing, toggles, gloves/sleeves, a control stick and a tethered washer. One reused instrument texture updates at 5 Hz. The approved static cabin shot remains in the existing prologue; gameplay uses the new geometry. Cabin and chase use the same 41.6-degree vertical field of view as the optical projection. The original capsule is normalized once to a declared ten-metre maximum extent; camera offsets are in metres.
- **Local control and response.** Q/E command roll rate through an ideal RCS controller, with angular acceleration capped at 0.08 rad/s² and a 0.14 rad/s rate demand. Authored assumptions: 6,000 kg craft, 30,000 kg m² roll inertia and four-metre effective thruster arm. Angular control consumes the same delta-v reserve as translation. WASD translation jets rotate with the body; Space brakes in the local frame. Empty fuel preserves angular motion. Dragging the cabin view turns the head independently of the craft.
- **Mechanical reaction.** A suspended head responds to local proper acceleration; an initially moving washer drifts within a slack tether. The tether engages beyond 0.15 m displacement per local axis. The cabin response currently includes translation and impact response, but not full rotational fictitious-force terms. These are bounded, authored mechanical approximations, not a human biomechanics model. Free fall alone does not inject shake. Objects do not oscillate merely because the hole approaches.
- **Visible impacts.** Encounter panels share the craft camera instead of a separate overlay camera. A nominal 12 kg panel and the existing encounter closing speed determine an inelastic reduced-mass impulse and a contact-direction impulse and its roll moment. The impulse uses the same panel orientation as the visible mesh; it changes local translation and suspended-head velocity consistently. Seventy-two pooled secondary fragments are released on actual collisions; geometry and materials are reused. The existing three-hit survival rule remains authored gameplay. There is no material fracture solver or tidal hull tearing.
- **Emission structure.** A periodic, multi-scale emission texture is differentially advected at the existing orbital angular frequency. The mass-dependent time conversion remains intact. This improves material variation within the existing thin opaque disk; it does not simulate a turbulent fluid or account for per-ray retarded emission times.

## Published checkpoint

- Game source: `d2385bb`, tagged `physical-descent-v1`.
- Vercel project: `kerr-blackhole-physical`, separate from the original `kerr-blackhole` project.
- Live improved version: https://kerr-blackhole-physical.vercel.app/
- Original submission: https://kerr-blackhole.vercel.app/
- Hosted build completed successfully on 8 September 2026; the public page and capsule asset returned HTTP 200. The original page's content hash was unchanged after publishing.

## Controls and preview

Run `npm run dev:vercel -- --host 127.0.0.1 --port 5174 --strictPort` from this worktree. The original project uses its own server/port. Use **Skip Intro**, choose the descent and release Vesper. The encounter near 8 M runs at 1× local playback; long-distance travel retains the explicit accelerated timeline.

- WASD / arrows: local translation jets during the encounter.
- Q / E: roll control during the encounter.
- Space: expend delta-v to brake local translation.
- Drag in the cabin: look around.
- Cabin / Chase / Optics: attached human view, nearby exterior view, unobstructed optical view.

The carrier remains an authored supported staging object with near-field coordinate-separation approximation. It is not a second solved escaping Kerr worldline and the chase camera is not a retarded observation from the carrier.

## Validation and limits

49 CPU tests pass. New tests cover camera handedness, analytic Schwarzschild transverse-frame transport, transported-frame orthogonality, RK4 frame convergence, null rays after camera rotation, the constant-sky spherical-harmonic integral, absence of fictitious free-fall head shake, thrust response, and roll/fuel behavior, and collision momentum/energy balance. Existing conservation, curvature, navigation and audio-controller tests remain in place. GLSL ES compile/link checks cover the transport, shading and display programs.

Live browser GPU validation and sustained device profiling have not been performed for this branch. No new FPS, fidelity-parity, or interactive image-quality result is claimed by these CPU and shader checks. The renderer remains WebGL2/GLSL, not WebGPU. Full-sphere lighting samples are coarse and can miss narrow emitters. SH lighting and the dominant-source fill are display approximations. The original approved narration and score files are unchanged.

The simulation still stops at `r+ + 0.3 M`, outside the outer horizon. The memory-space ending remains explicitly speculative. A supermassive outer horizon does not justify automatic spaghettification. Hull material response, horizon crossing, retarded two-observer signals, and a reliable interior remain separate milestones.

## Next review gates

1. Review an uninterrupted cabin-to-chase descent: correct camera orientation, instrument readability, visible scale and consistent illumination.
2. Measure frame-time percentiles and GPU cost on the target integrated GPU, including the new lighting pass. Check head rotation and ring stability; do not use offline-refined video as the performance benchmark.
3. Replace authored survival counters with a documented structural-response model, and connect the carrier's outcome to its own trajectory.
4. Validate a Schwarzschild horizon-crossing control case before extending Kerr camera and light-source handling to the interior.

Keep the production tag and deployment intact throughout these gates. Future updates to this branch must deploy to the separate `kerr-blackhole-physical` project. Do not replace the original deployment unless explicitly requested.

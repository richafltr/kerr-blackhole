# From a black-hole image to a probe experience

Status: scoped on 8 September 2026; implementation has not started. Preserve `baseline-kerr-v1` at `1bbcd14`. The immediate milestone is a sense of physical scale; probe dynamics, received signals, and horizon crossing follow separate acceptance gates. Technical explanation stays in this repository. Any in-scene instrumentation should be sparse, purposeful, and owner-directed.

## References and creative interpretation

The supplied [ScienceClic video](https://www.youtube.com/watch?v=ABFGKdKKKyg), “Let's reproduce the calculations from Interstellar,” was reviewed through its auto-generated transcript. Useful sections are 10:09–12:10 (mass and the demanding time-dilation scenario), 12:13–15:38 (lensing and the film's presentation choices), and 18:37–20:14 (infall and speculative interiors). This is an independent analysis, not a statement of Nolan's intentions. Its informal descriptions and numerical estimates require verification before implementation.

The supplied [descent clip](https://www.youtube.com/watch?v=OA3Txp94pjs) was accessed and sampled visually; no transcript was available. Its cockpit and human close-ups provide a concrete size reference. Our proposed visual language is to alternate such intimate views with exterior scale reveals, retaining the same physical scene. This is a design interpretation, not a claim to reproduce the film's exact camera trajectory. No movie footage, dialogue, music, or ship design is incorporated into the product.

The primary [DNGR paper](https://arxiv.org/abs/1502.03808) explains relativistic image formation and the film's artistic choices. [Thorne's account](https://www.its.caltech.edu/~kip/index.html/PubScans/VI-59.pdf) explains why the one-hour/seven-year orbital scenario demands unusually extreme spin. Our validated spin range stops at |a*| = 0.9. Do not attach that cinematic time ratio to the current model; near-extremal precision needs a distinct solver/validation effort.

## First milestone: make scale felt

Choose a proposed physical mass of **100 million solar masses**, inspired by Gargantua, while retaining the current validated spin of 0.6. This is a Gargantua-scale preset, not its near-extremal orbital model. The existing dimensionless geometry alone does not determine mass: restoring units supplies physical distances and time without making the ray kernel more expensive.

Use `r_g = GM/c²`, `t_g = GM/c³`. With nominal solar GM = 1.3271244e20 m³/s² and c = 299792458 m/s:

| Quantity | At 100 million solar masses |
| --- | --- |
| One gravitational length r_g | 147.66 million km, about 0.987 AU |
| One gravitational time t_g | 492.55 seconds, about 8.21 minutes |
| Current camera coordinate radius 30 r_g | 4.43 billion km |
| Current disk outer coordinate radius 22 r_g | 3.25 billion km |
| Proposed probe span | 10 metres, about 6.77e-11 r_g |

The coordinate radii above are not proper tape-measure distances or apparent image radii. Kerr's horizon is at `r_+ = r_g(1 + sqrt(1 − a*²))`; neither that coordinate radius nor the dark image silhouette is a universal physical spherical radius. A mass change scales lengths and durations; at fixed dimensionless spin, camera, and source geometry it does not by itself change the vacuum lensing pattern.

Proposed 30–45 second visual sequence:

1. **Beside the probe.** A close camera sees a dish, insulating panels, and a structural boom at recognizably human scale, with the lensed disk beyond. Begin with a static reference composition, not a purported free-fall trajectory.
2. **The scale reveal.** Cut to a wider reference viewpoint: the same 10 m probe becomes unresolvable while the black hole remains enormous. An optional locator can identify the probe, but must behave as an instrument marker, never a giant physical spacecraft.
3. **Back to the instrument view.** The probe's own clock and a minimal physical scale readout can establish the starting conditions for a later launch. No simulated time-dilation ratio is shown before worldline validation.

Keep true object size and camera field of view explicit internally. Editorial cuts and accelerated presentation are not physical spacecraft travel. Avoid a seconds-long physically impossible zoom flight across astronomical units. Background stars are effectively distant, so their parallax cannot be fabricated to sell speed.

### Asset and rendering choice

Build an original compact procedural probe first: bus, dish, boom, a few panels, approximately 10 m overall. Target under 5,000 triangles, few materials, and no large texture downloads. This avoids an asset hunt and gives predictable dimensions. A licensed glTF asset can replace it later after checking scale, materials, attribution, and redistribution rights.

Keep the current WebGL2 Kerr backend. Render the nearby probe in a camera-local metre-scale frame with an ordinary mesh pass; keep the black hole in dimensionless Kerr coordinates. CPU float64 transforms the global anchor into the local observer tetrad before uploading small local coordinates. Adding metre offsets directly to AU-scale f32 positions would erase the probe through rounding.

A local mesh approximation is appropriate for a nearby object in a small freely falling/local laboratory region, with curvature variation across the object negligible. It does not produce a physically lensed image of a remotely falling probe. Remote observation later needs retarded-time light transport; do not just draw a moving mesh over the black-hole image and call it relativistic observation. In the first static composition, probe lighting is a documented approximation to disk illumination, separate from validated ray propagation.

Acceptance: correct unit conversions and projected angular size; readable close view; disappearance below pixel scale in the wide view; no f32 jitter; no changes to baseline GPU results; memory and frame-cost measurements with the added mesh. Reserve roughly one focused 2–4 hour implementation session as a planning estimate, subject to rendering integration. No deadline or FPS promise is implied.

## Next: give the probe a worldline and a clock

A material probe follows a timelike worldline, not the null paths already rendered. Extend the CPU Hamiltonian system to `H = −1/2` for unit rest mass and parameterize by proper time τ. Integrate coordinate time as well as spatial position/momentum. Normalize the initial four-velocity in a local frame; verify mass shell, energy, axial angular momentum, Schwarzschild limits, and step refinement. Neglect the probe's backreaction on the metric. Start with one defined release scenario outside the disk; radiation damage and propulsion are separate models.

Track three different observables:

- **Probe proper time:** its onboard elapsed time, locally normal to the probe.
- **Reference clock:** elapsed proper time on a specified observer worldline, with an explicit comparison/synchronization convention. Coordinate time alone is not automatically the clock of that finite-radius observer.
- **Received pulse stream:** signals emitted at equal probe proper-time intervals and propagated to the observer. Arrival spacing and frequency include motion, gravity, path delays, and potentially multiple images.

Use a future-directed photon and `g = (−p·u_receiver)/(−p·u_emitter)` consistently along each connecting ray. Pulse arrival intervals are observable; a made-up slowing multiplier is not. A distant observer sees progressively delayed/redshifted, fading emission during infall, while the probe crosses the event horizon in finite proper time. It does not feel its own clock stop. Falling in does not generically reveal the entire future of the universe.

## Then: ride with it

An onboard view requires a moving observer tetrad and an orientation transported along the trajectory. The current static camera cannot simply be translated inward: static observers cease to exist inside the ergosphere. Add four-velocity, local aberration, observer frequency normalization, and coordinate travel time to the rendering model before entering this regime.

Compute constraint: a moving viewpoint invalidates the current screen-space transport cache every frame. A cheap CPU worldline does not make a moving Kerr image cheap. Start with a fixed exterior observation point and precomputed selected signal connections. For an onboard sequence, use lower resolution during motion and full refinement on pause; consider a bounded precomputed camera path after measuring costs. Neighboring transport maps cannot be blindly interpolated across capture boundaries/caustics. Full free-roaming motion is a later benchmark gate.

Probe worldline -> moving tetrad -> backward light transport -> retarded source sampling -> HDR image. Observer worldline + probe emissions -> connecting null paths -> received telemetry. Keep presentation playback speed separate from all physical clocks. The existing sixfold disk-animation speed is illustrative and must be reconciled with physical units before a mission-time claim.

## Later: the boundary of prediction

The event horizon is not where GR and QFT automatically fail. A large black hole can have modest local tidal gradients there. Classical GR supports regular horizon crossing; QFT on curved spacetime is a useful established framework. The difficulty is a complete quantum description of dynamical spacetime in regimes where the classical approximation fails. Classical singularities signal incompleteness of the spacetime description, not an observed material object we know how to draw.

Do not turn ideal Kerr's mathematical interior into a claim about traversable astrophysical interiors; inner-horizon instability and backreaction matter. A predicted tidal signal would require curvature in the probe's frame and a separate structural model to predict damage. End a future scientifically validated journey at its declared model boundary. Any speculative interior would be a separately identified experience, not hidden inside the GR simulator.

Primary background: [Wald, Quantum Field Theory in Curved Spacetime](https://arxiv.org/abs/gr-qc/9509057); [NASA black-hole anatomy](https://science.nasa.gov/universe/black-holes/anatomy/); [NASA's infall visualization](https://science.nasa.gov/universe/black-holes/supermassive-black-holes/new-nasa-black-hole-visualization-takes-viewers-beyond-the-brink/). The latter is useful precedent, not a performance target already achieved by our browser.

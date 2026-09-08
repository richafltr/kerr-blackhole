# Ad Astra: research and the next physical boundary

Research and implementation notes, 8 September 2026. Source preservation: `baseline-vesper-v1` at `6f8efe8`. The user’s desired destination is a human-scale encounter through a rotating black hole. This release implements the entrance, a fictional crew decision, revised spacecraft, and a calculated exterior tidal instrument. It does **not** claim to implement the interior, crew survival, or breakup.

## What the references support

- **Film image formation.** [James et al., DNGR, §§4.1.2–4.1.3](https://arxiv.org/html/1502.03808v2) describes deliberate film choices in spin and frequency-shift presentation. A film-matching grade is not a calibrated spectral observation. We preserve the geodesic kernel and offer Cinema/Spectral color in camera controls.
- **Human scale.** [NASA’s infall visualization](https://science.nasa.gov/universe/black-holes/supermassive-black-holes/new-nasa-black-hole-visualization-takes-viewers-beyond-the-brink/) demonstrates that a supermassive hole can have tolerable horizon tides. Its specific journey times belong to its particular mass and trajectory; they are not numbers to copy into ours.
- **Inside vs outside.** [Andrew Hamilton’s Schwarzschild journey](https://jila.colorado.edu/~ajsh/insidebh/schw.html) distinguishes free fall from hovering and explains that horizon crossing does not turn the infaller’s sky off. Its nonrotating interior is not a Kerr-interior solution. External observers receive pre-crossing light with changing delay/redshift; they cannot see a ship break apart inside the event horizon.
- **Local tidal physics.** [Carroll, curvature notes, geodesic deviation](https://preposterousuniverse.com/wp-content/uploads/grnotes-three.pdf) supplies the tensor framework for relative acceleration. [Lima Junior, Crispino and Higuchi](https://arxiv.org/abs/2003.09506) shows why Kerr tides are direction dependent, including sign changes on the axis. We must not label the spherical radial formula exact for arbitrary Kerr flight.
- **Kerr interior uncertainty.** [McMaken and Hamilton](https://arxiv.org/abs/2102.10402) studies the inner horizon of a rotating, accreting hole. The stationary vacuum extension omits instabilities relevant to real holes. A dramatic known interior landscape, a traversable wormhole, or a quantum-gravity ending cannot be presented as established prediction.

The user-supplied [film clip](https://www.youtube.com/watch?v=OA3Txp94pjs) was inspected by sampled frames, including 1:21 (faceted capsule against the luminous disk) and 2:16 (pilot close-up). There was no available caption track; this is not a claim of full audiovisual/transcript analysis. The supplied ring silhouette informs the carrier. Original geometry and narration are used; the clip, film audio, dialogue and actor likenesses are not bundled.

## Implemented curvature instrument

Signature (−,+,+,+), ingoing Cartesian Kerr–Schild coordinates, G=c=M=1. We evaluate the connection from analytic first derivatives of the covariant Kerr metric, then central-difference the connection to obtain Riemann curvature. Stationarity makes temporal partial derivatives zero.

`R^ρ_(σμν) = ∂μ Γ^ρ_(νσ) − ∂ν Γ^ρ_(μσ) + Γ^ρ_(μλ)Γ^λ_(νσ) − Γ^ρ_(νλ)Γ^λ_(μσ)`.

The camera tetrad projects the tidal tensor `T_ij = −R_(i)(0)(j)(0)`. Its largest eigenvalue times a 2 m local separation, divided by `(GM/c³)²`, gives the maximum instantaneous stretching differential acceleration. The `Δa₂ₘ` instrument displays this in micrometres/s². It is a geodesic-deviation measurement, not a person's perceived uniform gravity, body elongation, injury threshold, or hull stress. It excludes rotational inertial forces from the hole-tracking camera.

The connection derivative step is `2e-4 max(r,1) M`. Float64 runs at telemetry cadence, once per 200 ms, outside the GPU pixel loop. A local Node sample averaged 0.131 ms per curvature evaluation over 100 evaluations; this is not a cross-device browser benchmark. At the default endpoint r=2.0878 M, the maximum differential acceleration across 2 m is 1.998e-6 m/s². Tests check the exact Schwarzschild eigenvalues `(−1,−1,2)/r³` for static and radial infalling frames, symmetry and vacuum trace across multiple Kerr spins and route points, the independent analytic Kerr polar-limit spectrum, step refinement, and inverse-square mass scaling at fixed dimensionless state. Passing these checks is not a global curvature error guarantee.

At 100 million solar masses, horizon-scale tides across a human remain small. We consequently apply no invented body stretching, camera shaking, or hull destruction on this exterior route. Accumulated deformation requires material/constraint dynamics as well as the instantaneous tensor.

## Story and graphics in this release

The entrance reads “interstellar: ad astra.” Three short transmissions establish a fictional mission and a two-crew/one-return-seat choice. Speech uses the browser's speech synthesis after a player gesture; local English voices are preferred. Voice availability/quality is device dependent, with persistent text and explicit continue, skip and mute controls. No actor voice imitation or model API is involved.

The player arms the descent, can abort, then releases Vesper and assigns the fictional return seat to Mara. This is a narrative decision on the existing supported-release trajectory; no rocket-equation, carrier escape, rescue probability, or crew-life-support simulation is claimed. The cinematic camera is a nearby chase view, not a remote observer. Twelve carrier modules and a faceted probe are original procedural Three.js geometry. Local spacecraft placement, material lighting and separation remain presentation approximations. The retained NASA asset is available in the preserved checkpoint, not loaded by this version.

## Gates before the requested breakup and human infall

1. **Physical departure:** establish an orbiting carrier worldline, a bounded release impulse, and propulsion assumptions. Validate timelike normalization, constants of motion, and escape/capture outcomes. A seat-choice story does not solve this trajectory problem.
2. **Human and hull:** use an articulated suit/crew asset and local body constraints. Drive relative motion with the transported tidal tensor; introduce explicit material parameters before a rupture threshold. Use test particles first to validate geodesic deviation; do not infer biological survival from one acceleration number.
3. **Remote camera:** trace null connections between emitter and carrier worldlines, including retarded emission times, magnification, received frequency and flux. Keep chase and received-image views clearly distinct. A precomputed route/signal table is a plausible browser compute saving for a fixed mission.
4. **Crossing:** remove the exterior stop only after horizon-penetrating timelike and past-light transport are separately tested. The current ray capture cutoff cannot produce the infaller’s interior sky. Start with a validated Schwarzschild crossing as a separately identified model before Kerr interior work.
5. **End of prediction:** terminate at a justified model-validity boundary. GR and QFT do not simply both fail at the outer horizon. [QFT on curved spacetime](https://arxiv.org/abs/gr-qc/9509057) is a working approximation; a full quantum-gravity theory of the singular regime remains unsettled. An artistic epilogue must be identified as such.

For a hackathon demonstration, this version's defensible technical claim is a cinematic exterior mission powered by checked Kerr light transport, proper-time probe dynamics, moving-observer frequency shifts, and a local curvature-derived tidal measurement on a consumer browser GPU. It is not “the first” physics experience and not film-resolution DNGR.

# Hackathon milestone: a human viewpoint on Kerr spacetime

## Pitch

Explore a rotating black hole from a probe, in your browser. Real general-relativistic light paths reveal the warped sky and accretion disk; a human-scale craft and physical clocks make the immense distances and different rates of elapsed time tangible. The project uses a numerically checked GPU solver and caches stationary light transport to make demanding physics accessible without a server GPU.

This is a simulation of an established model, not an observation or a replacement for telescopes. Avoid “first ever,” universal-device support, film-level fidelity, or simulated quantum-gravity claims. The runtime currently uses **WebGL2**, not WebGPU. Astra-assisted development belongs in the build-process description, not a claim that an AI predicts the physics at runtime.

## What is implemented for the submission

- Kerr null geodesics on the viewer's GPU, local camera tetrad, disk intersections, and covariant frequency shifts.
- Float64 reference, 140-ray GPU comparison, and preserved baseline tag `baseline-kerr-v1`.
- Original low-poly 10 m probe and stylized cabin geometry; no downloaded 3D asset or new dependency.
- Four selectable views and a 36-second editorial sequence: cabin, local exterior, scale view, cabin.
- Physical units for a 100-million-solar-mass preset; clock rate `dτ/dt = sqrt(-g_tt)` for a supported static observer. The reference coordinate time agrees with proper time at infinity; it is not a received remote-clock image.
- Physical disk animation timescale, with retarded texture sampling still excluded.
- Public Vercel static deployment; no account or server GPU needed by viewers.

The current observer is station-keeping, **not in free fall**. Clocks pause with the simulation and reset when radius, inclination, or spin changes: each is a new stationary experiment, not a flown path between presets. A geometric size comparison is not an instantaneous physically flown zoom. Reference-clock synchronization is a coordinate convention, not an operational light-signal synchronization experiment.

## Presentation approximations

The nearby craft is rasterized in a metre-scale local frame, separately from the Kerr background; illumination and cabin proportions are illustrative. The cabin frame adapts horizontally to the viewport to keep its window visible. At wide-view separation (10,000 km), the 10 m craft is culled by its projected pixel size, rather than exaggerated into a visible mesh. The distant Kerr background is reused for the local reference-camera cut, neglecting that small displacement relative to the 4.43-billion-km black-hole coordinate radius. This is a scale presentation, not retarded remote imaging of a falling spacecraft.

The background projection has vertical focal coefficient 1/0.38. A conservative probe-span estimate is `pixels = span_metres × image_height / (0.76 × separation_metres)`. At 1080 px height and 10,000 km, 10 m spans about 0.00142 px before orientation. Geometry smaller than 0.5 px is omitted. Source vertices and camera offsets stay in local units, avoiding addition of metre-scale offsets to astronomical f32 coordinates.

The new geometry uses a separate WebGL2 context with a capped 1.5 device pixel ratio. It adds buffers and a mesh pass; no measured FPS or performance-neutrality claim is made for this addition. The expensive Kerr transport kernel and cache rules are unchanged. The shipped image remains a prescribed thin disk, not plasma dynamics.

## One-minute demo

| Time | Show | Say |
| --- | --- | --- |
| 0–12 s | Onboard window, black hole, clocks | “A human viewpoint on a rotating black hole, computed from general relativity in a browser.” |
| 12–24 s | Local probe view | “This probe spans ten metres. Our black hole's gravitational length is almost the Earth–Sun distance.” |
| 24–34 s | Scale view | “At this separation the craft is below one pixel. We preserve its size rather than enlarging it.” |
| 34–46 s | Back to onboard clocks; briefly change spin | “The stationary clock rates and lensed light follow the metric. Each camera preset starts a new clock comparison.” |
| 46–55 s | Show repository validation results | “We compared actual GPU output with a double-precision reference and reuse stationary light transport.” |
| 55–60 s | Return to the scene | “Next: follow a falling probe and the signals it sends. Beyond our model’s limits, we will show questions—not fabricated answers.” |

## Remaining few-hour priorities

1. Record this working milestone and retain a video fallback before expanding scope.
2. Improve probe material detail, lighting, and window composition with the existing original mesh. Keep model caveats accurate.
3. Only if time remains: implement and test a CPU timelike release trajectory in isolation. A trajectory alone is not a validated moving-camera/received-signal experience, so do not sell it as one.
4. Complete submission fields: team, public repo, 1-minute video link, project description, actual Astra use, and personally observed feedback. Do not submit invented feedback.

For the OpenAI-use field, describe the documented work: assisted scientific scoping, the GPU implementation and CPU reference comparison, cache architecture, tests, scene construction, and deployment. Identify the actual model/session used from the event setup; do not invent an API integration or imply runtime model inference. No application or video has been submitted by this change.

## Longer-term fidelity gates

Timelike worldline and proper time -> moving tetrad and aberration -> retarded probe signals -> controlled horizon crossing -> clearly delimited questions about quantum gravity. QFT on curved spacetime is an established framework; it does not mean we can simulate the quantum resolution of a singularity. The final experience must distinguish classical predictions, presentation approximations, and open research questions.

## Delivery checks

Twenty-two CPU tests, TypeScript, authored-code lint, and the Vercel build pass. The existing GPU comparison was rerun after integration: 140 classifications agreed, maximum disk-hit discrepancy 1.754e-5 M, with the suite reporting PASS. This checks light transport, not the artistic mesh lighting. The browser showed the cabin and exterior model without reported console errors; the guided sequence returned to the cabin and stopped. The new renderer's mesh timing has not been benchmarked.

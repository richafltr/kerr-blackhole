# GPU validation — 2026-09-08

Run the static app with `npm run dev:vercel`, then open `/?validate=1`. The diagnostic executes the same transport shader used by the image, reads floating-point outputs, and compares them with the JavaScript float64 automatic-differentiation reference. It also exercises the normal renderer cache. Tolerances are encoded in `client/validation.ts`.

Recorded in the Codex in-app browser on the development Mac; user agent Chromium 152.0.0.0 / macOS. This is a short functional run, not a thermal or broad hardware benchmark.

| Check | Observed | Acceptance |
| --- | --- | --- |
| 140 rays across spin 0, 0.6, −0.6, 0.9 | 0 classification mismatches; 0 unresolved | No mismatches |
| Disk-hit position discrepancy | 1.473e-5 M | < 0.01 M |
| Frequency-ratio discrepancy | 7.186e-7 | < 0.002 |
| Escape-direction vector discrepancy | 4.021e-6 | < 0.001 |
| GPU normalized Hamiltonian residual, disk/escape | 1.012e-4 | < 0.002 |
| GPU axial momentum drift, disk/escape | 1.638e-5 | < 0.002 |
| Spin-zero capture vs independent planar ODE | Pass | Same outcomes |
| Disk-hit displacement on halving step size | 5.735e-6 M | < 0.005 M |
| Progressive refinement completes | Pass | Completed view |
| 60 animation/exposure frames reuse transport | Pass | No extra transport passes |
| Spin change invalidates transport | Pass | New transport pass |

At **416×234** internal resolution, the initial view used 14 transport passes. Allocated floating render targets totalled **2.90 MiB**, excluding browser/driver memory. Median timer-query duration was **5.890 ms per transport pass** and **1.348 ms for shading plus display**. A pass is a preview or refinement tile, not an entire freshly traced frame; these numbers must not be presented as full-frame Kerr FPS. Timing is device/load dependent.

The CPU suite contains 18 passing tests. Type checking, authored-code lint, and the Vercel production build are separate delivery checks. The normal image was visually inspected in the browser.

## Limits of this evidence

CPU/GPU agreement tests independent derivative implementations but shares model conventions and integration strategy. The finite ray grid cannot establish correctness everywhere. Captured rays are excluded from the quoted invariant-drift maxima because past-directed momenta grow near the ingoing-coordinate horizon cutoff. This does not establish near-horizon accuracy. Critical-ray filtering, extreme-spin behavior, global error bounds, Carter-constant monitoring, multi-device support, p95 sustained timing, and power consumption remain future validation work.

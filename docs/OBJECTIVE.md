# Objective: general relativity on accessible hardware

Make complex physics simulations publicly accessible on ordinary consumer devices, with explicit numerical accuracy, compute, memory, and energy tradeoffs. Begin with general-relativistic black-hole ray tracing. Extend to other physical systems only when their equations and validation criteria are separately established.

The product is a visual simulation. Explanatory material is added only at the owner's direction. The technical documentation belongs in the repository, not over the rendered image.

## Scientific scope

Solve null geodesics in a prescribed spacetime. Schwarzschild and Kerr are exact stationary solutions of Einstein's field equations; ray tracing in these metrics is real general relativity. It is not numerical evolution of the full Einstein equations. Black-hole mergers, evolving spacetime, magnetohydrodynamic disks, quantum gravity, and singularity interiors require different solvers and are not current capabilities.

The desired technical achievement is an accessible renderer whose numerical output can be checked against a double-precision reference, whose optimizations preserve a declared error tolerance, and whose performance is measured on affordable hardware. Do not claim a first-ever simulator, film-level fidelity, universal device support, or unmeasured speedups.

## Current versus target

| Area | Current shipped image | Next acceptance gate |
| --- | --- | --- |
| Metric | Exact Schwarzschild null-orbit ODE | Kerr metric with consistent camera initialization and spin-zero agreement |
| GPU method | Fragment shader, per-pixel RK4, fixed angular step | Compare kernel outputs against float64 reference before optimization |
| Disk | Thin opaque annulus; procedural illustrative emission | Covariant frequency shift and documented emitter velocity model |
| Accuracy | Selected float64 analytic-limit and convergence tests | GPU capture/escape, disk-hit, null-constraint and convergence measurements |
| Performance | Capped internal resolution; no validated timing claim | Median/p95 GPU time, step distributions, unresolved fraction, memory footprint |
| Distribution | Browser preview | Public Vercel static build; zero server-side GPU inference/rendering cost |

## What would qualify as a technical feat

1. Integrate Kerr null geodesics on a consumer GPU, with visible spin-dependent frame dragging arising from the equations.
2. Demonstrate agreement with an independent float64 path and analytic Schwarzschild limits.
3. Show an optimization at the same scene, resolution, ray budget and error tolerance; report the measured before/after GPU time.
4. Make a public browser build work without account sign-in or server compute, while reporting unsupported-device and lost-context conditions honestly.

These are targets until measured and documented. The first milestone is a validated numerical foundation, not a claim that the final kernel already exists.

## Submission description, bounded to actual progress

This project works toward making general-relativistic black-hole simulations accessible on consumer hardware. Its browser renderer integrates Schwarzschild light paths on the GPU, with a separate float64 validation path. The next milestone is a checked Kerr kernel and physically specified emission, with explicit accuracy and performance budgets. Rendering runs on the viewer's device rather than a paid server GPU.

Revise the description to reflect actual achieved Kerr validation, benchmarks, and deployment at submission time. Record actual Astra use and observed feedback separately.

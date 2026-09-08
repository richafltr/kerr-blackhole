# Objective: general relativity on accessible hardware

Make complex physics simulations publicly accessible on ordinary consumer devices, with explicit numerical accuracy, compute, memory, and energy tradeoffs. Begin with general-relativistic black-hole ray tracing. Extend to other physical systems only when their equations and validation criteria are separately established.

The product is a visual simulation. Explanatory material is added only at the owner's direction. The technical documentation belongs in the repository, not over the rendered image.

## Scientific scope

Solve null geodesics in a prescribed spacetime. Schwarzschild and Kerr are exact stationary solutions of Einstein's field equations; ray tracing in these metrics is real general relativity. It is not numerical evolution of the full Einstein equations. Black-hole mergers, evolving spacetime, magnetohydrodynamic disks, quantum gravity, and singularity interiors require different solvers and are not current capabilities.

The desired technical achievement is an accessible renderer whose numerical output can be checked against a double-precision reference, whose optimizations preserve a declared error tolerance, and whose performance is measured on affordable hardware. Do not claim a first-ever simulator, film-level fidelity, universal device support, or unmeasured speedups.

## Achieved milestone

The browser now integrates Kerr null geodesics with a metric-orthonormal camera, analytic GPU derivatives, circular disk emitters, and covariant frequency shifts. A fixed-grid GPU readback test agrees with the float64 reference for 140 sampled rays. Stationary light transport is cached and refined progressively, so disk animation and exposure changes avoid repeating the geodesic integration. See [measured validation and limits](VALIDATION.md).

## Remaining technical gates

Resolve narrow higher-order images with controlled sampling, validate near-critical rays and further invariants, and measure sustained performance on lower-resource hardware. Full fluid dynamics, evolving spacetime, and film-level ray-bundle fidelity are outside this milestone. No universal speedup or device-support claim is made.

## Submission description

This project makes general-relativistic black-hole rendering available through a public browser link. It integrates light paths in the Kerr metric on the visitor's GPU, checks selected trajectories against a double-precision reference, and caches stationary light transport so animation can run without repeating the expensive integration. The disk is a prescribed thin emission model, not an evolved accretion flow. Vercel serves static assets; no server GPU or account is required.

Record actual Astra use and observed feedback separately. The technical achievement is validated numerical transport and reuse under limited compute, with remaining accuracy and hardware limits documented openly.

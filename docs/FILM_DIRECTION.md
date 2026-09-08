# Cinematic direction / 8 September 2026

The goal is a human encounter with immense scale, while keeping the tested general-relativistic exterior underneath the presentation.

## What was studied

At the user's request, yt-dlp downloaded the complete [supplied 4:33 clip](https://www.youtube.com/watch?v=OA3Txp94pjs) for private local analysis. The available source was 1280×720, HDR BT.2020/PQ. Forty-six frames sampled every six seconds cover the full clip; automatic scene detection at 0.25 yielded 79 candidate cuts. Bright flashes can trigger false cuts, so these are not an authoritative edit list.

The contact sheets were inspected alongside the supplied reference images. They were not HDR tone-mapped, so their colors are not calibrated evidence. Audio was extracted separately from picture; this is the **complete mixed soundtrack**, not an isolated music stem. RMS analysis measures amplitude, not musical harmony, instrumentation or emotional effectiveness. No claim of an isolated-score transcription or a complete auditory analysis is made.

A private local review page combines the video, audio, contact sheets, amplitude plot and timestamped notes. Raw film media remain outside Git and the deployed game. The copy is temporary, not an archival/public hosting service.

## Visual observations and decisions

| Reference region | Observation | Applied direction |
| --- | --- | --- |
| 0:00–0:18 | Tiny spacecraft against an enormous luminous object that exceeds the frame. | Crop the live black-hole image off the right side. Keep the first carrier small and readable. |
| 0:18–1:18 | Frequent returns to faces, windows and cabin geometry. | Alternate exterior scale with a seated cabin viewpoint. A real character performance remains a future asset/animation milestone. |
| 1:18–1:42 | Docking hardware and capsule silhouette become recognizable landmarks. | Retain the textured NASA capsule; detail the ring with recesses, rails, radiators and four-bell drive modules. |
| 1:42–2:12 | Instrument inserts connect the situation to physical controls. | Keep the consequential action on the cabin console and omit exterior explanatory panels. |
| 2:12–3:24 | Spatial separation and repeated close views sustain personal stakes. | Use an original one-seat conflict, hold the ship in frame, then return to the cabin before handing over control. |
| 3:24–4:33 | Enclosed framing, extreme brightness changes and late visual escalation. | Preserve the alternation between large exterior and small interior; do not copy shaking or breakup unsupported by this simulation's local tides. |

The reference combines warm near-white emission, dark negative space, weathered pale spacecraft and limited cool engine accents. The carrier revision adds recessed blue-lit throats, not an all-over emissive outline. The existing Cinema grade is artistic; the Spectral option remains available.

The full mix's median RMS levels in successive 60-second windows were approximately −14.5, −14.9, −25.0, −22.2 and −9.2 dBFS (last window partial). The later rise is measurable; its cause cannot be assigned to the score alone. The implementation uses independent licensed music with its own pacing.

## Implemented original prologue

| Time | Shot | Narrative role |
| --- | --- | --- |
| 0:00–0:07 | Black / typewriter | Stillness; allow the first voice to arrive alone. |
| 0:07–0:18 | Wide exterior | A hundred million solar masses and a tiny carrier. |
| 0:18–0:26 | Carrier close pass | Introduce Mara and Vesper through recognizable hardware. |
| 0:26–0:33 | Black / typewriter | One return seat; hold after the short sentence. |
| 0:33–0:45 | Textured capsule | The player's decision acquires a physical subject. |
| 0:45–0:58 | Cabin | Return to the player's hands and wait for their command. |

The source script and ElevenLabs configuration are in `scripts/narration.json`; `lib/prologue.json` records the generated shot boundaries. George, a stock ElevenLabs narrator, performs the original text. No celebrity voice was cloned. About 28 seconds contain speech; about 30 seconds are lead-ins and holds. The joined audio file is the editorial clock, so muting narration does not alter shot timing. A failed audio channel is reported and the text sequence can continue on a fallback clock.

“Signal to Noise” (No Piano Melody mix) by Scott Buckley supplies the first bed. “Titan,” starting at its original 1:15, begins on release: the rising section is closer to the roughly 40-second default time-lapse descent than the full track's quiet opening would be. Both are CC BY 4.0, requiring attribution; neither is public domain. Music is attenuated beneath speech, crossfaded at release and reduced at the exterior endpoint. Score and voice have independent controls. Pause and page visibility suspend audio; skipping permanently ends the briefing speech. Reduced-motion preference fixes the staged camera drift and removes typewriter animation.

## Compute and physical boundaries

- Narration is generated once, offline. The game downloads static audio; there is no ElevenLabs key, live speech API, paid inference request, or film asset in the browser.
- Three MP3 assets total approximately **4.14 MB**. They are streamed through HTML media elements rather than decoded into several long Web Audio buffers.
- Editorial crops reuse the stationary Kerr transport cache. Local Three.js camera staging changes spacecraft composition without solving a new relativistic trajectory every frame. Entering the cabin changes the viewport and may require a fresh optical refinement.
- The GPU kernel, timelike integrator, curvature calculation, capture cutoff and moving-camera budget are unchanged by this revision.
- A nearby Euclidean mesh overlay does not provide relativistically lensed ship geometry, retarded external observations, a physically simulated carrier escape, or scale-correct co-location with every background feature.
- At 100 million solar masses the current exterior tides do not justify dramatic spaghettification at the horizon. The story does not turn that unimplemented visual into a claimed physical result.
- This is a stronger cinematic prototype, not film-resolution ray-bundle rendering, a full character game, or an interior/singularity solver.

## Verification

The production build and TypeScript check pass. Thirty existing CPU physics checks remain passing; four new audio-controller tests cover pause/skip, release cue restart, independent mute and failed-voice recovery. These audio tests use media-element doubles; they do not establish cross-browser autoplay behavior or subjective sound quality.

FFmpeg decoded all three final MP3s and measured true peaks below zero: narration −2.4 dBFS, Signal to Noise −4.9 dBFS, Titan −7.6 dBFS. Loudness measurements were approximately −18.4, −19.1 and −19.0 LUFS before runtime mixing. No claim of live GPU revalidation or a new frame-rate benchmark is made for this audio/presentation revision.

See [asset attribution](ASSETS.md) and [audio licenses](../public/assets/audio/LICENSES.md). A commercial release must regenerate free-tier ElevenLabs narration under a suitable paid subscription. For a demo video, include the composer attribution in the description and ElevenLabs attribution in the title.

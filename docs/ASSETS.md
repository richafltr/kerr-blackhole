# Visual assets and provenance

## Cabin

`public/assets/cabin-v2.png` was generated with the built-in image-generation tool for this project, with original retro-future styling. It is 1672×941 pixels. The tool did not supply the requested alpha window; `public/assets/cabin-mask.svg` is a functional compositor mask that removes the window region, including its baked checkerboard. The stored image is not modified. No external sky or black-hole pixels from this asset are shown through the window.

Prompt used:

> Use case: stylized-concept. Asset type: photoreal cinematic game foreground overlay, transparent PNG, landscape 2048 x 1152. Primary request: An original high-fidelity first-person retro-future spacecraft cabin seen from a seated pilot's eyes, crafted as a perimeter frame for a live space renderer. Scene/backdrop: The entire forward window opening MUST be genuinely TRANSPARENT with alpha=0, including all the space visible through it. Do not draw any background in the window. No black fill, no white fill, no checkerboard pattern. Output real alpha transparency. Composition/framing: Wide 16:9. A huge single unobstructed panoramic forward window opening runs approximately from 15% to 85% of width and 8% to 72% of height, with softly angled corners. Its middle must remain completely clear and transparent. Cabin architecture occupies outer left and right margins, a thin overhead rim, and a lower mechanical console along bottom 25%. No central pillars. The cockpit must fill the image to the edges, with authentic close eye-level perspective from the pilot seat. Two small suited gloves can rest naturally near the very bottom corners, leaving the console center open. Style/medium: Extremely detailed photoreal hard-surface practical spacecraft set, believable engineering, cinematic lighting, premium simulation-game asset, original design. Materials/textures: Aged ivory molded panels and worn dark charcoal instrument housings, subtle chipped paint, brushed aluminum fasteners, rubber seals, tactile metal toggles, cables and recessed instrument arrays. Small nonlinguistic mechanical gauges and blank dark instrument glass; restrained warm amber practical indicator lights. Lighting/mood: Dim intimate cabin, soft neutral reflected window rim illumination, gentle amber instrument lighting, deep controlled shadows, visible material detail. Constraints: Original design, no movie replica. Transparent window is essential because an animated black-hole renderer will be composited behind it. Only the cabin itself is opaque. Preserve clean antialiased cutout edges and the PNG alpha channel. Avoid: NO outside scenery, NO stars, NO black hole, NO planets, NO baked text or lettering, NO captions, NO HUD, NO logos, NO identifiable actor, NO watermark, NO checkerboard baked in.

## Spacecraft

`public/assets/apollo-soyuz.glb` — **NASA/Michael D. Carbajal**. Model source: [NASA Apollo–Soyuz](https://science.nasa.gov/3d-resources/apollo-soyuz/), [NASA GitHub mirror](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Apollo%20Soyuz). Download is 952,608 bytes, with embedded textures. The renderer separates its Apollo and Soyuz material groups, retains model dimensions, and stages them as fictional probe/carrier imagery. This is not a NASA mission or an endorsement.

NASA's [media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) permit educational/informational use of model and texture data with source acknowledgement; NASA identifiers do not imply endorsement. These third-party media terms remain separate from the project's code licensing. No film footage, soundtrack, actor likeness, or exact Interstellar spacecraft model is included.

## Ad Astra spacecraft revision

The current game combines the NASA Apollo capsule from the preserved checkpoint with an original twelve-module ring carrier (`lib/vessels.ts`). The supplied silhouette and film references inform the carrier shape and palette. No film models, textures, dialogue, score or footage are bundled. The Apollo capsule remains a detailed stand-in, not a reproduction of the film’s Ranger. The Soyuz part of the NASA asset is not displayed in this version.

## Narration and score revision

Original narration: stock **George** voice from **elevenlabs.io**, generated with Eleven Multilingual v2. This account was on the free tier at generation: noncommercial preview only, with title attribution; regenerate under an appropriate paid plan for commercial use. No Morgan Freeman voice or actor clone is used.

“Signal to Noise” (No Piano Melody mix) and “Titan” by **Scott Buckley**, released under **CC BY 4.0**. Music excerpts were faded, level-adjusted and transcoded; full source links, edit details and demo-video attribution are in [audio licenses](../public/assets/audio/LICENSES.md). The public credits page is `/credits.html`.

The user-requested YouTube download, extracted soundtrack and contact sheets are private analysis files outside the repository. The game uses live graphics and licensed replacement music; it does not contain that film's pixels, dialogue or score.

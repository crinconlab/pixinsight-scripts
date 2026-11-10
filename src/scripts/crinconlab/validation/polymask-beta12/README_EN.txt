PolyMask Advanced 0.3.0-beta.12 — local beta for PixInsight 1.9.6
Copyright Carlos Rincón 2026

Extract the entire Crinconlab folder, keeping both .jsh files, icons/ and
manuals/ beside PolyMask_EN.js. Run Script > Execute Script File and check
0.3.0-beta.12 in the editor title. Avoid registering duplicate menu entries.

The Update Preview button has been removed. A reduced view is used while
dragging; after release or a short pause the mask refines automatically at
full resolution. Starting another adjustment postpones a pending refinement.
The last view remains visible while the next one is calculated. Large images
can take longer to refine; watch the blue status line and progress bar.

Live preview while dragging controls only the fast updates during dragging.
When unchecked, the preview still refines automatically after each adjustment.
Create Mask always uses the complete current settings at original resolution.

Chrominance normalization and both-sides feather from beta 11 are retained.
Final blur follows color/lightness selections and region union; final inversion
comes last. Gray can extend into nearby excluded areas after smoothing.
See Help, the English manual and LEEME_ES.txt for details.

Local, unsigned and unpublished. Source pixels are not modified.

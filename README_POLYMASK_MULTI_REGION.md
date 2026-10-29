# PolyMask multi-region development branch

Version **0.2.0-beta.1**, for **PixInsight 1.9.5**. Copyright © Carlos Rincón 2026.

This branch adds up to 32 editable polygon regions, each with independent feather sigma, transition mode, inversion and mask strength. Select a region in the list; the active contour is purple and the others cyan. Existing synchronized zoom, pan, vertex editing and undo are retained.

**Create Mask** creates a single mask using the maximum of the weighted region masks; overlaps do not add. **Create Separate Masks** creates one mask per region, so you can apply different PixInsight processes to different zones. PolyMask itself creates masks; it does not run those image adjustments.

Every polygon must be closed before output. Region inversion is local to its mask calculation but exposes its exterior across the canvas. Strength controls mask opacity, not image brightness. Layouts are in memory only; save the resulting masks manually.

## Installation

Download this branch using Code > Download ZIP. The scripts and icons are in `src/scripts/crinconlab/`. For an existing installation, replace PolyMask_EN.js and its three PolyMask manuals from this branch; retain the icons directory. Refresh Script > Feature Scripts. This beta uses the same menu registration as PolyMask, so register only one copy at a time. The main branch and existing release retain version 0.1.0.

## Validation

36 native programmatic checks passed on PixInsight Core 1.9.5 x64 using synthetic images. Physical mouse interaction, real astronomical images and large-image performance still need user testing. The regression checks cover source preservation, feathering, preview/output equality, zoom/pan, undo, and independent/overlapping regions. See `tests/polymask-multi-region/results.json` and the user manuals. Run `tests/polymask-multi-region/native.js` with PixInsight to repeat; outputs go to a temporary folder.

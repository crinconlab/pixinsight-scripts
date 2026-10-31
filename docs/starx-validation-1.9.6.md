# StarXTerminator — native automatic validation in PixInsight 1.9.6

30 October 2026. Tested source: `b5d6d720502ecc772168781b8caee93081a74e6e`, Focal Length Blend 0.11.8. Runtime: PixInsight Core 1.9.6 Lockhart x64/macOS. Native module: **StarXTerminator 2.6.10, ML version 11**, GPU execution reported by the module.

## Availability issue resolved for the tests

A normal newly launched test instance did not expose the StarXTerminator constructor, although the installed RC Astro Suite module existed and the author used StarX successfully interactively. Explicitly loading that installed module through PixInsight's documented `--module` startup option exposed the constructor. This was a test-launch configuration difference, not evidence that StarX was absent or broken in the author's installation. The exact underlying persisted-module-list cause was not established.

The isolated test used `--automation-mode`, which does not save core preferences on exit, and the installed module's existing configuration. No license file, signing key or security preference was read or changed by the harness. No StarX implementation was mocked and no custom star-separation factory was supplied.

## Functional results

Five automatic functional workflow checks passed, followed by successful saved-result readback:

- Loaded the real solved with-stars samples: short focal length 1500 × 1500 RGB and long focal length 1500 × 1021 RGB.
- Executed production `MF_prepareGeometry(..., {removeStars:true})`: native StarX separated both inputs; the short-focal stars were retained with Unscreen enabled. Both native runs and fixed-canvas reprojection completed in 8.325 seconds in this run. The destination remained 1500 × 1500, all required WCS solutions were present, and the base sky-coordinate difference was zero.
- Prepared the actual polygon mask, contrast fit and native MLT blend; constructed/rendered the comparison dialog and verified its recombination option was enabled.
- Executed `MF_keepResult(..., true)` with the real StarX star image. Full-image comparison with `1-(1-starless)*(1-stars)` had **maximum absolute error 0** across RGB channels. Final sky-coordinate difference was zero. Both blended and recombined outputs were retained.
- Executed `MF_retainBaseStars`: the separate stars image remained available. All 363 checked original-source sample values were unchanged and both original solutions remained present.
- Saved and reopened the recombined XISF: 1500 × 1500 with a valid native astrometric solution.

The repeatable harness was executed again successfully: the same five functional checks passed, separation/reprojection took 8.086 seconds and the reconstruction diagnostic reproduced the same 0.0130966604 maximum difference. No image-processing source changes were required. Public numerical results are in [starx-validation-results.json](../tests/starx-validation-results.json). Timings apply only to this machine, model and sample pair. Physical mouse interaction and Windows/Linux execution were not tested here.

## Additional diagnostic: exact reconstruction is not claimed

An extra, stronger test attempted to recover the original input exactly from the native starless/stars decomposition. Its strict 1e-5 maximum-error assertion **did not pass**. This is distinguished from the script's Screen-expression correctness, which passed with zero error.

For this sample the absolute reconstruction error had maximum **0.0130966604** and mean **0.0000158911**, on an input range of 0–1. About 2.978% of channel samples had starless values above the original; the native stars image was zero at all those locations. That accounts for part of the non-exact reconstruction. Outside those locations the maximum residual was 0.0005342960 and the mean was about 4.719e-8; no unverified cause is assigned to that residual. These measured differences do not justify claiming perfect pixel inversion or changing the requested blend formula.

This is a documented property of this measured native decomposition, not a silently discarded failed assertion. No alternative stars image was synthesized to force reconstruction and the requested Screen formula was not changed.

## Review status

StarX separation and Screen recombination are now directly tested successes in PixInsight 1.9.6 for the above environment and sample workflow. They are no longer only accepted by continuity. The earlier missing-constructor observation remains historical. SPCC and a fresh astrometric solve retain their previously documented uncompleted scope; this StarX follow-up does not change them.

## Repeat the native test

Use the installed module and the extracted With_StarX sample directory with `tests/Test_StarX_Workflow_PixInsight.js`. The command-line form is `PixInsight --new --automation-mode --module=/path/to/installed/RCAstroSuite-pxm.dylib --run=/path/to/tests/Test_StarX_Workflow_PixInsight.js,/path/to/With_StarX --force-exit` on this macOS installation. Select the appropriate installed module filename on another platform. The harness writes owned results to a unique temporary directory; its original-reconstruction measurement is explicitly diagnostic, not a failed compatibility check disguised as a pass.

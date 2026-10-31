# CPD review corrections — 2026-10-31

- The product formerly named RGB Ha Blend is now **RGB Ha Blend 0.15.0** (`RGB_Ha_Blend.js`). Its dependency on the official solver and color calibration tools remains documented.
- RGB Ha Blend and Focal Length Blend 0.11.8 use their own `SETTINGS_MODULE` keys: `Crinconlab/RGBHaBlend` and `Crinconlab/FocalLengthBlend`. `SOLVER_SETTINGS_MODULE` remains `ImageSolver` to share solver configuration. Dialog Reset therefore removes only the calling product's settings.
- The same four reviewed scripts and secure sample downloader are distributed in all active branches. The multi-region PolyMask beta is preserved on its experimental branch.
- The obsolete 2026-10-26 ZIP and checksum have been withdrawn. The replacement collection is published at https://github.com/crinconlab/pixinsight-scripts/releases/tag/collection-2026-10-31 ; sample content must pass its pinned SHA-256 before publication, with HTTPS-only requests and redirects.

Public developer identity URL: https://github.com/crinconlab/pixinsight-scripts

Product documentation: https://github.com/crinconlab/pixinsight-scripts/blob/cpd-review/docs/cpd-scripts-en.md

## Signing and optional recommendations

The blending scripts include installed ImageSolver sources outside `include/pjsr`. These become part of the signed dependency set. Revalidate and re-sign after updating those files. The explicit embedded solver version is retained in this correction; it is not the product version. Migration to NetworkTransfer is a future implementation option; the current downloader restricts requests and redirects to HTTPS and verifies a pinned SHA-256.

## Regression validation

PixInsight Core 1.9.6/macOS: both renamed/updated setup interfaces rendered successfully. Each script invoked the native solver configuration ResetSettings method with an ImageSolver sentinel preference present; both preserved the sentinel. The namespace guard was checked before the native reset. All 14 downloader Node tests passed, including the actual sample archive pin. No blending algorithm was changed.

Historical validation reports retain the filenames and product versions used when those tests ran. The 2026-10-31 reset/interface tests cover the new versions.

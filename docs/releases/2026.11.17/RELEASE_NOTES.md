# PolyMask 1.0.1 — signing candidate

Fixes a preview-buffer ownership error when automatic final-blur previews pass through a positive sigma below 0.1 preview pixels. That path formerly returned the reusable live buffer as the displayed mask; replacing the display closed the buffer, causing a later null beginProcess error. The live cache now clones for that no-op blur range, just as for zero blur. The existing 0.1-pixel cutoff and final pipeline are unchanged.

Native PixInsight 1.9.6 regression: the buffer failure was reproduced before the fix; 23 checks pass afterwards, including real automatic timer updates, active-region-only mode, zero/subpixel/large blur changes, changed preview pixels and exact final-output agreement with a fresh full pipeline. The author also confirmed the local correction works.

Only PolyMask_EN.js requires a new signature. Shared libraries and other scripts are unchanged. After receiving it: validate all six signatures, finalize metadata and frozen ZIP, verify its public direct URL, then ask the author to sign the exact XML index. Keep the existing production index until all gates pass. No candidate index is published now.

PolyMask 1.0.0 was the first stable release, published 2026.11.16; 1.0.1 is its first maintenance update. The separate unspecified Ha/RGB blend nuance remains pending, not implemented.

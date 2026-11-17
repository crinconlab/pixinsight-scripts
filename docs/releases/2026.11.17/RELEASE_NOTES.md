# PolyMask 1.0.1 — signed maintenance release

Fixes a preview-buffer ownership error when automatic final-blur previews pass through a positive sigma below 0.1 preview pixels. That path formerly returned the reusable live buffer as the displayed mask; replacing the display closed the buffer, causing a later null beginProcess error. The live cache now clones for that no-op blur range, just as for zero blur. The existing 0.1-pixel cutoff and final pipeline are unchanged.

Native PixInsight 1.9.6 regression: the buffer failure was reproduced before the fix; 23 checks pass afterwards, including real automatic timer updates, active-region-only mode, zero/subpixel/large blur changes, changed preview pixels and exact final-output agreement with a fresh full pipeline. The author also confirmed the local correction works.

Only PolyMask_EN.js changed and received a new signature. Shared libraries and other scripts are unchanged. All six source/code signatures and the final XML signature validate. The public ZIP passed size and hash checks; the native updater downloaded it with 1 successful and 0 failed. Installation was scheduled; final installation is not claimed.

PolyMask 1.0.0 was the first stable release, published 2026.11.16; 1.0.1 is its first maintenance update. The separate unspecified Ha/RGB blend nuance remains pending, not implemented.

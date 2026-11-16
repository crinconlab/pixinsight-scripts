# Full-flow comparison — PixInsight 1.9.6

Date: 2026-11-16. Experimental code only; published package and installation unchanged.

Synthetic stretched RGB: 1920×1280; two irregular 32-vertex regions; symmetric feather sigma24; red and blue chrominance masks; lightness range and transition; union; final blur sigma8; final inversion. Three repetitions per method. Timings include PM_makeRegions, native mask image.render and a PM_clone output copy; exact sample comparison and cleanup excluded. Not a measurement of the entire interactive dialog or disk saving.

| Action | Current median ms | Columns median ms | Reduction |
|---|---:|---:|---:|
| cold two-region preview | 7253 | 2991 | 58.8% |
| unchanged cached preview | 467 | 466 | 0.2% |
| lightness adjustment | 1058 | 1090 | -3.0% |
| move polygon vertex | 3162 | 1290 | 59.2% |
| uncached final output | 6937 | 3056 | 55.9% |

All 15 baseline/column paired results matched exactly at full resolution (2,457,600 samples per pair), including the final feather/color/lightness/blur/inversion result. 30 timed runs completed.

Stage instrumentation records top-level raster, blur, color and other PixelMath durations (nested calls excluded from double counting). Timings are coarse wall-clock measurements, subject to scheduling and allocation noise. Baseline always precedes columns per repetition; repeat with interleaved order and larger real images before a release decision.

Cache behavior: moving one vertex invalidates one region geometry; changing lightness reuses geometry and color. Unchanged preview still performs combination, final blur/inversion and rendering. Column rasterization cannot accelerate those remaining operations.

Not yet verified: actual modal-editor pointer responsiveness/cancellation under load, peak resident memory, large real-user images, and pixel-boundary/self-intersection edge cases beyond the initial test fixtures. No production integration or publication performed.

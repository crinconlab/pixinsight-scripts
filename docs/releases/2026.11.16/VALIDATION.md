# Validation record — 2026-11-16

## Baseline reviewed before modification

Fresh clone of `crinconlab/pixinsight-scripts`, clean main at `5904bec7c4bf4dedb5dc4fd49c8f67d20feb10bd` (published signed 2026.11.12). Workspace AGENTS.md read; no additional repository instructions found. The local PolyMask candidate validated in this conversation was incorporated deliberately. Landing baseline: `crinconlab/crinconlab` main `6ebbbfbe9ab413ceab0d4a2b866a283d23f5e1c2`. No changes to historical releases, active repository index/ZIPs, sample terms or general installation instructions for an individual case.

## Completed

- **11 native checks** in PixInsight 1.9.6/macOS build 1718: exact visible RGB recommendation, optional tooltip/help, no added startup noise-reduction popup, versions, news suppression defaults/persistence/dismissal, Help notes. Temporary preference key cleaned; real suppression preference untouched.
- **28 native PolyMask checks:** original mask creation/output/attachment paths plus fine softness limits, unchanged luminance fine steps, saved project metadata, notice behavior and persistence. Synthetic fixtures only.
- **Actual UI interaction:** opened the RGB setup, observed the full note below input selectors without clipping, cancelled without processing user images; observed PolyMask 1.0 release notice, unchecked suppression option and working OK dismissal.
- **RGB processing comparison:** source section from RD_validate through processing/alignment/crop/SPCC/preview classes equals the published source after normalizing only version labels. No blend algorithm modification.
- **11 Python packaging tests:** official `serverURL` + basename construction, relative compatibility, missing-signature refusal, unsafe paths/URLs/tags, no overwrite of frozen packages, successful/failed asset bytes and HTTPS downgrade rejection. Test fixture signature text is explicitly fake and confined to temporary test directories; not used in a product package.
- **Node sample downloader:** 13 passed, 1 optional real-archive fixture skipped. Separate live HTTPS test verified an existing 17,781-byte historical Release asset against its known SHA-256, including redirect to release-assets.githubusercontent.com. Not installed or executed.
- **Landing:** JS/assets/repository checks and semantic rendering of the recommendation in English and Spanish passed. Existing published version labels were retained; no premature 1.0 announcement.
- **Prior column evidence retained:** 21 native mask comparisons and 30 full-flow measurements (15 paired outputs) with zero sample differences. Full-flow median reductions near 56–59% apply to geometry rebuild cases; cached luminance settings do not gain that amount.

## Signature findings and pending work

Independent native verification confirms Header Editor and ProtectedPaths retained signatures valid. Focal Length Blend's old signature returns `valid:false` on the current installation, although its script bytes are unchanged. Included ImageSolver dependencies can invalidate signatures across PixInsight updates; this is a possible cause, not established as the exact cause here. The old Focal signature is removed from the candidate, and re-signing is required.

RGB Ha Blend, PolyMask and PolyMaskProjects signatures are removed because their sources changed. Four new signatures are needed in all. Signing remains the author's local step. No private key was accessed.

New signed ZIP construction, public new Release asset verification, signed final XML validation, and the actual Check for Updates download/staging/install path using `serverURL` remain pending those signatures. The documented format and HTTP asset test do not replace that native acceptance test. No new full SPCC/astrometric run is claimed by this note-only RGB revision.

## Additional test attempt that did not pass

The repository's legacy `tests/mezcla_focales.test.cjs` was attempted. Its mocks lack current native bindings (`CoreApplication.ensureMinimumVersion`, later `Cursor`), and some expectations describe obsolete mask geometry. It does not certify this current source. The harness was restored unchanged; production Focal code was not altered to make old expectations pass. The captured attempt is retained in validation evidence and is not counted as a passing test.

See `validation/2026.11.16/` for JSON reports, counters and the HTTP fixture result. UI renders in that working directory are local evidence, not replacements for tutorial images.

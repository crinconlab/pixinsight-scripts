# Crinconlab — PixInsight 1.9.6 validation summary

**Manual validation:** Carlos Rincón confirms that all workflow tests have been repeated manually with satisfactory results.

**Manual workflow validation:** Carlos Rincón confirms that astrometric solving with ImageSolver and full color calibration with SPCC were manually tested and completed successfully in **both PixInsight 1.9.5 and 1.9.6**. This author-confirmed end-to-end validation complements the automated development and native processing checks.

**Automated development checks — PixInsight 1.9.5:** astrometric-solution handling, ImageSolver initialization and SPCC configuration/workflow integration were covered by automated development checks. These are distinct from the subsequent native 1.9.6 results.

**Four complementary tools for astronomical image processing, by Carlos Rincón.**

Native checks on PixInsight Core 1.9.6 x64/macOS confirm metadata editing, astrometric transfer, image registration and reprojection, MLT detail blending, StarX separation and Screen recombination, and verified sample downloads.

| Product | Current version | Verified operation |
| --- | --- | --- |
| FITS/XISF Header Editor | 1.0.1 | FITS/XISF field creation and editing, simulation, copies, readback, overwrite with/without backups and progress controls. |
| RGB DualBand Solver SPCC | 0.14.3 | Setup and SPCC configuration interfaces, coordinate reprojection, common-field cropping, controlled stellar registration, red-channel composition and WCS propagation. |
| Focal Length Blend | 0.11.7 | Fixed-canvas reprojection, polygon masks, contrast estimation, native MLT blending, comparison, output creation, StarX separation, retained base stars and Screen recombination. |
| Astrometric Solution Copy | 1.1 | Real stellar detection and alignment verification, native WCS transfer and protection against unauthorized or unverified targets. |

## Confirmed results

- Real sample downloads completed on two consecutive button activations, with a responsive progress window and successful cancellation checks. The downloaded 85,376,365-byte ZIP matched the pinned SHA-256. Fourteen Node download/integrity tests also passed.
- Native StarXTerminator 2.6.10/model 11 processed both real sample images. The script's Screen result matched the specified formula exactly. Stars were retained separately and astrometry remained valid.
- Both Focal Length Blend outputs and the RGB geometry output retained native astrometry after saving and reopening their XISF files.
- Header I/O and write-path checks passed. User output remains available while writes into the running PixInsight installation and configuration directories are protected.
- Astrometric Solution Copy matched 480 real stars with zero median positional displacement on the registered-copy fixture.

## Requirements and validation scope

SPCC requires a configured, accessible Gaia DR3/SP catalog and prepared linear RGB/Dual Band images. A new astrometric solution requires suitable stellar data and the installed ImageSolver resources. **The author completed both operations successfully in manual runs on 1.9.5 and 1.9.6**; these are recorded as manual results, separately from the automated session. Reuse, reprojection, cropping and preservation of existing solutions were verified.

Native results apply to this macOS installation and the documented sample workflows. Windows/Linux execution is not claimed by this session. These results describe the tools' behavior; CPD approval remains with PTeam.

## Technical evidence

- [Download execution and integrity](sample-download-ui-1.9.6.md)
- [Native StarX workflow and numerical characterization](starx-validation-1.9.6.md)
- [Protected write paths](path-write-safety.md)
- [Numerical results](../tests/starx-validation-results.json)

The manifest and SHA256SUMS.txt identify the distributed files. Image-processing behavior is unchanged; script descriptions and help include the author-confirmed manual-validation note. Updated 30 October 2026.

## Earlier automated development methodology
The 1.9.5 record covers astrometric metadata/solution propagation, ImageSolver initialization and SPCC settings/integration. The documented automated calibration workflow uses an injected calibration callback. These tests are not evidence of a completed catalog-backed SPCC calibration or a fresh catalog solve. The attribution is to automated development testing, not to a manual test by Carlos Rincón.

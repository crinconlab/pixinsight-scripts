# Crinconlab — PixInsight 1.9.6 validation summary

**Previous author validation — PixInsight 1.9.5:** astrometric solving with ImageSolver and color calibration with SPCC were tested by Carlos Rincón in PixInsight 1.9.5. This records the author's prior workflow validation; it is separate from the automated 1.9.6 checks below.

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

SPCC requires a configured, accessible Gaia DR3/SP catalog and prepared linear RGB/Dual Band images. A new astrometric solution requires suitable stellar data and the installed ImageSolver resources. **Full SPCC calibration and a fresh solve were not completed in this validation session**; their integration uses the installed PixInsight components. Reuse, reprojection, cropping and preservation of existing solutions were verified.

Native results apply to this macOS installation and the documented sample workflows. Windows/Linux execution is not claimed by this session. These results describe the tools' behavior; CPD approval remains with PTeam.

## Technical evidence

- [Download execution and integrity](sample-download-ui-1.9.6.md)
- [Native StarX workflow and numerical characterization](starx-validation-1.9.6.md)
- [Protected write paths](path-write-safety.md)
- [Numerical results](../tests/starx-validation-results.json)

The manifest and SHA256SUMS.txt identify the distributed files. Core product sources are unchanged by this editorial update. Updated 30 October 2026.

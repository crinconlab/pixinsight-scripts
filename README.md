# Crinconlab — tools for PixInsight

**Manual workflow validation:** Carlos Rincón confirms that astrometric solving with ImageSolver and full color calibration with SPCC were manually tested and completed successfully in **both PixInsight 1.9.5 and 1.9.6**. This author-confirmed end-to-end validation complements the automated development and native processing checks.

**Bring your images together, add fine detail and streamline everyday preparation.**

Crinconlab is a collection of four complementary scripts by Carlos Rincón:

| Tool | Version | Purpose |
| --- | --- | --- |
| FITS/XISF Header Editor | 1.0.1 | Inspect and edit metadata across files and folders, with verified copies and optional overwrite. |
| RGB Ha Blend | 0.15.0 | Add dual-band Ha signal to RGB through a guided registration, crop and color-calibration workflow. |
| Focal Length Blend | 0.11.8 | Combine the wide field of a shorter-focal image with selected detail from a longer-focal image. |
| Astrometric Solution Copy | 1.1 | Transfer an existing solution between registered images with stellar alignment checks. |

Includes English manuals, matching icons, sample-image downloads in Focal Length Blend and protected write paths. PolyMask is outside this four-script submission.

## Review and validation

**Automated development checks — PixInsight 1.9.5:** astrometric-solution handling, ImageSolver initialization and SPCC configuration/workflow integration were covered by automated development checks. These are distinct from the subsequent native 1.9.6 results.

- [Product descriptions and technical disclosures](docs/cpd-scripts-en.md)
- [PixInsight 1.9.6 validation summary](docs/validation-pixinsight-1.9.6.md)
- [English manuals](src/scripts/crinconlab/manuals)
- [Submission reference](docs/cpd-submission-guide.md)

Native 1.9.6/macOS checks confirm metadata editing, registration/reprojection, astrometric transfer, MLT blending, StarX separation/Screen recombination and verified downloads. Full SPCC calibration requires accessible Gaia DR3/SP data and prepared linear inputs; the author has confirmed successful manual ImageSolver and full SPCC runs on both 1.9.5 and 1.9.6. The validation summary sets out this scope clearly.

## Installation

[Download this branch as a ZIP](https://github.com/crinconlab/pixinsight-scripts/archive/refs/heads/cpd-review.zip). Keep `src/scripts/crinconlab/` together, including ProtectedPaths.jsh, icons/ and manuals/. Add that folder through Script > Feature Scripts > Add. Launch from Script > Crinconlab. Avoid registering duplicate copies.

The package is distributed manually while the CPD application is reviewed. It does not activate an automatic-update repository. ImageSolver, SPCC/catalog resources and optional StarXTerminator are supplied by the user's PixInsight installation. Versioned source hashes are in the manifest and SHA256SUMS.txt.

Copyright © Carlos Rincón 2026.

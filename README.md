# Crinconlab — four-script CPD submission candidate

Author: Carlos Rincón. Requested CPD identifier: `Carlos_Rincon_Astrophoto`.

This branch contains the four products currently proposed for CPD review. **PolyMask is excluded from this branch and package.** The development branch and older releases are outside the scope of this review package.

The baseline sources are from commit `31fed1d6b8b06624dd8456d537ee29d60ce9b2a8` (26 October 2026). Focal Length Blend 0.11.7 adds SHA-256 sample-download verification, HTTPS-only redirects and protected replacement of an existing download. The header editor has version 1.0.1 with write-path protection; RGB DualBand 0.14.3 and Focal Length Blend 0.11.7 include the same shared write-path guard; Astrometric Solution Copy retains its implementation. This is a submission candidate, not CPD approval. Native 1.9.6 results and the author's accepted continuity assumptions are distinguished in the validation report.

| Product | Source | Version in the reviewed source |
| --- | --- | --- |
| FITS / XISF Header Editor | [FITS_XISF_Header_Editor_EN.js](src/scripts/crinconlab/FITS_XISF_Header_Editor_EN.js) | 1.0.1 |
| RGB DualBand Solver SPCC | [RGB_DualBand_Solver_SPCC_EN.js](src/scripts/crinconlab/RGB_DualBand_Solver_SPCC_EN.js) | 0.14.3 |
| Focal Length Blend | [Mezcla_Focales.js](src/scripts/crinconlab/Mezcla_Focales.js) | 0.11.7 |
| Astrometric Solution Copy | [Astrometric_Solution_Copy_EN.js](src/scripts/crinconlab/Astrometric_Solution_Copy_EN.js) | 1.1 |

- [Product descriptions and technical disclosures — English](docs/cpd-scripts-en.md)
- [Descripciones de los cuatro scripts — español](docs/cpd-scripts-es.md)
- [Checks still required before final submission](docs/cpd-pending-checks.md)
- [PixInsight 1.9.6 native validation and author disposition](docs/validation-pixinsight-1.9.6.md)
- [Submission guide and links](docs/cpd-submission-guide.md)
- [User manuals](src/scripts/crinconlab/manuals)
- [Package instructions](src/scripts/crinconlab/README_EN.txt)

## Review package

Use this branch's source or [download this branch as a ZIP](https://github.com/crinconlab/pixinsight-scripts/archive/refs/heads/cpd-review.zip). Older collection releases include additional development products and are not the four-script review package.

Extract the archive and keep `src/scripts/crinconlab/` together with its `icons/` and `manuals/` subfolders. Place it in a user-managed folder and register it with **Script → Feature Scripts… → Add**. The scripts appear under **Script → Crinconlab**. They do not install themselves into PixInsight or change its security preferences.

These are preliminary scripts, without CPD signatures in this package. This branch does not activate a PixInsight automatic-update repository. The source targets PixInsight 1.9.5; native checks on PixInsight 1.9.6/macOS have been performed for the scope listed in the report. SPCC and fresh solving remain accepted by the author based on previous operation. StarXTerminator separation and Screen recombination have now passed the native 1.9.6 follow-up described in docs/starx-validation-1.9.6.md. ImageSolver and other PixInsight libraries are referenced from the installed application, not copied into this package. StarXTerminator is an optional dependency of Focal Length Blend and must already be installed and activated.

For the FITS header tool, the reviewed implementation uses file-system access and has no direct network API, remote participant exchange or external-program invocation. RGB DualBand Solver SPCC and Focal Length Blend use the official ImageSolver included with PixInsight; catalogue queries follow that component's installed version and configuration. Focal Length Blend also offers an optional sample-data download using `curl`, restricted to HTTPS and checked against a pinned SHA-256 before publication. No separate catalogue service is implemented by the collection.

## Download-verification tests

Run `node --test tests/sample-download.test.cjs` for the standalone helpers. Set `CR_MF_SAMPLE_ZIP` to a downloaded original sample ZIP to include its production SHA-256 check. Eleven tests passed with the real 85,376,365-byte archive on 29 October 2026, using Node file-I/O adapters for PJSR APIs. Run `tests/Test_Sample_Download_PixInsight.js` from PixInsight's script editor to check native file/hash operations; that native test passed on PixInsight 1.9.6/macOS, followed by a successful real HTTPS transfer with the pinned size and SHA-256. See the validation report for results and limits.

Copyright © Carlos Rincón 2026.


WRITE-PATH PROTECTION — 29 OCTOBER 2026
Keep ProtectedPaths.jsh beside the four scripts. Header Editor 1.0.1, Focal Length Blend 0.11.7 and RGB DualBand 0.14.3 refuse writes inside the running PixInsight installation and its per-user configuration directory. Symbolic links are resolved before comparison; ambiguous Windows paths and reparse points are rejected. Existing files with multiple hard links are rejected where reported by the platform. Choose normal user folders for output. The header editor retains its stricter source-link policy. See docs/path-write-safety.md in the cpd-review repository. This guard does not change image-processing algorithms, signing or security preferences.


SAMPLE DOWNLOAD UPDATE — 30 OCTOBER 2026
Focal Length Blend 0.11.7 adds a responsive progress window, separate transfer/SHA-256 percentages and Cancel, blocks duplicate clicks and accelerates native bounded file hashing. Two consecutive real button-callback downloads passed in PixInsight 1.9.6/macOS. HTTPS, the pinned SHA-256 and protected destinations remain enforced. See docs/sample-download-ui-1.9.6.md in cpd-review.


STARX FOLLOW-UP — 30 OCTOBER 2026
Native StarXTerminator 2.6.10/model 11 separation and Screen recombination passed the real-sample automatic workflow in PixInsight 1.9.6/macOS. StarX is no longer an untested dependency in this environment. Exact recovery of every original pixel from the native decomposition is not claimed; numerical diagnostics and remaining limits are documented in docs/starx-validation-1.9.6.md.

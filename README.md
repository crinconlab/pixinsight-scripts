# Crinconlab — four-script CPD review draft

Author: Carlos Rincón. Requested CPD identifier: `Carlos_Rincon_Astrophoto`.

This branch contains the four products currently proposed for CPD review. **PolyMask is excluded from this branch and package.** The development branch and older releases are outside the scope of this review package.

The executable sources are unchanged from commit `31fed1d6b8b06624dd8456d537ee29d60ce9b2a8` (26 October 2026). The descriptions and review notes were prepared on 29 October 2026. This is a documentation draft, not a claim of CPD approval or completed compliance testing.

| Product | Source | Version in the reviewed source |
| --- | --- | --- |
| FITS / XISF Header Editor | [FITS_XISF_Header_Editor_EN.js](src/scripts/crinconlab/FITS_XISF_Header_Editor_EN.js) | No product version declared in its header |
| RGB DualBand Solver SPCC | [RGB_DualBand_Solver_SPCC_EN.js](src/scripts/crinconlab/RGB_DualBand_Solver_SPCC_EN.js) | 0.14.2 |
| Focal Length Blend | [Mezcla_Focales.js](src/scripts/crinconlab/Mezcla_Focales.js) | 0.11.4 |
| Astrometric Solution Copy | [Astrometric_Solution_Copy_EN.js](src/scripts/crinconlab/Astrometric_Solution_Copy_EN.js) | 1.1 |

- [Product descriptions and technical disclosures — English](docs/cpd-scripts-en.md)
- [Descripciones de los cuatro scripts — español](docs/cpd-scripts-es.md)
- [Checks still required before final submission](docs/cpd-pending-checks.md)
- [User manuals](src/scripts/crinconlab/manuals)
- [Package instructions](src/scripts/crinconlab/README_EN.txt)

## Review package

Use this branch's source or [download this branch as a ZIP](https://github.com/crinconlab/pixinsight-scripts/archive/refs/heads/cpd-review.zip). Older collection releases include additional development products and are not the four-script review package.

Extract the archive and keep `src/scripts/crinconlab/` together with its `icons/` and `manuals/` subfolders. Place it in a user-managed folder and register it with **Script → Feature Scripts… → Add**. The scripts appear under **Script → Crinconlab**. They do not install themselves into PixInsight or change its security preferences.

These are preliminary scripts, without CPD signatures in this package. This branch does not activate a PixInsight automatic-update repository. The source targets PixInsight 1.9.5; the requested checks on PixInsight 1.9.6 remain pending. ImageSolver and other PixInsight libraries are referenced from the installed application, not copied into this package. StarXTerminator is an optional dependency of Focal Length Blend and must already be installed and activated.

For the FITS header tool, the reviewed implementation uses file-system access and has no direct network API, remote participant exchange or external-program invocation. Focal Length Blend has an optional sample-data download and invokes `curl`; RGB DualBand Solver SPCC and Focal Length Blend also invoke installed ImageSolver components. Those distinctions and outstanding network checks are documented explicitly rather than describing the whole collection as offline.

Copyright © Carlos Rincón 2026.

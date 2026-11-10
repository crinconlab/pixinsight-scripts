# C_Rinconlab PixInsight Scripts

## Signed release 2026.11.10 — PixInsight 1.9.6

| Script | Version |
| --- | --- |
| [FITS / XISF Header Editor](src/scripts/crinconlab/FITS_XISF_Header_Editor_EN.js) | 1.0.1 |
| [RGB Ha Blend](src/scripts/crinconlab/RGB_Ha_Blend.js) | 0.15.6 |
| [Focal Length Blend](src/scripts/crinconlab/Mezcla_Focales.js) | 0.11.13 |
| [PolyMask (Beta)](src/scripts/crinconlab/PolyMask_EN.js) | 0.3.0-beta.14 |

PolyMask adds freehand and editable polygon regions, color and lightness selections, symmetric feathering, project save/load and cached full-resolution preview refinement. Region-area inversion is in Shape; final inversion is only in Output. Combining existing masks is temporarily disabled.

## Install or update

In PixInsight select **Resources > Updates > Manage Repositories > Add**:

```text
https://raw.githubusercontent.com/crinconlab/pixinsight-scripts/main/repository/
```

Then run **Resources > Updates > Check for Updates** and follow PixInsight's installation/restart prompts.

The four scripts, both shared libraries and the XML update index carry signatures from **Carlos_Rincon_Astrophoto**, verified valid with PixInsight 1.9.6. The developer identity must be present in your PixInsight certified-developer database.

[Website](https://crinconlab.onrender.com/) · [English manuals](src/scripts/crinconlab/manuals) · [Signed update package](repository/crinconlab-scripts-2026.11.10-5d066a765ebaa042.zip) · [Signature verification](docs/releases/2026.11.10/signature-verification.json) · [Index verification](docs/releases/2026.11.10/index-verification.json) · [Package checks](docs/releases/2026.11.10/package-verification.json)

## Astrometric Solution Copy

This script is excluded from the new package and active source folder. Its previous source remains in [the archive](archive/astrometric-solution-copy-1.1); the author's local copy is retained. Existing separately installed local copies are not part of this release.

## Release records

The signing kit, source manifest and signing instructions record the frozen pre-signing state. Current distribution status is documented here and in the verification reports. No source edits were made after signing. Previous signed packages remain in the repository for history; updates.xri selects the current release.

[Publication procedure](docs/publicacion.md) · [Historical CPD review snapshot](https://github.com/crinconlab/pixinsight-scripts/tree/cpd-review)

Copyright © Carlos Rincón 2026.
